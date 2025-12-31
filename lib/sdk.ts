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
  TimePeriod,
  ActivitySpineResponse,
} from '../types/activity-spine';
import type { BootstrapResponse } from '../types/bootstrap';
import { isApiDisabled } from '../config/appConfig';

// ============================================
// Configuration
// ============================================

const ODS_API_URL =
  process.env.NEXT_PUBLIC_ODS_API_URL ||
  '/functions/v1/ods-api';
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

// =============================================================================
// M67.9-01 MOCK DATA FOR API-DISABLED MODE
// =============================================================================

const MOCK_BOOTSTRAP_RESPONSE: BootstrapResponse = {
  user: {
    id: 'mock-user',
    email: 'preview@example.com',
    name: 'Preview User',
  },
  organization: {
    id: 'mock-org',
    name: 'Preview Organization',
  },
  roles: ['viewer'],
  permissions: ['read:campaigns'],
  environment: 'preview',
  feature_visibility: {
    sales_engine: true,
    campaigns: true,
    approvals: false,
    execution: false,
  },
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
      meta: {
        timestamp: new Date().toISOString(),
        source: 'mock',
      },
    } as ActivitySpineResponse<T>;
  }

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
