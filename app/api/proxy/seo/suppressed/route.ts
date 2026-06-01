/**
 * GET /api/proxy/seo/suppressed
 *
 * The intent/relevance gate's audit trail: candidates the gate withheld and why.
 * Reads analytics.seo_gate_suppressed (read-only) and returns a by-reason
 * breakdown plus the most recent suppressed candidates with their grounded
 * source → target / why pulled from the evidence jsonb.
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

type Row = Record<string, unknown>;
async function safe(p: Pool, sql: string): Promise<Row[]> {
  try {
    const { rows } = await p.query(sql);
    return rows;
  } catch (err) {
    console.error('[seo/suppressed] query failed:', (err as Error).message);
    return [];
  }
}
const n = (v: unknown): number => (v == null ? 0 : Number(v));

export async function GET() {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const p = getPool();

  const [totalRows, byReason, recent] = await Promise.all([
    safe(p, `SELECT count(*) AS c FROM analytics.seo_gate_suppressed`),
    safe(p, `
      SELECT unnest(gate_reasons) AS reason, count(*) AS c
      FROM analytics.seo_gate_suppressed
      GROUP BY 1
      ORDER BY 2 DESC
    `),
    safe(p, `
      SELECT id::text AS id,
             mutation_type,
             evidence->'source'->>'entity' AS source,
             evidence->'target'->>'entity' AS target,
             gate_reasons,
             relevance_score,
             evidence->>'why' AS why,
             created_at
      FROM analytics.seo_gate_suppressed
      ORDER BY created_at DESC
      LIMIT 50
    `),
  ]);

  return NextResponse.json({
    data: {
      total: totalRows.length ? n(totalRows[0].c) : 0,
      byReason: byReason.map((r) => ({ reason: String(r.reason ?? 'unknown'), count: n(r.c) })),
      recent: recent.map((r) => ({
        id: r.id,
        mutation_type: r.mutation_type,
        source: r.source ?? null,
        target: r.target ?? null,
        gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
        relevance_score: r.relevance_score != null ? Number(r.relevance_score) : null,
        why: r.why ?? null,
        created_at: r.created_at,
      })),
      generated_at: new Date().toISOString(),
    },
  });
}
