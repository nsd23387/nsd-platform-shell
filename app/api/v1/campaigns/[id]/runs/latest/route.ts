/**
 * GET /api/v1/campaigns/:id/runs/latest
 *
 * REQUIRED CONTRACT (must match non-versioned):
 * 1) 404 { error: "CAMPAIGN_NOT_FOUND" } only when campaign does not exist
 * 2) 200 { status: "no_runs" } when campaign exists but has no runs
 * 3) 200 { status: "<run.status>", run } when a latest run exists (any status, verbatim)
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../../lib/supabase-server';

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

  const { data: runs, error: runsError } = await supabase
    .schema('public')
    .from('campaign_runs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (runsError) {
    return NextResponse.json(
      { error: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch latest run' },
      { status: 500 }
    );
  }

  if (!runs || runs.length === 0) {
    return NextResponse.json({ status: 'no_runs' }, { status: 200 });
  }

  const run = runs[0] as Record<string, unknown>;
  return NextResponse.json({ status: run.status, run }, { status: 200 });
}
