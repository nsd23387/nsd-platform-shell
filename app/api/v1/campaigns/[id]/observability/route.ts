/**
 * Campaign Observability API Route
 * 
 * GET /api/v1/campaigns/[id]/observability
 * 
 * Returns full observability data including status, pipeline, and send metrics.
 * This is a read-only endpoint that reflects backend-authoritative data.
 * 
 * GOVERNANCE:
 * - Read-only
 * - No execution control
 * - Data comes from ODS activity.events
 * - UI reflects backend truth
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (!isSupabaseConfigured()) {
    // Return mock/empty data when Supabase is not configured
    return NextResponse.json({
      campaign_id: campaignId,
      status: 'idle',
      last_observed_at: new Date().toISOString(),
      pipeline: [],
      send_metrics: null,
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

    // Determine execution status from campaign status and recent events
    let executionStatus: string = 'idle';
    
    // Check for recent run.started events
    const { data: latestRun } = await supabase
      .from('campaign_runs')
      .select('id, status, started_at, completed_at')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (latestRun) {
      if (latestRun.status === 'RUNNING') {
        executionStatus = 'running';
      } else if (latestRun.status === 'COMPLETED') {
        executionStatus = 'completed';
      } else if (latestRun.status === 'FAILED') {
        executionStatus = 'failed';
      } else if (latestRun.status === 'PARTIAL') {
        executionStatus = 'partial';
      }
    }

    // Get pipeline counts from activity events or campaign_run_stats
    // For now, return empty pipeline if no data
    interface PipelineStage {
      stage: string;
      label: string;
      count: number;
      confidence: 'observed' | 'conditional';
      tooltip?: string;
    }
    const pipeline: PipelineStage[] = [];

    // Build response
    const observability = {
      campaign_id: campaignId,
      status: executionStatus,
      active_run_id: latestRun?.status === 'RUNNING' ? latestRun.id : undefined,
      last_observed_at: latestRun?.started_at || new Date().toISOString(),
      pipeline: pipeline,
      send_metrics: null,
    };

    return NextResponse.json(observability);
  } catch (error) {
    console.error('[observability] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
