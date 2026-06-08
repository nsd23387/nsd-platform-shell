// =============================================================================
// GET /api/proxy/seo/offpage[?url=...] — Lane 3 off-page authority briefs
// Governance lock: READ-ONLY. Parameterized queries only, no writes. Surfaces
// analytics.seo_offpage_brief — the engine's authority-bound pages where
// on-page is necessary but not sufficient and backlinks / digital PR are
// required. Real GSC position + impressions + DataForSEO value only; this
// endpoint never fabricates link projections and never mutates. Optional ?url=
// filters to a single page using the same normalized-url match as the dossier.
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

function normUrl(u: string): string {
  return u
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const rawUrl = req.nextUrl.searchParams.get('url');
  const norm = rawUrl ? normUrl(rawUrl) : null;
  const window = parseSeoWindow(req);

  try {
    const { rows } = norm
      ? await pool.query(
          `SELECT page_url, target_keyword,
                  search_volume::numeric AS search_volume,
                  current_position::numeric AS current_position,
                  impressions::numeric AS impressions,
                  keyword_difficulty::numeric AS keyword_difficulty,
                  reason, generated_at, reference_metrics_source,
                  reference_metrics_observed_at, gsc_window_start,
                  gsc_window_end, gsc_available_start, gsc_available_end
           FROM analytics.seo_command_center_offpage_brief($2::int, $3::date, $4::date)
           WHERE rtrim(regexp_replace(lower(page_url), '^https?://(www\\.)?', ''), '/') = $1
           ORDER BY impressions DESC NULLS LAST`,
          [norm, window.days, window.start, window.end],
        )
      : await pool.query(
          `SELECT page_url, target_keyword,
                  search_volume::numeric AS search_volume,
                  current_position::numeric AS current_position,
                  impressions::numeric AS impressions,
                  keyword_difficulty::numeric AS keyword_difficulty,
                  reason, generated_at, reference_metrics_source,
                  reference_metrics_observed_at, gsc_window_start,
                  gsc_window_end, gsc_available_start, gsc_available_end
           FROM analytics.seo_command_center_offpage_brief($1::int, $2::date, $3::date)
           ORDER BY impressions DESC NULLS LAST
           LIMIT 100`,
          [window.days, window.start, window.end],
        );

    const briefs = rows.map((r) => ({
      page_url: r.page_url,
      target_keyword: r.target_keyword,
      search_volume: r.search_volume != null ? Number(r.search_volume) : null,
      current_position: r.current_position != null ? Number(r.current_position) : null,
      impressions: r.impressions != null ? Number(r.impressions) : null,
      keyword_difficulty: r.keyword_difficulty != null ? Number(r.keyword_difficulty) : null,
      reason: r.reason,
      generated_at: r.generated_at,
      reference_metrics_source: r.reference_metrics_source ?? null,
      reference_metrics_observed_at: r.reference_metrics_observed_at ?? null,
      gsc_window_start: r.gsc_window_start ?? null,
      gsc_window_end: r.gsc_window_end ?? null,
      gsc_available_start: r.gsc_available_start ?? null,
      gsc_available_end: r.gsc_available_end ?? null,
    }));

    return NextResponse.json({ data: briefs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/offpage] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load off-page briefs' }, { status: 500 });
  }
}
