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
    // Migrated 2026-05-12: read from analytics.seo_action instead of the
    // legacy seo_execution_log. seo_action.gsc_position/gsc_impressions are
    // the at-creation baselines; mutation_type is the equivalent of
    // execution_type. measured_at_90d isn't tracked in seo_action — null.
    const p = getPool();
    const { rows } = await p.query(`
      SELECT
        sa.id,
        sa.target_url,
        sa.mutation_type AS execution_type,
        sa.executed_by,
        sa.executed_at,
        sa.gsc_position::numeric AS baseline_position,
        sa.gsc_impressions AS baseline_impressions,
        sa.measured_at_14d,
        sa.measured_at_30d,
        NULL::timestamptz AS measured_at_90d
      FROM analytics.seo_action sa
      WHERE sa.executed_at IS NOT NULL
      ORDER BY sa.executed_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/execution-log] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load execution log' }, { status: 500 });
  }
}
