/**
 * @deprecated LEGACY HOOK - DO NOT USE
 * 
 * useExecutionPolling Hook
 * 
 * This hook called legacy endpoints:
 * - /api/v1/campaigns/:id/runs/latest
 * - /api/v1/campaigns/:id/observability/funnel
 * 
 * USE INSTEAD: useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus
 * which calls the canonical /api/v1/campaigns/:id/execution-state endpoint.
 * 
 * LOCKDOWN: This hook is deprecated and will throw an error if used.
 */

'use client';

import type { CampaignRun, ObservabilityFunnel } from '../types/campaign';

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

/**
 * @deprecated LEGACY HOOK - DO NOT USE
 * 
 * This hook called:
 * - /api/v1/campaigns/:id/runs/latest
 * - /api/v1/campaigns/:id/observability/funnel
 * 
 * USE INSTEAD: useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus
 * which calls the canonical /api/v1/campaigns/:id/execution-state endpoint.
 */
export function useExecutionPolling({
  campaignId,
}: UseExecutionPollingOptions): UseExecutionPollingResult {
  // LOCKDOWN: Throw error to prevent legacy endpoint usage
  throw new Error(
    `[useExecutionPolling] DEPRECATED: Legacy execution hook is deprecated. ` +
    `It called /runs/latest and /observability/funnel which are legacy endpoints. ` +
    `Use useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus instead, ` +
    `which calls the canonical /api/v1/campaigns/:id/execution-state endpoint. ` +
    `Campaign ID: ${campaignId}`
  );
}

export default useExecutionPolling;
