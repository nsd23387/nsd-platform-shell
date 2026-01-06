/**
 * Campaign Observability API Route
 * 
 * GET /api/v1/campaigns/[id]/observability
 * 
 * Returns the full observability state for a campaign, combining
 * execution status and pipeline funnel data.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * All observability data is derived from activity.events.
 * 
 * DATABASE ACCESS:
 * - activity.events is read via direct DB connection, not PostgREST.
 * - core.* tables are read via Supabase client (PostgREST).
 * 
 * GOVERNANCE:
 * - Read-only
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

  if (!isSupabaseConfigured() || !isActivityDbConfigured()) {
    // Return empty observability data when not configured
    return NextResponse.json({
      campaign_id: campaignId,
      execution: {
        status: 'idle',
        last_observed_at: new Date().toISOString(),
      },
      pipeline: [],
      active_run: null,
    });
  }

  try {
    const coreClient = createCoreClient();

    // Check if campaign exists (via Supabase/PostgREST)
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the latest run event via direct Postgres
    // activity.events is read via direct DB connection, not PostgREST.
    const latestRunEvent = await getLatestRunEvent(
      campaignId,
      ['run.started', 'run.running', 'run.completed', 'run.failed']
    );

    // Determine execution status from event stream
    let executionStatus: string = 'idle';
    let activeRunId: string | null = null;
    let currentStage: string | undefined;
    let errorMessage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRunEvent) {
      lastObservedAt = latestRunEvent.created_at || lastObservedAt;
      const payload = latestRunEvent.payload || {};
      
      switch (latestRunEvent.event_type) {
        case 'run.started':
          executionStatus = 'run_requested';
          activeRunId = latestRunEvent.run_id || null;
          break;
        case 'run.running':
          executionStatus = 'running';
          activeRunId = latestRunEvent.run_id || null;
          currentStage = payload.stage as string | undefined;
          break;
        case 'run.completed':
          const leadsPromoted = payload.leads_promoted as number || 0;
          if (leadsPromoted > 0) {
            executionStatus = 'awaiting_approvals';
          } else {
            executionStatus = 'completed';
          }
          lastObservedAt = (payload.completed_at as string) || lastObservedAt;
          break;
        case 'run.failed':
          executionStatus = 'failed';
          errorMessage = payload.error as string | undefined;
          lastObservedAt = (payload.failed_at as string) || lastObservedAt;
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
      const payload = latestCompletionEvent.payload || {};

      const stageDefinitions = [
        { stage: 'orgs_sourced', label: 'Organizations sourced', count: payload.orgs_sourced as number | undefined },
        { stage: 'contacts_discovered', label: 'Contacts discovered', count: payload.contacts_discovered as number | undefined },
        { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: payload.contacts_evaluated as number | undefined },
        { stage: 'leads_promoted', label: 'Leads promoted', count: payload.leads_promoted as number | undefined },
      ];

      for (const stageDef of stageDefinitions) {
        if (stageDef.count !== null && stageDef.count !== undefined) {
          pipeline.push({
            stage: stageDef.stage,
            label: stageDef.label,
            count: stageDef.count,
            confidence: 'observed',
          });
        }
      }
    } else {
      // No completion event - check stage.completed events for in-progress data
      const stageEvents = await getStageCompletedEvents(campaignId, 10);

      if (stageEvents && stageEvents.length > 0) {
        const counts: Record<string, number> = {};
        for (const event of stageEvents) {
          const payload = event.payload || {};
          if (payload.orgs_sourced !== undefined) counts.orgs_sourced = payload.orgs_sourced as number;
          if (payload.contacts_discovered !== undefined) counts.contacts_discovered = payload.contacts_discovered as number;
          if (payload.contacts_evaluated !== undefined) counts.contacts_evaluated = payload.contacts_evaluated as number;
          if (payload.leads_promoted !== undefined) counts.leads_promoted = payload.leads_promoted as number;
        }

        const stageDefinitions = [
          { stage: 'orgs_sourced', label: 'Organizations sourced', count: counts.orgs_sourced },
          { stage: 'contacts_discovered', label: 'Contacts discovered', count: counts.contacts_discovered },
          { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: counts.contacts_evaluated },
          { stage: 'leads_promoted', label: 'Leads promoted', count: counts.leads_promoted },
        ];

        for (const stageDef of stageDefinitions) {
          if (stageDef.count !== null && stageDef.count !== undefined) {
            pipeline.push({
              stage: stageDef.stage,
              label: stageDef.label,
              count: stageDef.count,
              confidence: 'observed',
            });
          }
        }
      }
    }

    return NextResponse.json({
      campaign_id: campaignId,
      execution: {
        status: executionStatus,
        active_run_id: activeRunId,
        current_stage: currentStage,
        error_message: errorMessage,
        last_observed_at: lastObservedAt,
      },
      pipeline: pipeline,
      active_run: activeRunId ? { id: activeRunId, status: executionStatus, stage: currentStage } : null,
    });
  } catch (error) {
    console.error('[observability] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
