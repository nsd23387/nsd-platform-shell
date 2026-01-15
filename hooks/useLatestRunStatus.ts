/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This hook fetches the latest run status for a campaign
 * from Sales Engine's canonical read model.
 *
 * NO polling. NO subscriptions. NO websockets.
 * Single fetch on mount is sufficient for v1.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Latest run data from Sales Engine.
 * Only these exact fields - no derived state.
 */
export interface LatestRun {
  run_id?: string;
  status?: string;
  execution_mode?: string;
  created_at?: string;
  updated_at?: string;
}

type LatestRunApiResponse =
  // New contract (platform-shell): 200 { status: "no_runs" }
  | { status: 'no_runs' }
  // New contract (platform-shell): 200 { status: <runStatus>, run }
  | { status: string; run?: Record<string, unknown> }
  // Legacy shape (older proxy): 200 { run_id, status, ... }
  | {
      run_id?: string;
      status?: string;
      execution_mode?: string;
      created_at?: string;
      updated_at?: string;
    };

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function normalizeLatestRunResponse(data: unknown): { noRuns: boolean; run: LatestRun | null } {
  if (!data || typeof data !== 'object') {
    return { noRuns: false, run: null };
  }

  const payload = data as LatestRunApiResponse & Record<string, unknown>;
  const status = getString(payload.status);

  // Contract: campaign exists, no runs yet
  if (status === 'no_runs') {
    return { noRuns: true, run: null };
  }

  // Contract: campaign exists, latest run returned under `run`
  const embeddedRun = (payload as { run?: unknown }).run;
  if (embeddedRun && typeof embeddedRun === 'object' && !Array.isArray(embeddedRun)) {
    const r = embeddedRun as Record<string, unknown>;
    // Runtime safety: upstream run payload fields are not guaranteed to exist.
    // Prefer `run_id`, fall back to `id` without remapping execution state.
    const runId = getString(r.run_id) ?? getString(r.id);
    const runStatus = status ?? getString(r.status);

    return {
      noRuns: false,
      run: {
        run_id: runId,
        status: runStatus,
        execution_mode: getString(r.execution_mode),
        created_at: getString(r.created_at),
        updated_at: getString(r.updated_at),
      },
    };
  }

  // Legacy shape: run fields are top-level
  return {
    noRuns: false,
    run: {
      run_id: getString((payload as any).run_id),
      status,
      execution_mode: getString((payload as any).execution_mode),
      created_at: getString((payload as any).created_at),
      updated_at: getString((payload as any).updated_at),
    },
  };
}

/**
 * Result of latest run status fetch.
 */
export interface LatestRunStatus {
  /** Latest run data (null if no runs or error) */
  run: LatestRun | null;
  /** Whether there are no runs yet (204 response) */
  noRuns: boolean;
  /** Whether the campaign was not found (404 response) */
  notFound: boolean;
  /** Whether the service is unavailable (5xx response) */
  serviceUnavailable: boolean;
  /** Whether the fetch is in progress */
  loading: boolean;
  /** Error message if fetch failed */
  error?: string;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook to fetch the latest run status for a campaign.
 *
 * This hook:
 * - Fetches /api/v1/campaigns/:id/runs/latest once on mount
 * - Does NOT poll (single fetch per page load)
 * - Handles 200, 204, 404, and 5xx responses
 * - Never throws
 *
 * @param campaignId - The campaign ID to fetch runs for
 * @returns LatestRunStatus object
 *
 * @example
 * ```tsx
 * const { run, noRuns, loading, serviceUnavailable } = useLatestRunStatus(campaignId);
 *
 * if (loading) return <Spinner />;
 * if (serviceUnavailable) return <div>Execution service unavailable</div>;
 * if (noRuns) return <div>This campaign has not been executed yet</div>;
 * if (run) return <RunStatus run={run} />;
 * ```
 */
export function useLatestRunStatus(campaignId: string | null): LatestRunStatus {
  const [run, setRun] = useState<LatestRun | null>(null);
  const [noRuns, setNoRuns] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchLatestRun = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(undefined);
    setNoRuns(false);
    setNotFound(false);
    setServiceUnavailable(false);

    try {
      // Prefer versioned `/api/v1/*` for governed architecture; fallback to legacy `/api/campaigns/*`
      // to support safe staged migration if v1 is temporarily unavailable or not deployed everywhere yet.
      let response: Response;
      try {
        response = await fetch(`/api/v1/campaigns/${campaignId}/runs/latest`);
        if (response.status === 404) {
          response = await fetch(`/api/campaigns/${campaignId}/runs/latest`);
        }
      } catch {
        response = await fetch(`/api/campaigns/${campaignId}/runs/latest`);
      }

      // Backwards compatibility: older implementation returned 204 for no runs.
      if (response.status === 204) {
        setRun(null);
        setNoRuns(true);
        setLoading(false);
        return;
      }

      // Handle 404 (campaign not found)
      if (response.status === 404) {
        setRun(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Handle 5xx (service unavailable)
      if (response.status >= 500) {
        setRun(null);
        setServiceUnavailable(true);
        setError('Execution service unavailable');
        setLoading(false);
        return;
      }

      // Handle non-OK responses
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || `HTTP ${response.status}`);
        setLoading(false);
        return;
      }

      // Parse successful response (supports both legacy and new contract shapes).
      const data: unknown = await response.json().catch(() => null);
      const normalized = normalizeLatestRunResponse(data);
      setNoRuns(normalized.noRuns);
      setRun(normalized.run);
      setLoading(false);
    } catch (err) {
      console.warn('[useLatestRunStatus] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setServiceUnavailable(true);
      setLoading(false);
    }
  }, [campaignId]);

  // Fetch on mount (single fetch - no polling)
  useEffect(() => {
    fetchLatestRun();
  }, [fetchLatestRun]);

  return {
    run,
    noRuns,
    notFound,
    serviceUnavailable,
    loading,
    error,
    refetch: fetchLatestRun,
  };
}
