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
  old_position: number;
  new_position: number;
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

async function seoFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
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
    body: JSON.stringify({ id, action: 'approve' }),
  });
}

export async function rejectRecommendation(id: string): Promise<void> {
  await seoFetch(`/api/proxy/seo/recommendations`, {
    method: 'POST',
    body: JSON.stringify({ id, action: 'reject' }),
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
