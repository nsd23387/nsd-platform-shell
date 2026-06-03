import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
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
    const gapType = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');

    let where = 'WHERE 1=1';
    const params: any[] = [];

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

    // seo_competitor_gap (post-Ahrefs source) does not carry search_volume /
    // keyword_difficulty / cpc. We join analytics.external_query_intelligence on
    // the normalized query to populate them where measured, leaving null only
    // when the keyword genuinely has no intelligence row. The dedup subquery
    // (DISTINCT ON normalized_query, newest metrics first) guards against any
    // row fan-out so the gap count stays exact.
    const { rows } = await p.query(`
      SELECT
        g.*,
        COALESCE(g.opportunity_score, null) AS opportunity_score,
        e.keyword_difficulty::int AS keyword_difficulty,
        e.search_volume::int     AS search_volume,
        e.cpc::numeric           AS cpc,
        kc.primary_keyword       AS cluster_keyword
      FROM analytics.seo_competitor_gap g
      LEFT JOIN analytics.keyword_clusters kc ON kc.id = g.cluster_id
      LEFT JOIN (
        SELECT DISTINCT ON (LOWER(TRIM(normalized_query)))
          LOWER(TRIM(normalized_query)) AS nq,
          search_volume, keyword_difficulty, cpc
        FROM analytics.external_query_intelligence
        WHERE normalized_query IS NOT NULL
        ORDER BY LOWER(TRIM(normalized_query)), metrics_observed_at DESC NULLS LAST
      ) e ON e.nq = LOWER(TRIM(g.keyword))
      ${where}
      ORDER BY g.opportunity_score DESC NULLS LAST
    `, params);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/competitor-gaps] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load competitor gaps' }, { status: 500 });
  }
}
