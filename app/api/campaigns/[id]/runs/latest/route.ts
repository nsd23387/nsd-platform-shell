/**
 * Endpoint: GET /api/campaigns/:id/runs/latest
 *
 * Authoritative contract:
 * - 404 { error: "CAMPAIGN_NOT_FOUND" } ONLY when the campaign does not exist
 * - 200 { status: "no_runs" } when campaign exists but has no runs
 * - 200 { status: <run.status>, run } when a latest run exists (queued/running/failed/succeeded/skipped)
 *
 * IMPORTANT:
 * Run state must never cause a 404 — campaign existence and execution state are orthogonal.
 * 
 * DATA SOURCE CONSISTENCY:
 * This endpoint now queries BOTH campaign_runs table AND activity.events to ensure
 * consistency with other observability components. The run history table uses
 * activity.events, so this endpoint must also check there to avoid showing
 * "no runs" when runs actually exist in the activity spine.
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';
import { getLatestRunEvent, isActivityDbConfigured } from '../../../../../../lib/activity-db';

type CampaignRunStatus = 'queued' | 'running' | 'failed' | 'succeeded' | 'skipped' | 'completed';

type LatestRunPayload =
  | { status: 'no_runs' }
  | { status: CampaignRunStatus | (string & {}); run: Record<string, unknown> };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Validate campaign ID
  if (!campaignId) {
    return NextResponse.json(
      { error: 'MISSING_CAMPAIGN_ID', message: 'Campaign ID is required' },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    console.error('[runs/latest] Supabase not configured');
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Database not configured',
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createServerClient();

    // 1) Fetch campaign first.
    // Run state must never cause a 404 — campaign existence and execution state are orthogonal.
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      // PostgREST "No rows found" for .single()
      if ((campaignError as { code?: string }).code === 'PGRST116') {
        return NextResponse.json({ error: 'CAMPAIGN_NOT_FOUND' }, { status: 404 });
      }
      console.error('[runs/latest] Campaign fetch error:', campaignError);
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch campaign',
        },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json({ error: 'CAMPAIGN_NOT_FOUND' }, { status: 404 });
    }

    // 2) Fetch latest run, unfiltered by status, ordered by created_at DESC.
    // campaign_runs lives in public schema (campaigns lives in core schema).
    const { data: runs, error: runsError } = await supabase
      .schema('public')
      .from('campaign_runs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (runsError) {
      console.error('[runs/latest] Runs fetch error:', runsError);
      // Don't fail yet - try activity.events fallback
    }

    if (runs && runs.length > 0) {
      const run = runs[0] as Record<string, unknown>;
      const status = run.status as LatestRunPayload['status'];
      const payload: LatestRunPayload = { status, run };
      return NextResponse.json(payload, { status: 200 });
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
          const eventPayload = latestEvent.payload || {};
          const runId = latestEvent.entity_id;
          
          // Determine status from event type
          let status: CampaignRunStatus | string = 'unknown';
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
          const run: Record<string, unknown> = {
            run_id: runId,
            id: runId,
            campaign_id: campaignId,
            status,
            created_at: latestEvent.created_at,
            updated_at: latestEvent.created_at,
            // Include any payload data
            stage: (eventPayload.stage as string) || (eventPayload.stageName as string) || undefined,
            error_message: (eventPayload.error as string) || undefined,
            termination_reason: (eventPayload.terminationReason as string) || (eventPayload.reason as string) || undefined,
          };

          const payload: LatestRunPayload = { status, run };
          return NextResponse.json(payload, { status: 200 });
        }
      } catch (activityError) {
        console.error('[runs/latest] activity.events fallback error:', activityError);
        // Continue to return no_runs if fallback also fails
      }
    }

    const payload: LatestRunPayload = { status: 'no_runs' };
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(`[runs/latest] Unhandled error for campaign ${campaignId}:`, error);
    return NextResponse.json(
      {
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Unhandled error',
      },
      { status: 500 }
    );
  }
}
