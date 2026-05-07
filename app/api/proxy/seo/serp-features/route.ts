export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool && databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

export async function GET() {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const p = getPool();
    const { rows } = await p.query(`
      SELECT
        sf.keyword,
        sf.feature_type,
        sf.detected_at,
        CASE WHEN r.id IS NOT NULL THEN true ELSE false END AS has_schema_rec
      FROM analytics.seo_serp_features sf
      LEFT JOIN analytics.seo_recommendations r
        ON r.primary_keyword = sf.keyword
        AND r.rec_type = 'schema_markup'
        AND r.status NOT IN ('rejected', 'applied')
      ORDER BY sf.detected_at DESC
    `).catch(() => ({ rows: [] as Record<string, unknown>[] }));

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/serp-features] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
