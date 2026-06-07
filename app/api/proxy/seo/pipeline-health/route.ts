export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export async function GET() {
  try {
    const [runsResult, rawResult] = await Promise.all([
      pool.query(`
        SELECT id, status, started_at, records_processed, error_message, metadata
        FROM analytics.ingestion_runs
        WHERE source = 'search_console'
        ORDER BY started_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT MAX(occurred_at::date)::text AS last_date
        FROM analytics.raw_search_console
      `),
    ]);

    const runs = runsResult.rows as Array<{
      id: string;
      status: string;
      started_at: string;
      records_processed: number;
      error_message: string | null;
      metadata: Record<string, unknown> | null;
    }>;

    const lastRun = runs[0] ?? null;
    const lastSuccessfulRun =
      runs.find((r) => r.status === 'completed' && r.records_processed > 0) ?? null;
    const lastFailedRun =
      runs.find((r) => r.status === 'failed' || r.error_message) ?? null;

    const rawDataLastDate: string | null = rawResult.rows[0]?.last_date ?? null;

    let daysBehind: number | null = null;
    if (rawDataLastDate) {
      const lastDate = new Date(rawDataLastDate + 'T00:00:00Z');
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      daysBehind = Math.round(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    // Lag-aware, deterministic thresholds. Google Search Console finalizes data
    // ~2-3 days late, and a weekend gap pushes the effective lag to ~4 days even
    // when ingestion is perfectly healthy. The previous "warning > 3 days" band
    // sat right inside that normal lag window, so the badge flipped between
    // healthy and warning day-to-day on a healthy pipeline. Widen "healthy" to
    // absorb the normal lag (<= 4 days) so "warning" only fires when data is
    // genuinely late, and the same days_behind always maps to the same status.
    let status: 'healthy' | 'warning' | 'stale';
    if (daysBehind === null || daysBehind > 7) {
      status = 'stale';
    } else if (daysBehind > 4) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return NextResponse.json({
      status,
      last_run_at: lastRun?.started_at ?? null,
      last_successful_run: lastSuccessfulRun?.started_at ?? null,
      last_error: lastFailedRun?.error_message ?? null,
      raw_data_last_date: rawDataLastDate,
      days_behind: daysBehind,
      recent_runs: runs.slice(0, 5).map((r) => ({
        id: r.id,
        status: r.status,
        started_at: r.started_at,
        records_processed: r.records_processed,
        date_range: r.metadata?.date_range ?? null,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
