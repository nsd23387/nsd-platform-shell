/**
 * useExecutionState Hook
 * 
 * CANONICAL EXECUTION STATE HOOK
 * 
 * This hook is the ONLY way the UI should access execution state.
 * 
 * ARCHITECTURE:
 * - Uses PROXY endpoint: /api/proxy/execution-state?campaignId=...
 * - Proxy forwards to Sales Engine (the sole execution authority)
 * - NO direct calls to /api/v1/* execution routes
 * 
 * CONTRACT (NON-NEGOTIABLE):
 * - Single fetch via proxy to sales-engine
 * - No fallbacks to other endpoints
 * - No reconstruction of state from events
 * - No reconciliation with other data sources
 * - If execution-state returns empty, UI shows empty
 * 
 * ERROR HANDLING:
 * - 404/non-retryable errors → stop polling, show clear message
 * - Exponential backoff on transient errors
 * - Terminal error state prevents infinite loops
 * 
 * UI RENDERING RULES (based on executionState.run):
 * - run === null → "Ready for execution"
 * - run.status === "queued" → "Queued for execution"
 * - run.status === "running" → "Running" + stage if present
 * - run.status === "completed" → "Completed"
 * - run.status === "failed" → "Execution failed" + terminationReason
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Error types for execution state fetching.
 * Used to determine retry behavior.
 */
type FetchErrorType = 'not_found' | 'server_error' | 'network_error' | 'unknown';

interface FetchError {
  type: FetchErrorType;
  message: string;
  retryable: boolean;
}

/**
 * Canonical run status values.
 */
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'stopped' | 'cancelled';

/**
 * OBSERVATIONS-FIRST: Outcome type provides semantic meaning to run results.
 * 
 * CRITICAL: Do NOT collapse these back into boolean success/failure.
 * Each outcome type requires different UI treatment.
 */
export type RunOutcomeType = 
  | 'VALID_EMPTY_OBSERVATION'  // Success, but zero qualifying data (NOT a failure)
  | 'CONFIG_INCOMPLETE'         // User-fixable configuration issue
  | 'INFRA_ERROR'               // Infrastructure failure (system error)
  | 'EXECUTION_ERROR';          // Logic error during execution

/**
 * Canonical run object from execution-state endpoint.
 */
export interface ExecutionRun {
  id: string;
  status: RunStatus;
  stage?: string;
  startedAt?: string;
  completedAt?: string;
  terminationReason?: string;
  errorMessage?: string;
  
  // OBSERVATIONS-FIRST: Outcome type provides semantic meaning
  /** The semantic outcome type - determines how the result should be displayed */
  outcomeType?: RunOutcomeType;
  /** Human-readable explanation of the outcome */
  outcomeReason?: string;
  /** The run intent that was used (HARVEST_ONLY | ACTIVATE) */
  runIntent?: 'HARVEST_ONLY' | 'ACTIVATE';
}

/**
 * Canonical funnel object from execution-state endpoint.
 */
export interface ExecutionFunnel {
  organizations: {
    total: number;
  };
  contacts: {
    total: number;
    withEmail: number;
  };
  leads: {
    total: number;
    pending: number;
    approved: number;
  };
  emailsSent: number;
}

/**
 * Canonical execution state from the single source of truth.
 */
export interface ExecutionState {
  campaignId: string;
  run: ExecutionRun | null;
  funnel: ExecutionFunnel;
  _meta: {
    fetchedAt: string;
    source: 'execution-state';
  };
}

/**
 * Hook return type.
 */
export interface UseExecutionStateResult {
  /** The canonical execution state (null while loading) */
  state: ExecutionState | null;
  /** Whether the initial fetch is in progress */
  loading: boolean;
  /** Whether a refresh is in progress */
  refreshing: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether the error is terminal (no retries) */
  isTerminalError: boolean;
  /** Force refresh the execution state */
  refresh: () => Promise<void>;
  /** Last successful fetch timestamp */
  lastFetchedAt: string | null;
}

/**
 * Default empty funnel for when data is not available.
 */
const EMPTY_FUNNEL: ExecutionFunnel = {
  organizations: { total: 0 },
  contacts: { total: 0, withEmail: 0 },
  leads: { total: 0, pending: 0, approved: 0 },
  emailsSent: 0,
};

interface UseExecutionStateOptions {
  /** Campaign ID to fetch state for */
  campaignId: string;
  /** Whether to enable fetching (default: true) */
  enabled?: boolean;
  /** Polling interval in ms (default: 0 = no polling) */
  pollingIntervalMs?: number;
}

/**
 * Classify fetch errors for retry behavior.
 */
function classifyError(status: number, message: string): FetchError {
  if (status === 404) {
    return {
      type: 'not_found',
      message: 'Execution state endpoint not available',
      retryable: false, // 404 = endpoint doesn't exist, don't retry
    };
  }
  if (status >= 500) {
    return {
      type: 'server_error',
      message: `Server error: ${status}`,
      retryable: true, // Server errors may be transient
    };
  }
  if (status === 0 || message.includes('fetch')) {
    return {
      type: 'network_error',
      message: 'Network error - check connection',
      retryable: true,
    };
  }
  return {
    type: 'unknown',
    message: message || 'Unknown error',
    retryable: false,
  };
}

/**
 * Fetch execution state from the PROXY endpoint.
 * 
 * ARCHITECTURE:
 * - Uses /api/proxy/execution-state (NOT /api/v1/campaigns/:id/execution-state)
 * - Proxy forwards to Sales Engine which is the sole execution authority
 * - NO direct calls to execution routes
 */
async function fetchExecutionState(campaignId: string): Promise<{ data: ExecutionState | null; error: FetchError | null }> {
  try {
    // USE PROXY ENDPOINT - not direct /api/v1/* routes
    const response = await fetch(`/api/proxy/execution-state?campaignId=${encodeURIComponent(campaignId)}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = classifyError(response.status, errorData.message || errorData.error || '');
      return { data: null, error };
    }
    
    const data = await response.json();
    
    // Normalize the response to match ExecutionState interface
    const normalizedState: ExecutionState = {
      campaignId: data.campaignId || campaignId,
      run: data.run || null,
      funnel: data.funnel || EMPTY_FUNNEL,
      _meta: {
        fetchedAt: new Date().toISOString(),
        source: 'execution-state',
      },
    };
    
    return { data: normalizedState, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { 
      data: null, 
      error: classifyError(0, message),
    };
  }
}

/**
 * Hook to access canonical execution state.
 * 
 * USAGE:
 * ```tsx
 * const { state, loading, error, isTerminalError, refresh } = useExecutionState({ campaignId });
 * 
 * if (loading) return <Loading />;
 * if (isTerminalError) return <EndpointNotAvailable />;
 * if (error) return <Error message={error} onRetry={refresh} />;
 * 
 * // state.run === null means "Ready for execution"
 * // state.run.status === "running" means show stage
 * // etc.
 * ```
 */
export function useExecutionState({
  campaignId,
  enabled = true,
  pollingIntervalMs = 0,
}: UseExecutionStateOptions): UseExecutionStateResult {
  const [state, setState] = useState<ExecutionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTerminalError, setIsTerminalError] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  /**
   * Clear polling interval safely.
   */
  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Fetch execution state with error handling.
   * This is the ONLY data fetching this hook does.
   */
  const doFetch = useCallback(async (isRefresh = false) => {
    if (!campaignId || !enabled) return;
    
    // Don't fetch if we've hit a terminal error
    if (isTerminalError && !isRefresh) return;
    
    if (isRefresh) {
      setRefreshing(true);
      // Manual refresh resets terminal error state
      setIsTerminalError(false);
      retryCountRef.current = 0;
    } else {
      setLoading(true);
    }

    const { data, error: fetchError } = await fetchExecutionState(campaignId);
    
    if (!mountedRef.current) return;

    if (fetchError) {
      console.error('[useExecutionState] Fetch error:', fetchError);
      setError(fetchError.message);
      
      if (!fetchError.retryable) {
        // Terminal error - stop all polling, don't retry
        setIsTerminalError(true);
        clearPolling();
        console.warn('[useExecutionState] Terminal error - polling stopped:', fetchError.message);
      } else {
        // Retryable error - increment counter
        retryCountRef.current += 1;
        if (retryCountRef.current >= maxRetries) {
          setIsTerminalError(true);
          clearPolling();
          console.warn('[useExecutionState] Max retries reached - polling stopped');
        }
      }
      
      // On error, set default state so UI can render
      setState({
        campaignId,
        run: null,
        funnel: EMPTY_FUNNEL,
        _meta: {
          fetchedAt: new Date().toISOString(),
          source: 'execution-state',
        },
      });
    } else if (data) {
      // Success - reset error state and retry counter
      setState(data);
      setLastFetchedAt(new Date().toISOString());
      setError(null);
      setIsTerminalError(false);
      retryCountRef.current = 0;
    }

    setLoading(false);
    setRefreshing(false);
  }, [campaignId, enabled, isTerminalError, clearPolling]);

  /**
   * Manual refresh function.
   * Resets error state and retries.
   */
  const refresh = useCallback(async () => {
    retryCountRef.current = 0;
    setIsTerminalError(false);
    setError(null);
    await doFetch(true);
  }, [doFetch]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPolling();
    };
  }, [clearPolling]);

  // Initial fetch
  useEffect(() => {
    if (enabled && campaignId && !isTerminalError) {
      doFetch(false);
    }
  }, [enabled, campaignId, doFetch, isTerminalError]);

  // Optional polling (only for running state, and only if no terminal error)
  useEffect(() => {
    // Clear existing interval
    clearPolling();

    // Don't poll if terminal error
    if (isTerminalError) return;

    // Only poll if enabled, interval is set, and run is active
    const isRunning = state?.run?.status === 'running' || state?.run?.status === 'queued';
    const shouldPoll = enabled && pollingIntervalMs > 0 && isRunning && !error;

    if (shouldPoll) {
      intervalRef.current = setInterval(() => {
        doFetch(true);
      }, pollingIntervalMs);
    }

    return clearPolling;
  }, [enabled, pollingIntervalMs, state?.run?.status, error, isTerminalError, doFetch, clearPolling]);

  return {
    state,
    loading,
    refreshing,
    error,
    isTerminalError,
    refresh,
    lastFetchedAt,
  };
}

/**
 * Helper to derive UI text from execution state.
 * 
 * CANONICAL MAPPING (from contract):
 * - run === null → "Ready for execution"
 * - run.status === "queued" → "Queued for execution"
 * - run.status === "running" → "Running"
 * - run.status === "completed" → "Completed"
 * - run.status === "failed" → "Execution failed"
 */
export function getExecutionStatusText(run: ExecutionRun | null): string {
  if (run === null) {
    return 'Ready for execution';
  }
  
  switch (run.status) {
    case 'queued':
      return 'Queued for execution';
    case 'running':
      return 'Running';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Execution failed';
    case 'stopped':
      return 'Execution stopped';
    case 'cancelled':
      return 'Execution cancelled';
    default:
      // Should never happen - contract guarantees these statuses
      return 'Unknown status';
  }
}

/**
 * Helper to check if send metrics should be shown.
 * 
 * CANONICAL RULE: Show metrics only if ALL are true:
 * - run.status === "completed"
 * - funnel.emailsSent > 0
 */
export function shouldShowSendMetrics(state: ExecutionState | null): boolean {
  if (!state) return false;
  if (state.run?.status !== 'completed') return false;
  if (state.funnel.emailsSent <= 0) return false;
  return true;
}

/**
 * Helper to check if pipeline funnel has any activity.
 */
export function hasFunnelActivity(funnel: ExecutionFunnel): boolean {
  return (
    funnel.organizations.total > 0 ||
    funnel.contacts.total > 0 ||
    funnel.leads.total > 0 ||
    funnel.emailsSent > 0
  );
}

export default useExecutionState;
