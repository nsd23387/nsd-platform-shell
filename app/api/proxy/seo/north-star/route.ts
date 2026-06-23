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
    // North star metrics from GSC data
    const nsResult = await pool.query(`
      SELECT
        COALESCE(SUM(clicks), 0)::int                   AS total_clicks_28d,
        0::numeric                                        AS clicks_delta_pct,
        0::numeric                                        AS pct_page_one,
        0::numeric                                        AS pct_page_one_delta,
        0::int                                            AS improving_pages,
        0::int                                            AS declining_pages,
        NOW()                                             AS data_freshness_at
      FROM analytics.gsc_page_query_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '28 days'
    `);

    // Pipeline counts: how many enhancement packages in each stage
    const pipelineResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE lifecycle_state IN ('evaluating') OR lifecycle_state IS NULL)::int AS review,
        COUNT(*) FILTER (WHERE lifecycle_state IN ('performer','probation','watch'))::int           AS evaluation,
        COUNT(*) FILTER (WHERE lifecycle_state IN ('winner','retired','inconclusive'))::int         AS resolved
      FROM analytics.seo_page_enhancement
    `).catch(() => ({ rows: [{ review: 0, evaluation: 0, resolved: 0 }] }));

    const ns = nsResult.rows[0] ?? {};
    const pip = pipelineResult.rows[0] ?? { review: 0, evaluation: 0, resolved: 0 };

    return NextResponse.json({
      data: {
        north_star: {
          total_clicks_28d: Number(ns.total_clicks_28d ?? 0),
          clicks_delta_pct: Number(ns.clicks_delta_pct ?? 0),
          pct_page_one: Number(ns.pct_page_one ?? 0),
          pct_page_one_delta: Number(ns.pct_page_one_delta ?? 0),
          improving_pages: Number(ns.improving_pages ?? 0),
          declining_pages: Number(ns.declining_pages ?? 0),
          data_freshness_at: ns.data_freshness_at ?? new Date().toISOString(),
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
    return NextResponse.json({ error: 'Failed to load north-star metrics' }, { status: 500 });
  }
}
