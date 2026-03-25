import { NextRequest, NextResponse } from 'next/server';
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
    const { rows } = await p.query(`
      SELECT
        el.id,
        el.target_url,
        el.execution_type,
        el.executed_by,
        el.executed_at,
        el.baseline_position,
        el.baseline_impressions,
        el.measured_at_14d,
        el.measured_at_30d,
        el.measured_at_90d
      FROM analytics.seo_execution_log el
      ORDER BY el.executed_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/execution-log] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load execution log' }, { status: 500 });
  }
}
