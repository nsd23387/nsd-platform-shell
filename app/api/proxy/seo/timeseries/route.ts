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
import { parseSeoWindow } from '../_window';

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

export async function GET(req: NextRequest) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const window = parseSeoWindow(req);

  try {
    const p = getPool();
    const { rows } = await p.query(
      `
      WITH w AS (
        SELECT * FROM analytics.seo_command_center_gsc_window($1::int, $2::date, $3::date)
      )
      SELECT
        m.date::text AS date,
        m.clicks::bigint AS clicks,
        m.impressions::bigint AS impressions,
        COALESCE(m.ctr, 0)::numeric(8,4) AS ctr,
        m.avg_position::numeric(6,2) AS avg_position,
        w.start_date::text AS window_start,
        w.end_date::text AS window_end,
        w.available_start::text AS available_start,
        w.available_end::text AS available_end,
        w.range_days::int AS range_days
      FROM analytics.metrics_search_console_daily m
      CROSS JOIN w
      WHERE m.date BETWEEN w.start_date AND w.end_date
      ORDER BY m.date ASC
      `,
      [window.days, window.start, window.end],
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
      range_days: rows[0]?.range_days ?? window.days,
      start_date: series[0]?.date ?? null,
      end_date: series[series.length - 1]?.date ?? null,
      gsc_window_start: rows[0]?.window_start ?? null,
      gsc_window_end: rows[0]?.window_end ?? null,
      gsc_available_start: rows[0]?.available_start ?? null,
      gsc_available_end: rows[0]?.available_end ?? null,
      series,
      summary: { total_clicks, total_impressions, half_over_half_delta_pct },
    });
  } catch (err: any) {
    console.error('[seo/timeseries] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load timeseries' }, { status: 500 });
  }
}
