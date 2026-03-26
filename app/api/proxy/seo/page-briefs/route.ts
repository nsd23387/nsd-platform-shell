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
    const status = req.nextUrl.searchParams.get('status');
    const where = status ? `WHERE b.status = $1` : '';
    const params = status ? [status] : [];

    const { rows } = await p.query(`
      SELECT b.*, kc.primary_keyword as cluster_keyword
      FROM analytics.seo_page_brief b
      LEFT JOIN analytics.keyword_clusters kc ON kc.id = b.cluster_id
      ${where}
      ORDER BY b.created_at DESC
      LIMIT 100
    `, params);

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/page-briefs] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load page briefs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { action, briefId, status: newStatus, targetKeyword, clusterId, triggerSource } = body;

    const p = getPool();

    if (action === 'generate') {
      // Insert a new brief directly (simplified — production should call ODS API)
      const { rows } = await p.query(`
        INSERT INTO analytics.seo_page_brief (
          cluster_id, target_keyword, trigger_source, status
        ) VALUES ($1, $2, $3, 'draft')
        RETURNING id
      `, [clusterId || null, targetKeyword, triggerSource || 'manual']);

      return NextResponse.json({ data: { briefId: rows[0].id } });
    }

    if (action === 'update-status' && briefId && newStatus) {
      await p.query(
        `UPDATE analytics.seo_page_brief SET status = $2 WHERE id = $1`,
        [briefId, newStatus],
      );
      return NextResponse.json({ data: { briefId, status: newStatus } });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[seo/page-briefs] POST Error:', err.message);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
