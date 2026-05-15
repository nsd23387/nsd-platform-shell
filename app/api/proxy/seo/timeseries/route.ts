/**
 * GET /api/proxy/seo/timeseries?days=N
 *
 * Returns daily organic clicks + impressions for the last N days.
 * Sourced from analytics.metrics_search_console_daily (GSC).
 *
 * Note: This is the post-Ahrefs data path. No Ahrefs dependency.
 *
 * Response:
 * {
 *   range_days: number,
 *   start_date: string,
 *   end_date: string,
 *   series: { date: string, clicks: number, impressions: number, ctr: number, avg_position: number | null }[],
 *   summary: {
 *     total_clicks: number,
 *     total_impressions: number,
 *     half_over_half_delta_pct: number | null,
 *   }
 * }
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool && databaseUrl) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

const ALLOWED_RANGES = new Set([7, 14, 30, 60, 90]);

export async function GET(req: NextRequest) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const raw = Number(req.nextUrl.searchParams.get('days') ?? '30');
  // Clamp custom values into a sane window: [7, 90]
  let days = Number.isFinite(raw) ? Math.round(raw) : 30;
  if (!ALLOWED_RANGES.has(days)) {
    days = Math.max(7, Math.min(90, days));
  }

  try {
    const p = getPool();
    const { rows } = await p.query(
      `
      SELECT
        date::text AS date,
        clicks::bigint AS clicks,
        impressions::bigint AS impressions,
        COALESCE(ctr, 0)::numeric(8,4) AS ctr,
        avg_position::numeric(6,2) AS avg_position
      FROM analytics.metrics_search_console_daily
      WHERE date >= (CURRENT_DATE - $1::int)
      ORDER BY date ASC
      `,
      [days],
    );

    const series = rows.map((r) => ({
      date: r.date as string,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      ctr: Number(r.ctr),
      avg_position: r.avg_position == null ? null : Number(r.avg_position),
    }));

    const total_clicks = series.reduce((s, d) => s + d.clicks, 0);
    const total_impressions = series.reduce((s, d) => s + d.impressions, 0);

    let half_over_half_delta_pct: number | null = null;
    if (series.length >= 2) {
      const half = Math.floor(series.length / 2);
      const prior = series.slice(0, half).reduce((s, d) => s + d.clicks, 0);
      const recent = series.slice(half).reduce((s, d) => s + d.clicks, 0);
      half_over_half_delta_pct = prior === 0 ? null : ((recent - prior) / prior) * 100;
    }

    return NextResponse.json({
      range_days: days,
      start_date: series[0]?.date ?? null,
      end_date: series[series.length - 1]?.date ?? null,
      series,
      summary: { total_clicks, total_impressions, half_over_half_delta_pct },
    });
  } catch (err: any) {
    console.error('[seo/timeseries] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load timeseries' }, { status: 500 });
  }
}
