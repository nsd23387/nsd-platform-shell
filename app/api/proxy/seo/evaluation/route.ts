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
    const { rows } = await pool.query(`
      SELECT
        e.enhancement_id,
        e.canonical_url,
        e.version,
        e.lifecycle_state,
        e.evaluation_start_at,
        COALESCE(e.lifecycle_policy_first_days, 30)  AS first_verdict_days,
        COALESCE(e.lifecycle_policy_final_days, 60)  AS final_verdict_days,
        NULL::numeric                                 AS rank_delta,
        NULL::numeric                                 AS click_delta_pct
      FROM analytics.seo_page_enhancement e
      WHERE e.lifecycle_state IN ('evaluating','performer','probation','watch')
        AND e.evaluation_start_at IS NOT NULL
      ORDER BY e.evaluation_start_at ASC
      LIMIT 200
    `);

    const data = rows.map((r) => ({
      enhancement_id: r.enhancement_id,
      canonical_url: r.canonical_url,
      version: Number(r.version ?? 1),
      lifecycle_state: r.lifecycle_state,
      evaluation_start_at: r.evaluation_start_at,
      first_verdict_days: Number(r.first_verdict_days ?? 30),
      final_verdict_days: Number(r.final_verdict_days ?? 60),
      rank_delta: r.rank_delta != null ? Number(r.rank_delta) : undefined,
      click_delta_pct: r.click_delta_pct != null ? Number(r.click_delta_pct) : undefined,
    }));

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/evaluation] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load evaluation data' }, { status: 500 });
  }
}
