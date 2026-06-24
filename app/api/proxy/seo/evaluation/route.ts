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

export async function GET(_req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // seo_page_enhancement uses `status` (not lifecycle_state) and `released_at` (not evaluation_start_at)
    // seo_lifecycle_policy holds the verdict windows
    const [rowsResult, policyResult] = await Promise.all([
      pool.query(`
        SELECT
          e.enhancement_id,
          e.canonical_url,
          e.version,
          e.status,
          e.released_at,
          e.anchor_at,
          e.baseline_position::numeric AS rank_delta,
          NULL::numeric               AS click_delta_pct
        FROM analytics.seo_page_enhancement e
        WHERE e.status IN ('evaluating','performer','probation','watch')
          AND e.released_at IS NOT NULL
        ORDER BY e.released_at ASC
        LIMIT 200
      `),
      pool.query(`
        SELECT first_verdict_days, final_days
        FROM analytics.seo_lifecycle_policy
        ORDER BY policy_id
        LIMIT 1
      `).catch(() => ({ rows: [] })),
    ]);

    const firstDays = Number(policyResult.rows[0]?.first_verdict_days ?? 30);
    const finalDays = Number(policyResult.rows[0]?.final_days ?? 60);

    const data = rowsResult.rows.map((r) => ({
      enhancement_id: r.enhancement_id,
      canonical_url: r.canonical_url,
      version: Number(r.version ?? 1),
      lifecycle_state: r.status,
      evaluation_start_at: r.released_at ?? r.anchor_at,
      first_verdict_days: firstDays,
      final_verdict_days: finalDays,
      rank_delta: r.rank_delta != null ? Number(r.rank_delta) : undefined,
      click_delta_pct: r.click_delta_pct != null ? Number(r.click_delta_pct) : undefined,
    }));

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/evaluation] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
