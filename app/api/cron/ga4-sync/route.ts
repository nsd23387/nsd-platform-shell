/**
 * GA4 Sync Cron Route — Daily Automated Sync
 *
 * GET /api/cron/ga4-sync
 *
 * Vercel Cron compatible endpoint. Runs daily at 06:00 UTC.
 * Syncs the last 3 days of GA4 data to handle late-arriving data.
 *
 * GOVERNANCE: This is a WRITE endpoint triggered by Vercel Cron.
 * Protected by CRON_SECRET (Vercel's built-in cron auth header).
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  syncPageEngagement,
  syncGA4Events,
  syncDeviceCountry,
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
    const runId = await createIngestionRun(pool, 'ga4-api-cron', 'ga4-daily-sync');

    const [engagementResult, eventsResult, deviceResult] = await Promise.all([
      syncPageEngagement(pool, startDate, endDate),
      syncGA4Events(pool, startDate, endDate, runId),
      syncDeviceCountry(pool, startDate, endDate, runId),
    ]);

    const totalRows =
      engagementResult.rows + eventsResult.rows + deviceResult.rows;
    const allErrors = [
      ...engagementResult.errors,
      ...eventsResult.errors,
      ...deviceResult.errors,
    ];

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
      page_engagement_rows: engagementResult.rows,
      ga4_event_rows: eventsResult.rows,
      device_country_rows: deviceResult.rows,
      errors: allErrors,
      duration_ms: durationMs,
    });
  } catch (err) {
    try {
      const failRunId = await createIngestionRun(pool, 'ga4-api-cron', 'ga4-daily-sync-error');
      await completeIngestionRun(pool, failRunId, 'failed', 0, 1, Date.now() - startTime, (err as Error).message);
    } catch { /* best-effort */ }

    return NextResponse.json(
      {
        error: 'GA4 cron sync failed',
        message: (err as Error).message,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
