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

// Phase 8 competitor set — matches competitorGapJob.ts in nsd-integrations
const ALLOWED_COMPETITORS = [
  'echoneon.com',
  'neonmfg.com',
  'voodooneon.com',
  'neonpros.com',
  'signs.com',
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

    const [totalResult, filteredResult, statusResult] = await Promise.all([
      p.query(`SELECT COUNT(*)::int AS count FROM analytics.seo_competitor_gap`),
      p.query(`
        SELECT COUNT(*)::int AS count
        FROM analytics.seo_competitor_gap g
        ${where}
      `, params),
      p.query(`
        SELECT g.status, COUNT(*)::int AS count
        FROM analytics.seo_competitor_gap g
        ${where}
        GROUP BY g.status
      `, params),
    ]);

    // Note: seo_competitor_gap (post-Ahrefs source) does not carry search_volume
    // or keyword_difficulty — those came from Ahrefs. We expose nulls so callers
    // can degrade gracefully without breaking their type contracts.
    const { rows } = await p.query(`
      SELECT
        g.*,
        g.dismissed_reason,
        COALESCE(g.opportunity_score, null) AS opportunity_score,
        NULL::int AS keyword_difficulty,
        NULL::int AS search_volume,
        kc.primary_keyword AS cluster_keyword
      FROM analytics.seo_competitor_gap g
      LEFT JOIN analytics.keyword_clusters kc ON kc.id = g.cluster_id
      ${where}
      ORDER BY g.opportunity_score DESC NULLS LAST
      LIMIT 100
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
        status_counts: statusCounts,
        limit: 100,
        filter_note: 'Filtered to the governed competitor allow-list, excluding competitor-branded/low-intent queries and keywords under 4 characters.',
      },
    });
  } catch (err: any) {
    console.error('[seo/competitor-gaps] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load competitor gaps' }, { status: 500 });
  }
}
