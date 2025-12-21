/**
 * SDK Client
 * 
 * This module provides:
 * - Bootstrap client for /api/v1/me (identity, permissions, features)
 * - Read-only access to Activity Spine analytics endpoints
 * 
 * IMPORTANT GOVERNANCE RULES:
 * - All calls are READ-ONLY (GET requests only)
 * - No CRUD operations are allowed
 * - No local metric calculations - APIs are the single source of truth
 * - No JWT parsing - tokens passed verbatim
 * - No permission inference - permissions come from bootstrap
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
  SystemPulseMetrics,
  ThroughputMetrics,
  LatencyMetrics,
  TrendMetrics,
} from '../types/activity-spine';
import type {
  AssignOwnerRequest,
  AcknowledgeReviewRequest,
  AdvanceLifecycleStageRequest,
  FlagExceptionRequest,
  MarkReadyForHandoffRequest,
  OMSActionResponse,
} from '../types/oms';
import type { BootstrapResponse } from '../types/bootstrap';

// ============================================
// Configuration
// ============================================

const ODS_API_URL = process.env.NEXT_PUBLIC_ODS_API_URL || '/api/v1';
const ACTIVITY_SPINE_BASE_URL = process.env.NEXT_PUBLIC_ACTIVITY_SPINE_URL || '/api/activity-spine';

interface SDKConfig {
  odsApiUrl: string;
  activitySpineUrl: string;
  orgId: string;
  authToken?: string;
}

let sdkConfig: SDKConfig = {
  odsApiUrl: ODS_API_URL,
  activitySpineUrl: ACTIVITY_SPINE_BASE_URL,
  orgId: '',
};

/**
 * Initialize the SDK with configuration
 */
export function initSDK(config: Partial<SDKConfig>): void {
  sdkConfig = { ...sdkConfig, ...config };
}

/**
 * @deprecated Use initSDK instead
 */
export function initActivitySpineSDK(config: Partial<SDKConfig>): void {
  initSDK(config);
}

// ============================================
// Token Handling
// ============================================

/**
 * Get auth token from available sources.
 * Token sources (in order):
 * 1. SDK config (if set)
 * 2. window.__NSD_AUTH_TOKEN__ (set by host application)
 * 3. NEXT_PUBLIC_NSD_DEV_JWT (development fallback)
 * 
 * GOVERNANCE: Token is passed verbatim. No parsing or validation.
 */
function getAuthToken(): string | undefined {
  if (sdkConfig.authToken) {
    return sdkConfig.authToken;
  }
  
  if (typeof window !== 'undefined' && (window as unknown as { __NSD_AUTH_TOKEN__?: string }).__NSD_AUTH_TOKEN__) {
    return (window as unknown as { __NSD_AUTH_TOKEN__?: string }).__NSD_AUTH_TOKEN__;
  }
  
  return process.env.NEXT_PUBLIC_NSD_DEV_JWT;
}

// ============================================
// Bootstrap API (/api/v1/me)
// ============================================

/**
 * GET /api/v1/me
 * 
 * Fetches bootstrap data: user identity, organization, roles, permissions,
 * environment, and feature visibility.
 * 
 * GOVERNANCE:
 * - Called exactly once on app load
 * - Response stored in memory only (no persistence)
 * - No JWT parsing
 * - No role/permission inference
 * - This is the SOLE source of truth for access control
 */
export async function getMe(): Promise<BootstrapResponse> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${sdkConfig.odsApiUrl}/me`, {
    method: 'GET',
    headers,
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new BootstrapError(
      `Bootstrap failed: ${response.status}`,
      response.status
    );
  }
  
  return response.json();
}

/**
 * Bootstrap-specific error
 */
export class BootstrapError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'BootstrapError';
  }
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Build headers for Activity Spine requests
 * Includes org scoping and authentication
 */
function buildHeaders(): HeadersInit {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (sdkConfig.orgId) {
    headers['X-Org-Id'] = sdkConfig.orgId;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
  const url = new URL(`${sdkConfig.activitySpineUrl}${endpoint}`, window.location.origin);
  
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

// ============================================
// Milestone 7: Platform Overview Metrics API
// ============================================

/**
 * GET /metrics/system-pulse
 * 
 * Fetches system pulse metrics (vital signs).
 * Read-only endpoint - no mutations.
 * 
 * Returns:
 * - Total events (last 24h)
 * - Active organizations (7d)
 * - Active users (7d)
 * - Errors (24h)
 */
export async function getSystemPulse(): Promise<ActivitySpineResponse<SystemPulseMetrics>> {
  return fetchFromActivitySpine<SystemPulseMetrics>('/metrics/system-pulse');
}

/**
 * GET /metrics/throughput
 * 
 * Fetches throughput metrics (events over time).
 * Read-only endpoint - no mutations.
 * 
 * Returns:
 * - Events per hour/day (time buckets)
 * - Breakdown by entity type
 * - Total events in window
 */
export async function getThroughput(
  window: '24h' | '7d' = '24h'
): Promise<ActivitySpineResponse<ThroughputMetrics>> {
  return fetchFromActivitySpine<ThroughputMetrics>('/metrics/throughput', { window });
}

/**
 * GET /metrics/latency
 * 
 * Fetches latency / SLA metrics.
 * Read-only endpoint - no mutations.
 * 
 * Returns:
 * - Average time to first activity
 * - P95 latency
 * - Count of stalled entities
 */
export async function getLatency(): Promise<ActivitySpineResponse<LatencyMetrics>> {
  return fetchFromActivitySpine<LatencyMetrics>('/metrics/latency');
}

/**
 * GET /metrics/trend
 * 
 * Fetches trend metrics (7-day activity trend).
 * Read-only endpoint - no mutations.
 * 
 * Returns:
 * - Daily event counts
 * - Trend direction
 * - Change percentage
 */
export async function getTrend(
  window: '7d' = '7d'
): Promise<ActivitySpineResponse<TrendMetrics>> {
  return fetchFromActivitySpine<TrendMetrics>('/metrics/trend', { window });
}

/**
 * Fetch all metrics needed for Overview Dashboard (Milestone 7)
 * Batches requests for efficiency
 * 
 * This is the primary entry point for the read-only overview dashboard.
 * All metrics are consumed exactly as provided - no client-side computation.
 */
export async function getOverviewDashboardData() {
  const [systemPulse, throughput, latency, trend] = await Promise.all([
    getSystemPulse(),
    getThroughput('24h'),
    getLatency(),
    getTrend('7d'),
  ]);

  return { systemPulse, throughput, latency, trend };
}

// ============================================
// Phase 8B: OMS Mutation Functions
// ============================================

/**
 * OMS API URL - separate from Activity Spine read endpoints
 */
const OMS_API_URL = process.env.NEXT_PUBLIC_OMS_API_URL || '/api/oms';

/**
 * Generic POST wrapper for OMS mutations.
 * 
 * GOVERNANCE:
 * - Each call is a single mutation
 * - No batching, no retries
 * - No optimistic updates
 * - Success/failure determined solely by backend response
 */
async function postOMSAction<T, R>(
  endpoint: string,
  payload: T
): Promise<R> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (sdkConfig.orgId) {
    headers['X-Org-Id'] = sdkConfig.orgId;
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${OMS_API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `OMS action failed: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorBody);
      errorMessage = errorJson.error || errorJson.message || errorMessage;
    } catch {
      // Use default error message
    }
    
    throw new OMSActionError(errorMessage, response.status, errorBody);
  }

  return response.json();
}

/**
 * OMS-specific error class
 */
export class OMSActionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'OMSActionError';
  }
}

// ============================================
// OMS Action 1: Assign Owner
// ============================================

/**
 * POST /oms/assign-owner
 * 
 * Assigns an owner to an entity.
 * Emits: entity.assigned
 * 
 * GOVERNANCE:
 * - Single mutation, single event
 * - No retry, no optimistic update
 * - Backend is sole source of truth
 */
export async function assignOwner(
  request: AssignOwnerRequest
): Promise<OMSActionResponse> {
  return postOMSAction<AssignOwnerRequest, OMSActionResponse>(
    '/assign-owner',
    request
  );
}

// ============================================
// OMS Action 2: Acknowledge Review
// ============================================

/**
 * POST /oms/acknowledge-review
 * 
 * Acknowledges that an entity has been reviewed.
 * Emits: entity.reviewed
 * 
 * GOVERNANCE:
 * - Single mutation, single event
 * - No retry, no optimistic update
 * - Backend is sole source of truth
 */
export async function acknowledgeReview(
  request: AcknowledgeReviewRequest
): Promise<OMSActionResponse> {
  return postOMSAction<AcknowledgeReviewRequest, OMSActionResponse>(
    '/acknowledge-review',
    request
  );
}

// ============================================
// OMS Action 3: Advance Lifecycle Stage
// ============================================

/**
 * POST /oms/advance-stage
 * 
 * Advances an entity to the next lifecycle stage.
 * Emits: entity.stage_advanced
 * 
 * GOVERNANCE:
 * - Single mutation, single event
 * - No retry, no optimistic update
 * - Backend is sole source of truth
 */
export async function advanceLifecycleStage(
  request: AdvanceLifecycleStageRequest
): Promise<OMSActionResponse> {
  return postOMSAction<AdvanceLifecycleStageRequest, OMSActionResponse>(
    '/advance-stage',
    request
  );
}

// ============================================
// OMS Action 4: Flag Exception
// ============================================

/**
 * POST /oms/flag-exception
 * 
 * Flags an entity as having an exception.
 * Emits: entity.exception_flagged
 * 
 * GOVERNANCE:
 * - Single mutation, single event
 * - No retry, no optimistic update
 * - Backend is sole source of truth
 */
export async function flagException(
  request: FlagExceptionRequest
): Promise<OMSActionResponse> {
  return postOMSAction<FlagExceptionRequest, OMSActionResponse>(
    '/flag-exception',
    request
  );
}

// ============================================
// OMS Action 5: Mark Ready for Handoff
// ============================================

/**
 * POST /oms/mark-ready
 * 
 * Marks an entity as ready for handoff.
 * Emits: entity.ready_for_handoff
 * 
 * GOVERNANCE:
 * - Single mutation, single event
 * - No retry, no optimistic update
 * - Backend is sole source of truth
 */
export async function markReadyForHandoff(
  request: MarkReadyForHandoffRequest
): Promise<OMSActionResponse> {
  return postOMSAction<MarkReadyForHandoffRequest, OMSActionResponse>(
    '/mark-ready',
    request
  );
}
