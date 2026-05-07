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

    const [rowsResult, earliestResult] = await Promise.all([
      p.query(`
        SELECT
          ra.page_url,
          ra.keyword,
          ra.pre_period_revenue,
          ra.post_period_revenue,
          ra.revenue_delta,
          ra.confidence,
          ra.attribution_date,
          ra.recommendation_id
        FROM analytics.seo_revenue_attribution ra
        ORDER BY ra.attribution_date DESC, ra.revenue_delta DESC NULLS LAST
        LIMIT 100
      `).catch(() => ({ rows: [] as Record<string, unknown>[] })),
      p.query(`SELECT MIN(executed_at) AS earliest FROM analytics.seo_execution_log`).catch(() => ({ rows: [{ earliest: null }] })),
    ]);

    return NextResponse.json({ data: { rows: rowsResult.rows, earliest_execution: earliestResult.rows[0]?.earliest ?? null } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/attribution] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
