/**
 * GA4 Sync API Route — Manual Trigger
 *
 * POST /api/sync/ga4
 *
 * Triggers a full GA4 data sync: page engagement metrics, actionable events,
 * and device/country session summaries. Writes to analytics.metrics_page_engagement_daily,
 * analytics.raw_ga4_events, and analytics.ingestion_runs.
 *
 * GOVERNANCE: This is a WRITE endpoint. It modifies three analytics tables.
 * Protected by SYNC_SECRET bearer token.
 *
 * Request body (optional):
 *   { startDate?: string, endDate?: string }
 *   Defaults to last 30 days if omitted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import {
  syncPageEngagement,
  syncGA4Events,
  syncDeviceCountry,
  syncChannelSessions,
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
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }

  const pool = getPool();
  const startTime = Date.now();

  try {
    const runId = await createIngestionRun(pool, 'ga4-api', 'ga4-sync');

    const [engagementResult, eventsResult, deviceResult] = await Promise.all([
      syncPageEngagement(pool, startDate, endDate),
      syncGA4Events(pool, startDate, endDate, runId),
      syncDeviceCountry(pool, startDate, endDate, runId),
    ]);

    const channelResult = await syncChannelSessions(pool, startDate, endDate, runId);

    const totalRows =
      engagementResult.rows + eventsResult.rows + deviceResult.rows + channelResult.rows;
    const allErrors = [
      ...engagementResult.errors,
      ...eventsResult.errors,
      ...deviceResult.errors,
      ...channelResult.errors,
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
      page_engagement_rows: engagementResult.rows,
      ga4_event_rows: eventsResult.rows,
      device_country_rows: deviceResult.rows,
      channel_session_rows: channelResult.rows,
      total_rows: totalRows,
      errors: allErrors,
      duration_ms: durationMs,
      ingestion_run_id: runId,
    });
  } catch (err) {
    try {
      const failRunId = await createIngestionRun(pool, 'ga4-api', 'ga4-sync-error');
      await completeIngestionRun(pool, failRunId, 'failed', 0, 1, Date.now() - startTime, (err as Error).message);
    } catch { /* best-effort */ }

    return NextResponse.json(
      {
        error: 'GA4 sync failed',
        message: (err as Error).message,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
