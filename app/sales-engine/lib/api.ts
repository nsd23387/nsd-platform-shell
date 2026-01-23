/**
 * Sales Engine API Client - Target-State Architecture
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * EXECUTION AUTHORITY CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * INVARIANT: Execution truth comes ONLY from sales-engine.
 * 
 * Platform-shell is a PURE CONSUMER of execution data.
 * 
 * ALLOWED EXECUTION ENDPOINTS:
 * - getExecutionState()  → GET /api/v1/campaigns/:id/execution-state
 * - getRunHistory()      → GET /api/v1/campaigns/:id/run-history
 * 
 * FORBIDDEN (DO NOT ADD):
 * - GET /api/v1/campaigns/:id/runs
 * - GET /api/v1/campaigns/:id/runs/latest  
 * - GET /api/v1/campaigns/:id/observability/*
 * - Any local database queries for execution data
 * - Inference or reconstruction of execution state
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Non-negotiable constraints:
 * - Only GET requests for read-only display
 * - Execution is observed from sales-engine, not computed locally
 * - If sales-engine is unreachable, show error (no fallback)
 * 
 * M67.9-01 Vercel Hosting:
 * - When NEXT_PUBLIC_API_MODE=disabled, all API calls return empty/mock data
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
  FunnelScope,
  FunnelExecution,
  DualLayerFunnel,
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
 * Get campaign scope (business-first funnel).
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Campaign value exists independently of execution.
 * Execution unlocks value — it does not define it.
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Returns eligibility counts that:
 * - MUST populate even if execution has never run
 * - MUST populate even if execution produces zero new writes
 * - MUST NOT depend on run status
 * 
 * @param id - Campaign ID
 * @returns FunnelScope with eligibility counts
 */
export async function getCampaignScope(id: string): Promise<FunnelScope> {
  // M67.9-01: Return empty scope when API is disabled
  if (isApiDisabled) {
    return {
      eligibleOrganizations: 0,
      eligibleContacts: 0,
      eligibleLeads: 0,
      scopeAvailable: false,
      scopeComputedAt: new Date().toISOString(),
    };
  }

  try {
    // Fetch from scope endpoint (separate from execution-state)
    const response = await fetch(`/api/campaigns/${encodeURIComponent(id)}/scope`, {
      headers: buildHeaders(),
    });

    if (!response.ok) {
      console.warn(`[getCampaignScope] Non-OK response: ${response.status}`);
      return {
        eligibleOrganizations: 0,
        eligibleContacts: 0,
        eligibleLeads: 0,
        scopeAvailable: false,
        scopeComputedAt: new Date().toISOString(),
      };
    }

    const data = await response.json();
    
    return {
      eligibleOrganizations: data.eligibleOrganizations ?? 0,
      eligibleContacts: data.eligibleContacts ?? 0,
      eligibleLeads: data.eligibleLeads ?? 0,
      scopeAvailable: data.scopeAvailable ?? true,
      scopeComputedAt: data.scopeComputedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error('[getCampaignScope] Error:', error);
    return {
      eligibleOrganizations: 0,
      eligibleContacts: 0,
      eligibleLeads: 0,
      scopeAvailable: false,
      scopeComputedAt: new Date().toISOString(),
    };
  }
}

/**
 * Get dual-layer funnel data (scope + execution).
 * 
 * Combines:
 * - Business scope (from getCampaignScope)
 * - Execution progress (from getExecutionState)
 * 
 * INVARIANT:
 * Scope is primary and independent of execution.
 * Execution metrics are observational and secondary.
 * 
 * @param id - Campaign ID
 * @returns DualLayerFunnel with both scope and execution data
 */
export async function getDualLayerFunnel(id: string): Promise<DualLayerFunnel> {
  // Fetch both in parallel
  const [scope, executionState] = await Promise.all([
    getCampaignScope(id),
    getExecutionState(id).catch(() => null),
  ]);

  // Extract execution metrics from execution state
  const execution: FunnelExecution = {
    processedOrganizations: executionState?.funnel?.organizations?.total ?? 0,
    processedContacts: executionState?.funnel?.contacts?.total ?? 0,
    promotedLeads: executionState?.funnel?.leads?.total ?? 0,
    sentMessages: 0, // Not yet available in execution-state
    executionAvailable: executionState !== null,
    runId: executionState?.run?.id,
    runStatus: executionState?.run?.status,
  };

  return {
    campaignId: id,
    scope,
    execution,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Get campaign runs (read-only observability).
 * 
 * @deprecated OBSERVATIONS-FIRST MIGRATION:
 * This function queries legacy run endpoints that may not reflect
 * the canonical execution state. Use useExecutionState() hook instead.
 * 
 * Canonical endpoints:
 * - execution-state: Single source of truth for execution
 * - run-history: When canonical run history endpoint is available
 * - market-scope / harvest-metrics: For scope data
 * 
 * DEFENSIVE NORMALIZATION:
 * If endpoint returns { runs: [...] } instead of [...], normalize to array.
 * This handles potential backend/frontend shape mismatches gracefully.
 */
export async function getCampaignRuns(id: string): Promise<CampaignRun[]> {
  console.warn(`[DEPRECATED] getCampaignRuns(${id}) - Use useExecutionState() hook instead`);
  // M67.9-01: Return empty array when API is disabled
  if (isApiDisabled) {
    return [];
  }
  const result = await apiRequest<CampaignRun[] | { runs: CampaignRun[] }>(`/${id}/runs`);
  return normalizeArrayResponse(result, 'runs', `getCampaignRuns(${id})`);
}

/**
 * Get latest campaign run (read-only observability).
 * 
 * @deprecated OBSERVATIONS-FIRST MIGRATION:
 * This function queries legacy run endpoints. Use useExecutionState() hook instead.
 * The execution-state endpoint is the single source of truth for execution state.
 * 
 * Canonical endpoints:
 * - /api/v1/campaigns/:id/execution-state
 */
export async function getLatestRun(id: string): Promise<CampaignRun | null> {
  console.warn(`[DEPRECATED] getLatestRun(${id}) - Use useExecutionState() hook instead`);
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
 * @deprecated OBSERVATIONS-FIRST MIGRATION:
 * This function queries legacy run endpoints. Use useExecutionState() hook instead.
 * 
 * When run history is needed:
 * - Use the canonical run-history endpoint when available
 * - Do NOT reconstruct run history from events
 * 
 * Canonical endpoints:
 * - /api/v1/campaigns/:id/execution-state - Single source of execution truth
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
  console.warn(`[DEPRECATED] getCampaignRunsDetailed(${id}) - Use useExecutionState() hook instead`);
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
 * - "completed": Last execution completed
 * - "failed": Last execution failed
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
// This submits execution intent via the server-side proxy.
// The proxy forwards requests to nsd-sales-engine to avoid CORS.
// platform-shell NEVER executes campaigns locally.
// =============================================================================

/**
 * Run intent determines execution behavior.
 * 
 * HARVEST_ONLY: Observe and collect market data without sending emails.
 *   Use this to validate market scope without activating outreach.
 * 
 * ACTIVATE: Full execution including email dispatch.
 *   Use this when ready to engage contacts.
 */
export type RunIntent = 'HARVEST_ONLY' | 'ACTIVATE';

/**
 * Request campaign execution via server-side proxy.
 * 
 * Execution is handled exclusively by nsd-sales-engine.
 * platform-shell must never execute campaigns.
 * 
 * This function calls the /api/execute-campaign proxy endpoint,
 * which forwards the request server-to-server to nsd-sales-engine.
 * This eliminates CORS issues since the browser never calls sales-engine directly.
 * 
 * The proxy uses SALES_ENGINE_URL + SALES_ENGINE_API_BASE_URL to construct
 * the target URL. If the primary path returns 404, it tries a fallback.
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * - runIntent controls what the execution does
 * - HARVEST_ONLY = observe market, collect data, NO emails
 * - ACTIVATE = full execution with email dispatch
 * 
 * On 202 Accepted:
 * - A campaign_run is created in nsd-ods
 * - Sales Engine cron automatically executes the run
 * - UI must refetch /runs to get server-truth state
 * - UI must NOT fabricate local run state
 * 
 * Error Handling:
 * - 404: "Execution service misconfigured (endpoint not found)."
 * - 409 PLANNING_ONLY_CAMPAIGN: "Execution disabled — this campaign is planning-only."
 * - 409 CAMPAIGN_NOT_RUNNABLE: "Campaign is not in a runnable state."
 * - 504: "Execution service timed out."
 * - 5xx: "Execution service unavailable. Please try again."
 * 
 * @param id - Campaign ID
 * @param runIntent - Optional intent (defaults to ACTIVATE for backward compatibility)
 * @returns RunRequestResponse with status and run_id
 * @throws Error if request fails or campaign cannot be started
 */
export async function requestCampaignRun(
  id: string, 
  runIntent: RunIntent = 'ACTIVATE'
): Promise<RunRequestResponse> {
  // When API is disabled, return a mock response indicating the action would occur
  if (isApiDisabled) {
    console.log(`[API] API mode disabled - mock run request for campaign ${id} (intent: ${runIntent})`);
    return {
      status: 'queued',
      campaign_id: id,
      message: `Execution request accepted (API disabled - mock response, intent: ${runIntent})`,
      delegated_to: null,
    };
  }

  // Execution is handled exclusively by nsd-sales-engine.
  // platform-shell must never execute campaigns.
  // Use server-side proxy to avoid CORS issues.
  try {
    const response = await fetch('/api/execute-campaign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: id, runIntent }),
    });

    // 202 Accepted = success (execution intent accepted by Sales Engine)
    if (response.status === 202 || response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        status: data.status || 'run_requested',
        campaign_id: id,
        message: data.message || 'Campaign queued',
        delegated_to: 'nsd-sales-engine',
        run_id: data.run_id,
      };
    }

    // Error response - provide user-friendly messages
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    
    if (response.status === 404) {
      // Endpoint not found - likely misconfiguration
      throw new Error('Execution service misconfigured (endpoint not found). Check SALES_ENGINE_URL / SALES_ENGINE_API_BASE_URL.');
    }
    
    if (response.status === 409) {
      if (errorData.error === 'PLANNING_ONLY_CAMPAIGN') {
        throw new Error('Execution disabled — this campaign is planning-only.');
      } else if (errorData.error === 'CAMPAIGN_NOT_RUNNABLE') {
        throw new Error('Campaign is not in a runnable state.');
      }
      throw new Error(errorData.reason || errorData.error || 'Campaign not in correct state');
    }
    
    if (response.status === 504) {
      // Timeout
      throw new Error('Execution service timed out. Please try again.');
    }
    
    if (response.status >= 500) {
      throw new Error('Execution service unavailable. Please try again.');
    }
    
    throw new Error(errorData.message || errorData.error || `Request failed: ${response.status}`);
  } catch (error) {
    console.error('[API] requestCampaignRun error:', error);
    throw error;
  }
}

// =============================================================================
// CAMPAIGN UPDATE
// Updates an existing campaign's configuration.
// This is a control-plane write for campaign editing.
//
// GOVERNANCE ALIGNMENT:
// Campaign updates are permitted as part of campaign management.
// Updates do NOT change governance state or initiate execution.
// =============================================================================

export interface UpdateCampaignPayload {
  campaign_id: string;
  name?: string;
  description?: string;
  icp?: {
    keywords?: string[];
    industries?: string[];
    geographies?: string[];
    job_titles?: string[];
    seniority_levels?: string[];
    company_size?: { min: number; max: number };
    roles?: string[];
  };
  contact_targeting?: {
    roles?: string[];
    seniority?: string[];
    max_contacts_per_org?: number;
    email_requirements?: {
      require_verified?: boolean;
      exclude_generic?: boolean;
    };
  };
  outreach_context?: {
    tone?: string;
    value_propositions?: string[];
    pain_points?: string[];
    call_to_action?: string;
  };
  campaign_targets?: {
    target_leads?: number | null;
    target_emails?: number | null;
    target_reply_rate?: number | null;
  };
  sourcing_config?: {
    benchmarks_only?: boolean;
  };
}

export interface UpdateCampaignResponse {
  success: boolean;
  data?: {
    campaign: {
      id: string;
      updated: boolean;
    };
  };
  error?: string;
}

/**
 * Update a campaign's configuration.
 * 
 * @param payload - The update payload including campaign_id and fields to update
 * @returns The update result
 */
export async function updateCampaign(
  payload: UpdateCampaignPayload
): Promise<UpdateCampaignResponse> {
  if (isApiDisabled) {
    console.log(`[API] API mode disabled - mock update for campaign ${payload.campaign_id}`);
    return {
      success: true,
      data: {
        campaign: {
          id: payload.campaign_id,
          updated: true,
        },
      },
    };
  }

  try {
    const response = await fetch('/api/campaign-update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Update failed: ${response.status}`,
      };
    }

    return data as UpdateCampaignResponse;
  } catch (error) {
    console.error('[API] updateCampaign error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// CAMPAIGN DUPLICATION
// Duplicates an existing campaign with a new ID and DRAFT status.
// This is a control-plane write similar to campaign creation.
//
// GOVERNANCE ALIGNMENT:
// Campaign duplication is explicitly permitted as an extension of the
// CampaignCreate control-plane write capability. Both create new campaigns
// in DRAFT state without execution capabilities. This is NOT a UI-initiated
// execution or approval - it creates a new campaign for human review.
// =============================================================================

export interface DuplicateCampaignResponse {
  success: boolean;
  data?: {
    campaign: {
      id: string;
      name: string;
      governance_state: 'DRAFT';
      source_campaign_id: string;
    };
  };
  error?: string;
}

/**
 * Duplicate a campaign.
 * Creates a copy of the campaign with a new ID and DRAFT status.
 * 
 * @param sourceCampaignId - The ID of the campaign to duplicate
 * @param newName - Optional custom name for the duplicated campaign
 * @returns The duplicated campaign details
 */
export async function duplicateCampaign(
  sourceCampaignId: string,
  newName?: string
): Promise<DuplicateCampaignResponse> {
  // When API is disabled, return a mock response
  if (isApiDisabled) {
    console.log(`[API] API mode disabled - mock duplicate for campaign ${sourceCampaignId}`);
    return {
      success: true,
      data: {
        campaign: {
          id: `mock-duplicate-${Date.now()}`,
          name: newName || `Copy of Campaign (mock)`,
          governance_state: 'DRAFT',
          source_campaign_id: sourceCampaignId,
        },
      },
    };
  }

  try {
    const response = await fetch('/api/campaign-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_campaign_id: sourceCampaignId,
        new_name: newName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Duplicate failed: ${response.status}`,
      };
    }

    return data as DuplicateCampaignResponse;
  } catch (error) {
    console.error('[API] duplicateCampaign error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// EXECUTION STATE (CANONICAL - SOLE AUTHORITY)
// GET /api/v1/campaigns/:id/execution-state
// 
// THIS IS THE ONLY SOURCE FOR EXECUTION-RELATED DATA.
// NO fallbacks to legacy endpoints. NO inference. NO silent failures.
// =============================================================================

/**
 * Canonical execution state response.
 * 
 * THIS IS THE SOLE EXECUTION AUTHORITY.
 * All execution-related UI must derive from this type.
 * 
 * Source: GET /api/v1/campaigns/:id/execution-state
 */
export interface ExecutionState {
  campaignId: string;
  run: {
    id: string;
    status: string;
    stage?: string;
    startedAt?: string;
    endedAt?: string;
    terminationReason?: string;
    errorMessage?: string;
  } | null;
  funnel: {
    organizations: {
      total: number;
      qualified: number;
      review: number;
      disqualified: number;
    };
    contacts: {
      total: number;
      sourced: number;
      ready: number;
      withEmail: number;
    };
    leads: {
      total: number;
      pending: number;
      approved: number;
    };
  };
  lastUpdatedAt: string;
}

// =============================================================================
// RUN HISTORY (CANONICAL - FROM SALES-ENGINE)
// GET /api/v1/campaigns/:id/run-history
// 
// EXECUTION AUTHORITY CONTRACT:
// - Sales-engine is the SOLE source of run history
// - Platform-shell displays what sales-engine provides
// - NO inference, grouping, or reconstruction
// - NO fallback to legacy endpoints
// =============================================================================

/**
 * A single historical run from sales-engine.
 * 
 * EXECUTION AUTHORITY: Sales-engine is the sole source.
 * Display only what the backend provides.
 */
export interface HistoricalRun {
  id: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  terminationReason?: string;
  errorMessage?: string;
  /** Summary counts at time of run completion */
  summary?: {
    organizationsSourced?: number;
    contactsDiscovered?: number;
    leadsPromoted?: number;
  };
}

/**
 * Run history response from sales-engine.
 * 
 * EXECUTION AUTHORITY CONTRACT:
 * - If available=false, show "Run history not available yet"
 * - Do NOT fallback to legacy endpoints
 * - Do NOT reconstruct runs from events
 */
export interface RunHistoryResponse {
  campaignId: string;
  runs: HistoricalRun[];
  available: boolean;
  lastUpdatedAt?: string;
}

/**
 * Legacy type alias for migration compatibility.
 * Maps ExecutionState to the old RealTimeExecutionStatus shape.
 * 
 * @deprecated Use ExecutionState directly. This will be removed.
 */
export interface RealTimeExecutionStatus {
  campaignId: string;
  latestRun: {
    id: string;
    status: string;
    phase?: string;
    stage?: string;
    startedAt?: string;
    completedAt?: string;
    durationSeconds?: number;
    errorMessage?: string;
    terminationReason?: string;
  } | null;
  funnel: {
    organizations: {
      total: number;
      qualified: number;
      review: number;
      disqualified: number;
    };
    contacts: {
      total: number;
      sourced: number;
      ready: number;
      withEmail: number;
      scored?: number;
      enriched?: number;
    };
    leads: {
      total: number;
      pending: number;
      approved: number;
    };
  };
  stages?: Array<{
    stage: string;
    status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
    message: string;
    details?: Record<string, unknown>;
    completedAt?: string;
  }>;
  alerts?: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
  }>;
  _meta?: {
    fetchedAt: string;
    source: string;
  };
}

/**
 * Get canonical execution state from sales-engine.
 * 
 * ARCHITECTURAL CONSTRAINT:
 * - Sales-engine is the SOLE execution authority
 * - Platform-shell does NOT implement execution logic
 * - This function calls a proxy that forwards to sales-engine
 * 
 * Proxy: GET /api/proxy/execution-state?campaignId=xxx
 * Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/execution-state
 * 
 * NO fallbacks. NO inference. NO local database queries.
 * If this fails, the UI must show an error state.
 */
export async function getExecutionState(id: string): Promise<ExecutionState> {
  // Use proxy endpoint to avoid CORS and keep SALES_ENGINE_URL server-side
  const endpoint = `/api/proxy/execution-state?campaignId=${encodeURIComponent(id)}`;
  
  if (isApiDisabled) {
    return {
      campaignId: id,
      run: null,
      funnel: {
        organizations: { total: 0, qualified: 0, review: 0, disqualified: 0 },
        contacts: { total: 0, sourced: 0, ready: 0, withEmail: 0 },
        leads: { total: 0, pending: 0, approved: 0 },
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  console.log('[getExecutionState] Fetching from sales-engine:', { campaignId: id });

  const response = await fetch(endpoint, { headers: buildHeaders() });
  const data = await response.json();

  if (!response.ok) {
    console.error('[getExecutionState] Fetch failed:', { 
      campaignId: id, 
      status: response.status,
      error: data.error,
    });
    throw new Error(data.message || `Execution state unavailable: ${response.status}`);
  }

  console.log('[getExecutionState] Received from sales-engine:', {
    campaignId: id,
    runId: data.run?.id ?? 'none',
    runStatus: data.run?.status ?? 'no_runs',
  });

  return data as ExecutionState;
}

/**
 * Get run history from sales-engine.
 * 
 * EXECUTION AUTHORITY CONTRACT:
 * - Sales-engine is the SOLE source of run history
 * - Platform-shell displays what sales-engine provides
 * - NO inference, grouping, or reconstruction
 * - NO fallback to legacy endpoints (/runs, /campaign-runs, etc.)
 * 
 * Proxy: GET /api/proxy/run-history?campaignId=xxx
 * Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/run-history
 * 
 * If endpoint is unavailable:
 * - Returns { available: false, runs: [] }
 * - UI should show "Run history not available yet"
 * - Do NOT attempt fallback or reconstruction
 */
export async function getRunHistory(id: string): Promise<RunHistoryResponse> {
  const endpoint = `/api/proxy/run-history?campaignId=${encodeURIComponent(id)}`;
  
  if (isApiDisabled) {
    return {
      campaignId: id,
      runs: [],
      available: false,
    };
  }

  console.log('[getRunHistory] Fetching from sales-engine:', { campaignId: id });

  try {
    const response = await fetch(endpoint, { headers: buildHeaders() });
    const data = await response.json();

    // Handle graceful unavailability (endpoint not implemented yet)
    if (!data.available) {
      console.log('[getRunHistory] Not available yet:', { campaignId: id });
      return {
        campaignId: id,
        runs: [],
        available: false,
      };
    }

    console.log('[getRunHistory] Received from sales-engine:', {
      campaignId: id,
      runCount: data.runs?.length ?? 0,
      available: data.available,
    });

    return {
      campaignId: id,
      runs: data.runs || [],
      available: true,
      lastUpdatedAt: data.lastUpdatedAt,
    };
  } catch (error) {
    console.error('[getRunHistory] Fetch failed:', { campaignId: id, error });
    // Return unavailable state - do NOT throw
    // UI should handle gracefully, not show error
    return {
      campaignId: id,
      runs: [],
      available: false,
    };
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

// NOTE: updateCampaign is now a working function defined above for campaign editing.
// The deprecated stub has been removed.

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
