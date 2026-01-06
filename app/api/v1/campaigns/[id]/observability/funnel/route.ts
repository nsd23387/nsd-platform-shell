/**
 * Campaign Observability Funnel API Route
 * 
 * GET /api/v1/campaigns/[id]/observability/funnel
 * 
 * Returns the pipeline funnel data for a campaign.
 * This is the SOURCE OF TRUTH for pipeline counts.
 * 
 * UI must render counts directly from this response.
 * No local math or inference is allowed.
 * 
 * Empty state: When stages is [], show "No activity observed yet".
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * Pipeline counts are derived from stage.completed events.
 * 
 * GOVERNANCE:
 * - Read-only
 * - Counts are backend-authoritative
 * - No local computation in UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  confidence: 'observed' | 'conditional';
  tooltip?: string;
}

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && serviceRoleKey);
}

function createActivityClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'activity' },
  });
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

  if (!isSupabaseConfigured()) {
    // Return empty funnel when Supabase is not configured
    return NextResponse.json({
      campaign_id: campaignId,
      stages: [],
      last_updated_at: new Date().toISOString(),
    });
  }

  try {
    const coreClient = createCoreClient();
    const activityClient = createActivityClient();

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the latest run.completed or run.failed event to get final counts
    const { data: latestCompletionEvent } = await activityClient
      .from('events')
      .select('event_type, run_id, payload, created_at')
      .eq('campaign_id', campaignId)
      .eq('entity_type', 'campaign_run')
      .in('event_type', ['run.completed', 'run.failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build pipeline stages from event payload
    const stages: PipelineStage[] = [];
    let lastUpdatedAt = new Date().toISOString();

    if (latestCompletionEvent) {
      lastUpdatedAt = latestCompletionEvent.created_at || lastUpdatedAt;
      const payload = latestCompletionEvent.payload as Record<string, unknown> || {};

      // Extract counts from the run.completed payload
      const orgsSourced = payload.orgs_sourced as number | undefined;
      const contactsDiscovered = payload.contacts_discovered as number | undefined;
      const contactsEvaluated = payload.contacts_evaluated as number | undefined;
      const leadsPromoted = payload.leads_promoted as number | undefined;

      // Build stage definitions
      const stageDefinitions = [
        { stage: 'orgs_sourced', label: 'Organizations sourced', count: orgsSourced, confidence: 'observed' as const, tooltip: 'Organizations matching ICP criteria' },
        { stage: 'contacts_discovered', label: 'Contacts discovered', count: contactsDiscovered, confidence: 'observed' as const, tooltip: 'Contacts found within sourced organizations' },
        { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: contactsEvaluated, confidence: 'observed' as const, tooltip: 'Contacts evaluated for ICP fit' },
        { stage: 'leads_promoted', label: 'Leads promoted', count: leadsPromoted, confidence: 'observed' as const, tooltip: 'Contacts promoted to leads (Tier A/B)' },
      ];

      // Add stages that have counts (>= 0)
      for (const stageDef of stageDefinitions) {
        if (stageDef.count !== null && stageDef.count !== undefined) {
          stages.push({
            stage: stageDef.stage,
            label: stageDef.label,
            count: stageDef.count,
            confidence: stageDef.confidence,
            tooltip: stageDef.tooltip,
          });
        }
      }
    } else {
      // No completion event yet - check for stage.completed events from ongoing run
      const { data: stageEvents } = await activityClient
        .from('events')
        .select('event_type, payload, created_at')
        .eq('campaign_id', campaignId)
        .eq('entity_type', 'campaign_run')
        .eq('event_type', 'stage.completed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (stageEvents && stageEvents.length > 0) {
        lastUpdatedAt = stageEvents[0].created_at || lastUpdatedAt;

        // Aggregate counts from stage events
        const counts: Record<string, number> = {};
        for (const event of stageEvents) {
          const payload = event.payload as Record<string, unknown> || {};
          if (payload.orgs_sourced !== undefined) counts.orgs_sourced = payload.orgs_sourced as number;
          if (payload.contacts_discovered !== undefined) counts.contacts_discovered = payload.contacts_discovered as number;
          if (payload.contacts_evaluated !== undefined) counts.contacts_evaluated = payload.contacts_evaluated as number;
          if (payload.leads_promoted !== undefined) counts.leads_promoted = payload.leads_promoted as number;
        }

        const stageDefinitions = [
          { stage: 'orgs_sourced', label: 'Organizations sourced', count: counts.orgs_sourced, confidence: 'observed' as const, tooltip: 'Organizations matching ICP criteria' },
          { stage: 'contacts_discovered', label: 'Contacts discovered', count: counts.contacts_discovered, confidence: 'observed' as const, tooltip: 'Contacts found within sourced organizations' },
          { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: counts.contacts_evaluated, confidence: 'observed' as const, tooltip: 'Contacts evaluated for ICP fit' },
          { stage: 'leads_promoted', label: 'Leads promoted', count: counts.leads_promoted, confidence: 'observed' as const, tooltip: 'Contacts promoted to leads (Tier A/B)' },
        ];

        for (const stageDef of stageDefinitions) {
          if (stageDef.count !== null && stageDef.count !== undefined) {
            stages.push({
              stage: stageDef.stage,
              label: stageDef.label,
              count: stageDef.count,
              confidence: stageDef.confidence,
              tooltip: stageDef.tooltip,
            });
          }
        }
      }
    }

    // If no stages found, this is an empty state - "No activity observed yet"
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
