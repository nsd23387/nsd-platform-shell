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

// ============================================
// Milestone 7: Platform Overview Metrics
// ============================================

/**
 * System Pulse Metrics
 * GET /metrics/system-pulse
 * 
 * At-a-glance vital signs showing the system is operational.
 * All values are pre-computed by the API - no client-side calculation.
 */
export interface SystemPulseMetrics {
  /** Total events in last 24 hours */
  totalEvents24h: number;
  /** Active organizations in last 7 days */
  activeOrganizations7d: number;
  /** Active users in last 7 days */
  activeUsers7d: number;
  /** Error events in last 24 hours */
  errors24h: number;
  /** Timestamp when metrics were computed */
  computedAt: string;
}

/**
 * Single time bucket for throughput data
 */
export interface ThroughputBucket {
  /** ISO timestamp for the bucket start */
  timestamp: string;
  /** Event count for this bucket */
  count: number;
}

/**
 * Throughput Metrics
 * GET /metrics/throughput?window=24h|7d
 * 
 * Volume and distribution of system activity.
 * All values are pre-computed by the API - no client-side calculation.
 */
export interface ThroughputMetrics {
  /** Events per time bucket (hourly for 24h, daily for 7d) */
  buckets: ThroughputBucket[];
  /** Breakdown by entity type */
  byEntityType: Record<string, number>;
  /** Total events in the window */
  totalEvents: number;
  /** Time window (24h or 7d) */
  window: '24h' | '7d';
  /** Timestamp when metrics were computed */
  computedAt: string;
}

/**
 * Latency / SLA Metrics
 * GET /metrics/latency
 * 
 * Time-to-action and operational delays.
 * All values are pre-computed by the API - no client-side calculation.
 */
export interface LatencyMetrics {
  /** Average time to first follow-up in minutes */
  avgTimeToFirstActivityMinutes: number | null;
  /** P95 time to first follow-up in minutes */
  p95TimeToFirstActivityMinutes: number | null;
  /** Count of organizations with no follow-up within 24h */
  stalledEntities: number;
  /** Total organizations evaluated */
  totalEvaluated: number;
  /** Timestamp when metrics were computed */
  computedAt: string;
}

/**
 * Single day data point for trend
 */
export interface TrendDataPoint {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Event count for this day */
  count: number;
}

/**
 * Trend Metrics
 * GET /metrics/trend?window=7d
 * 
 * Directional movement of system activity over time.
 * All values are pre-computed by the API - no client-side calculation.
 */
export interface TrendMetrics {
  /** Daily event counts for the window */
  dataPoints: TrendDataPoint[];
  /** Trend direction based on comparison */
  direction: 'up' | 'down' | 'flat';
  /** Percentage change from previous period */
  changePercent: number | null;
  /** Timestamp when metrics were computed */
  computedAt: string;
}

/**
 * Combined Overview Dashboard Data
 * Used by the overview dashboard hook.
 */
export interface OverviewDashboardData {
  systemPulse: SystemPulseMetrics;
  throughput: ThroughputMetrics;
  latency: LatencyMetrics;
  trend: TrendMetrics;
}
