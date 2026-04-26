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

// Approved competitor list — must match nsd-integrations/integrations/ahrefs/ahrefsConfig.ts
// Branded marketplaces (amazon, etsy, vistaprint, ebay) are explicitly excluded —
// they are not real competitors for neon signs and produce noise in the gap analysis.
const ALLOWED_COMPETITORS = [
  'everythingneon.com',
  'businesssignsandmore.com',
  'kingsofneon.com',
  'crazyneon.com',
  'luckyneon.com',
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

    const { rows } = await p.query(`
      SELECT g.*, kc.primary_keyword as cluster_keyword
      FROM analytics.seo_competitor_gap g
      LEFT JOIN analytics.keyword_clusters kc ON kc.id = g.cluster_id
      ${where}
      ORDER BY g.opportunity_score DESC NULLS LAST
      LIMIT 100
    `, params);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/competitor-gaps] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load competitor gaps' }, { status: 500 });
  }
}
