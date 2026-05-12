export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { toRecommendationCard, groupIntoSections } from '../../../../../lib/recommendation-templates';
import type { OpportunityRow } from '../../../../../lib/recommendation-templates';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

async function getOverviewKpis() {
  // Migrated 2026-05-12: legacy reads on seo_opportunity_queue_balanced
  // (which had a runaway-join bug returning 4.3B rows),
  // seo_execution_queue, and seo_execution_candidate replaced with
  // seo_action lifecycle counts. Non-legacy panels (Ahrefs, page index,
  // content artifacts, internal links, generation settings, cluster run
  // metadata) keep their existing tables.
  const [actionCounts, pageOpts, internalLinks, contentArtifacts, ahrefsKw, pageIndex, autoApproveSettings, autoApprovedToday, pipelineRuns] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_opportunities,
        COUNT(DISTINCT source_cluster)::int AS total_clusters,
        COUNT(*) FILTER (
          WHERE agent_review_score >= 7
            AND human_decision IS NULL
            AND executed_at IS NULL
        )::int AS high_urgency,
        COUNT(*) FILTER (
          WHERE agent_review_score >= 4 AND agent_review_score < 7
            AND human_decision IS NULL
            AND executed_at IS NULL
        )::int AS medium_urgency,
        COUNT(*) FILTER (
          WHERE (agent_review_score IS NULL OR agent_review_score < 4)
            AND human_decision IS NULL
            AND executed_at IS NULL
        )::int AS low_urgency,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'reviewed' AND human_decision IS NULL)::int AS awaiting_approval,
        COUNT(*) FILTER (WHERE human_decision = 'approved' AND executed_at IS NULL)::int AS approved,
        COUNT(*) FILTER (WHERE executed_at IS NOT NULL)::int AS published
      FROM analytics.seo_action
    `).catch(() => ({ rows: [{ total_opportunities: 0, total_clusters: 0, high_urgency: 0, medium_urgency: 0, low_urgency: 0, total: 0, awaiting_approval: 0, approved: 0, published: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_page_optimization_recommendations`).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.internal_link_recommendations`).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_content_artifacts`).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`
      WITH deduped AS (
        SELECT DISTINCT ON (payload->>'keyword', payload->>'competitor_domain')
          id
        FROM analytics.raw_ahrefs_keyword_gap
        ORDER BY payload->>'keyword', payload->>'competitor_domain', created_at DESC
      )
      SELECT COUNT(*)::int AS cnt FROM deduped
    `).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM analytics.seo_page_index`).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`
      SELECT auto_approve_enabled, auto_approve_daily_cap, auto_approve_min_score
      FROM analytics.seo_generation_settings
      ORDER BY id ASC
      LIMIT 1
    `).catch(() => ({ rows: [] })),
    pool.query(`
      SELECT COUNT(*)::int AS cnt
      FROM analytics.seo_action
      WHERE agent_model IN ('claude-haiku-4-5', 'claude-haiku-4-5-20251001')
        AND agent_reviewed_at::date = CURRENT_DATE
        AND human_decision = 'approved'
    `).catch(() => ({ rows: [{ cnt: 0 }] })),
    pool.query(`
      SELECT MAX(created_at) AS run_at
      FROM analytics.seo_action
    `).catch(() => ({ rows: [] })),
  ]);

  const eng = actionCounts.rows[0];
  const exec = actionCounts.rows[0]; // same source now
  const lastRun = pipelineRuns.rows[0]?.run_at ?? null;
  const autoSettings = autoApproveSettings.rows[0] ?? null;
  const autoTodayCount = autoApprovedToday.rows[0]?.cnt ?? 0;

  return {
    total_clusters: eng.total_clusters,
    total_opportunities: eng.total_opportunities,
    high_urgency: eng.high_urgency,
    medium_urgency: eng.medium_urgency,
    low_urgency: eng.low_urgency,
    page_optimization_recs: pageOpts.rows[0].cnt,
    internal_link_recs: internalLinks.rows[0].cnt,
    content_artifacts: contentArtifacts.rows[0].cnt,
    ahrefs_keywords_tracked: ahrefsKw.rows[0].cnt,
    indexed_pages: pageIndex.rows[0].cnt,
    execution_candidates_total: exec.total,
    awaiting_approval: exec.awaiting_approval,
    approved: exec.approved,
    published: exec.published,
    // Phase 2 pipeline fields
    last_pipeline_run_at: lastRun,
    auto_approve_enabled: autoSettings?.auto_approve_enabled ?? false,
    auto_approve_daily_cap: autoSettings?.auto_approve_daily_cap ?? 25,
    auto_approve_min_score: autoSettings?.auto_approve_min_score != null
      ? parseFloat(String(autoSettings.auto_approve_min_score))
      : 7.0,
    auto_approved_today: autoTodayCount,
    seo_auto_execute_env: process.env.SEO_AUTO_EXECUTE_ENABLED === 'true',
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
  // Filter out low-value internal link recommendations:
  // - Exclude product→product sibling links (deep /shop/.../ → /shop/.../)
  //   These are circular siblings that provide minimal SEO value
  // - Prioritize cross-category links (blog→page, page→category, root→hub)
  //   These actually move authority and improve crawl depth
  // Cap at 50 to prevent the noise that comes with 900+ undifferentiated recs
  const { rows } = await pool.query(`
    SELECT id, source_page, target_page, anchor_text, reason, priority, rule_source, created_at,
      CASE
        -- Strategic value scoring: higher = more impact per link
        WHEN source_page LIKE '%/blog/%' OR source_page LIKE '%/the-ultimate-guide%' THEN 100  -- blog → anywhere
        WHEN source_page = 'https://neonsignsdepot.com/' OR source_page LIKE '%neonsignsdepot.com/' THEN 90  -- homepage → anywhere
        WHEN source_page LIKE '%/create-sign%' OR source_page LIKE '%/custom-designs%' THEN 80  -- design tools → anywhere
        WHEN source_page LIKE '%/collections/%' AND target_page LIKE '%/shop/%' THEN 70  -- category → product
        WHEN source_page NOT LIKE '%/shop/%' AND target_page LIKE '%/shop/%' THEN 60  -- non-product → product
        WHEN source_page LIKE '%/shop/%' AND target_page LIKE '%/collections/%' THEN 50  -- product → category
        WHEN source_page LIKE '%/shop/%' AND target_page LIKE '%/shop/%' THEN 5  -- product → product (low value)
        ELSE 30
      END AS strategic_score
    FROM analytics.internal_link_recommendations
    WHERE
      -- Exclude product→product sibling pairs (circular, low value)
      NOT (source_page LIKE '%/shop/%' AND target_page LIKE '%/shop/%'
           AND split_part(regexp_replace(source_page, '^https?://[^/]+', ''), '/', 3)
             = split_part(regexp_replace(target_page, '^https?://[^/]+', ''), '/', 3))
    ORDER BY
      strategic_score DESC,
      CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
      created_at DESC
    LIMIT 50
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
    // Migrated 2026-05-12: dropped LEFT JOIN to legacy seo_recommendations.
    // Artifacts now carry their own status/title; cluster_topic/primary_keyword
    // are not joined-in (the legacy join was the only producer). UI shows null
    // cluster_topic for new artifacts; previously-joined rows were already
    // sparse in practice.
    pool.query(`
      SELECT a.id, a.artifact_type, a.status, a.title, a.generated_by, a.created_at,
             NULL::text AS primary_keyword,
             NULL::text AS cluster_topic
      FROM analytics.seo_content_artifacts a
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

const PHASE1_INTENT_TO_REMEDY: Record<string, string> = {
  create_page: 'create_new_page',
  strengthen_page: 'strengthen_existing_page',
  improve_ctr: 'metadata_ctr_optimization',
  add_internal_links: 'add_internal_links',
};

function mapPhase1RowToOpportunityShape(row: Record<string, unknown>, idx: number) {
  const intent = String(row.strategic_intent || '');
  const remedy = PHASE1_INTENT_TO_REMEDY[intent] || intent;
  const bucket = String(row.target_page_bucket || '');
  const nsdPageUrl = bucket.startsWith('existing:') ? bucket.replace('existing:', '') : null;

  return {
    opportunity_id: row.opportunity_id,
    opportunity_family: 'page',
    opportunity_type: intent,
    topic_cluster: row.topic_cluster,
    primary_subject: row.topic_cluster,
    nsd_page_url: nsdPageUrl,
    competitor_domain: null,
    total_opportunity_score: Number(row.business_impact_score || 0),
    demand_score: Number(row.max_keyword_score || 0),
    competitive_opportunity_score: Number(row.competitor_evidence_count || 0) / 10,
    authority_gap_score: Number(row.authority_evidence_count || 0) / 10,
    paid_support_score: 0,
    execution_readiness_score: 0,
    primary_remedy: remedy,
    secondary_remedy: null,
    urgency_band: row.urgency_band || 'low',
    data_confidence: Number(row.confidence_score || 0) >= 7 ? 'high' : Number(row.confidence_score || 0) >= 4 ? 'medium' : 'low',
    source_freshness_label: 'healthy',
    confidence_reason: null,
    source_coverage_count: Number(row.keyword_driver_count || 0),
    ahrefs_search_volume: null,
    ahrefs_keyword_difficulty: null,
    ahrefs_cpc: null,
    gsc_impressions: null,
    gsc_best_position: null,
    ads_cost: null,
    ads_conversions: null,
    competitor_referring_domains: null,
    competitor_domain_rating: null,
    evidence_summary_short: [
      `${row.keyword_driver_count || 0} keyword drivers`,
      `${row.competitor_evidence_count || 0} competitor signals`,
      `${row.authority_evidence_count || 0} authority signals`,
      row.commercial_tier ? `tier: ${String(row.commercial_tier).replace(/_/g, ' ')}` : null,
    ].filter(Boolean).join(' | '),
    evidence_summary_long: null,
    internal_link_signal_strength: null,
    nsd_ranking_page: null,
    balanced_rank: idx + 1,
    portfolio_position: null,
    balancing_strategy: null,
    ahrefs_data_stale: null,
    execution_status: row.execution_status as string | null || null,
    approval_status: row.approval_status as string | null || null,
    candidate_id: row.candidate_id ? String(row.candidate_id) : null,
    mutation_type: row.mutation_type as string | null || null,
    rollback_status: row.rollback_status as string | null || null,
    awaiting_approval: row.awaiting_approval as boolean | null || null,
    ready_to_execute: row.ready_to_execute as boolean | null || null,
    phase1_confidence_score: Number(row.confidence_score || 0),
    phase1_business_impact_score: Number(row.business_impact_score || 0),
    phase1_strategic_intent: intent,
    phase1_commercial_tier: row.commercial_tier || null,
    phase1_lifecycle_phase: row.lifecycle_phase || null,
    phase1_bottleneck_primary: row.bottleneck_primary || null,
    phase1_bottleneck_secondary: row.bottleneck_secondary || null,
    phase1_target_page_bucket: bucket,
    phase1_recommended_target_page: row.recommended_target_page || null,
    phase1_wp_page_exists: row.wp_page_exists || null,
    phase1_create_page_warning: row.create_page_warning || null,
    phase1_kpi_primary: row.kpi_primary || null,
    phase1_kpi_secondary: row.kpi_secondary || null,
    phase1_baseline_window_days: row.baseline_window_days != null ? Number(row.baseline_window_days) : null,
    phase1_measurement_window_days: row.measurement_window_days != null ? Number(row.measurement_window_days) : null,
    phase1_baseline_fields: row.baseline_fields || null,
    phase1_success_threshold: row.success_threshold || null,
    phase1_measurement_notes: row.measurement_notes || null,
  };
}

function extractPhase1Fields(detail: Record<string, unknown>) {
  return {
    phase1_confidence_score: Number(detail.phase1_confidence_score ?? detail.confidence_score ?? 0),
    phase1_business_impact_score: Number(detail.phase1_business_impact_score ?? detail.business_impact_score ?? 0),
    phase1_strategic_intent: detail.phase1_strategic_intent ?? detail.strategic_intent ?? null,
    phase1_commercial_tier: detail.phase1_commercial_tier ?? detail.commercial_tier ?? null,
    phase1_lifecycle_phase: detail.phase1_lifecycle_phase ?? detail.lifecycle_phase ?? null,
    phase1_bottleneck_primary: detail.phase1_bottleneck_primary ?? detail.bottleneck_primary ?? null,
    phase1_bottleneck_secondary: detail.phase1_bottleneck_secondary ?? detail.bottleneck_secondary ?? null,
    phase1_target_page_bucket: detail.phase1_target_page_bucket ?? detail.target_page_bucket ?? null,
    phase1_recommended_target_page: detail.phase1_recommended_target_page ?? detail.recommended_target_page ?? null,
    phase1_wp_page_exists: detail.phase1_wp_page_exists ?? detail.wp_page_exists ?? null,
    phase1_create_page_warning: detail.phase1_create_page_warning ?? detail.create_page_warning ?? null,
    phase1_kpi_primary: detail.phase1_kpi_primary ?? detail.kpi_primary ?? null,
    phase1_kpi_secondary: detail.phase1_kpi_secondary ?? detail.kpi_secondary ?? null,
    phase1_baseline_window_days: detail.phase1_baseline_window_days ?? (detail.baseline_window_days != null ? Number(detail.baseline_window_days) : null),
    phase1_measurement_window_days: detail.phase1_measurement_window_days ?? (detail.measurement_window_days != null ? Number(detail.measurement_window_days) : null),
    phase1_baseline_fields: detail.phase1_baseline_fields ?? detail.baseline_fields ?? null,
    phase1_success_threshold: detail.phase1_success_threshold ?? detail.success_threshold ?? null,
    phase1_measurement_notes: detail.phase1_measurement_notes ?? detail.measurement_notes ?? null,
  };
}

// Deprecated 2026-05-12: Phase 1 commercial-gating views (seo_phase1_*)
// were superseded by analytics.seo_action (migration 20260501000035).
// Returns an empty array so existing dashboard pages render an empty
// state instead of failing. Delete the dashboard's Phase 1 panel when
// it's confirmed unused.
async function getPhase1Recommendations(_remedy?: string | null, _urgency?: string | null) {
  return [] as ReturnType<typeof mapPhase1RowToOpportunityShape>[];
}

async function resolveGscPageForCluster(topicCluster: string): Promise<string | null> {
  try {
    const words = topicCluster.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    const likePattern = '%' + words.join('%') + '%';
    const { rows } = await pool.query(`
      SELECT payload->>'page' AS page,
             SUM((payload->>'impressions')::int) AS total_impressions
      FROM analytics.raw_search_console
      WHERE payload->>'query' ILIKE $1
        AND payload->>'page' ILIKE '%neonsignsdepot.com%'
      GROUP BY payload->>'page'
      ORDER BY total_impressions DESC
      LIMIT 1
    `, [likePattern]);
    return rows.length > 0 ? rows[0].page : null;
  } catch {
    return null;
  }
}

const ALLOWED_METADATA_HOSTS = new Set(['neonsignsdepot.com', 'www.neonsignsdepot.com']);

function isAllowedMetadataUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_METADATA_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function fetchLivePageMetadata(url: string): Promise<{ title: string | null; metaDescription: string | null; focusKeyword: string | null }> {
  if (!isAllowedMetadataUrl(url)) return { title: null, metaDescription: null, focusKeyword: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NSD-SEO-Shell/1.0 (metadata-check)' },
      redirect: 'follow',
    });
    if (!resp.ok) return { title: null, metaDescription: null, focusKeyword: null };
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const maxBytes = 512 * 1024;
    const reader = resp.body?.getReader();
    if (!reader) return { title: null, metaDescription: null, focusKeyword: null };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
      if (totalBytes > maxBytes) break;
    }
    reader.cancel().catch(() => {});
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = decoder.decode(Buffer.concat(chunks));
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : null;
    const metaMatch = html.match(/<meta\s[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([\s\S]*?)["'][^>]*\/?>/i)
                   || html.match(/<meta\s[^>]*content\s*=\s*["']([\s\S]*?)["'][^>]*name\s*=\s*["']description["'][^>]*\/?>/i);
    const metaDescription = metaMatch ? metaMatch[1].trim().replace(/\s+/g, ' ') : null;
    // Extract Rank Math focus keyword from article:tag or rankmath meta
    const focusKwMatch = html.match(/<meta\s[^>]*property\s*=\s*["']article:tag["'][^>]*content\s*=\s*["']([\s\S]*?)["'][^>]*\/?>/i)
                      || html.match(/<meta\s[^>]*name\s*=\s*["']keywords["'][^>]*content\s*=\s*["']([\s\S]*?)["'][^>]*\/?>/i);
    const focusKeyword = focusKwMatch ? focusKwMatch[1].trim().replace(/\s+/g, ' ') : null;
    return { title, metaDescription, focusKeyword };
  } catch {
    return { title: null, metaDescription: null, focusKeyword: null };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeToFullUrl(url: string | null): string | null {
  if (!url) return null;
  // Already a full URL
  if (url.startsWith('https://')) return url;
  if (url.startsWith('http://')) return url;
  // Bare path like /shop/business-neon-signs/ — prepend domain
  if (url.startsWith('/')) return `https://neonsignsdepot.com${url}`;
  // Slug without leading slash
  return `https://neonsignsdepot.com/${url}`;
}

async function enrichWithCurrentMetadata(detail: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Resolve page URL for ALL remedy types, not just metadata_ctr_optimization.
  // Every recommendation needs current state context for informed decision-making.
  let pageUrl = normalizeToFullUrl(
    (detail.nsd_page_url as string | null)
    || (detail.phase1_recommended_target_page as string | null)
    || null
  );

  const bucket = detail.phase1_target_page_bucket as string | null;
  if (!pageUrl && bucket && bucket.startsWith('existing:')) {
    pageUrl = normalizeToFullUrl(bucket.replace('existing:', ''));
  }

  if (!pageUrl) {
    const cluster = detail.topic_cluster as string | null;
    if (cluster) {
      pageUrl = normalizeToFullUrl(await resolveGscPageForCluster(cluster));
    }
  }

  if (!pageUrl) {
    return {
      ...detail,
      current_page_url: null,
      current_seo_title: null,
      current_meta_description: null,
      current_focus_keyword: null,
      proposed_focus_keyword: (detail.topic_cluster as string | null)?.toLowerCase() || null,
    };
  }

  const { title, metaDescription, focusKeyword } = await fetchLivePageMetadata(pageUrl);
  return {
    ...detail,
    current_page_url: pageUrl,
    current_seo_title: title,
    current_meta_description: metaDescription,
    current_focus_keyword: focusKeyword,
    proposed_focus_keyword: (detail.topic_cluster as string | null)?.toLowerCase() || null,
  };
}

// Deprecated 2026-05-12 — see getPhase1Recommendations.
async function getPhase1RecommendationDetail(_opportunityId: string) {
  return null;
}

// Deprecated 2026-05-12 — see getPhase1Recommendations.
async function getPhase1Suppressed() {
  return [] as Array<{
    opportunity_id: string;
    topic_cluster: string;
    strategic_intent: string;
    target_page_bucket: string | null;
    recommended_target_page: string | null;
    max_keyword_score: number;
    urgency_band: string;
    keyword_driver_count: number;
    status: string;
    lifecycle_phase: string;
    commercial_tier: string;
    confidence_score: number;
    business_impact_score: number;
    suppression_reason: string;
  }>;
}

// Migrated 2026-05-12: replaced seo_opportunity_queue_balanced (the runaway
// view) + seo_execution_queue with a direct seo_action read.
//
// Score fields the legacy queue computed (total_opportunity_score,
// demand_score, competitive_opportunity_score, authority_gap_score,
// paid_support_score, execution_readiness_score, ahrefs_search_volume,
// ads_cost, competitor_domain_rating, evidence_summary_long, etc.) don't
// exist in seo_action and are returned as null. The dashboard UI gracefully
// degrades when these are missing.
//
// Mappings:
//   opportunity_id    <- id
//   opportunity_family / opportunity_type / primary_remedy <- mutation_type
//   topic_cluster     <- source_cluster
//   primary_subject   <- source_keyword
//   nsd_page_url      <- target_url
//   total_opportunity_score <- agent_review_score
//   gsc_impressions / gsc_best_position <- gsc_impressions / gsc_position
//   urgency_band      <- bucket on agent_review_score (>=7 high, >=4 medium)
//   evidence_summary_short <- proposed_reason
//   execution_status  <- derived from executed_at + execution_error
//   approval_status   <- human_decision
//   awaiting_approval <- status='reviewed' AND human_decision IS NULL
//   ready_to_execute  <- human_decision='approved' AND executed_at IS NULL
async function getEngineRecommendations(limit: number, family?: string | null, remedy?: string | null, urgency?: string | null) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (family || remedy) {
    conditions.push(`sa.mutation_type = $${paramIdx++}`);
    params.push((family || remedy) as string);
  }
  if (urgency === 'high') conditions.push(`sa.agent_review_score >= 7`);
  else if (urgency === 'medium') conditions.push(`sa.agent_review_score >= 4 AND sa.agent_review_score < 7`);
  else if (urgency === 'low') conditions.push(`(sa.agent_review_score IS NULL OR sa.agent_review_score < 4)`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      ROW_NUMBER() OVER (ORDER BY sa.agent_review_score DESC NULLS LAST, sa.gsc_impressions DESC NULLS LAST)::int AS balanced_rank,
      ROW_NUMBER() OVER (ORDER BY sa.agent_review_score DESC NULLS LAST, sa.gsc_impressions DESC NULLS LAST)::int AS canonical_queue_rank,
      ROW_NUMBER() OVER (ORDER BY sa.agent_review_score DESC NULLS LAST, sa.gsc_impressions DESC NULLS LAST)::int AS portfolio_position,
      'agent_score' AS balancing_strategy,
      'sorted by agent review score then GSC impressions' AS balancing_reason,
      sa.id::text AS opportunity_id,
      sa.mutation_type AS opportunity_family,
      sa.mutation_type AS opportunity_type,
      sa.source_cluster AS topic_cluster,
      sa.source_keyword AS primary_subject,
      sa.target_url AS nsd_page_url,
      NULL::text AS competitor_domain,
      sa.agent_review_score::numeric AS total_opportunity_score,
      sa.gsc_impressions::numeric AS demand_score,
      NULL::numeric AS competitive_opportunity_score,
      NULL::numeric AS authority_gap_score,
      NULL::numeric AS paid_support_score,
      sa.agent_review_score::numeric AS execution_readiness_score,
      sa.mutation_type AS primary_remedy,
      NULL::text AS secondary_remedy,
      CASE WHEN sa.agent_review_score IS NOT NULL THEN 'high' ELSE 'medium' END AS data_confidence,
      1::int AS source_coverage_count,
      CASE
        WHEN sa.agent_review_score >= 7 THEN 'high'
        WHEN sa.agent_review_score >= 4 THEN 'medium'
        ELSE 'low'
      END AS urgency_band,
      'fresh' AS source_freshness_label,
      sa.agent_review_notes AS confidence_reason,
      NULL::int AS ahrefs_search_volume,
      NULL::int AS ahrefs_keyword_difficulty,
      NULL::numeric AS ahrefs_cpc,
      sa.gsc_impressions::numeric AS gsc_impressions,
      sa.gsc_position::numeric AS gsc_best_position,
      NULL::numeric AS ads_cost,
      NULL::numeric AS ads_conversions,
      NULL::int AS competitor_referring_domains,
      NULL::numeric AS competitor_domain_rating,
      sa.proposed_reason AS evidence_summary_short,
      sa.proposed_reason AS evidence_summary_long,
      NULL::text AS internal_link_signal_strength,
      sa.target_url AS nsd_ranking_page,
      false AS ahrefs_data_stale,
      CASE
        WHEN sa.executed_at IS NOT NULL AND sa.execution_error IS NULL THEN 'published'
        WHEN sa.executed_at IS NOT NULL AND sa.execution_error IS NOT NULL THEN 'failed'
        WHEN sa.human_decision = 'approved' THEN 'approved'
        WHEN sa.status = 'reviewed' THEN 'proposed'
        ELSE sa.status
      END AS execution_status,
      COALESCE(sa.human_decision, 'pending') AS approval_status,
      sa.id::text AS candidate_id,
      sa.mutation_type,
      CASE WHEN sa.rolled_back_at IS NOT NULL THEN 'rolled_back' ELSE NULL END AS rollback_status,
      (sa.status = 'reviewed' AND sa.human_decision IS NULL) AS awaiting_approval,
      (sa.human_decision = 'approved' AND sa.executed_at IS NULL) AS ready_to_execute
    FROM analytics.seo_action sa
    ${whereClause}
    ORDER BY sa.agent_review_score DESC NULLS LAST, sa.gsc_impressions DESC NULLS LAST
    LIMIT $${paramIdx}
  `, [...params, limit]);

  // pg returns NUMERIC columns as strings; coerce so the UI's .toFixed()
  // calls don't throw "is not a function".
  const numericFields = [
    'total_opportunity_score', 'demand_score', 'competitive_opportunity_score',
    'authority_gap_score', 'paid_support_score', 'execution_readiness_score',
    'gsc_impressions', 'gsc_best_position', 'ahrefs_cpc',
    'competitor_domain_rating',
  ];
  return rows.map((r) => {
    const out: Record<string, unknown> = { ...r };
    for (const k of numericFields) if (out[k] != null) out[k] = Number(out[k]);
    return out;
  });
}

// Migrated 2026-05-12: single-table seo_action lookup.
// execution_candidates returns a synthetic single-row array derived from
// seo_action's own execution fields (executed_at, executed_by, applied_value,
// mutation_type, status, rollback_available, rolled_back_at).
async function getEngineRecommendationDetail(opportunityId: string) {
  const { rows } = await pool.query(`
    SELECT
      sa.id::text AS opportunity_id,
      sa.mutation_type AS opportunity_family,
      sa.mutation_type AS opportunity_type,
      sa.source_cluster AS topic_cluster,
      sa.source_keyword AS primary_subject,
      sa.target_url AS nsd_page_url,
      sa.agent_review_score::numeric AS total_opportunity_score,
      sa.gsc_impressions::numeric AS demand_score,
      NULL::numeric AS competitive_opportunity_score,
      NULL::numeric AS authority_gap_score,
      NULL::numeric AS paid_support_score,
      sa.agent_review_score::numeric AS execution_readiness_score,
      sa.mutation_type AS primary_remedy,
      NULL::text AS secondary_remedy,
      CASE
        WHEN sa.agent_review_score >= 7 THEN 'high'
        WHEN sa.agent_review_score >= 4 THEN 'medium'
        ELSE 'low'
      END AS urgency_band,
      CASE WHEN sa.agent_review_score IS NOT NULL THEN 'high' ELSE 'medium' END AS data_confidence,
      1::int AS source_coverage_count,
      'fresh' AS source_freshness_label,
      sa.agent_review_notes AS confidence_reason,
      NULL::int AS ahrefs_search_volume,
      NULL::int AS ahrefs_keyword_difficulty,
      NULL::numeric AS ahrefs_cpc,
      sa.gsc_impressions::numeric AS gsc_impressions,
      sa.gsc_position::numeric AS gsc_best_position,
      NULL::numeric AS ads_cost,
      NULL::numeric AS ads_conversions,
      NULL::int AS competitor_referring_domains,
      NULL::numeric AS competitor_domain_rating,
      sa.proposed_reason AS evidence_summary_short,
      sa.proposed_reason AS evidence_summary_long,
      NULL::text AS internal_link_signal_strength,
      sa.target_url AS nsd_ranking_page,
      false AS ahrefs_data_stale,
      sa.proposed_value,
      sa.target_field,
      sa.status,
      sa.human_decision,
      sa.executed_at,
      sa.execution_error,
      sa.rollback_available,
      sa.rolled_back_at
    FROM analytics.seo_action sa
    WHERE sa.id::text = $1
  `, [opportunityId]);

  if (rows.length === 0) return null;
  const opp = rows[0];

  // Build the execution_candidates array from this row's own fields so the
  // dashboard's existing execution-candidate panel keeps working with the
  // shape it expects.
  const execStatus = opp.executed_at
    ? (opp.execution_error ? 'failed' : 'published')
    : (opp.human_decision === 'approved' ? 'approved' : 'proposed');
  const apprStatus = opp.human_decision === 'approved'
    ? 'approved'
    : opp.human_decision === 'rejected'
    ? 'rejected'
    : 'pending';

  const execRows = [{
    candidate_id: opportunityId,
    execution_status: execStatus,
    approval_status: apprStatus,
    mutation_type: opp.opportunity_type,
    rollback_status: opp.rolled_back_at ? 'rolled_back' : null,
    target_page_url: opp.nsd_page_url,
    target_field: opp.target_field,
    proposed_value: opp.proposed_value,
    approval_required: true,
    reviewer_id: null,
    reviewed_at: null,
    review_notes: opp.confidence_reason,
    rollback_available: opp.rollback_available,
    execution_timestamp: opp.executed_at,
    created_at: null,
    confidence_tier: null,
    awaiting_approval: execStatus === 'proposed' && apprStatus === 'pending',
    ready_to_execute: apprStatus === 'approved' && !opp.executed_at,
    rollback_eligible: !!opp.executed_at && !!opp.rollback_available,
  }];

  // Coerce numeric strings (pg returns NUMERIC as string)
  const numericFields = [
    'total_opportunity_score', 'demand_score', 'competitive_opportunity_score',
    'authority_gap_score', 'paid_support_score', 'execution_readiness_score',
    'gsc_impressions', 'gsc_best_position', 'ahrefs_cpc',
    'competitor_domain_rating',
  ];
  const cleaned: Record<string, unknown> = { ...opp };
  for (const k of numericFields) if (cleaned[k] != null) cleaned[k] = Number(cleaned[k]);

  return { ...cleaned, execution_candidates: execRows };
}

export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  try {
    const view = req.nextUrl.searchParams.get('view') || 'overview-kpis';
    const competitor = req.nextUrl.searchParams.get('competitor');
    const rawLimit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    const maxLimit = view === 'recommendations' ? 2000 : 500;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : 100;
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
      case 'recommendations': {
        const family = req.nextUrl.searchParams.get('family');
        const remedy = req.nextUrl.searchParams.get('remedy');
        const urgencyFilter = req.nextUrl.searchParams.get('urgency');
        const grouped = req.nextUrl.searchParams.get('grouped') !== 'false';
        const rows = await getEngineRecommendations(limit, family, remedy, urgencyFilter);
        const cards = (rows as unknown as OpportunityRow[]).map(toRecommendationCard);
        result = grouped ? groupIntoSections(cards) : cards;
        break;
      }
      case 'phase1-recommendations': {
        const p1Remedy = req.nextUrl.searchParams.get('remedy');
        const p1Urgency = req.nextUrl.searchParams.get('urgency');
        const p1Grouped = req.nextUrl.searchParams.get('grouped') !== 'false';
        const p1Rows = await getPhase1Recommendations(p1Remedy, p1Urgency);
        const p1Cards = (p1Rows as unknown as OpportunityRow[]).map(toRecommendationCard);
        const p1Result = p1Grouped ? groupIntoSections(p1Cards) : p1Cards;
        result = { sections: p1Result, phase1_fields: p1Rows };
        break;
      }
      case 'phase1-detail': {
        const p1OppId = req.nextUrl.searchParams.get('opportunity_id');
        if (!p1OppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 });
        try {
          const p1Detail = await getPhase1RecommendationDetail(p1OppId);
          if (!p1Detail) return NextResponse.json({ error: 'detail_not_found', opportunity_id: p1OppId, message: 'Could not load detail for this recommendation' }, { status: 404 });
          const p1Enriched = await enrichWithCurrentMetadata(p1Detail as Record<string, unknown>);
          const p1ExecCandidates = p1Enriched.execution_candidates as Array<Record<string, unknown>> | undefined;
          const p1LatestExec = p1ExecCandidates && p1ExecCandidates.length > 0 ? p1ExecCandidates[0] : null;
          const p1DetailWithExec = p1LatestExec
            ? { ...p1Enriched, execution_status: p1LatestExec.execution_status, approval_status: p1LatestExec.approval_status, candidate_id: p1LatestExec.candidate_id, mutation_type: p1LatestExec.mutation_type, rollback_status: p1LatestExec.rollback_status, awaiting_approval: p1LatestExec.awaiting_approval, ready_to_execute: p1LatestExec.ready_to_execute }
            : p1Enriched;
          const p1Card = toRecommendationCard(p1DetailWithExec as unknown as OpportunityRow);
          result = { ...p1Card, evidence_summary_long: null, execution_candidates: p1ExecCandidates, ...extractPhase1Fields(p1Detail), current_page_url: p1Enriched.current_page_url || null, current_seo_title: p1Enriched.current_seo_title || null, current_meta_description: p1Enriched.current_meta_description || null, current_focus_keyword: p1Enriched.current_focus_keyword || null, proposed_focus_keyword: p1Enriched.proposed_focus_keyword || null };
        } catch (detailErr: any) {
          console.error(`[intelligence] phase1-detail error for ${p1OppId}:`, detailErr.message);
          return NextResponse.json({ error: 'detail_not_found', opportunity_id: p1OppId, message: 'Could not load detail for this recommendation' }, { status: 404 });
        }
        break;
      }
      case 'phase1-suppressed': {
        result = await getPhase1Suppressed();
        break;
      }
      case 'recommendation-detail': {
        const oppId = req.nextUrl.searchParams.get('opportunity_id');
        if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 });
        try {
          const detail = await getEngineRecommendationDetail(oppId);
          if (!detail) return NextResponse.json({ error: 'detail_not_found', opportunity_id: oppId, message: 'Could not load recommendation detail' }, { status: 404 });
          const execCandidates = (detail as Record<string, unknown>).execution_candidates as Array<Record<string, unknown>> | undefined;
          const latestExec = execCandidates && execCandidates.length > 0 ? execCandidates[0] : null;
          const detailWithExec = latestExec
            ? { ...detail, execution_status: latestExec.execution_status, approval_status: latestExec.approval_status, candidate_id: latestExec.candidate_id, mutation_type: latestExec.mutation_type, rollback_status: latestExec.rollback_status, awaiting_approval: latestExec.awaiting_approval, ready_to_execute: latestExec.ready_to_execute }
            : detail;
          const card = toRecommendationCard(detailWithExec as unknown as OpportunityRow);
          result = { ...card, evidence_summary_long: (detail as Record<string, unknown>).evidence_summary_long, execution_candidates: execCandidates };
        } catch (detailErr: any) {
          console.error(`[intelligence] recommendation-detail error for ${oppId}:`, detailErr.message);
          return NextResponse.json({ error: 'detail_not_found', opportunity_id: oppId, message: 'Could not load recommendation detail' }, { status: 404 });
        }
        break;
      }
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
