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

/**
 * Read-only API request function.
 * Enforces GET-only constraint for the Sales Engine UI.
 */
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
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
// =============================================================================

/**
 * Get bootstrap information for the current user.
 */
export async function getBootstrap(): Promise<UserBootstrap | null> {
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
  return apiRequest<MetricsHistoryEntry[]>(`/${id}/metrics/history`);
}

/**
 * Get campaign runs (read-only observability).
 */
export async function getCampaignRuns(id: string): Promise<CampaignRun[]> {
  return apiRequest<CampaignRun[]>(`/${id}/runs`);
}

/**
 * Get latest campaign run (read-only observability).
 */
export async function getLatestRun(id: string): Promise<CampaignRun | null> {
  return apiRequest<CampaignRun | null>(`/${id}/runs/latest`);
}

/**
 * Get campaign variants (read-only).
 */
export async function getCampaignVariants(id: string): Promise<CampaignVariant[]> {
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
  return apiRequest<DashboardReadiness>('/readiness');
}

/**
 * Get dashboard throughput summary (read-only).
 */
export async function getDashboardThroughput(): Promise<DashboardThroughput> {
  return apiRequest<DashboardThroughput>('/throughput');
}

/**
 * Get system notices (read-only).
 */
export async function getSystemNotices(): Promise<SystemNotice[]> {
  return apiRequest<SystemNotice[]>('/notices');
}

/**
 * Get recent run outcomes (read-only observability).
 */
export async function getRecentRuns(): Promise<RecentRunOutcome[]> {
  return apiRequest<RecentRunOutcome[]>('/runs/recent');
}

/**
 * Get items needing attention (read-only).
 */
export async function getNeedsAttention(): Promise<NeedsAttentionItem[]> {
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
