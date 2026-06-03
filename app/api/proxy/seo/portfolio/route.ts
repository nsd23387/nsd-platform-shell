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

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

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
}

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { rows } = await pool.query(`
      WITH ts_dups AS (
        -- Trailing-slash / canonicalization duplicates: the same normalized path
        -- resolves to more than one distinct inventory URL. These need a
        -- redirect/canonical fix and form the "Fix" bucket.
        SELECT rtrim(regexp_replace(lower(url), '^https?://(www\\.)?', ''), '/') AS norm_path
        FROM analytics.seo_page_inventory
        GROUP BY 1
        HAVING COUNT(DISTINCT url) > 1
      ),
      pq AS (
        -- Per (page, query) demand from the GSC query×page rollup.
        SELECT regexp_replace(page_url, '^https?://[^/]+', '') AS path,
               query,
               SUM(impressions) AS qi,
               ROUND(AVG(avg_position), 1) AS qp
        FROM analytics.metrics_search_console_query_page_daily
        GROUP BY 1, 2
      ),
      top AS (
        -- The single highest-demand query for each page, with its average
        -- position. This (NOT gsc_best_position) is the governed position.
        SELECT DISTINCT ON (path) path,
               query AS topq,
               qi,
               ROUND(qp, 0) AS qpos
        FROM pq
        ORDER BY path, qi DESC
      ),
      inv AS (
        SELECT
          i.url,
          i.content_type,
          i.status_class,
          i.gsc_impressions,
          i.gsc_top_query,
          i.gsc_best_position,
          i.has_rankmath_redirect,
          i.rankmath_redirect_target,
          i.http_status,
          rtrim(regexp_replace(lower(i.url), '^https?://(www\\.)?', ''), '/') AS norm_path,
          regexp_replace(i.url, '^https?://[^/]+', '') AS path
        FROM analytics.seo_page_inventory i
        WHERE i.status_class IN ('canonical_live', 'lost', 'pending_verification')
      )
      SELECT
        inv.url,
        inv.content_type,
        inv.status_class,
        inv.gsc_impressions,
        inv.gsc_top_query,
        inv.gsc_best_position::numeric AS gsc_best_position,
        t.topq AS top_query,
        t.qi::bigint AS top_q_impr,
        t.qpos::int AS top_q_pos,
        inv.has_rankmath_redirect,
        inv.rankmath_redirect_target,
        inv.http_status,
        (inv.status_class = 'pending_verification') AS needs_verify,
        CASE
          WHEN inv.status_class = 'lost' THEN 'lost'
          -- pending_verification pages are never confident targets: they are
          -- shown in Strategic with a needs_verify flag, never as Wins/Fix.
          WHEN inv.status_class = 'pending_verification' THEN 'strategic'
          WHEN d.norm_path IS NOT NULL THEN 'fix'
          -- Win = top-query avg position in 1..30 (NOT best-ever position).
          WHEN t.qpos IS NOT NULL
               AND t.qpos BETWEEN 1 AND 30 THEN 'win'
          ELSE 'strategic'
        END AS bucket,
        COALESCE(eqi.search_volume, eqi.ahrefs_search_volume) AS kw_volume,
        COALESCE(eqi.keyword_difficulty, eqi.ahrefs_keyword_difficulty)::numeric AS kw_difficulty,
        COALESCE(eqi.cpc, eqi.ahrefs_cpc)::numeric AS kw_cpc,
        COALESCE(eqi.is_competitor_only, false) AS is_competitor_only
      FROM inv
      LEFT JOIN ts_dups d ON d.norm_path = inv.norm_path
      LEFT JOIN top t ON t.path = inv.path
      LEFT JOIN analytics.external_query_intelligence eqi
        ON eqi.normalized_query = lower(trim(inv.gsc_top_query))
      ORDER BY inv.gsc_impressions DESC NULLS LAST
    `);

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
      };
    });

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/portfolio] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 });
  }
}
