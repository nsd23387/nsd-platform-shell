/**
 * Sales Engine API Client - Target-State Architecture
 * 
 * This module provides a READ-ONLY API client for the Sales Engine UI.
 * 
 * Non-negotiable constraints:
 * - Only GET requests are allowed from the UI layer
 * - All mutation functions have been removed or replaced with read-only alternatives
 * - Execution is observed, not initiated
 * - Canonical ODS is the source of truth
 * 
 * M67.9-01 Vercel Hosting:
 * - When NEXT_PUBLIC_API_MODE=disabled, all API calls return empty/mock data
 * - No network calls are made when API mode is disabled
 */

import type {
  Campaign,
  CampaignDetail,
  CampaignMetrics,
  MetricsHistoryEntry,
  CampaignRun,
  CampaignVariant,
  ThroughputConfig,
  CampaignStatus,
  DashboardReadiness,
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
  NeedsAttentionItem,
  UserBootstrap,
  ReadinessStatus,
} from '../types/campaign';
import {
  assertReadOnly,
  ReadOnlyViolationError,
  READ_ONLY_MESSAGE,
} from './read-only-guard';
import { isApiDisabled, isReadOnly, READ_ONLY_BANNER_MESSAGE } from '../../../config/appConfig';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns';
  }
  return process.env.SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns';
};

const getOdsApiUrl = () => {
  return process.env.NEXT_PUBLIC_ODS_API_URL || '';
};

function getAuthToken(): string | undefined {
  if (typeof window !== 'undefined') {
    const windowWithToken = window as unknown as { __SALES_ENGINE_TOKEN__?: string };
    if (windowWithToken.__SALES_ENGINE_TOKEN__) {
      return windowWithToken.__SALES_ENGINE_TOKEN__;
    }
  }
  return process.env.NEXT_PUBLIC_SALES_ENGINE_DEV_TOKEN;
}

function buildHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// =============================================================================
// M67.9-01 MOCK DATA FOR API-DISABLED MODE
// When NEXT_PUBLIC_API_MODE=disabled, these values are returned instead of
// making network calls. This enables Vercel preview deployments.
// =============================================================================

const MOCK_DASHBOARD_READINESS: DashboardReadiness = {
  total: 0,
  draft: 0,
  pendingReview: 0,
  runnable: 0,
  running: 0,
  completed: 0,
  failed: 0,
  archived: 0,
  blockers: [],
};

const MOCK_DASHBOARD_THROUGHPUT: DashboardThroughput = {
  usedToday: 0,
  dailyLimit: 100,
  activeCampaigns: 0,
  blockedByThroughput: 0,
};

const MOCK_SYSTEM_NOTICE: SystemNotice = {
  id: 'api-disabled-notice',
  type: 'info',
  message: READ_ONLY_BANNER_MESSAGE,
  active: true,
  createdAt: new Date().toISOString(),
};

/**
 * Read-only API request function.
 * Enforces GET-only constraint for the Sales Engine UI.
 * 
 * M67.9-01: Returns early with null when API mode is disabled.
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // M67.9-01: Short-circuit when API mode is disabled
  if (isApiDisabled) {
    console.log(`[API] API mode disabled - skipping request to ${endpoint}`);
    return null as unknown as T;
  }

  const method = options?.method?.toUpperCase() || 'GET';
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;

  // Enforce read-only constraint
  assertReadOnly(method, url);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

// =============================================================================
// READ-ONLY API FUNCTIONS
// These are the only allowed API calls from the Sales Engine UI.
// M67.9-01: All functions return mock data when API mode is disabled.
// =============================================================================

/**
 * Get bootstrap information for the current user.
 */
export async function getBootstrap(): Promise<UserBootstrap | null> {
  // M67.9-01: Return null when API is disabled
  if (isApiDisabled) {
    console.log('[API] API mode disabled - returning null for bootstrap');
    return null;
  }

  const odsUrl = getOdsApiUrl();
  if (!odsUrl) {
    return null;
  }
  
  try {
    const response = await fetch(`${odsUrl}/api/v1/me`, {
      headers: buildHeaders(),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch {
    return null;
  }
}

/**
 * List campaigns (read-only).
 */
export async function listCampaigns(status?: CampaignStatus): Promise<Campaign[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  const params = status ? `?status=${status}` : '';
  return apiRequest<Campaign[]>(params);
}

/**
 * Get campaign details (read-only).
 */
export async function getCampaign(id: string): Promise<CampaignDetail> {
  return apiRequest<CampaignDetail>(`/${id}`);
}

/**
 * Get campaign metrics (read-only).
 */
export async function getCampaignMetrics(id: string): Promise<CampaignMetrics> {
  return apiRequest<CampaignMetrics>(`/${id}/metrics`);
}

/**
 * Get campaign metrics history (read-only).
 */
export async function getCampaignMetricsHistory(id: string): Promise<MetricsHistoryEntry[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  return apiRequest<MetricsHistoryEntry[]>(`/${id}/metrics/history`);
}

/**
 * Get campaign runs (read-only observability).
 */
export async function getCampaignRuns(id: string): Promise<CampaignRun[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  return apiRequest<CampaignRun[]>(`/${id}/runs`);
}

/**
 * Get latest campaign run (read-only observability).
 */
export async function getLatestRun(id: string): Promise<CampaignRun | null> {
  // M67.9-01: Return null when API is disabled
  if (isApiDisabled) {
    return null;
  }
  return apiRequest<CampaignRun | null>(`/${id}/runs/latest`);
}

/**
 * Get campaign variants (read-only).
 */
export async function getCampaignVariants(id: string): Promise<CampaignVariant[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  return apiRequest<CampaignVariant[]>(`/${id}/variants`);
}

/**
 * Get campaign throughput configuration (read-only).
 */
export async function getCampaignThroughput(id: string): Promise<ThroughputConfig> {
  return apiRequest<ThroughputConfig>(`/${id}/throughput`);
}

/**
 * Get campaign readiness status (read-only).
 */
export async function getCampaignReadiness(id: string): Promise<ReadinessStatus> {
  return apiRequest<ReadinessStatus>(`/${id}/readiness`);
}

/**
 * Get dashboard readiness summary (read-only).
 */
export async function getDashboardReadiness(): Promise<DashboardReadiness> {
  // M67.9-01: Return mock data when API is disabled
  if (isApiDisabled) {
    return MOCK_DASHBOARD_READINESS;
  }
  return apiRequest<DashboardReadiness>('/readiness');
}

/**
 * Get dashboard throughput summary (read-only).
 */
export async function getDashboardThroughput(): Promise<DashboardThroughput> {
  // M67.9-01: Return mock data when API is disabled
  if (isApiDisabled) {
    return MOCK_DASHBOARD_THROUGHPUT;
  }
  return apiRequest<DashboardThroughput>('/throughput');
}

/**
 * Get system notices (read-only).
 */
export async function getSystemNotices(): Promise<SystemNotice[]> {
  // M67.9-01: Return API disabled notice when API is disabled
  if (isApiDisabled) {
    return [MOCK_SYSTEM_NOTICE];
  }
  return apiRequest<SystemNotice[]>('/notices');
}

/**
 * Get recent run outcomes (read-only observability).
 */
export async function getRecentRuns(): Promise<RecentRunOutcome[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  return apiRequest<RecentRunOutcome[]>('/runs/recent');
}

/**
 * Get items needing attention (read-only).
 */
export async function getNeedsAttention(): Promise<NeedsAttentionItem[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  return apiRequest<NeedsAttentionItem[]>('/attention');
}

// =============================================================================
// DEPRECATED/REMOVED MUTATION FUNCTIONS
// These functions have been removed per target-state architecture constraints.
// The Sales Engine UI is read-only; mutations are managed by backend systems.
// =============================================================================

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign creation is managed by backend governance systems.
 */
export async function createCampaign(): Promise<never> {
  throw new ReadOnlyViolationError('POST', '/campaigns (createCampaign)');
}

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign updates are managed by backend governance systems.
 */
export async function updateCampaign(): Promise<never> {
  throw new ReadOnlyViolationError('PATCH', '/campaigns/:id (updateCampaign)');
}

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign submission is managed by backend governance systems.
 * 
 * Note: In a future iteration, this may be re-enabled as a governance action
 * that triggers a backend workflow, but for now, the UI cannot initiate mutations.
 */
export async function submitCampaign(): Promise<never> {
  throw new ReadOnlyViolationError('POST', '/campaigns/:id/submit (submitCampaign)');
}

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign approval is managed by backend governance systems.
 */
export async function approveCampaign(): Promise<never> {
  throw new ReadOnlyViolationError('POST', '/campaigns/:id/approve (approveCampaign)');
}

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign rejection is managed by backend governance systems.
 */
export async function rejectCampaign(): Promise<never> {
  throw new ReadOnlyViolationError('POST', '/campaigns/:id/reject (rejectCampaign)');
}

/**
 * @deprecated This function has been removed. The Sales Engine UI is read-only.
 * Campaign execution is managed by backend systems and observed in this UI.
 * 
 * This is a BLOCKER per target-state constraints:
 * - UI must NOT let a user "start/run/launch" anything
 * - Execution is observed, not initiated
 */
export async function startCampaignRun(): Promise<never> {
  throw new ReadOnlyViolationError('POST', '/campaigns/:id/runs (startCampaignRun)');
}

// =============================================================================
// READ-ONLY STATUS EXPORTS
// =============================================================================

export { READ_ONLY_MESSAGE, ReadOnlyViolationError };

/**
 * Check if an action is available in the read-only UI.
 * Always returns false for mutation actions.
 */
export function isActionAvailable(action: string): boolean {
  const mutationActions = [
    'create',
    'update',
    'submit',
    'approve',
    'reject',
    'start',
    'run',
    'execute',
    'delete',
  ];
  return !mutationActions.some(m => action.toLowerCase().includes(m));
}

/**
 * Get a message explaining why an action is not available.
 */
export function getUnavailableActionMessage(action: string): string {
  return `The "${action}" action is not available. ${READ_ONLY_MESSAGE}`;
}
