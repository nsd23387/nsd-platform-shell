/**
 * useExecutionState Hook
 * 
 * CANONICAL EXECUTION STATE HOOK
 * 
 * This hook is the ONLY way the UI should access execution state.
 * 
 * CONTRACT (NON-NEGOTIABLE):
 * - Single fetch to /api/v1/campaigns/:id/execution-state
 * - No fallbacks to other endpoints
 * - No reconstruction of state from events
 * - No reconciliation with other data sources
 * - If execution-state returns empty, UI shows empty
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
 * Canonical run status values.
 */
export type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

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
 * Fetch execution state from the canonical endpoint.
 * NO FALLBACKS. NO RECONSTRUCTION. SINGLE SOURCE OF TRUTH.
 */
async function fetchExecutionState(campaignId: string): Promise<ExecutionState> {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/execution-state`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch execution state: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Hook to access canonical execution state.
 * 
 * USAGE:
 * ```tsx
 * const { state, loading, error, refresh } = useExecutionState({ campaignId });
 * 
 * if (loading) return <Loading />;
 * if (error) return <Error message={error} />;
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
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch execution state.
   * This is the ONLY data fetching this hook does.
   */
  const doFetch = useCallback(async (isRefresh = false) => {
    if (!campaignId || !enabled) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchExecutionState(campaignId);
      
      if (mountedRef.current) {
        setState(data);
        setLastFetchedAt(new Date().toISOString());
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('[useExecutionState] Fetch error:', err);
        
        // On error, set default state instead of null
        // This ensures UI can render "Ready for execution" state
        setState({
          campaignId,
          run: null,
          funnel: EMPTY_FUNNEL,
          _meta: {
            fetchedAt: new Date().toISOString(),
            source: 'execution-state',
          },
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [campaignId, enabled]);

  /**
   * Manual refresh function.
   */
  const refresh = useCallback(async () => {
    await doFetch(true);
  }, [doFetch]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled && campaignId) {
      doFetch(false);
    }
  }, [enabled, campaignId, doFetch]);

  // Optional polling (only for running state)
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll if enabled, interval is set, and run is active
    const isRunning = state?.run?.status === 'running' || state?.run?.status === 'queued';
    const shouldPoll = enabled && pollingIntervalMs > 0 && isRunning;

    if (shouldPoll) {
      intervalRef.current = setInterval(() => {
        doFetch(true);
      }, pollingIntervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollingIntervalMs, state?.run?.status, doFetch]);

  return {
    state,
    loading,
    refreshing,
    error,
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
