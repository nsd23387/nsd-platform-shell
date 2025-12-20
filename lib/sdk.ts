/**
 * Activity Spine SDK Client
 * 
 * This module provides read-only access to Activity Spine analytics endpoints.
 * 
 * IMPORTANT GOVERNANCE RULES:
 * - All calls are READ-ONLY (GET requests only)
 * - No CRUD operations are allowed
 * - No local metric calculations - Activity Spine is the single source of truth
 * - All requests are org-scoped via headers
 * - No direct database access - SDK only
 */

import type {
  OrderMetrics,
  MediaMetrics,
  MockupMetrics,
  OrderFunnel,
  SLAMetrics,
  MockupSLAMetrics,
  TimePeriod,
  ActivitySpineResponse,
} from '../types/activity-spine';

// ============================================
// Configuration
// ============================================

const ACTIVITY_SPINE_BASE_URL = process.env.NEXT_PUBLIC_ACTIVITY_SPINE_URL || '/api/activity-spine';

interface SDKConfig {
  baseUrl: string;
  orgId: string;
  authToken?: string;
}

let sdkConfig: SDKConfig = {
  baseUrl: ACTIVITY_SPINE_BASE_URL,
  orgId: '',
};

/**
 * Initialize the Activity Spine SDK with org context
 */
export function initActivitySpineSDK(config: Partial<SDKConfig>): void {
  sdkConfig = { ...sdkConfig, ...config };
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Build headers for Activity Spine requests
 * Includes org scoping and authentication
 */
function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Org-Id': sdkConfig.orgId,
  };

  if (sdkConfig.authToken) {
    headers['Authorization'] = `Bearer ${sdkConfig.authToken}`;
  }

  return headers;
}

/**
 * Generic fetch wrapper with error handling
 * All Activity Spine calls go through this - ensures read-only compliance
 */
async function fetchFromActivitySpine<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ActivitySpineResponse<T>> {
  const url = new URL(`${sdkConfig.baseUrl}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET', // READ-ONLY: Only GET requests allowed
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ActivitySpineError(
      `Activity Spine request failed: ${response.status}`,
      response.status,
      errorBody
    );
  }

  return response.json();
}

// ============================================
// Error Handling
// ============================================

export class ActivitySpineError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'ActivitySpineError';
  }
}

// ============================================
// Order Metrics API
// ============================================

/**
 * GET /activity-spine/metrics/orders
 * 
 * Fetches order volume and cycle time metrics.
 * Read-only endpoint - no mutations.
 */
export async function getOrderMetrics(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<OrderMetrics>> {
  return fetchFromActivitySpine<OrderMetrics>('/metrics/orders', { period });
}

// ============================================
// Media Metrics API
// ============================================

/**
 * GET /activity-spine/metrics/media
 * 
 * Fetches media creation and approval metrics.
 * Read-only endpoint - no mutations.
 */
export async function getMediaMetrics(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<MediaMetrics>> {
  return fetchFromActivitySpine<MediaMetrics>('/metrics/media', { period });
}

// ============================================
// Mockup Metrics API
// ============================================

/**
 * GET /activity-spine/metrics/mockups
 * 
 * Fetches mockup turnaround metrics.
 * Read-only endpoint - no mutations.
 */
export async function getMockupMetrics(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<MockupMetrics>> {
  return fetchFromActivitySpine<MockupMetrics>('/metrics/mockups', { period });
}

// ============================================
// Funnel API
// ============================================

/**
 * GET /activity-spine/funnels/orders
 * 
 * Fetches order funnel conversion metrics (lead → quote → order).
 * Read-only endpoint - no mutations.
 */
export async function getOrderFunnel(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<OrderFunnel>> {
  return fetchFromActivitySpine<OrderFunnel>('/funnels/orders', { period });
}

// ============================================
// SLA APIs
// ============================================

/**
 * GET /activity-spine/slas
 * 
 * Fetches production SLA metrics including breaches and compliance.
 * Read-only endpoint - no mutations.
 */
export async function getSLAMetrics(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<SLAMetrics>> {
  return fetchFromActivitySpine<SLAMetrics>('/slas', { period });
}

/**
 * GET /activity-spine/slas/mockups
 * 
 * Fetches mockup-specific SLA metrics (2h target).
 * Read-only endpoint - no mutations.
 */
export async function getMockupSLAMetrics(
  period: TimePeriod = '30d'
): Promise<ActivitySpineResponse<MockupSLAMetrics>> {
  return fetchFromActivitySpine<MockupSLAMetrics>('/slas/mockups', { period });
}

// ============================================
// Aggregated Fetch Helpers
// ============================================

/**
 * Fetch all metrics needed for Executive Dashboard
 * Batches requests for efficiency
 */
export async function getExecutiveDashboardData(period: TimePeriod = '30d') {
  const [orders, mockups, slas, mockupSLAs] = await Promise.all([
    getOrderMetrics(period),
    getMockupMetrics(period),
    getSLAMetrics(period),
    getMockupSLAMetrics(period),
  ]);

  return { orders, mockups, slas, mockupSLAs };
}

/**
 * Fetch all metrics needed for Operations Dashboard
 */
export async function getOperationsDashboardData(period: TimePeriod = '30d') {
  const [orders, slas] = await Promise.all([
    getOrderMetrics(period),
    getSLAMetrics(period),
  ]);

  return { orders, slas };
}

/**
 * Fetch all metrics needed for Design Dashboard
 */
export async function getDesignDashboardData(period: TimePeriod = '30d') {
  const [mockups, mockupSLAs] = await Promise.all([
    getMockupMetrics(period),
    getMockupSLAMetrics(period),
  ]);

  return { mockups, mockupSLAs };
}

/**
 * Fetch all metrics needed for Media Dashboard
 */
export async function getMediaDashboardData(period: TimePeriod = '30d') {
  return getMediaMetrics(period);
}

/**
 * Fetch all metrics needed for Sales Dashboard
 */
export async function getSalesDashboardData(period: TimePeriod = '30d') {
  const [funnel, orders] = await Promise.all([
    getOrderFunnel(period),
    getOrderMetrics(period),
  ]);

  return { funnel, orders };
}
