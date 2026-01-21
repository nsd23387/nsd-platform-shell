/**
 * useCampaignProgress Hook
 * 
 * Provides near-real-time campaign progress visibility through read-only polling.
 * 
 * GOVERNANCE:
 * - Read-only: No mutations, no execution control
 * - Progress derived from entity state counts, not run status
 * - Runs are bounded work units, not progress indicators
 * - Polling is conditional and self-terminating
 * 
 * POLLING RULES:
 * - 2s interval while running
 * - 3s interval while queued
 * - 5s interval when incomplete (paused with remaining work)
 * - Stops when exhausted or failed (non-incomplete)
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
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
  /** Overall campaign progress state */
  state: 'not_started' | 'in_progress' | 'paused' | 'exhausted';
  /** Progress per stage */
  stages: StageProgress[];
  /** Latest run info */
  latestRun: {
    id: string | null;
    status: string | null;
    terminationReason: string | null;
    startedAt: string | null;
    completedAt: string | null;
  };
  /** Whether there are contacts remaining to process */
  hasRemainingWork: boolean;
  /** Count of remaining items to process */
  remainingCount: number;
  /** Human-readable status message */
  statusMessage: string;
  /** Last updated timestamp */
  lastUpdatedAt: string;
  /** Delta from last poll (for impact summary) */
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
  /** Manual refresh trigger */
  refresh: () => void;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const POLL_INTERVALS = {
  running: 2000,    // 2s while actively processing
  queued: 3000,     // 3s while waiting for execution
  incomplete: 5000, // 5s when paused with remaining work
  idle: 10000,      // 10s when idle (minimal background refresh)
} as const;

const MAX_POLLS = 300; // Safety limit: 10 minutes at 2s interval

// ============================================================================
// Helper Functions
// ============================================================================

function computePercent(processed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((processed / total) * 100));
}

/**
 * Check if termination reason indicates an intentional pause (not an error).
 * These are all valid "progress continues on next run" scenarios.
 */
function isIntentionalPause(terminationReason: string | null): boolean {
  if (!terminationReason) return false;
  const reason = terminationReason.toLowerCase();
  return (
    reason === 'unprocessed_work_remaining' ||
    reason === 'execution_timeout' ||
    reason === 'batch_limit_reached' ||
    reason === 'rate_limit_exceeded' ||
    reason.includes('timeout') ||
    reason.includes('limit')
  );
}

function deriveProgressState(
  latestRunStatus: string | null,
  terminationReason: string | null,
  hasContacts: boolean,
  hasRemainingWork: boolean
): CampaignProgressState['state'] {
  // Not started: no contacts discovered yet
  if (!hasContacts) {
    return 'not_started';
  }
  
  // Currently running
  if (latestRunStatus === 'running' || latestRunStatus === 'queued' || latestRunStatus === 'in_progress') {
    return 'in_progress';
  }
  
  // Paused: failed run with intentional pause reason (NOT an error)
  // This includes: execution_timeout, unprocessed_work_remaining, batch_limit_reached
  if (latestRunStatus === 'failed' && isIntentionalPause(terminationReason)) {
    return 'paused';
  }
  
  // Exhausted: no remaining work
  if (!hasRemainingWork) {
    return 'exhausted';
  }
  
  // Default: paused (has work but not actively running)
  // This catches cases where run completed but work remains
  return 'paused';
}

interface StatusMessageContext {
  state: CampaignProgressState['state'];
  latestRunStatus: string | null;
  terminationReason: string | null;
  contactCount: number;
  scoredCount: number;
  enrichedCount: number;
  leadCount: number;
}

function deriveStatusMessage(ctx: StatusMessageContext): string {
  const { state, latestRunStatus, terminationReason, contactCount, scoredCount, enrichedCount, leadCount } = ctx;
  
  switch (state) {
    case 'not_started':
      return 'Campaign has not started processing yet.';
    case 'in_progress':
      return 'Processing in progress. Live updates shown.';
    case 'paused': {
      const reason = terminationReason?.toLowerCase();
      
      // Determine which stage we're blocked at
      // SEMANTIC ALIGNMENT: Zero leads ≠ zero progress if scoring has occurred
      if (scoredCount > 0 && leadCount === 0) {
        // Progress made in scoring, blocked at enrichment or promotion
        if (enrichedCount === 0) {
          // Blocked at email enrichment
          return `Processing paused — contact scoring in progress. ${scoredCount.toLocaleString()} of ${contactCount.toLocaleString()} contacts scored. Email enrichment pending before leads can be created.`;
        } else {
          // Enriched but no leads yet
          return `Processing paused — email enrichment in progress. ${enrichedCount.toLocaleString()} contacts enriched. Lead promotion pending.`;
        }
      }
      
      // Calculate total remaining work
      const remainingCount = Math.max(0, contactCount - leadCount);
      const remainingMsg = `${remainingCount.toLocaleString()} contacts awaiting processing.`;
      
      // Explain the specific pause reason
      if (reason === 'execution_timeout') {
        return `Processing paused (execution timeout). ${remainingMsg} Progress shown reflects completed work.`;
      }
      if (reason === 'unprocessed_work_remaining') {
        return `Processing paused (batch complete). ${remainingMsg} Progress continues on next run.`;
      }
      if (reason === 'batch_limit_reached' || reason?.includes('limit')) {
        return `Processing paused (limit reached). ${remainingMsg} Progress continues on next run.`;
      }
      if (reason?.includes('timeout')) {
        return `Processing paused (timeout). ${remainingMsg} Partial progress preserved.`;
      }
      
      // Default paused message
      return `Processing paused. ${remainingMsg} Progress continues when next run executes.`;
    }
    case 'exhausted':
      return 'All contacts processed. Campaign complete.';
    default:
      return `Status: ${latestRunStatus || 'Unknown'}`;
  }
}

function getPollInterval(
  state: CampaignProgressState['state'],
  latestRunStatus: string | null
): number {
  if (latestRunStatus === 'running' || latestRunStatus === 'in_progress') {
    return POLL_INTERVALS.running;
  }
  if (latestRunStatus === 'queued') {
    return POLL_INTERVALS.queued;
  }
  if (state === 'paused') {
    return POLL_INTERVALS.incomplete;
  }
  return POLL_INTERVALS.idle;
}

function shouldStopPolling(
  state: CampaignProgressState['state'],
  latestRunStatus: string | null,
  terminationReason: string | null,
  pollCount: number
): boolean {
  // Safety limit
  if (pollCount >= MAX_POLLS) {
    return true;
  }
  
  // Stop if exhausted
  if (state === 'exhausted') {
    return true;
  }
  
  // NEVER stop polling on intentional pauses (timeout, batch limit, etc.)
  // These are valid states where progress is shown and monitoring continues
  if (latestRunStatus === 'failed' && isIntentionalPause(terminationReason)) {
    // Continue polling at reduced rate for paused campaigns
    return false;
  }
  
  // Stop if truly failed (actual error, not intentional pause)
  if (latestRunStatus === 'failed') {
    return true;
  }
  
  return false;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCampaignProgress(campaignId: string | null): UseCampaignProgressResult {
  const [progress, setProgress] = useState<CampaignProgressState | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for polling control
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const previousCountsRef = useRef<{ orgs: number; contacts: number; scored: number; leads: number } | null>(null);
  const pollingEnabledRef = useRef(false);
  
  // Fetch progress data
  const fetchProgress = useCallback(async () => {
    if (!campaignId) return;
    
    try {
      // Fetch funnel data and latest run in parallel
      const [funnelResponse, runResponse] = await Promise.all([
        fetch(`/api/v1/campaigns/${campaignId}/observability/funnel`),
        fetch(`/api/v1/campaigns/${campaignId}/runs/latest`),
      ]);
      
      if (!funnelResponse.ok || !runResponse.ok) {
        throw new Error('Failed to fetch campaign progress');
      }
      
      const funnelData = await funnelResponse.json();
      const runData = await runResponse.json();
      
      // Extract counts from funnel
      // AUTHORITATIVE PIPELINE: Orgs → Contacts → Scored → Enriched → Leads → Approved
      const stages = funnelData.stages || [];
      const orgCount = stages.find((s: { stage: string }) => s.stage === 'orgs_sourced')?.count || 0;
      const contactCount = stages.find((s: { stage: string }) => s.stage === 'contacts_discovered')?.count || 0;
      const scoredCount = stages.find((s: { stage: string }) => s.stage === 'contacts_scored')?.count || 0;
      const enrichedCount = stages.find((s: { stage: string }) => s.stage === 'contacts_enriched')?.count || 0;
      const leadCount = stages.find((s: { stage: string }) => s.stage === 'leads_promoted')?.count || 0;
      const pendingApprovalCount = stages.find((s: { stage: string }) => s.stage === 'leads_awaiting_approval')?.count || 0;
      const approvedCount = stages.find((s: { stage: string }) => s.stage === 'leads_approved')?.count || 0;
      
      // Extract run info
      const latestRun = runData.run || runData;
      const runStatus = runData.status === 'no_runs' ? null : (latestRun?.status || runData.status || null);
      const terminationReason = latestRun?.termination_reason || latestRun?.terminationReason || null;
      
      // Compute delta from previous poll
      let delta: CampaignProgressState['delta'] = null;
      if (previousCountsRef.current) {
        delta = {
          orgsAdded: Math.max(0, orgCount - previousCountsRef.current.orgs),
          contactsDiscovered: Math.max(0, contactCount - previousCountsRef.current.contacts),
          contactsScored: Math.max(0, scoredCount - (previousCountsRef.current.scored || 0)),
          leadsPromoted: Math.max(0, leadCount - previousCountsRef.current.leads),
        };
      }
      previousCountsRef.current = { orgs: orgCount, contacts: contactCount, scored: scoredCount, leads: leadCount };
      
      // Determine remaining work at each stage
      // Key insight: zero leads ≠ zero progress if scoring has occurred
      const scoringRemaining = Math.max(0, contactCount - scoredCount);
      const enrichmentRemaining = Math.max(0, scoredCount - enrichedCount);
      const promotionRemaining = Math.max(0, enrichedCount - leadCount);
      const hasRemainingWork = scoringRemaining > 0 || enrichmentRemaining > 0 || promotionRemaining > 0;
      const hasContacts = contactCount > 0;
      const hasProgress = scoredCount > 0 || leadCount > 0; // Progress exists if ANY scoring has occurred
      
      // Total remaining count for display purposes
      const remainingCount = scoringRemaining + enrichmentRemaining + promotionRemaining;
      
      // Derive progress state
      const state = deriveProgressState(runStatus, terminationReason, hasContacts, hasRemainingWork);
      const statusMessage = deriveStatusMessage({
        state,
        latestRunStatus: runStatus,
        terminationReason,
        contactCount,
        scoredCount,
        enrichedCount,
        leadCount,
      });
      
      // Build stage progress with STAGE-RELATIVE percentages
      // Key semantic: Each stage's denominator is its upstream gate
      // Organizations → Contacts → Scored → Enriched → Leads → Approved
      const stageProgress: StageProgress[] = [
        {
          stage: 'organizations',
          label: 'Organizations Sourced',
          processed: orgCount,
          total: orgCount, // Orgs are always 100% of what we have
          percent: orgCount > 0 ? 100 : 0,
          remaining: 0,
          confidence: 'observed',
        },
        {
          stage: 'contacts',
          label: 'Contacts Discovered',
          processed: contactCount,
          total: contactCount,
          percent: contactCount > 0 ? 100 : 0,
          remaining: 0,
          confidence: 'observed',
        },
        {
          // CONTACTS SCORED: Denominator = contacts discovered
          stage: 'scored',
          label: 'Contacts Scored',
          processed: scoredCount,
          total: contactCount,
          percent: computePercent(scoredCount, contactCount),
          remaining: scoringRemaining,
          confidence: 'observed',
        },
        {
          // CONTACTS ENRICHED: Denominator = contacts scored
          // This shows email enrichment progress relative to scored contacts
          stage: 'enriched',
          label: 'Contacts with Email',
          processed: enrichedCount,
          total: scoredCount, // Enrichment pool is scored contacts
          percent: computePercent(enrichedCount, scoredCount),
          remaining: enrichmentRemaining,
          confidence: 'observed',
        },
        {
          // LEADS PROMOTED: Denominator = enriched contacts
          // Leads can only be created from contacts with emails
          stage: 'leads',
          label: 'Leads Promoted',
          processed: leadCount,
          total: enrichedCount, // Leads are promoted from enriched contacts
          percent: computePercent(leadCount, enrichedCount),
          remaining: promotionRemaining,
          confidence: 'observed',
        },
        {
          stage: 'approved',
          label: 'Leads Approved',
          processed: approvedCount,
          total: leadCount,
          percent: computePercent(approvedCount, leadCount),
          remaining: pendingApprovalCount,
          confidence: 'observed',
        },
      ];
      
      const newProgress: CampaignProgressState = {
        state,
        stages: stageProgress,
        latestRun: {
          id: latestRun?.run_id || latestRun?.id || null,
          status: runStatus,
          terminationReason,
          startedAt: latestRun?.started_at || latestRun?.created_at || null,
          completedAt: latestRun?.completed_at || null,
        },
        hasRemainingWork,
        remainingCount,
        statusMessage,
        lastUpdatedAt: new Date().toISOString(),
        delta,
      };
      
      setProgress(newProgress);
      setError(null);
      
      // Check if we should stop polling
      if (pollingEnabledRef.current && shouldStopPolling(state, runStatus, terminationReason, pollCountRef.current)) {
        stopPollingInternal();
      }
      
    } catch (err) {
      console.error('[useCampaignProgress] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch progress');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);
  
  // Internal stop polling (doesn't update ref)
  const stopPollingInternal = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
  }, []);
  
  // Public stop polling
  const stopPolling = useCallback(() => {
    pollingEnabledRef.current = false;
    stopPollingInternal();
  }, [stopPollingInternal]);
  
  // Start polling
  const startPolling = useCallback(() => {
    if (!campaignId) return;
    
    pollingEnabledRef.current = true;
    pollCountRef.current = 0;
    setIsPolling(true);
    
    // Initial fetch
    fetchProgress();
    
    // Set up interval based on current state
    const setupInterval = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      const interval = progress 
        ? getPollInterval(progress.state, progress.latestRun.status)
        : POLL_INTERVALS.running;
      
      pollIntervalRef.current = setInterval(() => {
        if (!pollingEnabledRef.current) {
          stopPollingInternal();
          return;
        }
        
        pollCountRef.current++;
        fetchProgress();
      }, interval);
    };
    
    setupInterval();
  }, [campaignId, fetchProgress, progress, stopPollingInternal]);
  
  // Manual refresh
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchProgress();
  }, [fetchProgress]);
  
  // Initial fetch on mount
  useEffect(() => {
    if (campaignId) {
      fetchProgress();
    }
  }, [campaignId, fetchProgress]);
  
  // Auto-start polling if run is active
  useEffect(() => {
    if (progress && !isPolling) {
      const runStatus = progress.latestRun.status;
      if (runStatus === 'running' || runStatus === 'queued' || runStatus === 'in_progress') {
        startPolling();
      }
    }
  }, [progress, isPolling, startPolling]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  return {
    progress,
    isPolling,
    isLoading,
    error,
    refresh,
    startPolling,
    stopPolling,
  };
}

export default useCampaignProgress;
