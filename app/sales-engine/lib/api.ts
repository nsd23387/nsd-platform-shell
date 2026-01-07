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
  CampaignRunDetailed,
  CampaignVariant,
  ThroughputConfig,
  CampaignStatus,
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
  NeedsAttentionItem,
  UserBootstrap,
  CampaignObservability,
  RunRequestResponse,
  ObservabilityStatus,
  ObservabilityFunnel,
} from '../types/campaign';
import {
  assertReadOnly,
  ReadOnlyViolationError,
} from './read-only-guard';
import { isApiDisabled } from '../../../config/appConfig';

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

const MOCK_DASHBOARD_THROUGHPUT: DashboardThroughput = {
  usedToday: 0,
  dailyLimit: 100,
  activeCampaigns: 0,
  blockedByThroughput: 0,
};

const MOCK_SYSTEM_NOTICE: SystemNotice = {
  id: 'api-disabled-notice',
  type: 'info',
  message: 'API mode is disabled for this deployment.',
  active: true,
  createdAt: new Date().toISOString(),
};

// =============================================================================
// DEFENSIVE NORMALIZATION HELPERS
// Handle potential backend/frontend shape mismatches gracefully.
// =============================================================================

/**
 * Normalize array response that might be wrapped in an object.
 * 
 * If response is already an array, return it directly.
 * If response is { [key]: [...] }, extract and return the array.
 * Log a warning in development if normalization was needed.
 * 
 * @param result - The API response (array or wrapped object)
 * @param key - The key to look for if wrapped (e.g., 'runs', 'stages')
 * @param context - Description for logging
 */
function normalizeArrayResponse<T>(
  result: T[] | { [key: string]: T[] } | null | undefined,
  key: string,
  context: string
): T[] {
  // Handle null/undefined
  if (result == null) {
    return [];
  }
  
  // If already an array, return directly
  if (Array.isArray(result)) {
    return result;
  }
  
  // If wrapped in object, extract the array
  if (typeof result === 'object' && key in result) {
    const extracted = (result as Record<string, T[]>)[key];
    if (Array.isArray(extracted)) {
      // Log warning in development only
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[API NORMALIZATION] ${context}: Response was wrapped as { ${key}: [...] }. ` +
          `Expected raw array. Normalizing to array.`
        );
      }
      return extracted;
    }
  }
  
  // Fallback to empty array
  console.error(`[API ERROR] ${context}: Unexpected response shape`, result);
  return [];
}

/**
 * Normalize object response with defensive defaults.
 * 
 * @param result - The API response object
 * @param defaults - Default values if fields are missing
 * @param context - Description for logging
 */
function normalizeObjectResponse<T>(
  result: T | null | undefined,
  defaults: T,
  context: string
): T {
  if (result == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[API NORMALIZATION] ${context}: Response was null/undefined. Using defaults.`);
    }
    return defaults;
  }
  
  if (typeof result !== 'object' || Array.isArray(result)) {
    console.error(`[API ERROR] ${context}: Expected object, got`, typeof result);
    return defaults;
  }
  
  // Merge with defaults for any missing fields
  return { ...defaults, ...result } as T;
}

/**
 * STAGE LABEL MAPPING
 * 
 * Maps stage identifiers to human-readable labels.
 * Unknown stages are rendered gracefully with formatted identifier.
 */
const STAGE_LABELS: Record<string, string> = {
  orgs_sourced: 'Organizations Sourced',
  contacts_discovered: 'Contacts Discovered',
  contacts_evaluated: 'Contacts Evaluated',
  leads_promoted: 'Leads Promoted',
  leads_awaiting_approval: 'Leads Awaiting Approval',
  leads_approved: 'Leads Approved',
  emails_sent: 'Emails Sent',
  emails_opened: 'Emails Opened',
  emails_replied: 'Replies Received',
  replies: 'Replies',
};

/**
 * Format unknown stage identifier to readable label.
 * 
 * @param stage - Stage identifier (e.g., "new_stage_type")
 * @returns Human-readable label (e.g., "New Stage Type")
 */
function formatUnknownStage(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get stage label from identifier.
 * 
 * IMPORTANT: Renders unknown stages gracefully.
 * Never crashes on missing stage definitions.
 */
export function getStageLabel(stage: string): string {
  return STAGE_LABELS[stage] || formatUnknownStage(stage);
}

/**
 * Parse adapter execution details from event payload.
 * 
 * IMPORTANT: Status must come ONLY from event payload fields:
 * - details.adapterRequestMade
 * - reason
 * 
 * @param payload - Event payload from backend
 * @returns Adapter execution details or undefined if not applicable
 */
export function parseAdapterDetails(
  payload: Record<string, unknown> | undefined
): import('../types/campaign').AdapterExecutionDetails | undefined {
  if (!payload) return undefined;
  
  const details = payload.details as Record<string, unknown> | undefined;
  if (!details) return undefined;
  
  // Check if this stage involves adapter execution
  const adapterRequestMade = details.adapterRequestMade;
  if (typeof adapterRequestMade !== 'boolean') return undefined;
  
  const adapterName = typeof details.adapter === 'string' ? details.adapter : undefined;
  const resultCount = typeof details.resultCount === 'number' ? details.resultCount : undefined;
  const reason = typeof payload.reason === 'string' ? payload.reason : undefined;
  const errorMessage = typeof details.error === 'string' ? details.error : undefined;
  
  // Derive status from payload fields
  let status: import('../types/campaign').AdapterExecutionStatus;
  
  if (!adapterRequestMade) {
    status = 'not_called';
  } else if (errorMessage) {
    status = 'adapter_error';
  } else if (resultCount === 0) {
    status = 'called_no_results';
  } else {
    status = 'called_success';
  }
  
  return {
    adapterRequestMade,
    adapterName,
    resultCount,
    reason: errorMessage || reason,
    status,
  };
}

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
 * M68-03: Mock bootstrap data for API-disabled mode.
 * Includes all required top-level keys to prevent UI crashes.
 */
const MOCK_USER_BOOTSTRAP: UserBootstrap = {
  id: 'mock-user',
  email: 'mock@nsd.local',
  name: 'Mock User',
  permissions: [],
  feature_visibility: {
    sales_engine: true,
  },
  // M68-03: Additional required keys to prevent "Cannot read properties of undefined" errors
  payload: {},
  metadata: {},
};

/**
 * Get bootstrap information for the current user.
 */
export async function getBootstrap(): Promise<UserBootstrap | null> {
  // M68-03: Return mock bootstrap data when API is disabled (instead of null)
  if (isApiDisabled) {
    console.log('[API] API mode disabled - returning mock bootstrap data');
    return MOCK_USER_BOOTSTRAP;
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
 * 
 * DEFENSIVE NORMALIZATION:
 * If endpoint returns { runs: [...] } instead of [...], normalize to array.
 * This handles potential backend/frontend shape mismatches gracefully.
 */
export async function getCampaignRuns(id: string): Promise<CampaignRun[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  const result = await apiRequest<CampaignRun[] | { runs: CampaignRun[] }>(`/${id}/runs`);
  return normalizeArrayResponse(result, 'runs', `getCampaignRuns(${id})`);
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
// PIPELINE OBSERVABILITY API FUNCTIONS
// These provide read-only visibility into campaign pipeline state.
// Observability reflects pipeline state; execution is delegated.
// =============================================================================

/**
 * Mock observability data for API-disabled mode.
 * 
 * When API is disabled, show empty pipeline with proper zero-state.
 * No mock data should imply activity that hasn't occurred.
 */
const MOCK_OBSERVABILITY: CampaignObservability = {
  campaign_id: 'mock',
  status: 'idle',
  last_observed_at: new Date().toISOString(),
  pipeline: [], // Empty pipeline - no activity observed yet
};

/**
 * Mock observability status for API-disabled mode.
 */
const MOCK_OBSERVABILITY_STATUS: ObservabilityStatus = {
  campaign_id: 'mock',
  status: 'idle',
  last_observed_at: new Date().toISOString(),
};

/**
 * Mock observability funnel for API-disabled mode.
 * Empty stages indicate no activity observed yet.
 */
const MOCK_OBSERVABILITY_FUNNEL: ObservabilityFunnel = {
  campaign_id: 'mock',
  stages: [], // Empty - "No activity observed yet"
  last_updated_at: new Date().toISOString(),
};

/**
 * Get campaign observability data (read-only).
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No execution control
 * - No retries or overrides
 * - Counts come directly from backend, never inferred
 * 
 * DEFENSIVE NORMALIZATION:
 * Ensures response has all required fields with safe defaults.
 */
export async function getCampaignObservability(id: string): Promise<CampaignObservability> {
  // M67.9-01: Return mock data when API is disabled
  if (isApiDisabled) {
    return { ...MOCK_OBSERVABILITY, campaign_id: id };
  }
  const defaults: CampaignObservability = {
    campaign_id: id,
    status: 'idle',
    last_observed_at: new Date().toISOString(),
    pipeline: [],
  };
  const result = await apiRequest<CampaignObservability>(`/${id}/observability`);
  const normalized = normalizeObjectResponse(result, defaults, `getCampaignObservability(${id})`);
  
  // Extra safety: ensure pipeline is an array
  if (!Array.isArray(normalized.pipeline)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[API NORMALIZATION] getCampaignObservability(${id}): pipeline was not an array`);
    }
    normalized.pipeline = [];
  }
  
  return normalized;
}

/**
 * Get detailed campaign runs with full pipeline visibility (read-only).
 * 
 * Data source: GET /api/v1/campaigns/{id}/runs
 * 
 * Extended from getCampaignRuns to include per-run pipeline counts.
 * 
 * Empty state: Returns [] when no run.started events exist.
 * UI should show "No runs observed yet" in this case.
 * 
 * DEFENSIVE NORMALIZATION:
 * If endpoint returns { runs: [...] } instead of [...], normalize to array.
 */
export async function getCampaignRunsDetailed(id: string): Promise<CampaignRunDetailed[]> {
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  const result = await apiRequest<CampaignRunDetailed[] | { runs: CampaignRunDetailed[] }>(`/${id}/runs`);
  return normalizeArrayResponse(result, 'runs', `getCampaignRunsDetailed(${id})`);
}

// =============================================================================
// OBSERVABILITY STATUS & FUNNEL API FUNCTIONS
// These provide the source of truth for execution state.
// UI must derive all execution display from these endpoints.
// =============================================================================

/**
 * Get campaign execution status (read-only).
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability/status
 * 
 * This is the SOURCE OF TRUTH for execution state:
 * - "idle": No active run
 * - "run_requested": Execution request sent
 * - "running": Run in progress
 * - "awaiting_approvals": Run completed, leads pending approval
 * - "completed": Last run completed
 * - "failed": Last run failed
 * 
 * UI MUST NOT derive status from any other source.
 * 
 * DEFENSIVE NORMALIZATION:
 * Ensures response has all required fields with safe defaults.
 */
export async function getCampaignObservabilityStatus(id: string): Promise<ObservabilityStatus> {
  if (isApiDisabled) {
    return { ...MOCK_OBSERVABILITY_STATUS, campaign_id: id };
  }
  const defaults: ObservabilityStatus = {
    campaign_id: id,
    status: 'idle',
    last_observed_at: new Date().toISOString(),
  };
  const result = await apiRequest<ObservabilityStatus>(`/${id}/observability/status`);
  return normalizeObjectResponse(result, defaults, `getCampaignObservabilityStatus(${id})`);
}

/**
 * Get campaign observability funnel (read-only).
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability/funnel
 * 
 * UI must render counts directly from this response.
 * No local math or inference is allowed.
 * 
 * Empty state: When stages is [], show "No activity observed yet".
 * 
 * DEFENSIVE NORMALIZATION:
 * Ensures response has all required fields with safe defaults.
 * If stages is wrapped, normalize to array.
 */
export async function getCampaignObservabilityFunnel(id: string): Promise<ObservabilityFunnel> {
  if (isApiDisabled) {
    return { ...MOCK_OBSERVABILITY_FUNNEL, campaign_id: id };
  }
  const defaults: ObservabilityFunnel = {
    campaign_id: id,
    stages: [],
    last_updated_at: new Date().toISOString(),
  };
  const result = await apiRequest<ObservabilityFunnel>(`/${id}/observability/funnel`);
  const normalized = normalizeObjectResponse(result, defaults, `getCampaignObservabilityFunnel(${id})`);
  
  // Extra safety: ensure stages is an array
  if (!Array.isArray(normalized.stages)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[API NORMALIZATION] getCampaignObservabilityFunnel(${id}): stages was not an array`);
    }
    normalized.stages = [];
  }
  
  return normalized;
}

// =============================================================================
// RUN REQUEST FUNCTION
// This is the ONLY mutation allowed from the UI - requesting execution.
// Execution itself is delegated to the Sales Engine backend.
// =============================================================================

/**
 * Request campaign execution (async handoff).
 * 
 * Endpoint: POST /api/v1/campaigns/{id}/run
 * 
 * IMPORTANT: This does NOT execute the campaign. It delegates execution
 * intent to the Sales Engine, which is the only system with execution authority.
 * 
 * On 202 Accepted:
 * - UI shows "Execution requested"
 * - UI immediately begins polling /observability/status
 * - UI refetches /runs to check for new run
 * 
 * This is NOT a no-op or mock. The request is forwarded to Sales Engine.
 * 
 * @returns RunRequestResponse with status and delegation info
 * @throws Error if request fails or campaign cannot be run
 */
export async function requestCampaignRun(id: string): Promise<RunRequestResponse> {
  // When API is disabled, return a mock response indicating the action would occur
  if (isApiDisabled) {
    console.log(`[API] API mode disabled - mock run request for campaign ${id}`);
    return {
      status: 'run_requested',
      campaign_id: id,
      message: 'Execution request accepted (API disabled - mock response)',
      delegated_to: null,
    };
  }

  // This is the one allowed POST request - it delegates to backend
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/${id}/run`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        requested_at: new Date().toISOString(),
        source: 'platform-shell-ui',
      }),
    });

    if (response.status === 202) {
      // Async execution accepted
      const data = await response.json();
      return {
        status: 'run_requested',
        campaign_id: id,
        message: data.message || 'Execution request delegated to Sales Engine',
        delegated_to: data.delegated_to || 'sales-engine',
        run_id: data.run_id,
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    // Other success status (should be 202 for async)
    const data = await response.json();
    return {
      status: 'run_requested',
      campaign_id: id,
      message: data.message || 'Execution request accepted',
      delegated_to: data.delegated_to || 'sales-engine',
    };
  } catch (error) {
    console.error('[API] requestCampaignRun error:', error);
    throw error;
  }
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
// EXPORTS
// =============================================================================

export { ReadOnlyViolationError };
