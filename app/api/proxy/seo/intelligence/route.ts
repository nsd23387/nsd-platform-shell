export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function getOverviewKpis() {
  const [clusters, opportunities, pageOpts, internalLinks, contentArtifacts, ahrefsKw, pageIndex, recommendations] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.keyword_clusters`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_cluster_opportunities`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_page_optimization_recommendations`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.internal_link_recommendations`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_content_artifacts`),
    pool.query(`
      WITH deduped AS (
        SELECT DISTINCT ON (payload->>'keyword', payload->>'competitor_domain')
          id
        FROM analytics.raw_ahrefs_keyword_gap
        ORDER BY payload->>'keyword', payload->>'competitor_domain', ingestion_run_id DESC
      )
      SELECT COUNT(*)::int AS cnt FROM deduped
    `),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_page_index`),
    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
      FROM analytics.seo_recommendations
    `),
  ]);

  return {
    total_clusters: clusters.rows[0].cnt,
    total_opportunities: opportunities.rows[0].cnt,
    page_optimization_recs: pageOpts.rows[0].cnt,
    internal_link_recs: internalLinks.rows[0].cnt,
    content_artifacts: contentArtifacts.rows[0].cnt,
    ahrefs_keywords_tracked: ahrefsKw.rows[0].cnt,
    indexed_pages: pageIndex.rows[0].cnt,
    recommendations_total: recommendations.rows[0].total,
    recommendations_pending: recommendations.rows[0].pending,
    recommendations_approved: recommendations.rows[0].approved,
    recommendations_rejected: recommendations.rows[0].rejected,
  };
}

async function getPagePerformance(limit: number, sortBy: string) {
  const validSorts: Record<string, string> = {
    impressions: 'impressions::int',
    clicks: 'clicks::int',
    ctr: 'ctr::numeric',
    position: 'position::numeric',
  };
  const orderCol = validSorts[sortBy] || 'impressions::int';

  const { rows } = await pool.query(`
    SELECT
      url,
      query,
      impressions::int AS impressions,
      clicks::int AS clicks,
      ctr::numeric AS ctr,
      position::numeric AS position
    FROM analytics.seo_page_query_performance_live
    ORDER BY ${orderCol} DESC
    LIMIT $1
  `, [limit]);

  return rows.map(r => ({
    url: r.url,
    query: r.query,
    impressions: Number(r.impressions),
    clicks: Number(r.clicks),
    ctr: Number(r.ctr),
    position: Number(r.position),
  }));
}

async function getPageOptimizations() {
  const { rows } = await pool.query(`
    SELECT
      id, url, page_type, primary_keyword, optimization_type,
      recommended_title, recommended_meta_description,
      content_recommendations, priority_score::numeric, status,
      created_at, generated_by
    FROM analytics.seo_page_optimization_recommendations
    ORDER BY priority_score::numeric DESC
  `);

  return rows.map(r => ({
    id: r.id,
    url: r.url,
    page_type: r.page_type,
    primary_keyword: r.primary_keyword,
    optimization_type: r.optimization_type,
    recommended_title: r.recommended_title,
    recommended_meta_description: r.recommended_meta_description,
    content_recommendations: r.content_recommendations,
    priority_score: Number(r.priority_score),
    status: r.status,
    created_at: r.created_at,
    generated_by: r.generated_by,
  }));
}

async function getInternalLinks() {
  const { rows } = await pool.query(`
    SELECT id, source_page, target_page, anchor_text, reason, priority, rule_source, created_at
    FROM analytics.internal_link_recommendations
    ORDER BY
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
      created_at DESC
  `);

  return rows.map(r => ({
    id: r.id,
    source_page: r.source_page,
    target_page: r.target_page,
    anchor_text: r.anchor_text,
    reason: r.reason,
    priority: r.priority,
    rule_source: r.rule_source,
    created_at: r.created_at,
  }));
}

async function getContentPipeline() {
  const [artifacts, candidates, events] = await Promise.all([
    pool.query(`
      SELECT a.id, a.artifact_type, a.status, a.title, a.generated_by, a.created_at,
             r.target_query AS primary_keyword, r.title AS cluster_topic
      FROM analytics.seo_content_artifacts a
      LEFT JOIN analytics.seo_recommendations r ON a.recommendation_id = r.id
      ORDER BY a.created_at DESC
    `),
    pool.query(`
      SELECT cluster_id, cluster_keyword, total_impressions::int, avg_position::numeric,
             keyword_count::int, seo_priority_score::numeric
      FROM analytics.seo_generation_candidates
      ORDER BY seo_priority_score::numeric DESC
      LIMIT 25
    `),
    pool.query(`
      SELECT id, event_type, generator_version, model, created_at
      FROM analytics.seo_generation_events
      ORDER BY created_at DESC
      LIMIT 20
    `),
  ]);

  return {
    artifacts: artifacts.rows.map(r => ({
      id: r.id,
      artifact_type: r.artifact_type,
      status: r.status,
      title: r.title,
      generated_by: r.generated_by,
      created_at: r.created_at,
      primary_keyword: r.primary_keyword,
      cluster_topic: r.cluster_topic,
    })),
    candidates: candidates.rows.map(r => ({
      cluster_id: r.cluster_id,
      cluster_keyword: r.cluster_keyword,
      total_impressions: Number(r.total_impressions),
      avg_position: Number(r.avg_position),
      keyword_count: Number(r.keyword_count),
      seo_priority_score: Number(r.seo_priority_score),
    })),
    events: events.rows.map(r => ({
      id: r.id,
      event_type: r.event_type,
      generator_version: r.generator_version,
      model: r.model,
      created_at: r.created_at,
    })),
  };
}

async function getCompetitiveKeywordGap(competitor?: string | null) {
  let filter = '';
  const params: string[] = [];
  if (competitor) {
    params.push(competitor);
    filter = `WHERE d.competitor_domain = $1`;
  }

  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (payload->>'keyword', payload->>'competitor_domain')
        payload
      FROM analytics.raw_ahrefs_keyword_gap
      ORDER BY payload->>'keyword', payload->>'competitor_domain', ingestion_run_id DESC
    ),
    d AS (
      SELECT
        payload->>'keyword' AS keyword,
        payload->>'competitor_domain' AS competitor_domain,
        (payload->>'volume')::int AS volume,
        (payload->>'keyword_difficulty')::int AS keyword_difficulty,
        (payload->>'cpc')::numeric AS cpc,
        (payload->>'best_position')::int AS best_position,
        payload->>'best_position_url' AS best_position_url,
        (payload->>'sum_traffic')::int AS sum_traffic,
        payload->>'topic_cluster' AS topic_cluster
      FROM deduped
    )
    SELECT * FROM d ${filter}
    ORDER BY volume DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    keyword: r.keyword,
    competitor_domain: r.competitor_domain,
    volume: Number(r.volume),
    keyword_difficulty: Number(r.keyword_difficulty),
    cpc: Number(r.cpc),
    best_position: Number(r.best_position),
    best_position_url: r.best_position_url,
    sum_traffic: Number(r.sum_traffic),
    topic_cluster: r.topic_cluster,
  }));
}

async function getCompetitiveBacklinks(competitor?: string | null) {
  let filter = '';
  const params: string[] = [];
  if (competitor) {
    params.push(competitor);
    filter = `WHERE d.competitor_domain = $1`;
  }

  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (payload->>'domain', payload->>'competitor_domain')
        payload
      FROM analytics.raw_ahrefs_backlink_gap
      ORDER BY payload->>'domain', payload->>'competitor_domain', ingestion_run_id DESC
    ),
    d AS (
      SELECT
        payload->>'domain' AS domain,
        payload->>'competitor_domain' AS competitor_domain,
        (payload->>'domain_rating')::int AS domain_rating,
        (payload->>'traffic_domain')::int AS traffic_domain,
        (payload->>'dofollow_links')::int AS dofollow_links,
        (payload->>'links_to_target')::int AS links_to_target,
        payload->>'first_seen' AS first_seen
      FROM deduped
    )
    SELECT * FROM d ${filter}
    ORDER BY domain_rating DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    domain: r.domain,
    competitor_domain: r.competitor_domain,
    domain_rating: Number(r.domain_rating),
    traffic_domain: Number(r.traffic_domain),
    dofollow_links: Number(r.dofollow_links),
    links_to_target: Number(r.links_to_target),
    first_seen: r.first_seen,
  }));
}

async function getCompetitiveTopPages(competitor?: string | null) {
  let filter = '';
  const params: string[] = [];
  if (competitor) {
    params.push(competitor);
    filter = `WHERE d.competitor_domain = $1`;
  }

  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (payload->>'url', payload->>'competitor_domain')
        payload
      FROM analytics.raw_ahrefs_top_pages
      ORDER BY payload->>'url', payload->>'competitor_domain', ingestion_run_id DESC
    ),
    d AS (
      SELECT
        payload->>'url' AS url,
        payload->>'competitor_domain' AS competitor_domain,
        (payload->>'sum_traffic')::int AS sum_traffic,
        (payload->>'keywords')::int AS keywords,
        payload->>'top_keyword' AS top_keyword,
        (payload->>'top_keyword_volume')::int AS top_keyword_volume,
        (payload->>'top_keyword_best_position')::int AS top_keyword_best_position,
        (payload->>'referring_domains')::int AS referring_domains,
        (payload->>'value')::numeric AS value,
        payload->>'topic_cluster' AS topic_cluster
      FROM deduped
    )
    SELECT * FROM d ${filter}
    ORDER BY sum_traffic DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    url: r.url,
    competitor_domain: r.competitor_domain,
    sum_traffic: Number(r.sum_traffic),
    keywords: Number(r.keywords),
    top_keyword: r.top_keyword,
    top_keyword_volume: Number(r.top_keyword_volume),
    top_keyword_best_position: Number(r.top_keyword_best_position),
    referring_domains: Number(r.referring_domains),
    value: Number(r.value),
    topic_cluster: r.topic_cluster,
  }));
}

async function getClusterPriorities(limit: number) {
  const { rows } = await pool.query(`
    SELECT
      cluster_id, cluster_keyword,
      total_impressions::int, avg_position::numeric,
      keyword_count::int, ranking_opportunity::int,
      missing_page_signal::int, seo_priority_score::numeric
    FROM analytics.seo_cluster_priority
    ORDER BY seo_priority_score::numeric DESC
    LIMIT $1
  `, [limit]);

  return rows.map(r => ({
    cluster_id: r.cluster_id,
    cluster_keyword: r.cluster_keyword,
    total_impressions: Number(r.total_impressions),
    avg_position: Number(r.avg_position),
    keyword_count: Number(r.keyword_count),
    ranking_opportunity: Number(r.ranking_opportunity),
    missing_page_signal: Number(r.missing_page_signal),
    seo_priority_score: Number(r.seo_priority_score),
  }));
}

async function getCompetitorsList() {
  const { rows } = await pool.query(`
    SELECT DISTINCT payload->>'competitor_domain' AS competitor
    FROM analytics.raw_ahrefs_keyword_gap
    ORDER BY payload->>'competitor_domain'
  `);
  return rows.map(r => r.competitor);
}

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'overview-kpis';
    const competitor = req.nextUrl.searchParams.get('competitor');
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '100', 10), 500);
    const sortBy = req.nextUrl.searchParams.get('sort_by') || 'impressions';

    let result: unknown;

    switch (view) {
      case 'overview-kpis':
        result = await getOverviewKpis();
        break;
      case 'page-performance':
        result = await getPagePerformance(limit, sortBy);
        break;
      case 'page-optimization':
        result = await getPageOptimizations();
        break;
      case 'internal-links':
        result = await getInternalLinks();
        break;
      case 'content-pipeline':
        result = await getContentPipeline();
        break;
      case 'competitive-gap':
        result = await getCompetitiveKeywordGap(competitor);
        break;
      case 'competitive-backlinks':
        result = await getCompetitiveBacklinks(competitor);
        break;
      case 'competitive-pages':
        result = await getCompetitiveTopPages(competitor);
        break;
      case 'cluster-priorities':
        result = await getClusterPriorities(limit);
        break;
      case 'competitors-list':
        result = await getCompetitorsList();
        break;
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }

    return NextResponse.json({ data: result, meta: { view } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo-intelligence] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
