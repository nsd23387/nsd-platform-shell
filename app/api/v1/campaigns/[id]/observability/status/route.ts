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
 * GOVERNANCE:
 * - Read-only
 * - UI must derive all execution display from this endpoint
 * - No execution control
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../../lib/supabase-server';

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
    const supabase = createServerClient();

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the latest run to determine execution status
    const { data: latestRun } = await supabase
      .from('campaign_runs')
      .select('id, status, started_at, completed_at, current_stage, error_message')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Determine execution status
    let executionStatus: string = 'idle';
    let activeRunId: string | undefined;
    let currentStage: string | undefined;
    let errorMessage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRun) {
      lastObservedAt = latestRun.started_at || lastObservedAt;
      
      switch (latestRun.status) {
        case 'REQUESTED':
          executionStatus = 'run_requested';
          activeRunId = latestRun.id;
          break;
        case 'RUNNING':
          executionStatus = 'running';
          activeRunId = latestRun.id;
          currentStage = latestRun.current_stage;
          lastObservedAt = latestRun.completed_at || latestRun.started_at || lastObservedAt;
          break;
        case 'AWAITING_APPROVALS':
          executionStatus = 'awaiting_approvals';
          lastObservedAt = latestRun.completed_at || latestRun.started_at || lastObservedAt;
          break;
        case 'COMPLETED':
          executionStatus = 'completed';
          lastObservedAt = latestRun.completed_at || latestRun.started_at || lastObservedAt;
          break;
        case 'FAILED':
          executionStatus = 'failed';
          errorMessage = latestRun.error_message;
          lastObservedAt = latestRun.completed_at || latestRun.started_at || lastObservedAt;
          break;
        case 'PARTIAL':
          executionStatus = 'partial';
          lastObservedAt = latestRun.completed_at || latestRun.started_at || lastObservedAt;
          break;
        default:
          // Unknown status, default to idle
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
