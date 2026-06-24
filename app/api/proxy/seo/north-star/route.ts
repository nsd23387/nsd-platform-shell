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
    const [nsResult, pipelineResult] = await Promise.all([
      // Canonical North Star view
      pool.query(`SELECT * FROM analytics.v_seo_north_star LIMIT 1`)
        .catch(() => ({ rows: [] })),

      // Pipeline counts — seo_page_enhancement uses column `status` (not lifecycle_state)
      pool.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE status IS NULL
               OR status NOT IN ('evaluating','performer','probation','watch','winner','retired','inconclusive')
          )::int AS review,
          COUNT(*) FILTER (
            WHERE status IN ('evaluating','performer','probation','watch')
          )::int AS evaluation,
          COUNT(*) FILTER (
            WHERE status IN ('winner','retired','inconclusive')
          )::int AS resolved
        FROM analytics.seo_page_enhancement
      `).catch(() => ({ rows: [{ review: 0, evaluation: 0, resolved: 0 }] })),
    ]);

    const ns = nsResult.rows[0] ?? {};
    const pip = pipelineResult.rows[0] ?? { review: 0, evaluation: 0, resolved: 0 };

    // v_seo_north_star exposes clicks_28d / clicks_prev28d / pct_page1 / improving / declining
    const clicks = Number(ns.clicks_28d ?? 0);
    const prevClicks = Number(ns.clicks_prev28d ?? 0);
    const clicksDelta = prevClicks > 0 ? ((clicks - prevClicks) / prevClicks) * 100 : 0;
    // pct_page1 is 0–1 in the view; surface as a percentage
    const pctPage1Raw = Number(ns.pct_page1 ?? 0);
    const pctPage1 = pctPage1Raw > 1 ? pctPage1Raw : pctPage1Raw * 100;

    return NextResponse.json({
      data: {
        north_star: {
          // raw view fields (for compatibility with other consumers)
          ...ns,
          // Command Center display aliases
          total_clicks_28d: clicks,
          clicks_delta_pct: parseFloat(clicksDelta.toFixed(1)),
          pct_page_one: parseFloat(pctPage1.toFixed(1)),
          pct_page_one_delta: 0, // no prior-period pct_page1 in view yet
          improving_pages: Number(ns.improving ?? 0),
          declining_pages: Number(ns.declining ?? 0),
          data_freshness_at: ns.as_of ?? new Date().toISOString(),
        },
        pipeline: {
          review: Number(pip.review ?? 0),
          evaluation: Number(pip.evaluation ?? 0),
          resolved: Number(pip.resolved ?? 0),
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/north-star] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
