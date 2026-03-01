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

export interface MarketingChannel {
  channel: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
}

export interface MarketingLandingPage {
  path: string;
  visitors: number;
  bounceRate: number;
  avgTimeOnPageSeconds: number;
}

export interface MarketingOverviewResponse {
  purchases: number;
  revenue: number;
  conversionRate: number;
  organicClicks: number;
  channels?: MarketingChannel[];
  landingPages?: MarketingLandingPage[];
  periodDays: number;
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
