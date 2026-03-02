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
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface MarketingCountryBreakdown {
  country: string;
  impressions: number;
  clicks: number;
  ctr: number;
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

export type MarketingPeriod = '7d' | '30d' | '90d';

export type MarketingPreset = 'last_7d' | 'last_30d' | 'last_90d' | 'mtd' | 'qtd' | 'ytd';

export interface MarketingPeriodBlock {
  start: string;
  end: string;
  granularity: 'day';
}

export interface MarketingDataFreshness {
  engagement_last_date: string | null;
  search_console_last_date: string | null;
  conversion_last_date: string | null;
}

export interface MarketingMeta {
  query_execution_ms: number;
  row_counts: {
    pages: number;
    sources: number;
  };
  data_freshness: MarketingDataFreshness;
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
