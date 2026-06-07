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
    const { rows } = await p.query(`
      SELECT
        c.candidate_id::text AS id,
        c.target_page_url AS target_url,
        c.mutation_type AS execution_type,
        analytics.seo_mutation_label(c.mutation_type) AS mutation_label,
        c.reviewer_id AS executed_by,
        COALESCE(o.published_at, c.published_at, c.execution_timestamp) AS executed_at,
        NULL::numeric AS baseline_position,
        NULL::bigint AS baseline_impressions,
        o.decided_at AS measured_at_14d,
        o.decided_at AS measured_at_30d,
        NULL::timestamptz AS measured_at_90d
      FROM analytics.seo_execution_candidate c
      LEFT JOIN analytics.seo_published_outcome o
        ON o.candidate_id = c.candidate_id
      WHERE c.execution_status IN ('published', 'draft_applied', 'rolled_back', 'failed')
        AND COALESCE(o.published_at, c.published_at, c.execution_timestamp) IS NOT NULL
      ORDER BY COALESCE(o.published_at, c.published_at, c.execution_timestamp) DESC
      LIMIT 100
    `);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/execution-log] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load execution log' }, { status: 500 });
  }
}
