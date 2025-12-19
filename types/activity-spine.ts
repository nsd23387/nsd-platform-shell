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
// Mockup Metrics
// ============================================
export interface MockupMetrics {
  avgTurnaroundMinutes: number;
  totalMockups: number;
  pendingMockups: number;
  periodDays: number;
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

export interface MockupSLAMetrics {
  complianceRate: number;
  targetMinutes: number;
  quotesPendingOver90Min: number;
  breachesByQuoteType: Record<string, number>;
  totalEvaluated: number;
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
