import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { Pool } from 'pg';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool && databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 3, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
  }
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

export async function GET(req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const p = getPool();
    const status = req.nextUrl.searchParams.get('status');
    const where = status ? 'WHERE status = $1' : '';
    const params = status ? [status] : [];
    const { rows } = await p.query(`SELECT * FROM analytics.seo_schema_markup ${where} ORDER BY created_at DESC LIMIT 100`, params);
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/schema] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load schema markup' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const body = await req.json();
    const p = getPool();
    if (body.action === 'update-status' && body.id && body.status) {
      await p.query(`UPDATE analytics.seo_schema_markup SET status = $2 WHERE id = $1`, [body.id, body.status]);
      return NextResponse.json({ data: { id: body.id, status: body.status } });
    }
    if (body.action === 'apply' && body.id) {
      await p.query(`UPDATE analytics.seo_schema_markup SET status = 'applied', applied_at = NOW() WHERE id = $1 AND status = 'ready'`, [body.id]);
      return NextResponse.json({ data: { id: body.id, status: 'applied' } });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[seo/schema] POST Error:', err.message);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
