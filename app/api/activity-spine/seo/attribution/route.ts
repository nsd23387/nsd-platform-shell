export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

type View = 'page-performance' | 'cluster-performance';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const view = (sp.get('view') ?? 'page-performance') as View;

    switch (view) {
      case 'page-performance':
        return NextResponse.json({ data: await getPagePerformance(sp), meta: { view } });
      case 'cluster-performance':
        return NextResponse.json({ data: await getClusterPerformance(), meta: { view } });
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/attribution] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getPagePerformance(sp: URLSearchParams) {
  const limit = Math.min(Number(sp.get('limit') ?? 200), 1000);
  const page = Math.max(Number(sp.get('page') ?? 0), 0);
  const offset = page * limit;

  const { rows } = await pool.query(
    `SELECT
       canonical_page_url,
       raw_page_url,
       page_title,
       page_type,
       topic_cluster,
       search_console_clicks,
       search_console_impressions,
       avg_position,
       submitted_quotes,
       paid_quotes,
       paid_revenue_cents
     FROM seo.page_quote_performance
     ORDER BY COALESCE(paid_revenue_cents, 0) DESC NULLS LAST
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return rows.map(r => ({
    canonical_page_url: r.canonical_page_url,
    raw_page_url: r.raw_page_url,
    page_title: r.page_title,
    page_type: r.page_type,
    topic_cluster: r.topic_cluster,
    search_console_clicks: Number(r.search_console_clicks),
    search_console_impressions: Number(r.search_console_impressions),
    avg_position: r.avg_position !== null ? Number(r.avg_position) : null,
    submitted_quotes: Number(r.submitted_quotes),
    paid_quotes: Number(r.paid_quotes),
    paid_revenue_cents: Number(r.paid_revenue_cents),
    paid_revenue_usd: Number(r.paid_revenue_cents) / 100,
  }));
}

async function getClusterPerformance() {
  const { rows } = await pool.query(
    `SELECT
       topic_cluster,
       mapped_pages,
       search_console_clicks,
       search_console_impressions,
       avg_position,
       submitted_quotes,
       paid_quotes,
       paid_revenue_cents,
       top_revenue_page,
       top_quote_page
     FROM seo.cluster_quote_performance
     ORDER BY COALESCE(paid_revenue_cents, 0) DESC NULLS LAST`
  );

  return rows.map(r => ({
    topic_cluster: r.topic_cluster,
    mapped_pages: Number(r.mapped_pages),
    search_console_clicks: Number(r.search_console_clicks),
    search_console_impressions: Number(r.search_console_impressions),
    avg_position: r.avg_position !== null ? Number(r.avg_position) : null,
    submitted_quotes: Number(r.submitted_quotes),
    paid_quotes: Number(r.paid_quotes),
    paid_revenue_cents: Number(r.paid_revenue_cents),
    paid_revenue_usd: Number(r.paid_revenue_cents) / 100,
    top_revenue_page: r.top_revenue_page,
    top_quote_page: r.top_quote_page,
  }));
}
