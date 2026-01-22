/**
 * GET /api/v1/campaigns/:id/runs/latest
 *
 * REQUIRED CONTRACT (must match non-versioned):
 * 1) 404 { error: "CAMPAIGN_NOT_FOUND" } only when campaign does not exist
 * 2) 200 { status: "no_runs" } when campaign exists but has no runs
 * 3) 200 { status: "<run.status>", run } when a latest run exists (any status, verbatim)
 * 
 * DATA SOURCE CONSISTENCY:
 * This endpoint now queries BOTH campaign_runs table AND activity.events to ensure
 * consistency with other observability components. The run history table uses
 * activity.events, so this endpoint must also check there to avoid showing
 * "no runs" when runs actually exist in the activity spine.
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../../lib/supabase-server';
import { getLatestRunEvent, isActivityDbConfigured } from '../../../../../../../lib/activity-db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const campaignId = params.id;

  if (!campaignId) {
    return NextResponse.json(
      { error: 'MISSING_CAMPAIGN_ID', message: 'Campaign ID is required' },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Database not configured' },
      { status: 503 }
    );
  }

  const supabase = createServerClient();

  // Run state must never cause a 404 — campaign existence and execution state are orthogonal.
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .single();

  if (campaignError) {
    if ((campaignError as { code?: string }).code === 'PGRST116') {
      return NextResponse.json({ error: 'CAMPAIGN_NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }

  if (!campaign) {
    return NextResponse.json({ error: 'CAMPAIGN_NOT_FOUND' }, { status: 404 });
  }

  // First try campaign_runs table (primary source)
  const { data: runs, error: runsError } = await supabase
    .schema('public')
    .from('campaign_runs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (runsError) {
    console.error('[runs/latest] campaign_runs query error:', runsError);
    // Don't fail yet - try activity.events fallback
  }

  if (runs && runs.length > 0) {
    const run = runs[0] as Record<string, unknown>;
    return NextResponse.json({ status: run.status, run }, { status: 200 });
  }

  // CONSISTENCY FIX: Fallback to activity.events if campaign_runs is empty
  // This ensures we show runs that exist in the activity spine but may not
  // have been synced to campaign_runs yet.
  if (isActivityDbConfigured()) {
    try {
      const latestEvent = await getLatestRunEvent(
        campaignId,
        ['run.started', 'run.running', 'run.completed', 'run.failed']
      );

      if (latestEvent) {
        const payload = latestEvent.payload || {};
        const runId = latestEvent.entity_id;
        
        // Determine status from event type
        let status = 'unknown';
        switch (latestEvent.event_type) {
          case 'run.started':
            status = 'queued';
            break;
          case 'run.running':
            status = 'running';
            break;
          case 'run.completed':
            status = 'completed';
            break;
          case 'run.failed':
            status = 'failed';
            break;
        }

        // Build run object from event data
        const run = {
          run_id: runId,
          id: runId,
          campaign_id: campaignId,
          status,
          created_at: latestEvent.created_at,
          updated_at: latestEvent.created_at,
          // Include any payload data
          stage: (payload.stage as string) || (payload.stageName as string) || undefined,
          error_message: (payload.error as string) || undefined,
          termination_reason: (payload.terminationReason as string) || (payload.reason as string) || undefined,
        };

        return NextResponse.json({ status, run }, { status: 200 });
      }
    } catch (activityError) {
      console.error('[runs/latest] activity.events fallback error:', activityError);
      // Continue to return no_runs if fallback also fails
    }
  }

  return NextResponse.json({ status: 'no_runs' }, { status: 200 });
}
