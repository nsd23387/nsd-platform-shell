// =============================================================================
// GET /api/proxy/seo/suppressed — gate-suppressed mutation audit (governed)
// Governance lock: READ-ONLY. Parameterized queries only, no writes. Surfaces
// the transparency trail of mutations the gate rejected so reviewers can see
// what was withheld and why. Single source: analytics.seo_gate_suppressed.
// Returns a per-reason rollup plus the most-recent suppressed rows (capped).
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 500) : 200;

  try {
    const totalQ = pool.query(`SELECT COUNT(*)::bigint AS n FROM analytics.seo_gate_suppressed`);

    const reasonsQ = pool.query(
      `SELECT reason, COUNT(*)::bigint AS n
       FROM analytics.seo_gate_suppressed,
            LATERAL unnest(
              CASE WHEN cardinality(gate_reasons) > 0
                   THEN gate_reasons ELSE ARRAY['(unspecified)'] END
            ) AS reason
       GROUP BY reason
       ORDER BY n DESC`,
    );

    const rowsQ = pool.query(
      `SELECT id, generator, mutation_type, target_url, gate_reasons,
              relevance_score::numeric AS relevance_score, created_at
       FROM analytics.seo_gate_suppressed
       ORDER BY created_at DESC NULLS LAST, relevance_score DESC NULLS LAST
       LIMIT $1`,
      [limit],
    );

    const [totalR, reasonsR, rowsR] = await Promise.all([totalQ, reasonsQ, rowsQ]);

    const reasons = reasonsR.rows.map((r) => ({
      reason: r.reason as string,
      count: Number(r.n),
    }));

    const rows = rowsR.rows.map((r) => ({
      id: r.id,
      generator: r.generator,
      mutation_type: r.mutation_type,
      target_url: r.target_url,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      relevance_score: r.relevance_score != null ? Number(r.relevance_score) : null,
      created_at: r.created_at,
    }));

    return NextResponse.json({
      data: {
        total: Number(totalR.rows[0]?.n ?? 0),
        returned: rows.length,
        reasons,
        rows,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/suppressed] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load suppressed audit' }, { status: 500 });
  }
}
