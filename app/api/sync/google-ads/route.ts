/**
 * Google Ads Sync API Route — Manual Trigger
 *
 * POST /api/sync/google-ads
 *
 * Triggers a Google Ads data sync from BigQuery into analytics.raw_google_ads.
 * Syncs campaign performance and search term performance.
 *
 * GOVERNANCE: This is a WRITE endpoint. It modifies analytics.raw_google_ads
 * and analytics.ingestion_runs.
 * Protected by SYNC_SECRET bearer token.
 *
 * Request body (optional):
 *   { startDate?: string, endDate?: string }
 *   Defaults to last 30 days if omitted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  syncCampaignPerformance,
  syncSearchTerms,
} from '../../../../services/googleAdsSync';
import {
  createIngestionRun,
  completeIngestionRun,
} from '../../../../services/ga4Sync';

function getPool(): Pool {
  return new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    connectionTimeoutMillis: 10000,
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.SYNC_SECRET;

  if (!expectedToken) {
    return NextResponse.json(
      { error: 'SYNC_SECRET not configured on server' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let startDate: string;
  let endDate: string;

  try {
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    startDate = body.startDate ?? formatDate(thirtyDaysAgo);
    endDate = body.endDate ?? formatDate(now);

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }
    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 },
      );
    }
    const maxWindowDays = 90;
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (diffMs > maxWindowDays * 86400000) {
      return NextResponse.json(
        { error: `Date range must not exceed ${maxWindowDays} days` },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const pool = getPool();
  const startTime = Date.now();

  try {
    const runId = await createIngestionRun(pool, 'google-ads-bq', 'google-ads-sync');

    const campaignResult = await syncCampaignPerformance(pool, startDate, endDate, runId);
    const searchTermResult = await syncSearchTerms(pool, startDate, endDate, runId);

    const totalRows = campaignResult.rows + searchTermResult.rows;
    const allErrors = [...campaignResult.errors, ...searchTermResult.errors];

    const durationMs = Date.now() - startTime;

    await completeIngestionRun(
      pool,
      runId,
      allErrors.length > 0 ? 'failed' : 'completed',
      totalRows,
      allErrors.length,
      durationMs,
      allErrors.length > 0 ? allErrors.join('; ') : undefined,
    );

    return NextResponse.json({
      status: 'ok',
      date_range: { startDate, endDate },
      campaign_rows: campaignResult.rows,
      search_term_rows: searchTermResult.rows,
      total_rows: totalRows,
      errors: allErrors,
      duration_ms: durationMs,
      ingestion_run_id: runId,
    });
  } catch (err) {
    try {
      const failRunId = await createIngestionRun(pool, 'google-ads-bq', 'google-ads-sync-error');
      await completeIngestionRun(pool, failRunId, 'failed', 0, 1, Date.now() - startTime, (err as Error).message);
    } catch { /* best-effort */ }

    const errMsg = (err as Error).message ?? 'Unknown error';
    const errStack = (err as Error).stack ?? '';
    console.error('[google-ads-sync] Sync failed:', errMsg, errStack);
    return NextResponse.json(
      {
        error: 'Google Ads sync failed',
        detail: errMsg,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
