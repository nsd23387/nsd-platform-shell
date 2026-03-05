/**
 * Google Ads Sync Cron Route — Daily Automated Sync
 *
 * GET /api/cron/google-ads-sync
 *
 * Vercel Cron compatible endpoint.
 * Syncs the last 3 days of Google Ads data from BigQuery to handle late-arriving data.
 *
 * GOVERNANCE: This is a WRITE endpoint triggered by Vercel Cron.
 * Protected by CRON_SECRET (Vercel's built-in cron auth header).
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

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const startDate = formatDate(threeDaysAgo);
  const endDate = formatDate(now);

  const pool = getPool();
  const startTime = Date.now();

  try {
    const runId = await createIngestionRun(pool, 'google-ads-bq-cron', 'google-ads-daily-sync');

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
      total_rows: totalRows,
      campaign_rows: campaignResult.rows,
      search_term_rows: searchTermResult.rows,
      errors: allErrors,
      duration_ms: durationMs,
    });
  } catch (err) {
    try {
      const failRunId = await createIngestionRun(pool, 'google-ads-bq-cron', 'google-ads-daily-sync-error');
      await completeIngestionRun(pool, failRunId, 'failed', 0, 1, Date.now() - startTime, (err as Error).message);
    } catch { /* best-effort */ }

    return NextResponse.json(
      {
        error: 'Google Ads cron sync failed',
        message: (err as Error).message,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
