/**
 * @deprecated LEGACY HOOK - DO NOT USE
 * 
 * useCampaignProgress Hook
 * 
 * This hook called legacy endpoints:
 * - /api/v1/campaigns/:id/observability/funnel
 * - /api/v1/campaigns/:id/runs/latest
 * 
 * USE INSTEAD: useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus
 * which calls the canonical /api/v1/campaigns/:id/execution-state endpoint.
 * 
 * The /execution-state endpoint provides:
 * - run: Current execution run data
 * - funnel: Pipeline counts (organizations, contacts, leads)
 * - lastUpdatedAt: Timestamp for freshness
 * 
 * LOCKDOWN: This hook is deprecated and will throw an error if used.
 */

'use client';

// ============================================================================
// Types (preserved for compatibility)
// ============================================================================

export interface StageProgress {
  stage: string;
  label: string;
  processed: number;
  total: number;
  percent: number;
  remaining: number;
  confidence: 'observed' | 'estimated';
}

export interface CampaignProgressState {
  state: 'not_started' | 'in_progress' | 'paused' | 'exhausted';
  stages: StageProgress[];
  latestRun: {
    id: string | null;
    status: string | null;
    terminationReason: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  hasRemainingWork: boolean;
  remainingCount: number;
  statusMessage: string;
  lastUpdatedAt: string;
  delta: {
    orgsAdded: number;
    contactsDiscovered: number;
    contactsScored: number;
    leadsPromoted: number;
  } | null;
}

export interface UseCampaignProgressResult {
  progress: CampaignProgressState | null;
  isPolling: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * @deprecated LEGACY HOOK - DO NOT USE
 * 
 * This hook called:
 * - /api/v1/campaigns/:id/observability/funnel
 * - /api/v1/campaigns/:id/runs/latest
 * 
 * USE INSTEAD: useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus
 * which calls the canonical /api/v1/campaigns/:id/execution-state endpoint.
 */
export function useCampaignProgress(campaignId: string | null): UseCampaignProgressResult {
  // LOCKDOWN: Throw error to prevent legacy endpoint usage
  throw new Error(
    `[useCampaignProgress] DEPRECATED: Legacy execution hook is deprecated. ` +
    `It called /observability/funnel and /runs/latest which are legacy endpoints. ` +
    `Use useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus instead, ` +
    `which calls the canonical /api/v1/campaigns/:id/execution-state endpoint. ` +
    `Campaign ID: ${campaignId}`
  );
}

export default useCampaignProgress;
