'use client';

export interface SeoCluster {
  id: string;
  cluster_topic: string;
  keyword_count: number;
  total_impressions: number;
  avg_position: number;
  avg_ctr: number;
  primary_keyword: string;
}

export interface SeoClusterMember {
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
}

export interface SeoClusterDetail extends SeoCluster {
  members: SeoClusterMember[];
}

export interface SeoOpportunity {
  id: string;
  cluster_id: string;
  cluster_topic: string;
  opportunity_type: 'optimize_existing_page' | 'create_new_page' | 'expand_content';
  total_impressions: number;
  avg_position: number;
  suggested_action: string;
}

export interface SeoRecommendation {
  id: string;
  cluster_id: string;
  cluster_topic: string;
  primary_keyword: string;
  recommended_action: string;
  recommended_url: string;
  recommended_title?: string;
  recommended_meta_description?: string;
  target_url?: string;
  opportunity_type: string;
  estimated_impact?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  feedback?: string;
  created_at: string;
}

export interface SeoOutcome {
  id: string;
  cluster_topic: string;
  keyword: string;
  page_url: string;
  old_position: number | null;
  new_position: number | null;
  ctr_change: number;
  traffic_change: number;
  execution_date: string;
  measured_at_14d: string | null;
  measured_at_30d: string | null;
  measured_at_90d: string | null;
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const windowWithToken = window as any;
    const token =
      windowWithToken.__NSD_AUTH_TOKEN__ ||
      windowWithToken.__SALES_ENGINE_TOKEN__ ||
      process.env.NEXT_PUBLIC_NSD_DEV_JWT;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

// Default per-request timeout for all SEO lib fetches.
// Mirrors the Overview's Promise.allSettled + 8s timeout pattern so no SEO sub-page
// can stall indefinitely on a single hung upstream (Postgres pool, proxy route, etc.).
// Callers may pass their own AbortSignal to override.
const SEO_FETCH_TIMEOUT_MS = 8000;

async function seoFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEO_FETCH_TIMEOUT_MS);
  // If the caller passed their own signal, abort our controller when theirs fires.
  if (options?.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...getAuthHeaders(),
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SEO API error ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`SEO API timeout after ${SEO_FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getClusters(): Promise<SeoCluster[]> {
  const data = await seoFetch<{ data: SeoCluster[] }>('/api/proxy/seo/clusters');
  return data.data ?? [];
}

export async function getClusterMembers(clusterId: string): Promise<SeoClusterDetail> {
  const data = await seoFetch<{ data: SeoClusterDetail }>(`/api/proxy/seo/clusters?id=${clusterId}`);
  return data.data;
}

export async function getClusterOpportunities(): Promise<SeoOpportunity[]> {
  const data = await seoFetch<{ data: SeoOpportunity[] }>('/api/proxy/seo/cluster-opportunities');
  return data.data ?? [];
}

export async function getRecommendations(): Promise<SeoRecommendation[]> {
  const data = await seoFetch<{ data: SeoRecommendation[] }>('/api/proxy/seo/recommendations');
  return data.data ?? [];
}

export async function approveRecommendation(id: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ candidate_id: id, action: 'approve', target: 'engine' }),
  });
}

export async function rejectRecommendation(id: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ candidate_id: id, action: 'reject', target: 'engine' }),
  });
}

export async function submitFeedback(id: string, feedbackText: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ id, action: 'feedback', feedback_text: feedbackText }),
  });
}

export async function getOutcomes(): Promise<SeoOutcome[]> {
  const data = await seoFetch<{ data: SeoOutcome[] }>('/api/proxy/seo/outcomes');
  return data.data ?? [];
}

export interface SeoOverviewKpis {
  total_clusters: number;
  total_opportunities: number;
  high_urgency: number;
  medium_urgency: number;
  low_urgency: number;
  page_optimization_recs: number;
  internal_link_recs: number;
  content_artifacts: number;
  ahrefs_keywords_tracked: number;
  indexed_pages: number;
  execution_candidates_total: number;
  awaiting_approval: number;
  approved: number;
  published: number;
  last_pipeline_run_at: string | null;
  auto_approve_enabled: boolean;
  auto_approve_daily_cap: number;
  auto_approve_min_score: number;
  auto_approved_today: number;
  seo_auto_execute_env: boolean;
  metric_contracts?: SeoDashboardMetricContract[];
}

export interface SeoDashboardMetricContract {
  metric_key: string;
  panel: string;
  label: string;
  grain: string;
  window_kind: 'windowed' | 'lifetime' | 'window_less';
  freshness_source: string | null;
  source_label: string;
  window_label: string;
  display_order: number;
  notes: string | null;
}

export interface PageQueryPerformance {
  url: string;
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

export interface PageOptimizationRec {
  id: string;
  url: string;
  page_type: string;
  primary_keyword: string;
  optimization_type: string;
  recommended_title: string;
  recommended_meta_description: string;
  content_recommendations: string | null;
  priority_score: number;
  status: string;
  created_at: string;
  generated_by: string;
}

export interface InternalLinkRec {
  id: string;
  source_page: string;
  target_page: string;
  anchor_text: string;
  reason: string;
  priority: string;
  rule_source: string;
  created_at: string;
}

export interface ContentArtifact {
  id: string;
  artifact_type: string;
  status: string;
  title: string;
  generated_by: string;
  created_at: string;
  primary_keyword: string;
  cluster_topic: string;
}

export interface GenerationCandidate {
  cluster_id: string;
  cluster_keyword: string;
  total_impressions: number;
  avg_position: number;
  keyword_count: number;
  seo_priority_score: number;
}

export interface GenerationEvent {
  id: string;
  event_type: string;
  generator_version: string;
  model: string;
  created_at: string;
}

export interface ContentPipeline {
  artifacts: ContentArtifact[];
  candidates: GenerationCandidate[];
  events: GenerationEvent[];
}

export interface AhrefsKeywordGap {
  keyword: string;
  competitor_domain: string;
  volume: number;
  keyword_difficulty: number;
  cpc: number;
  best_position: number;
  best_position_url: string;
  sum_traffic: number;
  topic_cluster: string;
}

export interface AhrefsBacklinkGap {
  domain: string;
  competitor_domain: string;
  domain_rating: number;
  traffic_domain: number;
  dofollow_links: number;
  links_to_target: number;
  first_seen: string;
}

export interface AhrefsTopPage {
  url: string;
  competitor_domain: string;
  sum_traffic: number;
  keywords: number;
  top_keyword: string;
  top_keyword_volume: number;
  top_keyword_best_position: number;
  referring_domains: number;
  value: number;
  topic_cluster: string;
}

export interface ClusterPriority {
  cluster_id: string;
  cluster_keyword: string;
  total_impressions: number;
  avg_position: number;
  keyword_count: number;
  ranking_opportunity: number;
  missing_page_signal: number;
  seo_priority_score: number;
}

async function seoIntelFetch<T>(view: string, params?: Record<string, string>): Promise<T> {
  const sp = new URLSearchParams({ view });
  if (params) Object.entries(params).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const data = await seoFetch<{ data: T }>(`/api/proxy/seo/intelligence?${sp.toString()}`);
  return data.data;
}

export async function getSeoOverviewKpis(): Promise<SeoOverviewKpis> {
  return seoIntelFetch<SeoOverviewKpis>('overview-kpis');
}

export async function getPagePerformance(sortBy?: string, limit?: number): Promise<PageQueryPerformance[]> {
  return seoIntelFetch<PageQueryPerformance[]>('page-performance', {
    sort_by: sortBy || 'impressions',
    limit: String(limit || 100),
  });
}

export async function getPageOptimizations(): Promise<PageOptimizationRec[]> {
  return seoIntelFetch<PageOptimizationRec[]>('page-optimization');
}

export async function getInternalLinkRecs(): Promise<InternalLinkRec[]> {
  return seoIntelFetch<InternalLinkRec[]>('internal-links');
}

export async function getContentPipelineData(): Promise<ContentPipeline> {
  return seoIntelFetch<ContentPipeline>('content-pipeline');
}

export async function getCompetitiveKeywordGap(competitor?: string): Promise<AhrefsKeywordGap[]> {
  return seoIntelFetch<AhrefsKeywordGap[]>('competitive-gap', { competitor: competitor || '' });
}

export async function getCompetitiveBacklinks(competitor?: string): Promise<AhrefsBacklinkGap[]> {
  return seoIntelFetch<AhrefsBacklinkGap[]>('competitive-backlinks', { competitor: competitor || '' });
}

export async function getCompetitiveTopPages(competitor?: string): Promise<AhrefsTopPage[]> {
  return seoIntelFetch<AhrefsTopPage[]>('competitive-pages', { competitor: competitor || '' });
}

export async function getClusterPriorities(limit?: number): Promise<ClusterPriority[]> {
  return seoIntelFetch<ClusterPriority[]>('cluster-priorities', { limit: String(limit || 50) });
}

export async function getCompetitorsList(): Promise<string[]> {
  return seoIntelFetch<string[]>('competitors-list');
}

export interface EngineRecommendationCard {
  opportunity_id: string;
  balanced_rank: number;
  portfolio_position: string | null;
  opportunity_family: string;
  primary_remedy: string;
  secondary_remedy: string | null;
  topic_cluster: string;
  primary_subject: string;
  nsd_page_url: string | null;
  competitor_domain: string | null;
  total_opportunity_score: number;
  urgency_band: string;
  data_confidence: string;
  source_freshness_label: string;
  confidence_reason: string | null;
  recommendation_title: string;
  recommendation_summary: string;
  recommendation_reason: string;
  evidence_summary_short: string;
  action_state_badge: string;
  ahrefs_search_volume: number | null;
  ahrefs_keyword_difficulty: number | null;
  ahrefs_cpc: number | null;
  gsc_impressions: number | null;
  gsc_best_position: number | null;
  ads_cost: number | null;
  ads_conversions: number | null;
  competitor_referring_domains: number | null;
  competitor_domain_rating: number | null;
  internal_link_signal_strength: string | null;
  nsd_ranking_page: string | null;
  execution_status: string | null;
  approval_status: string | null;
  candidate_id: string | null;
  mutation_type: string | null;
  rollback_status: string | null;
  recommendation_source?: 'cluster_engine' | 'phase1' | 'manual';
  coverage_validated?: boolean;
  recommendation_quality_score?: number | null;
}

export interface EngineRecommendationSection {
  section_id: string;
  section_title: string;
  section_description: string;
  items: EngineRecommendationCard[];
}

export interface EngineRecommendationDetail extends EngineRecommendationCard {
  evidence_summary_long: string | null;
  execution_candidates: Array<{
    candidate_id: string | null;
    execution_status: string | null;
    approval_status: string | null;
    mutation_type: string | null;
    rollback_status: string | null;
    target_page_url: string | null;
    target_field: string | null;
    proposed_value: string | null;
    approval_required: boolean | null;
    reviewer_id: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    rollback_available: boolean | null;
    execution_timestamp: string | null;
    awaiting_approval: boolean | null;
    ready_to_execute: boolean | null;
    rollback_eligible: boolean | null;
    created_at: string | null;
    confidence_tier: string | null;
  }>;
}

export async function getEngineRecommendations(opts?: {
  limit?: number;
  family?: string;
  remedy?: string;
  urgency?: string;
  grouped?: boolean;
}): Promise<EngineRecommendationSection[]> {
  const params: Record<string, string> = {};
  if (opts?.limit) params.limit = String(opts.limit);
  if (opts?.family) params.family = opts.family;
  if (opts?.remedy) params.remedy = opts.remedy;
  if (opts?.urgency) params.urgency = opts.urgency;
  if (opts?.grouped === false) params.grouped = 'false';
  return seoIntelFetch<EngineRecommendationSection[]>('recommendations', params);
}

export async function getEngineRecommendationDetail(opportunityId: string): Promise<EngineRecommendationDetail> {
  return seoIntelFetch<EngineRecommendationDetail>('recommendation-detail', { opportunity_id: opportunityId });
}

export interface Phase1MeasurementPlan {
  phase1_kpi_primary: string | null;
  phase1_kpi_secondary: string | null;
  phase1_baseline_window_days: number | null;
  phase1_measurement_window_days: number | null;
  phase1_baseline_fields: string[] | null;
  phase1_success_threshold: string | null;
  phase1_measurement_notes: string | null;
}

export interface Phase1Fields extends Phase1MeasurementPlan {
  phase1_confidence_score: number;
  phase1_business_impact_score: number;
  phase1_strategic_intent: string | null;
  phase1_commercial_tier: string | null;
  phase1_lifecycle_phase: string | null;
  phase1_bottleneck_primary: string | null;
  phase1_bottleneck_secondary: string | null;
  phase1_target_page_bucket: string | null;
  phase1_recommended_target_page: string | null;
  phase1_wp_page_exists: boolean | null;
  phase1_create_page_warning: string | null;
}

export interface Phase1RecommendationsResponse {
  sections: EngineRecommendationSection[];
  phase1_fields: Array<EngineRecommendationCard & Phase1Fields>;
}

export interface Phase1DetailResponse extends EngineRecommendationDetail, Phase1Fields {
  current_page_url: string | null;
  current_seo_title: string | null;
  current_meta_description: string | null;
  current_focus_keyword: string | null;
  proposed_focus_keyword: string | null;
}

export interface Phase1SuppressedRow {
  opportunity_id: string;
  topic_cluster: string;
  strategic_intent: string;
  target_page_bucket: string | null;
  recommended_target_page: string | null;
  max_keyword_score: number;
  urgency_band: string;
  keyword_driver_count: number;
  status: string;
  lifecycle_phase: string | null;
  commercial_tier: string | null;
  confidence_score: number;
  business_impact_score: number;
  suppression_reason: string;
}

export async function getPhase1Recommendations(opts?: {
  remedy?: string;
  urgency?: string;
}): Promise<Phase1RecommendationsResponse> {
  const params: Record<string, string> = {};
  if (opts?.remedy) params.remedy = opts.remedy;
  if (opts?.urgency) params.urgency = opts.urgency;
  return seoIntelFetch<Phase1RecommendationsResponse>('phase1-recommendations', params);
}

export async function getPhase1RecommendationDetail(opportunityId: string): Promise<Phase1DetailResponse> {
  return seoIntelFetch<Phase1DetailResponse>('phase1-detail', { opportunity_id: opportunityId });
}

export async function getPhase1Suppressed(): Promise<Phase1SuppressedRow[]> {
  return seoIntelFetch<Phase1SuppressedRow[]>('phase1-suppressed');
}

export async function approveEngineCandidate(opts: {
  candidate_id?: string;
  opportunity_id?: string;
  review_notes?: string;
  proposed_value?: string;
  target_page_url?: string;
}): Promise<void> {
  await seoFetch('/api/proxy/seo/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      action: 'approve',
      target: 'engine',
      candidate_id: opts.candidate_id,
      opportunity_id: opts.opportunity_id,
      review_notes: opts.review_notes,
      proposed_value: opts.proposed_value,
      target_page_url: opts.target_page_url,
    }),
  });
}

export async function rejectEngineCandidate(opts: {
  candidate_id?: string;
  opportunity_id?: string;
  review_notes?: string;
}): Promise<void> {
  await seoFetch('/api/proxy/seo/recommendations', {
    method: 'POST',
    body: JSON.stringify({
      action: 'reject',
      target: 'engine',
      candidate_id: opts.candidate_id,
      opportunity_id: opts.opportunity_id,
      review_notes: opts.review_notes,
    }),
  });
}

// =============================================================================
// Content Pipeline — Page Briefs
// =============================================================================

export interface PageBriefSummary {
  id: string;
  cluster_id: string | null;
  cluster_keyword: string | null;
  target_keyword: string;
  suggested_title: string | null;
  status: string;
  total_word_count_target: number;
  wp_draft_url: string | null;
  trigger_source: string | null;
  content_type: string | null;
  content_type_confidence: string | null;
  created_at: string;
}

export async function getPageBriefs(status?: string): Promise<PageBriefSummary[]> {
  const params = status ? `?status=${status}` : '';
  const data = await seoFetch<{ data: PageBriefSummary[] }>(`/api/proxy/seo/page-briefs${params}`);
  return data.data ?? [];
}

export async function updateBriefStatus(briefId: string, status: string): Promise<void> {
  await seoFetch('/api/proxy/seo/page-briefs', {
    method: 'POST',
    body: JSON.stringify({ action: 'update-status', briefId, status }),
  });
}

export async function generateBriefFromGap(targetKeyword: string, clusterId?: string): Promise<void> {
  await seoFetch('/api/proxy/seo/page-briefs', {
    method: 'POST',
    body: JSON.stringify({ action: 'generate', targetKeyword, clusterId, triggerSource: 'manual' }),
  });
}

// =============================================================================
// Content Pipeline — Competitor Gaps
// =============================================================================

export interface CompetitorGapSummary {
  id: string;
  competitor_url: string;
  gap_type: string;
  keyword: string | null;
  competitor_ranking_position: number | null;
  our_ranking_position: number | null;
  our_ranking_position_window?: number | null;
  competitor_page_url: string | null;
  cluster_keyword: string | null;
  opportunity_score: number | null;
  status: string;
  discovered_at: string;
}

export async function getCompetitorGaps(type?: string, status?: string): Promise<CompetitorGapSummary[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  const qs = params.toString();
  const data = await seoFetch<{ data: CompetitorGapSummary[] }>(`/api/proxy/seo/competitor-gaps${qs ? `?${qs}` : ''}`);
  return data.data ?? [];
}

// =============================================================================
// Phase 4 — Schema Markup
// =============================================================================

export interface SchemaMarkupRow {
  id: string;
  page_path: string;
  schema_type: string;
  schema_json: Record<string, unknown>;
  status: string;
  wp_page_id: number | null;
  applied_at: string | null;
  created_at: string;
}

export async function getSchemaMarkup(status?: string): Promise<SchemaMarkupRow[]> {
  const qs = status ? `?status=${status}` : '';
  const data = await seoFetch<{ data: SchemaMarkupRow[] }>(`/api/proxy/seo/schema${qs}`);
  return data.data ?? [];
}

export async function updateSchemaMarkupStatus(id: string, status: string): Promise<void> {
  await seoFetch('/api/proxy/seo/schema', {
    method: 'POST',
    body: JSON.stringify({ action: 'update-status', id, status }),
  });
}

export async function applySchemaMarkup(id: string): Promise<void> {
  await seoFetch('/api/proxy/seo/schema', {
    method: 'POST',
    body: JSON.stringify({ action: 'apply', id }),
  });
}

// =============================================================================
// Phase 4 — Signals (Decay, Cannibalization, Topical Authority)
// =============================================================================

export interface DecaySignalRow {
  id: string;
  page_path: string;
  keyword: string;
  position_30d_ago: number | null;
  position_now: number | null;
  position_delta: number | null;
  traffic_delta_pct: number | null;
  decay_score: number | null;
  status: string;
  detected_at: string;
}

export interface CannibalizationRow {
  id: string;
  keyword: string;
  page_path_a: string;
  page_path_b: string;
  overlap_score: number | null;
  suggested_canonical: string | null;
  canonical_confidence: string | null;
  status: string;
  detected_at: string;
}

export interface TopicalGapRow {
  id: string;
  topic: string;
  subtopic: string | null;
  gap_type: string;
  related_cluster_id: string | null;
  opportunity_score: number | null;
  status: string;
  discovered_at: string;
}

export async function getSignals(type: 'decay' | 'cannibalization' | 'topical-gaps', params?: Record<string, string>): Promise<unknown[]> {
  const qs = new URLSearchParams({ type, ...(params || {}) }).toString();
  const data = await seoFetch<{ data: unknown[] }>(`/api/proxy/seo/signals?${qs}`);
  return data.data ?? [];
}

export async function updateSignalStatus(signalType: string, id: string, status: string): Promise<void> {
  await seoFetch('/api/proxy/seo/signals', {
    method: 'POST',
    body: JSON.stringify({ action: 'update-status', signalType, id, status }),
  });
}

export interface GscPipelineHealth {
  status: 'healthy' | 'warning' | 'stale' | 'credential_error';
  credentials_valid?: boolean;
  last_run_at: string | null;
  last_successful_run: string | null;
  last_error: string | null;
  raw_data_last_date: string | null;
  days_behind: number | null;
}

export async function getGscPipelineHealth(): Promise<GscPipelineHealth> {
  return seoFetch<GscPipelineHealth>('/api/proxy/seo/pipeline-health');
}

// =============================================================================
// SEO Progress (Today's Brief + Weekly/Monthly Scoreboard)
// =============================================================================

// =============================================================================
// SEO Actions (simplified pipeline)
// =============================================================================

export async function getSeoActions(status: string, limit = 50): Promise<unknown[]> {
  const data = await seoFetch<{ data: unknown[] }>(`/api/proxy/seo/actions?status=${status}&limit=${limit}`);
  return data.data ?? [];
}

export async function approveSeoAction(id: string, notes?: string): Promise<void> {
  await seoFetch('/api/proxy/seo/actions', {
    method: 'POST',
    body: JSON.stringify({ id, action: 'approve', notes }),
  });
}

export async function rejectSeoAction(id: string, notes?: string): Promise<void> {
  await seoFetch('/api/proxy/seo/actions', {
    method: 'POST',
    body: JSON.stringify({ id, action: 'reject', notes }),
  });
}

export interface SeoProgressDelta {
  current: number;
  prior: number;
  delta_pct: number;
}

export interface SeoProgressPositionDelta {
  current: number | null;
  prior: number | null;
  delta: number | null;
}

export interface SeoProgressResponse {
  today: {
    actions_yesterday: {
      applied: number;
      approved: number;
      rejected: number;
      pages: string[];
    };
    needs_attention: {
      decay_count: number;
      cannibalization_count: number;
      awaiting_approval: number;
      urgent_pages: number;
      top_decay_page: string | null;
    };
    pipeline_health: {
      last_cluster_run: string | null;
      last_decay_detection: string | null;
      last_execution: string | null;
      last_gsc_date: string | null;
    };
  };
  week: {
    organic_clicks: SeoProgressDelta;
    organic_impressions: SeoProgressDelta;
    avg_position: SeoProgressPositionDelta;
    pages_optimized: number;
    pages_measuring: number;
  };
  month: {
    organic_clicks: SeoProgressDelta;
    organic_impressions: SeoProgressDelta;
    avg_position: SeoProgressPositionDelta;
    pages_optimized: number;
    win_rate_pct: number | null;
    win_sample_size: number;
  };
}

export async function getSeoProgress(): Promise<SeoProgressResponse> {
  return seoFetch<SeoProgressResponse>('/api/proxy/seo/progress');
}

// =============================================================================
// SEO Timeseries (daily clicks/impressions, post-Ahrefs — sourced from GSC)
// =============================================================================

export interface SeoTimeseriesPoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number | null;
}

export interface SeoTimeseriesResponse {
  range_days: number;
  start_date: string | null;
  end_date: string | null;
  gsc_window_start?: string | null;
  gsc_window_end?: string | null;
  gsc_available_start?: string | null;
  gsc_available_end?: string | null;
  series: SeoTimeseriesPoint[];
  summary: {
    total_clicks: number;
    total_impressions: number;
    half_over_half_delta_pct: number | null;
  };
}

export interface SeoWindowRequest {
  days: number;
  start?: string | null;
  end?: string | null;
}

function seoWindowQuery(window?: SeoWindowRequest): string {
  const sp = new URLSearchParams();
  if (window?.days) sp.set('days', String(window.days));
  if (window?.start) sp.set('start', window.start);
  if (window?.end) sp.set('end', window.end);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export async function getSeoTimeseries(window: number | SeoWindowRequest): Promise<SeoTimeseriesResponse> {
  const req = typeof window === 'number' ? { days: window } : window;
  return seoFetch<SeoTimeseriesResponse>(`/api/proxy/seo/timeseries${seoWindowQuery(req)}`);
}

// =============================================================================
// Competitor Gaps (post-Ahrefs — sourced from analytics.seo_competitor_gap,
// produced by the ODS cluster engine, not Ahrefs).
// =============================================================================

export interface SeoCompetitorGap {
  id: string;
  competitor_url: string;
  gap_type: 'keyword' | 'content' | string;
  keyword: string | null;
  competitor_ranking_position: number | null;
  our_ranking_position: number | null;
  competitor_page_url: string | null;
  competitor_page_title: string | null;
  content_gap_notes: string | null;
  cluster_id: string | null;
  cluster_keyword: string | null;
  opportunity_score: number | null;
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  status: string;
  dismissed_reason: string | null;
  discovered_at: string;
  reference_metrics_source?: string | null;
  reference_metrics_observed_at?: string | null;
  gsc_window_start?: string | null;
  gsc_window_end?: string | null;
  gsc_available_start?: string | null;
  gsc_available_end?: string | null;
}

export interface SeoCompetitorGapMeta {
  total_count: number;
  filtered_count: number;
  returned_count: number;
  status_counts: Record<string, number>;
  limit: number | null;
  filter_note: string;
}

export interface SeoCompetitorGapFeed {
  data: SeoCompetitorGap[];
  meta: SeoCompetitorGapMeta;
}

export async function getSeoCompetitorGaps(opts?: { type?: string; status?: string } & SeoWindowRequest): Promise<SeoCompetitorGap[]> {
  const feed = await getSeoCompetitorGapFeed(opts);
  return feed.data;
}

export async function getSeoCompetitorGapFeed(opts?: { type?: string; status?: string } & SeoWindowRequest): Promise<SeoCompetitorGapFeed> {
  const sp = new URLSearchParams();
  if (opts?.type) sp.set('type', opts.type);
  if (opts?.status) sp.set('status', opts.status);
  if (opts?.days) sp.set('days', String(opts.days));
  if (opts?.start) sp.set('start', opts.start);
  if (opts?.end) sp.set('end', opts.end);
  const qs = sp.toString();
  const data = await seoFetch<SeoCompetitorGapFeed>(`/api/proxy/seo/competitor-gaps${qs ? `?${qs}` : ''}`);
  return {
    data: data.data ?? [],
    meta: data.meta ?? {
      total_count: data.data?.length ?? 0,
      filtered_count: data.data?.length ?? 0,
      returned_count: data.data?.length ?? 0,
      status_counts: {},
      limit: data.data?.length ?? 0,
      filter_note: 'Filtered competitor gaps.',
    },
  };
}

export async function markBacklinkContacted(domain: string): Promise<void> {
  await seoFetch('/api/proxy/seo/backlinks', {
    method: 'POST',
    body: JSON.stringify({ id: domain, status: 'contacted' }),
  });
}

// =============================================================================
// Page Portfolio + Page Dossier (governed Review surface)
// Backed by analytics.seo_page_inventory (+ GSC demand, DataForSEO keyword
// value, gate-accepted execution candidates). Read-only except Lane-1 engine
// approve/reject, which reuses approveEngineCandidate / rejectEngineCandidate.
// =============================================================================

export type PortfolioBucket = 'lost' | 'win' | 'strategic' | 'fix';

export interface PortfolioPage {
  url: string;
  content_type: string | null;
  status_class: string;
  bucket: PortfolioBucket;
  needs_verify: boolean;
  gsc_impressions: number | null;
  gsc_top_query: string | null;
  gsc_best_position: number | null;
  // Governed position: avg position of the page's highest-demand query
  // (NOT all-time best). top_query / top_q_impr describe that query.
  top_query: string | null;
  top_q_impr: number | null;
  top_q_pos: number | null;
  has_rankmath_redirect: boolean;
  rankmath_redirect_target: string | null;
  http_status: number | null;
  kw_volume: number | null;
  kw_difficulty: number | null;
  kw_cpc: number | null;
  has_dataforseo: boolean;
  is_competitor_only: boolean;
  reference_metrics_source?: string | null;
  reference_metrics_observed_at?: string | null;
  gsc_window_start?: string | null;
  gsc_window_end?: string | null;
  gsc_available_start?: string | null;
  gsc_available_end?: string | null;
}

export async function getSeoPortfolio(window?: SeoWindowRequest): Promise<PortfolioPage[]> {
  const data = await seoFetch<{ data: PortfolioPage[] }>(`/api/proxy/seo/portfolio${seoWindowQuery(window)}`);
  return data.data ?? [];
}

export interface PageDossierPage {
  url: string;
  content_type: string | null;
  status_class: string;
  gsc_impressions: number | null;
  gsc_top_query: string | null;
  gsc_best_position: number | null;
  has_rankmath_redirect: boolean;
  rankmath_redirect_target: string | null;
  http_status: number | null;
  canonical_url: string | null;
  indexable: boolean | null;
  noindex: boolean | null;
  in_404_monitor: boolean | null;
  needs_verify: boolean;
  gsc_window_start?: string | null;
  gsc_window_end?: string | null;
  gsc_available_start?: string | null;
  gsc_available_end?: string | null;
}

export interface PageDossierDemandRow {
  query: string;
  impressions: number;
  clicks: number;
  avg_position: number | null;
  kw_volume: number | null;
  kw_difficulty: number | null;
  kw_cpc: number | null;
  reference_metrics_source?: string | null;
  reference_metrics_observed_at?: string | null;
  is_discard: boolean;
  discard_reason: string | null;
}

export interface PageDossierCandidate {
  candidate_id: string;
  opportunity_id: string | null;
  mutation_type: string | null;
  mutation_label?: string | null;
  primary_remedy: string | null;
  proposed_value: string | null;
  current_value_snapshot: string | null;
  evidence_summary: string | null;
  why?: string | null;
  gate_reasons: string[];
  gate_status?: string | null;
  opportunity_score: number | null;
  opportunity_urgency: string | null;
  confidence_tier: string | null;
  source_confidence: string | null;
  approval_status: string | null;
  execution_status: string | null;
  target_page_url: string | null;
  page_url_canonical?: string | null;
  page_is_live?: boolean | null;
  page_status_class?: string | null;
  needs_evidence?: boolean | null;
  qa_status?: string | null;
  outcome_verdict?: string | null;
  // Engine re-gate signal: the candidate was re-surfaced for human re-review
  // after a prior decision (e.g. demand shifted). Honest passthrough — null
  // when the column is absent. lane/executor describe which of the three lanes
  // the engine routed the candidate to.
  regate_review_flag?: boolean | null;
  lane?: number | null;
  executor?: string | null;
}

// Dossier meta = the engine's per-page reasoning record (analytics.seo_page_dossier).
// These are observed/derived signals, never fabricated projections. keyword_targets
// is the engine's chosen primary + secondary keywords with real GSC position and
// DataForSEO value; routed_queries is its own/route/discard routing decision per
// query; ranked_actions is the engine's lane-routed action plan (lane 1 engine,
// lane 2 Rank Math, lane 3 off-page). impact is a real measured impression count,
// not a predicted lift.
export interface PageDossierKeywordTarget {
  keyword: string | null;
  position: number | null;
  volume: number | null;
  kd: number | null;
  cpc: number | null;
  confidence: number | null;
  target_score: number | null;
  on_intent: boolean | null;
  impressions: number | null;
}

export interface PageDossierKeywordTargets {
  primary: PageDossierKeywordTarget | null;
  secondary: PageDossierKeywordTarget[];
}

export interface PageDossierRoutedQuery {
  query: string;
  decision: string | null;
  reason: string | null;
  target_page: string | null;
}

export interface PageDossierRankedAction {
  lane: number | null;
  executor: string | null;
  action: string | null;
  change: string | null;
  speed: string | null;
  status: string | null;
  score: number | null;
  impact: number | null;
}

export interface PageDossierState {
  h1?: string | null;
  meta?: string | null;
  title?: string | null;
  links_in?: number | null;
  links_out?: number | null;
  schema_type?: string | null;
  schema_present?: boolean | null;
  cannibalization?: unknown;
  [key: string]: unknown;
}

export interface PageDossierMetaDemandRow {
  query: string;
  position: number | null;
  impressions: number | null;
}

export interface PageDossierMeta {
  intent: string | null;
  priority: string | null;
  status_class: string | null;
  content_type: string | null;
  generated_at: string | null;
  state: PageDossierState | null;
  // Engine demand ranking (ordered impressions DESC). demand[0] is the canonical
  // top-query baseline that the detection rows + keyword targets read from.
  demand: PageDossierMetaDemandRow[];
  keyword_targets: PageDossierKeywordTargets | null;
  routed_queries: PageDossierRoutedQuery[];
  ranked_actions: PageDossierRankedAction[];
}

export interface PageGateTransition {
  candidate_id: string;
  from_status: string | null;
  to_status: string | null;
  reason: string[];
  gated_at: string | null;
}

export interface PageDossier {
  page: PageDossierPage;
  demand: PageDossierDemandRow[];
  candidates: PageDossierCandidate[];
  // Optional because a page may exist in inventory but not (yet) have an engine
  // dossier record. Null/empty is an honest "engine has not analyzed this page".
  dossier?: PageDossierMeta | null;
  transitions?: PageGateTransition[];
}

export async function getSeoPageDossier(url: string, window?: SeoWindowRequest): Promise<PageDossier> {
  const params = new URLSearchParams({ url });
  if (window?.days) params.set('days', String(window.days));
  if (window?.start) params.set('start', window.start);
  if (window?.end) params.set('end', window.end);
  const data = await seoFetch<{ data: PageDossier }>(
    `/api/proxy/seo/page?${params.toString()}`,
  );
  return data.data;
}

// Portfolio-wide engine action queue: every gate-accepted, approval-pending
// candidate across all pages. Reuses PageDossierCandidate so the queue and the
// per-page dossier render the same candidate shape. Approve/reject still routes
// through approveEngineCandidate / rejectEngineCandidate.
export interface SeoCandidateQueue {
  candidates: PageDossierCandidate[];
  returned: number;
  summary?: {
    decisions: number;
    total_proposals: number;
    re_review_flagged: number;
    needs_review: number;
    live_page_decisions: number;
    lost_or_nonlive_decisions: number;
  } | null;
}

export async function getSeoCandidateQueue(limit?: number): Promise<SeoCandidateQueue> {
  const qs = limit ? `?limit=${limit}` : '';
  const data = await seoFetch<{ data: SeoCandidateQueue }>(
    `/api/proxy/seo/candidate-queue${qs}`,
  );
  return data.data;
}

// Single engine candidate including the full `evidence` jsonb (the list/queue
// endpoints omit the heavy jsonb). Powers the Action Card detail screen.
// evidence shape (internal_link_insertion remedy):
//   { why, source: {url, entity, intent}, target: {url, entity, intent},
//     signals: { embedding_cosine, shared_attributes, hierarchy_proximity },
//     gsc: {...} }
export interface SeoCandidateEvidenceNode {
  url?: string | null;
  entity?: string | null;
  intent?: string | null;
}
// Internal-link anchor context — the concrete, in-context proposal captured at
// generation time (Part A, ods-api/integrations). Lets the reviewer see the
// exact sentence a link lives in and judge naturalness vs box-checking.
//   placement_type: 'existing_anchor' = the phrase already appears in real copy
//     (just hyperlink it); 'new_sentence' = no natural anchor exists so the
//     engine drafted a sentence to insert (confidence-scored, flag for scrutiny).
//   gate_result: the anchor/relevance gate outcome (e.g. 'anchor_found',
//     'new_sentence_drafted', 'anchor_not_found').
// All fields optional/null: when the engine has not yet captured anchor context
// the UI degrades to an honest "not yet captured" state, never invented copy.
export interface SeoAnchorContext {
  anchor_phrase?: string | null;
  source_sentence?: string | null;
  placement_type?: 'existing_anchor' | 'new_sentence' | string | null;
  confidence?: number | null;
  gate_result?: string | null;
  insertion_hint?: string | null;
}
export interface SeoCandidateEvidence {
  why?: string | null;
  source?: SeoCandidateEvidenceNode | null;
  target?: SeoCandidateEvidenceNode | null;
  anchor_context?: SeoAnchorContext | null;
  signals?: {
    embedding_cosine?: number | null;
    shared_attributes?: string[] | null;
    hierarchy_proximity?: number | string | null;
  } | null;
  gsc?: Record<string, unknown> | null;
  [key: string]: unknown;
}
export interface SeoCandidateDetail extends PageDossierCandidate {
  gate_status: string | null;
  evidence: SeoCandidateEvidence | null;
  // Execution lifecycle (analytics.seo_execution_candidate). Honest passthrough
  // of the engine/executor's real state — this read-only screen never writes
  // these. proposed -> approved -> draft_applied -> published, with rollback
  // available; null when the executor has not reached that stage.
  original_value?: string | null;
  applied_value?: string | null;
  approval_timestamp?: string | null;
  execution_timestamp?: string | null;
  rollback_available?: boolean | null;
  rollback_status?: string | null;
  published_at?: string | null;
  outcome_verdict?: string | null;
  outcome_live_confirmed_at?: string | null;
  outcome_live_drift_at?: string | null;
  outcome_leading_metric?: string | null;
  outcome_decided_at?: string | null;
}

export async function getSeoCandidate(id: string): Promise<SeoCandidateDetail> {
  const data = await seoFetch<{ data: SeoCandidateDetail }>(
    `/api/proxy/seo/candidate?id=${encodeURIComponent(id)}`,
  );
  return data.data;
}

// =============================================================================
// Gate-suppressed mutation audit (read-only transparency trail)
// =============================================================================

export interface SuppressedReasonRollup {
  reason: string;
  count: number;
}

export interface SuppressedRow {
  id: string;
  generator: string | null;
  mutation_type: string | null;
  target_url: string | null;
  gate_reasons: string[];
  relevance_score: number | null;
  created_at: string | null;
}

export interface SuppressedAudit {
  total: number;
  returned: number;
  reasons: SuppressedReasonRollup[];
  rows: SuppressedRow[];
}

export async function getSeoSuppressed(limit?: number): Promise<SuppressedAudit> {
  const qs = limit ? `?limit=${limit}` : '';
  const data = await seoFetch<{ data: SuppressedAudit }>(`/api/proxy/seo/suppressed${qs}`);
  return data.data;
}

// =============================================================================
// Competitor Content Velocity (governed competitive feed)
// Read-only. Sourced from the nsd-integrations competitive producer via the
// server-side /api/competitive proxy (the bearer token never reaches the
// browser). These helpers return null/[] — never throw and never fabricate —
// when the feed is unconfigured or has not yet crawled, so the Command Center
// renders an honest empty state. "new"/"changed" are the producer's real
// change_type enum; we do NOT invent threat scores.
// =============================================================================

export interface CompetitiveVelocitySummary {
  competitors_tracked: number;
  pages_tracked: number;
  last_crawl_date: string | null;
  this_week_new: number;
  this_week_changed: number;
}

export interface CompetitivePageChange {
  competitor_name: string;
  competitor_domain: string;
  page_url: string;
  page_title: string;
  change_type: string;
  page_type?: string;
}

async function competitiveFetch<T>(endpoint: string, search?: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/competitive/${endpoint}${search ? `?${search}` : ''}`, {
      headers: getAuthHeaders(),
    });
    const body = await res.json().catch(() => null);
    if (!body || body.success !== true) return null;
    return (body.data ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function getCompetitiveVelocitySummary(): Promise<CompetitiveVelocitySummary | null> {
  return competitiveFetch<CompetitiveVelocitySummary>('summary');
}

export async function getCompetitiveChanges(limit = 100): Promise<CompetitivePageChange[]> {
  const data = await competitiveFetch<{ changes: CompetitivePageChange[]; total: number }>('changes', `limit=${limit}`);
  return data?.changes ?? [];
}

// =============================================================================
// Recently approved / shipped SEO actions (read-only)
// Sourced from analytics.seo_execution_candidate via /api/proxy/seo/actions. We surface the
// real lifecycle status, timestamps, and the engine-measured GSC click delta
// where one exists — we never fabricate predicted lift and never offer a
// rollback write from this read-only surface. Empty until the engine approves
// or ships its first action.
// =============================================================================

export interface SeoShippedAction {
  id: string;
  target_url: string | null;
  mutation_type: string | null;
  status: string | null;
  created_at: string | null;
  executed_at: string | null;
  outcome_clicks_delta: number | null;
}

// Shipped lifecycle statuses from analytics.seo_execution_candidate. Pending
// approval rows are intentionally excluded so queued recommendations cannot
// masquerade as shipped work.
const SHIPPED_STATUSES = ['approved', 'draft_applied', 'published', 'rolled_back', 'failed'];

export async function getSeoShipped(limit = 8): Promise<SeoShippedAction[]> {
  const rows = await getSeoActions(SHIPPED_STATUSES.join(','), limit);
  return (rows as Record<string, unknown>[])
    .filter((r) => typeof r.status === 'string' && SHIPPED_STATUSES.includes(r.status))
    .map((r) => ({
      id: String(r.id ?? ''),
      target_url: (r.target_url as string) ?? null,
      mutation_type: (r.mutation_label as string) ?? (r.mutation_type as string) ?? null,
      status: (r.status as string) ?? null,
      created_at: (r.created_at as string) ?? null,
      executed_at: ((r.executed_at ?? r.published_at) as string) ?? null,
      outcome_clicks_delta: r.outcome_clicks_delta != null ? Number(r.outcome_clicks_delta) : null,
    }));
}

// =============================================================================
// Off-page authority briefs (Lane 3) — analytics.seo_offpage_brief
// Read-only. These are the engine's authority-bound pages: ones where on-page
// is necessary but not sufficient and backlinks / digital PR are required to
// break into the top 10. Real GSC position + impressions + DataForSEO value;
// no fabricated link projections. Empty when the engine has produced no briefs.
// =============================================================================

export interface SeoOffpageBrief {
  page_url: string;
  target_keyword: string | null;
  search_volume: number | null;
  current_position: number | null;
  impressions: number | null;
  keyword_difficulty: number | null;
  reason: string | null;
  generated_at: string | null;
  reference_metrics_source?: string | null;
  reference_metrics_observed_at?: string | null;
  gsc_window_start?: string | null;
  gsc_window_end?: string | null;
  gsc_available_start?: string | null;
  gsc_available_end?: string | null;
}

export async function getSeoOffpageBriefs(url?: string, window?: SeoWindowRequest): Promise<SeoOffpageBrief[]> {
  const params = new URLSearchParams();
  if (url) params.set('url', url);
  if (window?.days) params.set('days', String(window.days));
  if (window?.start) params.set('start', window.start);
  if (window?.end) params.set('end', window.end);
  const qs = params.toString();
  const data = await seoFetch<{ data: SeoOffpageBrief[] }>(`/api/proxy/seo/offpage${qs ? `?${qs}` : ''}`);
  return data.data ?? [];
}
