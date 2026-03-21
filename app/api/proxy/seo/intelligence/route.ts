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
  const [engineCounts, pageOpts, internalLinks, contentArtifacts, ahrefsKw, pageIndex, execQueue] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*)::int AS total_opportunities,
        COUNT(DISTINCT topic_cluster)::int AS total_clusters,
        COUNT(*) FILTER (WHERE urgency_band = 'high')::int AS high_urgency,
        COUNT(*) FILTER (WHERE urgency_band = 'medium')::int AS medium_urgency,
        COUNT(*) FILTER (WHERE urgency_band = 'low')::int AS low_urgency
      FROM analytics.seo_opportunity_queue_balanced
    `),
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
        COUNT(*) FILTER (WHERE awaiting_approval = true)::int AS awaiting_approval,
        COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE execution_status = 'published')::int AS published
      FROM analytics.seo_execution_queue
    `),
  ]);

  const eng = engineCounts.rows[0];
  const exec = execQueue.rows[0];

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

async function getPhase1Recommendations(remedy?: string | null, urgency?: string | null) {
  const conditions: string[] = [];
  const params: string[] = [];
  let paramIdx = 1;

  if (remedy) {
    const intentKey = Object.entries(PHASE1_INTENT_TO_REMEDY).find(([, v]) => v === remedy)?.[0] || remedy;
    conditions.push(`p.strategic_intent = $${paramIdx++}`);
    params.push(intentKey);
  }
  if (urgency) {
    conditions.push(`p.urgency_band = $${paramIdx++}`);
    params.push(urgency);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      p.*,
      e.execution_status, e.approval_status, e.candidate_id::text,
      e.mutation_type, e.rollback_status,
      e.awaiting_approval, e.ready_to_execute
    FROM analytics.seo_phase1_opportunity p
    LEFT JOIN LATERAL (
      SELECT eq.execution_status, eq.approval_status, eq.candidate_id,
             eq.mutation_type, eq.rollback_status,
             eq.awaiting_approval, eq.ready_to_execute
      FROM analytics.seo_execution_queue eq
      WHERE eq.opportunity_id = p.opportunity_id::text
      ORDER BY eq.created_at DESC
      LIMIT 1
    ) e ON true
    ${whereClause}
    ORDER BY p.business_impact_score DESC NULLS LAST, p.confidence_score DESC NULLS LAST
  `, params);

  return rows.map((r, i) => mapPhase1RowToOpportunityShape(r, i));
}

async function getPhase1RecommendationDetail(opportunityId: string) {
  const { rows } = await pool.query(`
    SELECT p.*
    FROM analytics.seo_phase1_opportunity p
    WHERE p.opportunity_id = $1
  `, [opportunityId]);

  if (rows.length === 0) return null;

  const { rows: execRows } = await pool.query(`
    SELECT candidate_id::text, execution_status, approval_status,
           mutation_type, rollback_status, target_page_url, target_field,
           proposed_value, approval_required, reviewer_id, reviewed_at,
           review_notes, rollback_available, execution_timestamp,
           awaiting_approval, ready_to_execute, rollback_eligible,
           created_at
    FROM analytics.seo_execution_queue
    WHERE opportunity_id::text = $1
    ORDER BY created_at DESC
  `, [opportunityId]);

  const mapped = mapPhase1RowToOpportunityShape(rows[0], 0);
  return { ...mapped, execution_candidates: execRows };
}

async function getPhase1Suppressed() {
  const { rows } = await pool.query(`
    SELECT * FROM analytics.seo_phase1_suppressed
    ORDER BY business_impact_score DESC NULLS LAST
  `);

  return rows.map((r, i) => ({
    opportunity_id: r.opportunity_id,
    topic_cluster: r.topic_cluster,
    strategic_intent: r.strategic_intent,
    target_page_bucket: r.target_page_bucket,
    recommended_target_page: r.recommended_target_page,
    max_keyword_score: Number(r.max_keyword_score || 0),
    urgency_band: r.urgency_band || 'low',
    keyword_driver_count: Number(r.keyword_driver_count || 0),
    status: r.status,
    lifecycle_phase: r.lifecycle_phase,
    commercial_tier: r.commercial_tier,
    confidence_score: Number(r.confidence_score || 0),
    business_impact_score: Number(r.business_impact_score || 0),
    suppression_reason: r.suppression_reason,
  }));
}

async function getEngineRecommendations(limit: number, family?: string | null, remedy?: string | null, urgency?: string | null) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (family) {
    conditions.push(`q.opportunity_family = $${paramIdx++}`);
    params.push(family);
  }
  if (remedy) {
    conditions.push(`q.primary_remedy = $${paramIdx++}`);
    params.push(remedy);
  }
  if (urgency) {
    conditions.push(`q.urgency_band = $${paramIdx++}`);
    params.push(urgency);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(`
    SELECT
      q.balanced_rank, q.canonical_queue_rank, q.portfolio_position,
      q.balancing_strategy, q.balancing_reason,
      q.opportunity_id, q.opportunity_family, q.opportunity_type,
      q.topic_cluster, q.primary_subject, q.nsd_page_url, q.competitor_domain,
      q.total_opportunity_score::numeric, q.demand_score::numeric,
      q.competitive_opportunity_score::numeric, q.authority_gap_score::numeric,
      q.paid_support_score::numeric, q.execution_readiness_score::numeric,
      q.primary_remedy, q.secondary_remedy,
      q.data_confidence, q.source_coverage_count::int, q.urgency_band,
      q.source_freshness_label, q.confidence_reason,
      q.ahrefs_search_volume::int, q.ahrefs_keyword_difficulty::int,
      q.ahrefs_cpc::numeric, q.gsc_impressions::numeric, q.gsc_best_position::numeric,
      q.ads_cost::numeric, q.ads_conversions::numeric,
      q.competitor_referring_domains::int, q.competitor_domain_rating::numeric,
      q.evidence_summary_short, q.evidence_summary_long,
      q.internal_link_signal_strength, q.nsd_ranking_page,
      q.ahrefs_data_stale,
      e.execution_status, e.approval_status, e.candidate_id::text,
      e.mutation_type, e.rollback_status,
      e.awaiting_approval, e.ready_to_execute
    FROM analytics.seo_opportunity_queue_balanced q
    LEFT JOIN LATERAL (
      SELECT eq.execution_status, eq.approval_status, eq.candidate_id,
             eq.mutation_type, eq.rollback_status,
             eq.awaiting_approval, eq.ready_to_execute
      FROM analytics.seo_execution_queue eq
      WHERE eq.opportunity_id = q.opportunity_id
      ORDER BY eq.created_at DESC
      LIMIT 1
    ) e ON true
    ${whereClause}
    ORDER BY q.balanced_rank ASC
    LIMIT $${paramIdx}
  `, [...params, limit]);

  return rows;
}

async function getEngineRecommendationDetail(opportunityId: string) {
  const { rows } = await pool.query(`
    SELECT
      q.balanced_rank, q.canonical_queue_rank, q.portfolio_position,
      q.balancing_strategy, q.balancing_reason,
      q.opportunity_id, q.opportunity_family, q.opportunity_type,
      q.topic_cluster, q.primary_subject, q.nsd_page_url, q.competitor_domain,
      q.total_opportunity_score::numeric, q.demand_score::numeric,
      q.competitive_opportunity_score::numeric, q.authority_gap_score::numeric,
      q.paid_support_score::numeric, q.execution_readiness_score::numeric,
      q.primary_remedy, q.secondary_remedy,
      q.data_confidence, q.source_coverage_count::int, q.urgency_band,
      q.source_freshness_label, q.confidence_reason,
      q.ahrefs_search_volume::int, q.ahrefs_keyword_difficulty::int,
      q.ahrefs_cpc::numeric, q.gsc_impressions::numeric, q.gsc_best_position::numeric,
      q.ads_cost::numeric, q.ads_conversions::numeric,
      q.competitor_referring_domains::int, q.competitor_domain_rating::numeric,
      q.evidence_summary_short, q.evidence_summary_long,
      q.internal_link_signal_strength, q.nsd_ranking_page,
      q.ahrefs_data_stale
    FROM analytics.seo_opportunity_queue_balanced q
    WHERE q.opportunity_id = $1
  `, [opportunityId]);

  if (rows.length === 0) return null;
  const opp = rows[0];

  const { rows: execRows } = await pool.query(`
    SELECT candidate_id::text, execution_status, approval_status,
           mutation_type, rollback_status, target_page_url, target_field,
           proposed_value, approval_required, reviewer_id, reviewed_at,
           review_notes, rollback_available, execution_timestamp,
           awaiting_approval, ready_to_execute, rollback_eligible,
           created_at
    FROM analytics.seo_execution_queue
    WHERE opportunity_id = $1
    ORDER BY created_at DESC
  `, [opportunityId]);

  return { ...opp, execution_candidates: execRows };
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
        const p1Detail = await getPhase1RecommendationDetail(p1OppId);
        if (!p1Detail) return NextResponse.json({ error: 'Phase-1 opportunity not found' }, { status: 404 });
        const p1ExecCandidates = (p1Detail as Record<string, unknown>).execution_candidates as Array<Record<string, unknown>> | undefined;
        const p1LatestExec = p1ExecCandidates && p1ExecCandidates.length > 0 ? p1ExecCandidates[0] : null;
        const p1DetailWithExec = p1LatestExec
          ? { ...p1Detail, execution_status: p1LatestExec.execution_status, approval_status: p1LatestExec.approval_status, candidate_id: p1LatestExec.candidate_id, mutation_type: p1LatestExec.mutation_type, rollback_status: p1LatestExec.rollback_status, awaiting_approval: p1LatestExec.awaiting_approval, ready_to_execute: p1LatestExec.ready_to_execute }
          : p1Detail;
        const p1Card = toRecommendationCard(p1DetailWithExec as unknown as OpportunityRow);
        result = { ...p1Card, evidence_summary_long: null, execution_candidates: p1ExecCandidates, ...extractPhase1Fields(p1Detail) };
        break;
      }
      case 'phase1-suppressed': {
        result = await getPhase1Suppressed();
        break;
      }
      case 'recommendation-detail': {
        const oppId = req.nextUrl.searchParams.get('opportunity_id');
        if (!oppId) return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 });
        const detail = await getEngineRecommendationDetail(oppId);
        if (!detail) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
        const execCandidates = (detail as Record<string, unknown>).execution_candidates as Array<Record<string, unknown>> | undefined;
        const latestExec = execCandidates && execCandidates.length > 0 ? execCandidates[0] : null;
        const detailWithExec = latestExec
          ? { ...detail, execution_status: latestExec.execution_status, approval_status: latestExec.approval_status, candidate_id: latestExec.candidate_id, mutation_type: latestExec.mutation_type, rollback_status: latestExec.rollback_status, awaiting_approval: latestExec.awaiting_approval, ready_to_execute: latestExec.ready_to_execute }
          : detail;
        const card = toRecommendationCard(detailWithExec as unknown as OpportunityRow);
        result = { ...card, evidence_summary_long: (detail as Record<string, unknown>).evidence_summary_long, execution_candidates: execCandidates };
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
