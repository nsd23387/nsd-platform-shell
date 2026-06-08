// =============================================================================
// GET /api/proxy/seo/portfolio — Level-1 page portfolio (governed)
// Governance lock: READ-ONLY. Parameterized queries only, no string
// interpolation of user input, no writes. The ONLY surfaced optimization
// targets are status_class='canonical_live'. 'lost' pages are returned solely
// for the restore/redirect (Lost) queue; 'pending_verification' are returned
// with a needs_verify flag and are never confident targets; 'excluded' pages
// are never returned. One backing source: analytics.seo_page_inventory, joined
// to GSC demand (already on inventory) + DataForSEO keyword value
// (analytics.external_query_intelligence). Do not read staging/legacy tables.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { parseSeoWindow } from '../_window';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

export interface PortfolioPageRow {
  url: string;
  content_type: string | null;
  status_class: string;
  bucket: 'lost' | 'win' | 'strategic' | 'fix';
  needs_verify: boolean;
  gsc_impressions: number | null;
  gsc_top_query: string | null;
  gsc_best_position: number | null;
  // Top-query average position (NOT all-time best). This is the governed
  // "position" surfaced in the UI and used for bucketing: best-ever position
  // is misleading (a brand term can pin a page at pos 1 while its highest-
  // demand query ranks ~46). top_query / top_q_impr describe the query the
  // position belongs to. Source: analytics.metrics_search_console_query_page_daily.
  top_query: string | null;
  top_q_impr: number | null;
  top_q_pos: number | null;
  has_rankmath_redirect: boolean;
  rankmath_redirect_target: string | null;
  http_status: number | null;
  kw_volume: number | null;
  kw_difficulty: number | null;
  kw_cpc: number | null;
  has_dataforseo: boolean;
  is_competitor_only: boolean;
  reference_metrics_source: string | null;
  reference_metrics_observed_at: string | null;
  gsc_window_start: string | null;
  gsc_window_end: string | null;
  gsc_available_start: string | null;
  gsc_available_end: string | null;
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const window = parseSeoWindow(req);
    const { rows } = await pool.query(
      `SELECT * FROM analytics.seo_command_center_portfolio($1::int, $2::date, $3::date)`,
      [window.days, window.start, window.end],
    );

    const data: PortfolioPageRow[] = rows.map((r) => {
      const vol = r.kw_volume != null ? Number(r.kw_volume) : null;
      const kd = r.kw_difficulty != null ? Number(r.kw_difficulty) : null;
      const cpc = r.kw_cpc != null ? Number(r.kw_cpc) : null;
      return {
        url: r.url,
        content_type: r.content_type,
        status_class: r.status_class,
        bucket: r.bucket,
        needs_verify: r.needs_verify,
        gsc_impressions: r.gsc_impressions != null ? Number(r.gsc_impressions) : null,
        gsc_top_query: r.gsc_top_query,
        gsc_best_position: r.gsc_best_position != null ? Number(r.gsc_best_position) : null,
        top_query: r.top_query ?? null,
        top_q_impr: r.top_q_impr != null ? Number(r.top_q_impr) : null,
        top_q_pos: r.top_q_pos != null ? Number(r.top_q_pos) : null,
        has_rankmath_redirect: r.has_rankmath_redirect,
        rankmath_redirect_target: r.rankmath_redirect_target,
        http_status: r.http_status != null ? Number(r.http_status) : null,
        kw_volume: vol,
        kw_difficulty: kd,
        kw_cpc: cpc,
        has_dataforseo: vol != null,
        is_competitor_only: r.is_competitor_only,
        reference_metrics_source: r.reference_metrics_source ?? null,
        reference_metrics_observed_at: r.reference_metrics_observed_at ?? null,
        gsc_window_start: r.gsc_window_start ?? null,
        gsc_window_end: r.gsc_window_end ?? null,
        gsc_available_start: r.gsc_available_start ?? null,
        gsc_available_end: r.gsc_available_end ?? null,
      };
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/portfolio] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 });
  }
}
