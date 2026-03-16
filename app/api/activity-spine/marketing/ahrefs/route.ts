export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function getKeywordGap(competitor?: string | null) {
  const params: string[] = [];
  let competitorFilter = '';
  if (competitor) {
    params.push(competitor);
    competitorFilter = `WHERE payload->>'competitor_domain' = $1`;
  }

  const { rows } = await pool.query(`
    SELECT
      payload->>'keyword' AS keyword,
      COALESCE((payload->>'volume')::int, 0) AS search_volume,
      COALESCE((payload->>'keyword_difficulty')::int, 0) AS keyword_difficulty,
      COALESCE((payload->>'cpc')::numeric, 0) AS cpc,
      COALESCE((payload->>'best_position')::int, 0) AS best_position,
      payload->>'best_position_url' AS best_position_url,
      payload->>'target_domain' AS target_domain,
      payload->>'competitor_domain' AS competitor_domain,
      payload->>'topic_cluster' AS topic_cluster,
      COALESCE((payload->>'sum_traffic')::int, 0) AS sum_traffic
    FROM analytics.raw_ahrefs_keyword_gap
    ${competitorFilter}
    ORDER BY COALESCE((payload->>'volume')::int, 0) DESC
    LIMIT 300
  `, params);

  return rows.map(r => ({
    keyword: r.keyword,
    search_volume: Number(r.search_volume),
    keyword_difficulty: Number(r.keyword_difficulty),
    cpc: Number(r.cpc),
    best_position: Number(r.best_position),
    best_position_url: r.best_position_url,
    target_domain: r.target_domain,
    competitor_domain: r.competitor_domain,
    topic_cluster: r.topic_cluster,
    sum_traffic: Number(r.sum_traffic),
  }));
}

async function getBacklinkGap(competitor?: string | null) {
  const params: string[] = [];
  let competitorFilter = '';
  if (competitor) {
    params.push(competitor);
    competitorFilter = `WHERE payload->>'competitor_domain' = $1`;
  }

  const { rows } = await pool.query(`
    SELECT
      payload->>'domain' AS referring_domain,
      COALESCE((payload->>'domain_rating')::numeric, 0) AS domain_rating,
      COALESCE((payload->>'dofollow_links')::int, 0) AS dofollow_links,
      COALESCE((payload->>'links_to_target')::int, 0) AS links_to_target,
      COALESCE((payload->>'traffic_domain')::numeric, 0) AS traffic_domain,
      payload->>'target_domain' AS target_domain,
      payload->>'competitor_domain' AS competitor_domain,
      payload->>'first_seen' AS first_seen
    FROM analytics.raw_ahrefs_backlink_gap
    ${competitorFilter}
    ORDER BY COALESCE((payload->>'domain_rating')::numeric, 0) DESC
    LIMIT 300
  `, params);

  return rows.map(r => ({
    referring_domain: r.referring_domain,
    domain_rating: Number(r.domain_rating),
    dofollow_links: Number(r.dofollow_links),
    links_to_target: Number(r.links_to_target),
    traffic_domain: Number(r.traffic_domain),
    target_domain: r.target_domain,
    competitor_domain: r.competitor_domain,
    first_seen: r.first_seen,
  }));
}

async function getTopPages(competitor?: string | null) {
  const params: string[] = [];
  let competitorFilter = '';
  if (competitor) {
    params.push(competitor);
    competitorFilter = `WHERE payload->>'competitor_domain' = $1`;
  }

  const { rows } = await pool.query(`
    SELECT
      payload->>'url' AS url,
      COALESCE((payload->>'sum_traffic')::int, 0) AS traffic,
      COALESCE((payload->>'value')::numeric, 0) AS traffic_value,
      payload->>'top_keyword' AS top_keyword,
      COALESCE((payload->>'top_keyword_volume')::int, 0) AS top_keyword_volume,
      COALESCE((payload->>'top_keyword_best_position')::int, 0) AS top_keyword_position,
      COALESCE((payload->>'keywords')::int, 0) AS keywords,
      COALESCE((payload->>'referring_domains')::int, 0) AS referring_domains,
      payload->>'competitor_domain' AS competitor_domain,
      payload->>'topic_cluster' AS topic_cluster
    FROM analytics.raw_ahrefs_top_pages
    ${competitorFilter}
    ORDER BY COALESCE((payload->>'sum_traffic')::int, 0) DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    url: r.url,
    traffic: Number(r.traffic),
    traffic_value: Number(r.traffic_value),
    top_keyword: r.top_keyword,
    top_keyword_volume: Number(r.top_keyword_volume),
    top_keyword_position: Number(r.top_keyword_position),
    keywords: Number(r.keywords),
    referring_domains: Number(r.referring_domains),
    competitor_domain: r.competitor_domain,
    topic_cluster: r.topic_cluster,
  }));
}

async function getDistinctCompetitors() {
  const { rows } = await pool.query(`
    SELECT DISTINCT payload->>'competitor_domain' AS competitor
    FROM analytics.raw_ahrefs_keyword_gap
    ORDER BY 1
  `);
  return rows.map(r => r.competitor);
}

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'keyword-gap';
    const competitor = req.nextUrl.searchParams.get('competitor');

    let result: unknown;

    switch (view) {
      case 'keyword-gap':
        result = await getKeywordGap(competitor);
        break;
      case 'backlink-gap':
        result = await getBacklinkGap(competitor);
        break;
      case 'top-pages':
        result = await getTopPages(competitor);
        break;
      case 'competitors':
        result = await getDistinctCompetitors();
        break;
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }

    return NextResponse.json({ data: result, meta: { view, competitor } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ahrefs] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
