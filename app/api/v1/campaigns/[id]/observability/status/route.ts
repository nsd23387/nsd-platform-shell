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
 * GOVERNANCE:
 * - Read-only
 * - UI must derive all execution display from this endpoint
 * - No execution control
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    // Return idle status when Supabase is not configured
    return NextResponse.json({
      campaign_id: campaignId,
      status: 'idle',
      last_observed_at: new Date().toISOString(),
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

    // Get the latest run events to determine execution status
    // We look for run.started, run.running, run.completed, run.failed events
    const { data: latestRunEvent } = await activityClient
      .from('events')
      .select('event_type, entity_id, run_id, payload, created_at')
      .eq('campaign_id', campaignId)
      .eq('entity_type', 'campaign_run')
      .in('event_type', ['run.started', 'run.running', 'run.completed', 'run.failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Determine execution status from event stream
    let executionStatus: string = 'idle';
    let activeRunId: string | undefined;
    let currentStage: string | undefined;
    let errorMessage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRunEvent) {
      lastObservedAt = latestRunEvent.created_at || lastObservedAt;
      const payload = latestRunEvent.payload as Record<string, unknown> || {};
      
      switch (latestRunEvent.event_type) {
        case 'run.started':
          executionStatus = 'run_requested';
          activeRunId = latestRunEvent.run_id;
          break;
        case 'run.running':
          executionStatus = 'running';
          activeRunId = latestRunEvent.run_id;
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
