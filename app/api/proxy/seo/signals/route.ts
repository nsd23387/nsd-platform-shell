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

const TABLE_MAP: Record<string, string> = {
  decay: 'analytics.seo_decay_signal',
  cannibalization: 'analytics.seo_cannibalization_signal',
  'topical-gaps': 'analytics.seo_topical_authority_gap',
};

const ORDER_MAP: Record<string, string> = {
  // Sort decay by how far rank actually slipped, not the unreliable traffic
  // delta (computed off an undercounted GSC click baseline).
  decay: 'position_delta DESC NULLS LAST',
  cannibalization: 'overlap_score DESC NULLS LAST',
  'topical-gaps': 'opportunity_score DESC NULLS LAST',
};

// Utility / policy pages whose ranking decay isn't actionable — excluded from
// decay alerts so the list stays focused on commercial pages.
const DECAY_EXCLUDE_PATTERNS = [
  '%/shipping-returns/%', '%/returns%', '%/wholesale%', '%/privacy%',
  '%/terms%', '%/contact%', '%/cart%', '%/checkout%', '%/my-account%',
];

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
    if (type === 'decay') {
      for (const pat of DECAY_EXCLUDE_PATTERNS) {
        params.push(pat);
        where += ` AND COALESCE(page_path, '') NOT ILIKE $${params.length}`;
      }
    }

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
