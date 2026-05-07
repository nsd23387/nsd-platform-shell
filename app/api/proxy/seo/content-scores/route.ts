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
        page_url,
        content_type,
        score_before,
        score_after,
        score_delta,
        accepted,
        generated_at
      FROM analytics.seo_content_score_log
      ORDER BY generated_at DESC
      LIMIT 100
    `).catch(() => ({ rows: [] as Record<string, unknown>[] }));

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/content-scores] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
