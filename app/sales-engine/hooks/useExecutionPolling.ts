/**
 * useExecutionPolling Hook
 * 
 * Provides live observability during campaign execution by polling
 * the latest run and funnel endpoints while execution is in progress.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only polling
 * - Stops automatically on terminal states
 * - Scoped to campaign detail page only
 * - No inference beyond explicit API signals
 * 
 * Polling behavior:
 * - Poll every 5-10 seconds when status is "queued" or "running"
 * - Stop polling when run reaches terminal state (completed, failed, etc.)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CampaignRun, ObservabilityFunnel } from '../types/campaign';
import { isRunStale, type ResolvableRun } from '../lib/resolveActiveRun';

interface LatestRunResponse {
  run_id: string;
  status: string;
  execution_mode?: string;
  created_at: string;
  updated_at?: string;
}

interface UseExecutionPollingOptions {
  campaignId: string;
  initialLatestRun: CampaignRun | null;
  initialFunnel: ObservabilityFunnel | null;
  pollingIntervalMs?: number;
  enabled?: boolean;
}

interface UseExecutionPollingResult {
  latestRun: CampaignRun | null;
  funnel: ObservabilityFunnel | null;
  lastUpdatedAt: string | null;
  isPolling: boolean;
  isRefreshing: boolean;
  refreshNow: () => Promise<void>;
  error: string | null;
}

const ACTIVE_STATUSES = ['queued', 'running', 'run_requested', 'in_progress'];
const DEFAULT_POLLING_INTERVAL = 7000;

/**
 * Convert CampaignRun to ResolvableRun for staleness check.
 */
function toResolvableRun(run: CampaignRun): ResolvableRun {
  return {
    id: run.id,
    status: run.status,
    started_at: run.started_at,
    created_at: run.started_at,
    completed_at: run.completed_at,
  };
}

/**
 * Check if a status is active AND not stale.
 * STALENESS HANDLING: Stale running runs should stop polling.
 */
function isActiveStatus(status: string | undefined, run: CampaignRun | null): boolean {
  if (!status) return false;
  const normalizedStatus = status.toLowerCase().replace(/_/g, '_');
  const isActive = ACTIVE_STATUSES.includes(normalizedStatus);
  
  if (!isActive) return false;
  
  // STALENESS HANDLING: Don't poll for stale runs
  if (run && (normalizedStatus === 'running' || normalizedStatus === 'in_progress')) {
    const resolvable = toResolvableRun(run);
    if (isRunStale(resolvable)) {
      return false;
    }
  }
  
  return true;
}

export function useExecutionPolling({
  campaignId,
  initialLatestRun,
  initialFunnel,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL,
  enabled = true,
}: UseExecutionPollingOptions): UseExecutionPollingResult {
  const [latestRun, setLatestRun] = useState<CampaignRun | null>(initialLatestRun);
  const [funnel, setFunnel] = useState<ObservabilityFunnel | null>(initialFunnel);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(
    initialLatestRun?.completed_at || initialLatestRun?.started_at || null
  );
  const [isPolling, setIsPolling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const fetchLatestRun = useCallback(async (): Promise<CampaignRun | null> => {
    try {
      const response = await fetch(`/api/v1/campaigns/${campaignId}/runs/latest`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch latest run: ${response.status}`);
      }
      const data: LatestRunResponse = await response.json();
      
      const run: CampaignRun = {
        id: data.run_id,
        campaign_id: campaignId,
        status: (data.status?.toUpperCase() || 'COMPLETED') as CampaignRun['status'],
        started_at: data.created_at,
        completed_at: data.updated_at,
        leads_processed: 0,
        emails_sent: 0,
        errors: 0,
      };
      
      return run;
    } catch (err) {
      console.error('Error fetching latest run:', err);
      throw err;
    }
  }, [campaignId]);

  const fetchFunnel = useCallback(async (): Promise<ObservabilityFunnel | null> => {
    try {
      const response = await fetch(`/api/v1/campaigns/${campaignId}/observability/funnel`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch funnel: ${response.status}`);
      }
      const data: ObservabilityFunnel = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching funnel:', err);
      throw err;
    }
  }, [campaignId]);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsRefreshing(true);
    setError(null);

    try {
      const [newRun, newFunnel] = await Promise.all([
        fetchLatestRun(),
        fetchFunnel(),
      ]);

      if (!mountedRef.current) return;

      let dataUpdated = false;

      if (newRun) {
        setLatestRun(newRun);
        dataUpdated = true;
      }

      if (newFunnel) {
        setFunnel(newFunnel);
        dataUpdated = true;
      }

      if (dataUpdated) {
        setLastUpdatedAt(new Date().toISOString());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchLatestRun, fetchFunnel]);

  const refreshNow = useCallback(async () => {
    await refresh();
  }, [refresh]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setLatestRun(initialLatestRun);
    setFunnel(initialFunnel);
    setLastUpdatedAt(
      initialLatestRun?.completed_at || initialLatestRun?.started_at || new Date().toISOString()
    );
  }, [initialLatestRun, initialFunnel]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const shouldPoll = enabled && isActiveStatus(latestRun?.status, latestRun);

    if (shouldPoll) {
      setIsPolling(true);
      
      intervalRef.current = setInterval(() => {
        refresh();
      }, pollingIntervalMs);
    } else {
      setIsPolling(false);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, latestRun?.status, pollingIntervalMs, refresh]);

  return {
    latestRun,
    funnel,
    lastUpdatedAt,
    isPolling,
    isRefreshing,
    refreshNow,
    error,
  };
}

export default useExecutionPolling;
