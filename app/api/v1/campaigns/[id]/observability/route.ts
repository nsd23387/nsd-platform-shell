/**
 * Campaign Observability API Route
 * 
 * GET /api/v1/campaigns/[id]/observability
 * 
 * Returns the full observability state for a campaign, combining
 * execution status and pipeline funnel data.
 * 
 * RESPONSE SHAPE (matches CampaignObservability interface):
 * {
 *   campaign_id: string,
 *   status: CampaignExecutionStatus,
 *   active_run_id?: string,
 *   current_stage?: string,
 *   last_observed_at: string,
 *   pipeline: PipelineStage[],
 *   send_metrics?: { ... }
 * }
 * 
 * activity.events SCHEMA:
 * - id: uuid (NOT NULL, no default)
 * - event_type: text (NOT NULL)
 * - entity_type: text (NOT NULL) - 'campaign_run' for run events
 * - entity_id: uuid (NOT NULL) - the runId
 * - payload: jsonb (nullable) - contains campaignId, counts, etc.
 * - created_at: timestamptz (NOT NULL, default now())
 * 
 * GOVERNANCE:
 * - Read-only projection from activity.events
 * - Backend-authoritative counts and status
 * - No local computation in UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getLatestRunEvent, 
  getStageCompletedEvents,
  isActivityDbConfigured 
} from '../../../../../../lib/activity-db';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  confidence: 'observed' | 'conditional';
  tooltip?: string;
}

/**
 * Convert camelCase payload key to display label.
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
      status: 'idle',
      last_observed_at: new Date().toISOString(),
      pipeline: [],
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

    // Get the latest run event via direct Postgres (activity schema)
    const latestRunEvent = await getLatestRunEvent(
      campaignId,
      ['run.started', 'run.running', 'run.completed', 'run.failed']
    );

    // Determine execution status from event stream
    let executionStatus: string = 'idle';
    let activeRunId: string | undefined;
    let currentStage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRunEvent) {
      lastObservedAt = latestRunEvent.created_at || lastObservedAt;
      // Defensive payload access
      const payload = latestRunEvent.payload || {};
      // entity_id IS the runId (physical column)
      const runId = latestRunEvent.entity_id;
      
      switch (latestRunEvent.event_type) {
        case 'run.started':
          executionStatus = 'run_requested';
          activeRunId = runId;
          break;
        case 'run.running':
          executionStatus = 'running';
          activeRunId = runId;
          currentStage = (payload.stage as string) || (payload.stageName as string) || undefined;
          break;
        case 'run.completed':
          const leadsPromoted = (payload.leadsPromoted as number) || 0;
          if (leadsPromoted > 0) {
            executionStatus = 'awaiting_approvals';
          } else {
            executionStatus = 'completed';
          }
          lastObservedAt = (payload.completedAt as string) || lastObservedAt;
          break;
        case 'run.failed':
          executionStatus = 'failed';
          lastObservedAt = (payload.failedAt as string) || lastObservedAt;
          break;
        default:
          executionStatus = 'idle';
      }
    }

    // Build pipeline stages from event data
    const pipeline: PipelineStage[] = [];

    // Get the latest completion event for final counts
    const latestCompletionEvent = await getLatestRunEvent(
      campaignId,
      ['run.completed', 'run.failed']
    );

    if (latestCompletionEvent && latestCompletionEvent.event_type === 'run.completed') {
      // Defensive payload access
      const payload = latestCompletionEvent.payload || {};

      // Dynamically extract stage counts from payload
      const stageKeys = ['orgsSourced', 'contactsDiscovered', 'contactsEvaluated', 'leadsPromoted', 'leadsApproved', 'emailsSent'];
      
      for (const key of stageKeys) {
        const count = payload[key];
        if (count !== null && count !== undefined && typeof count === 'number') {
          pipeline.push({
            stage: getStageId(key),
            label: getStageLabel(key),
            count: count,
            confidence: 'observed',
            tooltip: getStageTooltip(key),
          });
        }
      }
    } else {
      // No completion event - check stage.completed events for in-progress data
      const stageEvents = await getStageCompletedEvents(campaignId, 20);

      if (stageEvents && stageEvents.length > 0) {
        // Aggregate counts from stage events
        const counts: Record<string, number> = {};
        for (const event of stageEvents) {
          const payload = event.payload || {};
          for (const [key, value] of Object.entries(payload)) {
            if (typeof value === 'number' && !counts[key]) {
              counts[key] = value;
            }
          }
        }

        const stageKeys = ['orgsSourced', 'contactsDiscovered', 'contactsEvaluated', 'leadsPromoted', 'leadsApproved', 'emailsSent'];
        for (const key of stageKeys) {
          const count = counts[key];
          if (count !== null && count !== undefined) {
            pipeline.push({
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

    // Return CampaignObservability shape
    return NextResponse.json({
      campaign_id: campaignId,
      status: executionStatus,
      active_run_id: activeRunId,
      current_stage: currentStage,
      last_observed_at: lastObservedAt,
      pipeline: pipeline,
    });
  } catch (error) {
    console.error('[observability] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
