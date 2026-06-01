/**
 * GET /api/proxy/seo/executions
 *
 * Minimal read used by the SEO nav to decide whether to show the "Results" area:
 * it stays hidden until at least one candidate has actually executed. Read-only.
 */

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
  if (!databaseUrl) return NextResponse.json({ data: { executed: 0 } });
  try {
    const { rows } = await getPool().query(
      `SELECT count(*)::int AS executed
         FROM analytics.seo_execution_candidate
        WHERE execution_status = 'applied' OR execution_timestamp IS NOT NULL`,
    );
    return NextResponse.json({ data: { executed: rows[0]?.executed ?? 0 } });
  } catch (err) {
    console.error('[seo/executions] query failed:', (err as Error).message);
    return NextResponse.json({ data: { executed: 0 } });
  }
}
