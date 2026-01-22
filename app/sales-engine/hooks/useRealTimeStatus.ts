'use client';

/**
 * useRealTimeStatus Hook
 * 
 * CANONICAL EXECUTION STATE HOOK
 * 
 * Provides execution status from sales-engine with lightweight caching and TTL.
 * This hook is the primary interface for the DATA AUTHORITY pattern.
 * 
 * ARCHITECTURAL CONSTRAINT:
 * - Sales-engine is the SOLE execution authority
 * - Platform-shell does NOT implement execution logic
 * - Data flows: sales-engine → proxy → this hook → UI components
 * 
 * DATA SOURCE: 
 * - Proxy: GET /api/proxy/execution-state?campaignId=xxx
 * - Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/execution-state
 * 
 * CACHING STRATEGY:
 * - In-memory cache per campaign with TTL (default: 7 seconds)
 * - Automatic invalidation when:
 *   - Run completes or fails
 *   - Campaign ID changes
 *   - TTL expires
 * - Only caches while run is in active state
 * 
 * PERFORMANCE:
 * - Prevents excessive polling
 * - Maintains data freshness
 * - No backend caching (client-side only)
 * - No stale UI risks (TTL ensures refresh)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getExecutionState, type ExecutionState, type RealTimeExecutionStatus } from '../lib/api';

/**
 * Map ExecutionState (canonical) to RealTimeExecutionStatus (UI-compatible).
 * This maintains backward compatibility with existing UI components.
 */
function mapToRealTimeStatus(state: ExecutionState): RealTimeExecutionStatus {
  return {
    campaignId: state.campaignId,
    latestRun: state.run ? {
      id: state.run.id,
      status: state.run.status,
      stage: state.run.stage,
      startedAt: state.run.startedAt,
      completedAt: state.run.endedAt,
      errorMessage: state.run.errorMessage,
      terminationReason: state.run.terminationReason,
    } : null,
    funnel: {
      organizations: state.funnel.organizations,
      contacts: {
        ...state.funnel.contacts,
        scored: 0,
        enriched: 0,
      },
      leads: state.funnel.leads,
    },
    stages: [],
    alerts: [],
    _meta: {
      fetchedAt: state.lastUpdatedAt,
      source: 'sales-engine-canonical',
    },
  };
}

interface CacheEntry {
  data: RealTimeExecutionStatus;
  timestamp: number;
  campaignId: string;
}

interface UseRealTimeStatusOptions {
  campaignId: string;
  /** Whether polling is enabled */
  enabled?: boolean;
  /** TTL for cached data in milliseconds (default: 7000 = 7 seconds) */
  cacheTtlMs?: number;
  /** Polling interval in milliseconds (default: 7000 = 7 seconds) */
  pollingIntervalMs?: number;
}

interface UseRealTimeStatusResult {
  /** Current real-time execution status (DATA AUTHORITY) */
  realTimeStatus: RealTimeExecutionStatus | null;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Whether polling is active */
  isPolling: boolean;
  /** Whether a refresh is in progress */
  isRefreshing: boolean;
  /** Last successful update timestamp */
  lastUpdatedAt: string | null;
  /** Any error that occurred */
  error: string | null;
  /** Force refresh (bypasses cache) */
  refreshNow: () => Promise<void>;
  /** Whether current data is from cache */
  isCached: boolean;
}

// Module-level cache (persists across hook instances)
const statusCache = new Map<string, CacheEntry>();

const ACTIVE_STATUSES = ['queued', 'running', 'run_requested', 'in_progress'];
const DEFAULT_CACHE_TTL = 7000; // 7 seconds
const DEFAULT_POLLING_INTERVAL = 7000; // 7 seconds

/**
 * Check if a run status is considered active (should poll).
 */
function isActiveRunStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return ACTIVE_STATUSES.includes(status.toLowerCase());
}

/**
 * Check if cache entry is valid (not expired and same campaign).
 */
function isCacheValid(entry: CacheEntry | undefined, campaignId: string, ttlMs: number): boolean {
  if (!entry) return false;
  if (entry.campaignId !== campaignId) return false;
  const age = Date.now() - entry.timestamp;
  return age < ttlMs;
}

/**
 * Check if data should trigger cache invalidation (terminal state).
 */
function shouldInvalidateCache(status: RealTimeExecutionStatus): boolean {
  const runStatus = status.latestRun?.status?.toLowerCase();
  if (!runStatus) return false;
  return ['completed', 'failed'].includes(runStatus);
}

export function useRealTimeStatus({
  campaignId,
  enabled = true,
  cacheTtlMs = DEFAULT_CACHE_TTL,
  pollingIntervalMs = DEFAULT_POLLING_INTERVAL,
}: UseRealTimeStatusOptions): UseRealTimeStatusResult {
  const [realTimeStatus, setRealTimeStatus] = useState<RealTimeExecutionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCampaignIdRef = useRef<string>(campaignId);

  /**
   * Fetch fresh data from sales-engine, optionally bypassing cache.
   */
  const fetchStatus = useCallback(async (bypassCache = false): Promise<RealTimeExecutionStatus | null> => {
    // Check cache first (unless bypassing)
    if (!bypassCache) {
      const cached = statusCache.get(campaignId);
      if (isCacheValid(cached, campaignId, cacheTtlMs)) {
        setIsCached(true);
        return cached!.data;
      }
    }

    // Fetch fresh data from sales-engine via proxy
    try {
      const executionState = await getExecutionState(campaignId);
      const data = mapToRealTimeStatus(executionState);
      
      // Update cache
      statusCache.set(campaignId, {
        data,
        timestamp: Date.now(),
        campaignId,
      });

      // Invalidate cache if terminal state
      if (shouldInvalidateCache(data)) {
        statusCache.delete(campaignId);
      }

      setIsCached(false);
      return data;
    } catch (err) {
      console.error('[useRealTimeStatus] Fetch error:', err);
      throw err;
    }
  }, [campaignId, cacheTtlMs]);

  /**
   * Refresh data (for polling and manual refresh).
   */
  const refresh = useCallback(async (bypassCache = false) => {
    if (!mountedRef.current) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const data = await fetchStatus(bypassCache);
      
      if (mountedRef.current && data) {
        setRealTimeStatus(data);
        setLastUpdatedAt(new Date().toISOString());
        setIsLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
        setIsLoading(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchStatus]);

  /**
   * Force refresh (bypasses cache).
   */
  const refreshNow = useCallback(async () => {
    await refresh(true);
  }, [refresh]);

  // Mount/unmount tracking
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Clear cache and reset state when campaign changes
  useEffect(() => {
    if (lastCampaignIdRef.current !== campaignId) {
      lastCampaignIdRef.current = campaignId;
      setRealTimeStatus(null);
      setIsLoading(true);
      setError(null);
      setIsCached(false);
      // Clear old campaign cache
      statusCache.delete(lastCampaignIdRef.current);
    }
  }, [campaignId]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      refresh(false);
    }
  }, [enabled, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling logic
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Determine if we should poll
    const runStatus = realTimeStatus?.latestRun?.status;
    const shouldPoll = enabled && isActiveRunStatus(runStatus);

    if (shouldPoll) {
      setIsPolling(true);
      
      intervalRef.current = setInterval(() => {
        refresh(false); // Use cache-aware refresh
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
  }, [enabled, realTimeStatus?.latestRun?.status, pollingIntervalMs, refresh]);

  return {
    realTimeStatus,
    isLoading,
    isPolling,
    isRefreshing,
    lastUpdatedAt,
    error,
    refreshNow,
    isCached,
  };
}

/**
 * Clear all cached status entries.
 * Useful for testing or forced global refresh.
 */
export function clearStatusCache(): void {
  statusCache.clear();
}

/**
 * Clear cached status for a specific campaign.
 */
export function clearCampaignStatusCache(campaignId: string): void {
  statusCache.delete(campaignId);
}

export default useRealTimeStatus;
