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
    // seo_page_enhancement uses `status` (not lifecycle_state), `updated_at` for verdict timestamp
    const { rows } = await pool.query(`
      SELECT
        e.enhancement_id,
        e.canonical_url,
        e.version,
        e.status                      AS verdict,
        e.final_label,
        e.prov_label,
        e.baseline_position::numeric  AS rank_delta,
        NULL::numeric                 AS click_delta_pct,
        COALESCE(e.updated_at, e.released_at) AS verdict_at
      FROM analytics.seo_page_enhancement e
      WHERE e.status IN ('winner','retired','inconclusive')
      ORDER BY COALESCE(e.updated_at, e.released_at) DESC NULLS LAST
      LIMIT 500
    `);

    const data = rows.map((r) => ({
      enhancement_id: r.enhancement_id,
      canonical_url: r.canonical_url,
      version: Number(r.version ?? 1),
      verdict: r.verdict as 'winner' | 'retired' | 'inconclusive',
      rank_delta: r.rank_delta != null ? Number(r.rank_delta) : undefined,
      click_delta_pct: r.click_delta_pct != null ? Number(r.click_delta_pct) : undefined,
      verdict_at: r.verdict_at ?? new Date().toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/results-v2] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
