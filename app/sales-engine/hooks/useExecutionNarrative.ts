/**
 * useExecutionNarrative Hook
 * 
 * Provides the canonical ExecutionNarrative for a campaign by consuming
 * campaign_runs and activity.events data through the ENM mapper.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only hook
 * - Consumes ONLY campaign_runs + activity.events
 * - No inference beyond explicit signals
 * - All state determination delegated to mapExecutionNarrative
 */

'use client';

import { useMemo } from 'react';
import {
  mapExecutionNarrative,
  type ExecutionNarrative,
  type CampaignRunForENM,
  type ActivityEventForENM,
} from '../lib/execution-narrative-mapper';
import type { CampaignRun } from '../types/campaign';
import type { ExecutionEvent } from '../components/observability/ExecutionTimelineFeed';

/**
 * Convert CampaignRun to CampaignRunForENM format.
 */
function toCampaignRunForENM(run: CampaignRun): CampaignRunForENM {
  return {
    id: run.id,
    status: run.status?.toLowerCase() || '',
    started_at: run.started_at,
    completed_at: run.completed_at,
    created_at: run.started_at,
    updated_at: run.completed_at || run.started_at,
    failure_reason: run.failure_reason || run.error_message || null,
    termination_reason: run.reason || null,
  };
}

/**
 * Convert ExecutionEvent to ActivityEventForENM format.
 */
function toActivityEventForENM(event: ExecutionEvent): ActivityEventForENM {
  return {
    id: event.id,
    event_type: event.event_type,
    run_id: event.run_id,
    campaign_id: event.campaign_id,
    occurred_at: event.occurred_at,
    outcome: event.outcome,
    reason: event.reason,
    details: event.details as ActivityEventForENM['details'],
  };
}

interface UseExecutionNarrativeOptions {
  runs: CampaignRun[];
  events: ExecutionEvent[];
}

interface UseExecutionNarrativeResult {
  narrative: ExecutionNarrative;
  isIdle: boolean;
  isQueued: boolean;
  isRunning: boolean;
  isStalled: boolean;
  isTerminal: boolean;
  isActive: boolean;
}

/**
 * useExecutionNarrative - Hook to get canonical execution narrative.
 * 
 * This hook wraps the mapExecutionNarrative function and provides
 * convenient boolean flags for common state checks.
 * 
 * @param options - Runs and events to derive narrative from
 * @returns ExecutionNarrative and derived boolean flags
 */
export function useExecutionNarrative({
  runs,
  events,
}: UseExecutionNarrativeOptions): UseExecutionNarrativeResult {
  const narrative = useMemo(() => {
    const enmRuns = runs.map(toCampaignRunForENM);
    const enmEvents = events.map(toActivityEventForENM);
    return mapExecutionNarrative(enmRuns, enmEvents);
  }, [runs, events]);

  const isIdle = narrative.mode === 'idle';
  const isQueued = narrative.mode === 'queued';
  const isRunning = narrative.mode === 'running' && !narrative.isStalled;
  const isStalled = narrative.mode === 'running' && narrative.isStalled === true;
  const isTerminal = narrative.mode === 'terminal';
  const isActive = isQueued || isRunning;

  return {
    narrative,
    isIdle,
    isQueued,
    isRunning,
    isStalled,
    isTerminal,
    isActive,
  };
}

export default useExecutionNarrative;
