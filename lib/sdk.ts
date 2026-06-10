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
 * 
 * M67.9-01 Vercel Hosting:
 * - When NEXT_PUBLIC_API_MODE=disabled, all API calls return mock data
 * - No network calls are made when API mode is disabled
 */

import type {
  OrderMetrics,
  MediaMetrics,
  MockupMetrics,
  OrderFunnel,
  SLAMetrics,
  MockupSLAMetrics,
  MarketingOverviewResponse,
  TimePeriod,
  ActivitySpineResponse,
} from '../types/activity-spine';
import type {
  AttributionResponse,
  SourceFunnelRow,
  ChannelRevenueRow,
  GoogleAdsPerformanceRow,
  AttributionQualityRow,
  SeoPagePerformanceRow,
  SeoClusterPerformanceRow,
  AttributionReviewSnapshotResponse,
} from '../types/attribution';
import type { BootstrapResponse } from '../types/bootstrap';
import { isApiDisabled } from '../config/appConfig';

// ============================================
// Configuration
// ============================================

const ODS_API_URL =
  process.env.NEXT_PUBLIC_ODS_API_URL ||
  '/functions/v1/ods-api';
const ACTIVITY_SPINE_BASE_URL = process.env.NEXT_PUBLIC_ACTIVITY_SPINE_URL || '/api/activity-spine';
const SDK_FETCH_TIMEOUT_MS = 8000;

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

// =============================================================================
// M67.9-01 MOCK DATA FOR API-DISABLED MODE
// 
// SECURITY NOTE: This application is an internal tool.
// Access control is handled via Vercel Password Protection.
// No application-level authentication is implemented.
// The mock data below is for UI rendering only - no user assumed.
// =============================================================================

/**
 * M68-03: Mock bootstrap response for API-disabled mode.
 * 
 * IMPORTANT: This mock includes all required top-level keys to prevent UI crashes:
 * - user, organization, roles, permissions, environment, feature_visibility (standard)
 * - payload, metadata (required by some UI components)
 * 
 * No real data is included. This is for UI rendering only.
 */
const MOCK_BOOTSTRAP_RESPONSE: BootstrapResponse = {
  user: null as unknown as BootstrapResponse['user'], // No user assumed - Vercel Password Protection handles access
  organization: null as unknown as BootstrapResponse['organization'],
  roles: [],
  permissions: [],
  environment: {
    name: 'production',
    api_version: 'v1',
  },
  feature_visibility: {
    sales_engine: true,
    campaigns: true,
    approvals: false,
    execution: false,
  },
  // M68-03: Additional required keys to prevent "Cannot read properties of undefined (reading 'payload')" errors
  payload: {},
  metadata: {},
};

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
 * 
 * M67.9-01: Returns mock data when API mode is disabled.
 */
export async function getMe(): Promise<BootstrapResponse> {
  // M67.9-01: Return mock bootstrap data when API is disabled
  if (isApiDisabled) {
    console.log('[SDK] API mode disabled - returning mock bootstrap data');
    return MOCK_BOOTSTRAP_RESPONSE;
  }

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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), SDK_FETCH_TIMEOUT_MS);

  if (init.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ActivitySpineError(`Activity Spine request timed out after ${SDK_FETCH_TIMEOUT_MS}ms`, 408);
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

/**
 * Generic fetch wrapper with error handling
 * All Activity Spine calls go through this - ensures read-only compliance
 * 
 * M67.9-01: Returns mock response when API mode is disabled.
 */
async function fetchFromActivitySpine<T>(
  endpoint: string,
  params?: Record<string, string>
): Promise<ActivitySpineResponse<T>> {
  // M67.9-01: Return mock response when API is disabled
  if (isApiDisabled) {
    console.log(`[SDK] API mode disabled - returning mock response for ${endpoint}`);
    return {
      data: {} as T,
      timestamp: new Date().toISOString(),
      orgId: 'mock-org',
    };
  }

  const url = new URL(`${sdkConfig.activitySpineUrl}${endpoint}`, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetchWithTimeout(url.toString(), {
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
// Attribution APIs
// ============================================

/**
 * GET /activity-spine/marketing/attribution?view=source-funnel
 * All-time source-to-paid funnel aggregated by source_group.
 * Optional filter: source_group
 */
export async function getSourceToPaidFunnel(
  params: Record<string, string> = {}
): Promise<AttributionResponse<SourceFunnelRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'source-funnel' } };
  const sp = new URLSearchParams({ view: 'source-funnel', ...params });
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/marketing/attribution?${sp}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution source-funnel: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/marketing/attribution?view=channel-revenue
 * Daily channel revenue. Defaults to last 30 days.
 * Optional filters: start, end, source_group
 */
export async function getChannelRevenueDaily(
  params: Record<string, string> = {}
): Promise<AttributionResponse<ChannelRevenueRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'channel-revenue' } };
  const sp = new URLSearchParams({ view: 'channel-revenue', ...params });
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/marketing/attribution?${sp}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution channel-revenue: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/marketing/attribution?view=google-ads-performance
 * Google Ads × QMS join with join_confidence tiers. Defaults to last 30 days.
 * Optional filters: start, end, join_confidence
 */
export async function getGoogleAdsQuotePerformance(
  params: Record<string, string> = {}
): Promise<AttributionResponse<GoogleAdsPerformanceRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'google-ads-performance' } };
  const sp = new URLSearchParams({ view: 'google-ads-performance', ...params });
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/marketing/attribution?${sp}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution google-ads-performance: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/marketing/attribution?view=google-ads-quality
 * Attribution precision diagnostic — all-time confidence tier breakdown.
 */
export async function getGoogleAdsAttributionQuality(): Promise<AttributionResponse<AttributionQualityRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'google-ads-quality' } };
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/marketing/attribution?view=google-ads-quality`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution google-ads-quality: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/seo/attribution?view=page-performance
 * SEO pages with Search Console + quote outcome data. Ordered by revenue DESC.
 * Optional params: limit, page
 */
export async function getSeoPageQuotePerformance(
  params: Record<string, string> = {}
): Promise<AttributionResponse<SeoPagePerformanceRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'page-performance' } };
  const sp = new URLSearchParams({ view: 'page-performance', ...params });
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/seo/attribution?${sp}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution seo page-performance: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/seo/attribution?view=cluster-performance
 * Topic cluster rollup with revenue and top pages.
 */
export async function getSeoClusterQuotePerformance(): Promise<AttributionResponse<SeoClusterPerformanceRow>> {
  if (isApiDisabled) return { data: [], meta: { view: 'cluster-performance' } };
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/seo/attribution?view=cluster-performance`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution seo cluster-performance: ${res.status}`, res.status);
  return res.json();
}

/**
 * GET /activity-spine/marketing/attribution?view=review-snapshot
 *
 * Weekly attribution operating snapshot for the aggregated marketing
 * dashboard. Source aggregation lives in the ODS function
 * metrics.get_attribution_review_snapshot — this client just relays the
 * window and returns the JSON document.
 */
export async function getAttributionReviewSnapshot(
  params: { start_date?: string; end_date?: string } = {}
): Promise<AttributionReviewSnapshotResponse> {
  if (isApiDisabled) {
    return {
      data: null,
      meta: {
        view: 'review-snapshot',
        window_start: params.start_date ?? '',
        window_end: params.end_date ?? '',
        generated_at: new Date().toISOString(),
        source: 'mock',
      },
    };
  }
  const sp = new URLSearchParams({ view: 'review-snapshot' });
  if (params.start_date) sp.set('start_date', params.start_date);
  if (params.end_date) sp.set('end_date', params.end_date);
  const res = await fetchWithTimeout(`${sdkConfig.activitySpineUrl}/marketing/attribution?${sp}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  if (!res.ok) throw new ActivitySpineError(`Attribution review-snapshot: ${res.status}`, res.status);
  return res.json();
}

// ============================================
// Marketing Metrics API
// ============================================

/**
 * GET /activity-spine/marketing/overview
 *
 * Fetches marketing overview metrics.
 * Accepts flexible query params: preset, start/end, include_timeseries.
 * Read-only endpoint - no mutations.
 */
export async function getMarketingDashboardData(
  params: Record<string, string> = { period: '30d' }
): Promise<ActivitySpineResponse<MarketingOverviewResponse>> {
  return fetchFromActivitySpine<MarketingOverviewResponse>('/marketing/overview', params);
}
