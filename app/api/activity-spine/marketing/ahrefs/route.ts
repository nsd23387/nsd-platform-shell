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
    competitorFilter = `WHERE g.competitor_domain = $1`;
  }

  const { rows } = await pool.query(`
    WITH gaps AS (
      SELECT
        keyword,
        search_volume,
        keyword_difficulty,
        kw_cpc,
        competitor_ranking_position,
        competitor_page_url,
        competitor_url,
        regexp_replace(
          regexp_replace(competitor_url, '^https?://', ''),
          '/.*$',
          ''
        ) AS competitor_domain,
        cluster_keyword,
        opportunity_score
      FROM analytics.seo_command_center_competitor_gaps(30, NULL::date, NULL::date)
    )
    SELECT
      g.keyword,
      COALESCE(eqi.search_volume, g.search_volume, 0)::int AS search_volume,
      COALESCE(eqi.keyword_difficulty, g.keyword_difficulty, 0)::int AS keyword_difficulty,
      COALESCE(eqi.cpc, g.kw_cpc, 0)::numeric AS cpc,
      COALESCE(g.competitor_ranking_position, 0)::int AS best_position,
      g.competitor_page_url AS best_position_url,
      'neonsignsdepot.com' AS target_domain,
      g.competitor_domain,
      g.cluster_keyword AS topic_cluster,
      COALESCE(g.opportunity_score, 0)::int AS sum_traffic
    FROM gaps g
    LEFT JOIN analytics.external_query_intelligence eqi
      ON eqi.normalized_query = lower(trim(g.keyword))
    ${competitorFilter}
    ORDER BY COALESCE(eqi.search_volume, g.search_volume, 0) DESC, COALESCE(g.opportunity_score, 0) DESC
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
  void competitor;
  return [];
}

async function getTopPages(competitor?: string | null) {
  void competitor;
  return [];
}

async function getDistinctCompetitors() {
  const { rows } = await pool.query(`
    SELECT DISTINCT
      regexp_replace(
        regexp_replace(competitor_url, '^https?://', ''),
        '/.*$',
        ''
      ) AS competitor
    FROM analytics.seo_command_center_competitor_gaps(30, NULL::date, NULL::date)
    WHERE competitor_url IS NOT NULL
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

    return NextResponse.json({
      data: result,
      meta: {
        view,
        competitor,
        source_label: 'Keyword & Competitive Intelligence',
        retired_source_label: 'Ahrefs Intelligence',
        unavailable_metrics: [
          { metric: 'backlink gap', reason: 'unavailable (source retired)' },
          { metric: 'top pages', reason: 'unavailable (source retired)' },
        ],
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ahrefs] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
