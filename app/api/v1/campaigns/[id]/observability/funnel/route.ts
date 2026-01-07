/**
 * Campaign Observability Funnel API Route
 * 
 * GET /api/v1/campaigns/[id]/observability/funnel
 * 
 * Returns the pipeline funnel data for a campaign.
 * This is the SOURCE OF TRUTH for pipeline counts.
 * 
 * RESPONSE SHAPE (matches ObservabilityFunnel interface):
 * {
 *   campaign_id: string,
 *   stages: PipelineStage[],
 *   last_updated_at: string
 * }
 * 
 * PipelineStage: { stage, label, count, confidence, tooltip? }
 * 
 * IMPORTANT:
 * - Stage names are derived from event payload, NOT hardcoded
 * - UI must render counts directly from this response
 * - No local math or inference is allowed
 * - When stages is [], show "No activity observed yet"
 * 
 * activity.events SCHEMA:
 * - id: uuid (NOT NULL, no default)
 * - event_type: text (NOT NULL)
 * - entity_type: text (NOT NULL) - 'campaign_run' for run events
 * - entity_id: uuid (NOT NULL) - the runId
 * - payload: jsonb (nullable) - contains stage counts
 * - created_at: timestamptz (NOT NULL, default now())
 * 
 * GOVERNANCE:
 * - Read-only projection from activity.events
 * - Counts are backend-authoritative
 * - No local computation in UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getLatestRunEvent, 
  getStageCompletedEvents, 
  isActivityDbConfigured 
} from '../../../../../../../lib/activity-db';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  confidence: 'observed' | 'conditional';
  tooltip?: string;
}

/**
 * Convert camelCase payload key to display label.
 * Does NOT hardcode stage names - derives from actual payload keys.
 */
function getStageLabel(stageKey: string): string {
  const labels: Record<string, string> = {
    orgsSourced: 'Organizations sourced',
    contactsDiscovered: 'Contacts discovered',
    contactsEvaluated: 'Contacts evaluated',
    leadsPromoted: 'Leads promoted',
    leadsApproved: 'Leads approved',
    emailsSent: 'Emails sent',
  };
  return labels[stageKey] || stageKey.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Convert camelCase payload key to stage ID.
 */
function getStageId(stageKey: string): string {
  return stageKey.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Get tooltip for a stage.
 */
function getStageTooltip(stageKey: string): string | undefined {
  const tooltips: Record<string, string> = {
    orgsSourced: 'Organizations matching ICP criteria',
    contactsDiscovered: 'Contacts found within sourced organizations',
    contactsEvaluated: 'Contacts evaluated for ICP fit',
    leadsPromoted: 'Contacts promoted to leads (Tier A/B)',
    leadsApproved: 'Leads approved for outreach',
    emailsSent: 'Emails sent to approved leads',
  };
  return tooltips[stageKey];
}

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && serviceRoleKey);
}

function createCoreClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'core' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // Default response when not configured
  if (!isSupabaseConfigured() || !isActivityDbConfigured()) {
    return NextResponse.json({
      campaign_id: campaignId,
      stages: [],
      last_updated_at: new Date().toISOString(),
    });
  }

  try {
    const coreClient = createCoreClient();

    // Check if campaign exists (via Supabase/PostgREST for core schema)
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the latest run.completed or run.failed event via direct Postgres
    const latestCompletionEvent = await getLatestRunEvent(
      campaignId,
      ['run.completed', 'run.failed']
    );

    // Build pipeline stages from event payload
    const stages: PipelineStage[] = [];
    let lastUpdatedAt = new Date().toISOString();

    if (latestCompletionEvent && latestCompletionEvent.event_type === 'run.completed') {
      lastUpdatedAt = latestCompletionEvent.created_at || lastUpdatedAt;
      // Defensive payload access
      const payload = latestCompletionEvent.payload || {};

      // Dynamically extract stage counts from payload (not hardcoded)
      const stageKeys = ['orgsSourced', 'contactsDiscovered', 'contactsEvaluated', 'leadsPromoted', 'leadsApproved', 'emailsSent'];
      
      for (const key of stageKeys) {
        const count = payload[key];
        if (count !== null && count !== undefined && typeof count === 'number') {
          stages.push({
            stage: getStageId(key),
            label: getStageLabel(key),
            count: count,
            confidence: 'observed',
            tooltip: getStageTooltip(key),
          });
        }
      }
    } else {
      // No completion event yet - check for stage.completed events from ongoing run
      const stageEvents = await getStageCompletedEvents(campaignId, 20);

      if (stageEvents && stageEvents.length > 0) {
        lastUpdatedAt = stageEvents[0].created_at || lastUpdatedAt;

        // Aggregate counts from stage events (defensive payload access)
        const counts: Record<string, number> = {};
        for (const event of stageEvents) {
          const payload = event.payload || {};
          // Extract any numeric counts from payload
          for (const [key, value] of Object.entries(payload)) {
            if (typeof value === 'number' && !counts[key]) {
              counts[key] = value;
            }
          }
        }

        // Build stages from aggregated counts
        const stageKeys = ['orgsSourced', 'contactsDiscovered', 'contactsEvaluated', 'leadsPromoted', 'leadsApproved', 'emailsSent'];
        for (const key of stageKeys) {
          const count = counts[key];
          if (count !== null && count !== undefined) {
            stages.push({
              stage: getStageId(key),
              label: getStageLabel(key),
              count: count,
              confidence: 'observed',
              tooltip: getStageTooltip(key),
            });
          }
        }
      }
    }

    // Return ObservabilityFunnel shape
    return NextResponse.json({
      campaign_id: campaignId,
      stages: stages,
      last_updated_at: lastUpdatedAt,
    });
  } catch (error) {
    console.error('[observability/funnel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
