import { NextRequest, NextResponse } from 'next/server';
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

const TABLE_MAP: Record<string, string> = {
  decay: 'analytics.seo_decay_signal',
  cannibalization: 'analytics.seo_cannibalization_signal',
  'topical-gaps': 'analytics.seo_topical_authority_gap',
};

const ORDER_MAP: Record<string, string> = {
  decay: 'decay_score DESC NULLS LAST',
  cannibalization: 'overlap_score DESC NULLS LAST',
  'topical-gaps': 'opportunity_score DESC NULLS LAST',
};

export async function GET(req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const p = getPool();
    const type = req.nextUrl.searchParams.get('type') || 'decay';
    const status = req.nextUrl.searchParams.get('status');
    const confidence = req.nextUrl.searchParams.get('confidence');

    const table = TABLE_MAP[type];
    if (!table) return NextResponse.json({ error: `Unknown signal type: ${type}` }, { status: 400 });

    let where = 'WHERE 1=1';
    const params: string[] = [];
    if (status) { params.push(status); where += ` AND status = $${params.length}`; }
    if (confidence && type === 'cannibalization') { params.push(confidence); where += ` AND canonical_confidence = $${params.length}`; }

    const order = ORDER_MAP[type] || 'detected_at DESC';
    const { rows } = await p.query(`SELECT * FROM ${table} ${where} ORDER BY ${order} LIMIT 100`, params);
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/signals] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load signals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  try {
    const body = await req.json();
    const p = getPool();
    if (body.action === 'update-status' && body.signalType && body.id && body.status) {
      const table = TABLE_MAP[body.signalType];
      if (!table) return NextResponse.json({ error: `Unknown signal type: ${body.signalType}` }, { status: 400 });
      await p.query(`UPDATE ${table} SET status = $2 WHERE id = $1`, [body.id, body.status]);
      return NextResponse.json({ data: { id: body.id, status: body.status } });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[seo/signals] POST Error:', err.message);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
