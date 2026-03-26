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

export async function GET(req: NextRequest) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const p = getPool();
    const gapType = req.nextUrl.searchParams.get('type');
    const status = req.nextUrl.searchParams.get('status');

    let where = 'WHERE 1=1';
    const params: string[] = [];

    if (gapType) {
      params.push(gapType);
      where += ` AND g.gap_type = $${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND g.status = $${params.length}`;
    }

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
