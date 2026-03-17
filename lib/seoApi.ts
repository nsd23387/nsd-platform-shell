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
  page_optimization_recs: number;
  internal_link_recs: number;
  content_artifacts: number;
  ahrefs_keywords_tracked: number;
  indexed_pages: number;
  recommendations_total: number;
  recommendations_pending: number;
  recommendations_approved: number;
  recommendations_rejected: number;
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
    awaiting_approval: boolean | null;
    ready_to_execute: boolean | null;
    rollback_eligible: boolean | null;
    created_at: string | null;
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
