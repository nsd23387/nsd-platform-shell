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
  run_id: string;
  status: string;
  execution_mode: string;
  created_at: string;
  updated_at: string;
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
 * - Fetches /api/campaigns/:id/runs/latest once on mount
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
      const response = await fetch(`/api/campaigns/${campaignId}/runs/latest`);

      // Handle 204 No Content (no runs yet)
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

      // Parse successful response
      const data = await response.json();
      setRun({
        run_id: data.run_id,
        status: data.status,
        execution_mode: data.execution_mode,
        created_at: data.created_at,
        updated_at: data.updated_at,
      });
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
