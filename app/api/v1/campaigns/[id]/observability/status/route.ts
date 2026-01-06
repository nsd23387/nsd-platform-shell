/**
 * Campaign Observability Status API Route
 * 
 * GET /api/v1/campaigns/[id]/observability/status
 * 
 * Returns the execution status for a campaign.
 * This is the SOURCE OF TRUTH for execution state.
 * 
 * STATUS VALUES:
 * - "idle": No active run
 * - "run_requested": Execution request sent, awaiting events
 * - "running": Run in progress
 * - "awaiting_approvals": Run completed, leads pending approval
 * - "completed": Last run completed
 * - "failed": Last run failed
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * Status is derived from the event stream (run.started, run.running, run.completed, run.failed).
 * 
 * DATABASE ACCESS:
 * - activity.events is read via direct DB connection, not PostgREST.
 * - core.* tables are read via Supabase client (PostgREST).
 * 
 * GOVERNANCE:
 * - Read-only
 * - UI must derive all execution display from this endpoint
 * - No execution control
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getLatestRunEvent, isActivityDbConfigured } from '../../../../../../../lib/activity-db';

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
    // Return idle status when not configured
    return NextResponse.json({
      campaign_id: campaignId,
      status: 'idle',
      last_observed_at: new Date().toISOString(),
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
    let activeRunId: string | undefined;
    let currentStage: string | undefined;
    let errorMessage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRunEvent) {
      lastObservedAt = latestRunEvent.created_at || lastObservedAt;
      const payload = latestRunEvent.payload || {};
      // run_id is stored in payload, not as a separate column
      const runIdFromPayload = payload.run_id as string | undefined;
      
      switch (latestRunEvent.event_type) {
        case 'run.started':
          executionStatus = 'run_requested';
          activeRunId = runIdFromPayload || latestRunEvent.entity_id || undefined;
          break;
        case 'run.running':
          executionStatus = 'running';
          activeRunId = runIdFromPayload || latestRunEvent.entity_id || undefined;
          currentStage = payload.stage as string | undefined;
          break;
        case 'run.completed':
          // Check if there are leads awaiting approval
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

    return NextResponse.json({
      campaign_id: campaignId,
      status: executionStatus,
      active_run_id: activeRunId,
      current_stage: currentStage,
      last_observed_at: lastObservedAt,
      error_message: errorMessage,
    });
  } catch (error) {
    console.error('[observability/status] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
