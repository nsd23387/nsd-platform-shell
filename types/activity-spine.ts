/**
 * Activity Spine Types
 * 
 * These types define the shape of data returned by the Activity Spine API.
 * The shell does NOT compute these metrics - they are consumed read-only.
 */

// ============================================
// Order Metrics
// ============================================
export interface OrderMetrics {
  volume: number;
  avgCycleTimeMinutes: number;
  p95CycleTimeMinutes: number;
  periodDays: number;
  breakdown?: {
    byStatus: Record<string, number>;
    byStage: Record<string, number>;
  };
}

// ============================================
// Media Metrics
// ============================================
export interface MediaMetrics {
  created: number;
  approved: number;
  pending: number;
  avgApprovalTimeMinutes: number;
  unusedApprovedAssets: number;
  periodDays: number;
}

// ============================================
// Mockup Metrics (Activity Spine v1.5.1+)
// ============================================

/**
 * Tiered SLA distribution as returned by Activity Spine.
 * The shell does NOT compute these values - they are consumed read-only.
 * 
 * Tier definitions (computed by Activity Spine):
 * - exceptional: ≤ 2 hours
 * - standard: > 2h and ≤ 24h
 * - breach: > 24h
 * - pending: no mockup delivered yet
 */
export interface MockupSLADistribution {
  exceptional: number;
  standard: number;
  breach: number;
  pending: number;
}

export interface MockupSLATargets {
  exceptionalMinutes: number;  // 120 (2h)
  standardMinutes: number;     // 1440 (24h)
}

export interface MockupMetrics {
  avgTurnaroundMinutes: number;
  totalMockups: number;
  pendingMockups: number;
  periodDays: number;
  /** Tiered SLA distribution (Activity Spine v1.5.1+) */
  distribution?: MockupSLADistribution;
  /** Counts for the last 30 days */
  countsLast30Days?: number;
  /** SLA tier thresholds */
  slaTargets?: MockupSLATargets;
}

// ============================================
// Order Funnel
// ============================================
export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface OrderFunnel {
  stages: FunnelStage[];
  overallConversion: number;
  periodDays: number;
}

// ============================================
// SLA Data
// ============================================
export interface SLAMetrics {
  production: {
    breaches: number;
    totalOrders: number;
    complianceRate: number;
  };
  ordersExceedingSLA: number;
  bottleneckStage: {
    stage: string;
    avgDurationMinutes: number;
  };
  stageDistribution: Record<string, number>;
}

/**
 * Mockup SLA breach item for detailed breach list.
 * Only items with sla_status === 'breach' should be displayed.
 */
export interface MockupBreachItem {
  quoteId: string;
  quoteType: string;
  turnaroundMinutes: number;
  elapsedSinceInquiryMinutes: number;
  slaStatus: 'exceptional' | 'standard' | 'breach' | 'pending';
}

export interface MockupSLAMetrics {
  /** 
   * @deprecated Use distribution-based metrics instead.
   * Kept for backward compatibility with Executive Dashboard.
   */
  complianceRate: number;
  /** 
   * @deprecated Use slaTargets instead.
   * Kept for backward compatibility.
   */
  targetMinutes: number;
  quotesPendingOver90Min: number;
  /** Breaches grouped by quote type (count) */
  breachesByQuoteType: Record<string, number>;
  totalEvaluated: number;
  /** Detailed breach items (only sla_status === 'breach') */
  breachItems?: MockupBreachItem[];
  /** Tiered distribution (mirrors MockupMetrics.distribution) */
  distribution?: MockupSLADistribution;
  /** SLA tier thresholds */
  slaTargets?: MockupSLATargets;
}

// ============================================
// Marketing Metrics
// ============================================

export interface MarketingKPIs {
  sessions: number;
  page_views: number;
  bounce_rate: number;
  avg_time_on_page_seconds: number;
  total_submissions: number;
  total_pipeline_value_usd: number;
  organic_clicks: number;
  impressions: number;
  avg_position: number;
  revenue_per_session: number;
  revenue_per_click: number;
  submissions_per_session: number;
  submissions_per_click: number;
}

export interface MarketingPage {
  page_url: string;
  sessions: number;
  page_views: number;
  bounce_rate: number;
  avg_time_on_page_seconds: number;
  clicks: number;
  impressions: number;
  ctr: number;
  submissions: number;
  pipeline_value_usd: number;
}

export interface MarketingSource {
  submission_source: string;
  canonical_source: string;
  submissions: number;
  pipeline_value_usd: number;
}

export interface MarketingKPIComparison {
  current: number;
  previous: number;
  delta_pct: number;
}

export interface MarketingKPIComparisons {
  sessions: MarketingKPIComparison;
  page_views: MarketingKPIComparison;
  total_submissions: MarketingKPIComparison;
  total_pipeline_value_usd: MarketingKPIComparison;
  organic_clicks: MarketingKPIComparison;
  impressions: MarketingKPIComparison;
}

export interface MarketingSEOQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number;
  submissions: number;
  pipeline_value_usd: number;
  revenue_per_click: number;
}

export interface MarketingTimeseriesPoint {
  date: string;
  value: number;
}

export interface MarketingTimeseries {
  sessions: MarketingTimeseriesPoint[];
  submissions: MarketingTimeseriesPoint[];
  pipeline_value_usd: MarketingTimeseriesPoint[];
  impressions: MarketingTimeseriesPoint[];
  clicks: MarketingTimeseriesPoint[];
}

export interface MarketingAnomalies {
  sessions_spike: boolean;
  submissions_spike: boolean;
  pipeline_spike: boolean;
}

export interface MarketingDeviceBreakdown {
  device: string;
  sessions: number;
  page_views: number;
  impressions: number;
  clicks: number;
  ctr: number;
  source: 'ga4' | 'search_console';
}

export interface MarketingCountryBreakdown {
  country: string;
  sessions: number;
  page_views: number;
  impressions: number;
  clicks: number;
  ctr: number;
  source: 'ga4' | 'search_console';
}

export interface MarketingPipelineCategory {
  product_category: string;
  submissions: number;
  pipeline_value_usd: number;
}

export interface MarketingConversionEvent {
  created_at: string;
  product_category: string;
  preliminary_price_usd: number;
  submission_source: string;
  quote_number?: string;
  customer_name?: string | null;
  status?: string;
}

export interface MarketingSEOQueryMover {
  query: string;
  impressions_first_half: number;
  impressions_second_half: number;
  delta_pct: number;
  direction: 'rising' | 'falling';
}

export interface MarketingFunnelStep {
  date: string;
  page_views: number;
  submissions: number;
  conversion_rate: number;
  pipeline_value_usd: number;
}

export interface MarketingPipelineHealth {
  source: string;
  last_success: string | null;
  failure_rate_24h: number;
  status: 'healthy' | 'warning' | 'stale';
}

export interface MarketingChannelPerformance {
  channel: string;
  sessions: number;
  page_views: number;
  conversions: number;
  revenue: number;
}

export interface MarketingGA4Funnel {
  view_item: number;
  add_to_cart: number;
  begin_checkout: number;
  purchase: number;
  form_start: number;
  form_submit: number;
}

export interface MarketingGoogleAdsOverview {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export interface MarketingGoogleAdsCampaign {
  campaign_name: string;
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpc: number;
  ctr: number;
  roas: number;
}

export type MarketingPeriod = '7d' | '30d' | '90d';

export type MarketingPreset = 'last_7d' | 'last_30d' | 'last_90d' | 'mtd' | 'qtd' | 'ytd';

export type MarketingComparisonMode = 'prev_period' | 'wow' | 'mom';

export interface MarketingPeriodBlock {
  start: string;
  end: string;
  granularity: 'day';
  comparison_mode?: MarketingComparisonMode;
  comparison_start?: string;
  comparison_end?: string;
}

export interface MarketingDataFreshness {
  engagement_last_date: string | null;
  search_console_last_date: string | null;
  conversion_last_date: string | null;
  qms_last_date?: string | null;
}

export interface MarketingMeta {
  query_execution_ms: number;
  row_counts: {
    pages: number;
    sources: number;
  };
  data_freshness: MarketingDataFreshness;
}

export type Core4Engine = 'warm_outreach' | 'cold_outreach' | 'post_free_content' | 'run_paid_ads';

export interface Core4EngineMetrics {
  engine: Core4Engine;
  sessions: number;
  clicks: number;
  quotes: number;
  pipeline_value_usd: number;
  spend: number;
  cac: number;
  roas: number;
  quote_rate: number;
}

export interface Core4EngineComparison {
  current: Core4EngineMetrics;
  previous: Core4EngineMetrics;
  deltas: {
    sessions_pct: number;
    clicks_pct: number;
    quotes_pct: number;
    pipeline_value_usd_pct: number;
    spend_pct: number;
    cac_pct: number;
    roas_pct: number;
    quote_rate_pct: number;
  };
}

export interface Core4Summary {
  warm_outreach: Core4EngineComparison;
  cold_outreach: Core4EngineComparison;
  post_free_content: Core4EngineComparison;
  run_paid_ads: Core4EngineComparison;
}

export interface MarketingOverviewResponse {
  period: MarketingPeriodBlock;
  generated_at: string;
  kpis: MarketingKPIs;
  comparisons: MarketingKPIComparisons;
  pages: MarketingPage[];
  sources: MarketingSource[];
  seo_queries: MarketingSEOQuery[];
  timeseries?: MarketingTimeseries;
  anomalies: MarketingAnomalies;
  meta: MarketingMeta;
  device_breakdown: MarketingDeviceBreakdown[];
  country_breakdown: MarketingCountryBreakdown[];
  pipeline_categories: MarketingPipelineCategory[];
  recent_conversions: MarketingConversionEvent[];
  seo_movers: MarketingSEOQueryMover[];
  funnel: MarketingFunnelStep[];
  pipeline_health: MarketingPipelineHealth[];
  channel_performance: MarketingChannelPerformance[];
  ga4_funnel: MarketingGA4Funnel;
  google_ads_overview: MarketingGoogleAdsOverview;
  google_ads_campaigns: MarketingGoogleAdsCampaign[];
  core4_summary?: Core4Summary;
}

// ============================================
// QMS (Quote Management System) Metrics
// ============================================

export interface QMSPipelineSummary {
  active_deals: number;
  pipeline_value_usd: number;
  avg_deal_value_usd: number;
  won_deals: number;
  won_revenue_usd: number;
  total_deals: number;
}

export interface QMSAgingBuckets {
  bucket_0_2d: number;
  bucket_3_7d: number;
  bucket_8_14d: number;
  bucket_15_plus: number;
}

export interface QMSCloseRate {
  won: number;
  lost: number;
  total: number;
  rate: number;
  won_revenue_usd: number;
  lost_revenue_usd: number;
}

export interface QMSVelocity {
  avg_days_to_close: number;
  avg_days_to_deposit: number;
  sample_size: number;
}

export interface QMSStatusBreakdown {
  status: string;
  count: number;
  value_usd: number;
}

export interface QMSRecentDeal {
  quote_number: string;
  customer_name: string | null;
  status: string;
  total_price_usd: number;
  sign_type: string | null;
  sign_text: string | null;
  created_at: string | null;
  updated_at: string | null;
  utm_source: string | null;
  landing_page: string | null;
  deposit_paid_at: string | null;
  quote_paid_at: string | null;
  followup_count: number;
  revision_round: number;
  discount_code: string | null;
}

export interface QMSAttribution {
  source: string;
  count: number;
  value_usd: number;
  won: number;
}

export interface QMSDiscountUsage {
  with_discount: number;
  total: number;
  discount_redeemed: number;
  avg_discount_pct: number;
}

export interface QMSAnalytics {
  available: boolean;
  pipeline: QMSPipelineSummary | null;
  aging: QMSAgingBuckets | null;
  close_rate: QMSCloseRate | null;
  velocity: QMSVelocity | null;
  status_breakdown: QMSStatusBreakdown[];
  recent_deals: QMSRecentDeal[];
  attribution: QMSAttribution[];
  discount_usage: QMSDiscountUsage | null;
}

// ============================================
// Time Period Options
// ============================================
export type TimePeriod = '7d' | '30d';

// ============================================
// API Response Wrapper
// ============================================
export interface ActivitySpineResponse<T> {
  data: T;
  timestamp: string;
  orgId: string;
}

// ============================================
// Loading/Error State
// ============================================
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
