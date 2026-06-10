import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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

// Canonical neon competitor set — the only domains present in
// analytics.seo_competitor_gap that are genuine *neon* shops. Generic-sign
// printers and marketplaces (businesssignsandmore.com, vistaprint.com,
// amazon.com, etsy.com) are intentionally excluded per the neon-only governance
// rule (see replit.md): they attract the wrong customers for a neon brand.
const ALLOWED_COMPETITORS = [
  'everythingneon.com',
  'luckyneon.com',
  'crazyneon.com',
  'kingsofneon.com',
  'neonmfg.com',
];

// Producer contract: 10 configured competitors feed the raw table; the Command
// Center governance layer allows only the 5 neon shops above as actionable intel.
const CONFIGURED_COMPETITOR_COUNT = 10;

// Branded keyword patterns to exclude — these are competitor brand searches that
// NSD will never rank for and shouldn't target.
const BRANDED_KEYWORD_PATTERNS = [
  'amazon%', 'etsy%', 'esty%', 'ebay%',
  'vistaprint%', 'vista print%', 'vista',
  'prime video%', 'prime%', 'print',
  'business cards', 'business card',
  'custom stickers',
  '% phone number%', '% jobs%', '% music%', '% login%', '% coupon%',
];

export async function GET(req: NextRequest) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const p = getPool();
    const window = parseSeoWindow(req);
    const gapType = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');

    let where = 'WHERE 1=1';
    const params: any[] = [window.days, window.start, window.end];

    if (gapType) {
      params.push(gapType);
      where += ` AND g.gap_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND g.status = $${params.length}`;
    }

    // Only include allowed competitors. Match competitor_url containing any allowed domain
    // (handles formats like "https://everythingneon.com" or "everythingneon.com/page").
    const competitorClauses: string[] = [];
    for (const domain of ALLOWED_COMPETITORS) {
      params.push(`%${domain}%`);
      competitorClauses.push(`g.competitor_url ILIKE $${params.length}`);
    }
    where += ` AND (${competitorClauses.join(' OR ')})`;

    // Exclude branded keyword patterns (amazon, etsy, vistaprint, etc.)
    for (const pattern of BRANDED_KEYWORD_PATTERNS) {
      params.push(pattern);
      where += ` AND COALESCE(LOWER(g.keyword), '') NOT ILIKE $${params.length}`;
    }

    // Skip ultra-short/single-character queries (low intent, no ranking potential)
    where += ` AND LENGTH(COALESCE(g.keyword, '')) >= 4`;

    const [totalResult, rawCompetitorsResult, filteredResult, statusResult] = await Promise.all([
      p.query(`SELECT COUNT(*)::int AS count FROM analytics.seo_competitor_gap`),
      p.query(`
        SELECT COUNT(DISTINCT lower(regexp_replace(regexp_replace(competitor_url, '^https?://(www\\.)?', ''), '/.*$', '')))::int AS count
        FROM analytics.seo_competitor_gap
        WHERE competitor_url IS NOT NULL AND btrim(competitor_url) <> ''
      `),
      p.query(`
        SELECT COUNT(*)::int AS count
        FROM analytics.seo_command_center_competitor_gaps($1::int, $2::date, $3::date) g
        ${where}
      `, params),
      p.query(`
        SELECT g.status, COUNT(*)::int AS count
        FROM analytics.seo_command_center_competitor_gaps($1::int, $2::date, $3::date) g
        ${where}
        GROUP BY g.status
      `, params),
    ]);

    const { rows } = await p.query(`
      SELECT
        g.id,
        g.competitor_url,
        g.gap_type,
        g.keyword,
        g.competitor_ranking_position,
        COALESCE(g.our_ranking_position_window, g.our_ranking_position)::numeric AS our_ranking_position,
        g.our_ranking_position_window,
        g.competitor_page_url,
        g.competitor_page_title,
        g.content_gap_notes,
        g.cluster_id,
        g.cluster_keyword,
        COALESCE(g.opportunity_score, null) AS opportunity_score,
        g.keyword_difficulty::int AS keyword_difficulty,
        g.search_volume::int AS search_volume,
        g.kw_cpc::numeric AS cpc,
        g.reference_metrics_source,
        g.reference_metrics_observed_at,
        g.gsc_window_start,
        g.gsc_window_end,
        g.gsc_available_start,
        g.gsc_available_end,
        g.status,
        g.dismissed_reason,
        g.discovered_at
      FROM analytics.seo_command_center_competitor_gaps($1::int, $2::date, $3::date) g
      ${where}
      ORDER BY g.opportunity_score DESC NULLS LAST
    `, params);

    const statusCounts = Object.fromEntries(
      statusResult.rows.map((r) => [r.status ?? 'unknown', Number(r.count ?? 0)])
    );

    return NextResponse.json({
      data: rows,
      meta: {
        total_count: Number(totalResult.rows[0]?.count ?? 0),
        filtered_count: Number(filteredResult.rows[0]?.count ?? 0),
        returned_count: rows.length,
        governed_competitors_count: ALLOWED_COMPETITORS.length,
        raw_competitors_count: Number(rawCompetitorsResult.rows[0]?.count ?? 0),
        configured_competitors_count: CONFIGURED_COMPETITOR_COUNT,
        status_counts: statusCounts,
        limit: null,
        filter_note: 'Filtered to the governed competitor allow-list, excluding competitor-branded/low-intent queries and keywords under 4 characters.',
      },
    });
  } catch (err: any) {
    console.error('[seo/competitor-gaps] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load competitor gaps' }, { status: 500 });
  }
}
