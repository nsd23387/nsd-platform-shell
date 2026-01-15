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
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

type CampaignRunStatus = 'queued' | 'running' | 'failed' | 'succeeded' | 'skipped';

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
      return NextResponse.json(
        {
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch latest run',
        },
        { status: 500 }
      );
    }

    if (!runs || runs.length === 0) {
      const payload: LatestRunPayload = { status: 'no_runs' };
      return NextResponse.json(payload, { status: 200 });
    }

    const run = runs[0] as Record<string, unknown>;
    const status = run.status as LatestRunPayload['status'];
    const payload: LatestRunPayload = { status, run };
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
