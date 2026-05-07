export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(_req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const p = getPool();

    const [summaryResult, opportunitiesResult] = await Promise.all([
      p.query(`
        SELECT target_domain, domain_rank, referring_domains, backlinks, fetched_at
        FROM analytics.seo_backlink_summary
        ORDER BY fetched_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] as Record<string, unknown>[] })),
      p.query(`
        SELECT referring_domain, domain_rank, backlinks_count, spam_score,
               gap_competitor, opportunity_type, status, discovered_at
        FROM analytics.seo_backlink_opportunities
        WHERE status = 'new'
        ORDER BY domain_rank DESC
        LIMIT 50
      `).catch(() => ({ rows: [] as Record<string, unknown>[] })),
    ]);

    return NextResponse.json({ data: { summary: summaryResult.rows, opportunities: opportunitiesResult.rows } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/backlinks] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!databaseUrl) return NextResponse.json({ error: 'Database not configured' }, { status: 503 });

  try {
    const { id, status } = await req.json() as { id: string; status: string };
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

    const p = getPool();
    await p.query(
      `UPDATE analytics.seo_backlink_opportunities SET status = $1 WHERE id = $2`,
      [status, id],
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
