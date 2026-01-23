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
  stage?: string;
  execution_mode?: string;
  created_at?: string;
  updated_at?: string;
  // Terminal metadata (optional) - emitted by backend on terminal runs
  error_message?: string | null;
  failure_reason?: string | null;
  termination_reason?: string | null;
  reason?: string | null;
}

/**
 * Check if a run is an "incomplete" run (intentional stop, not error).
 * 
 * SEMANTIC ALIGNMENT (Target-State Execution):
 * When status = "failed" AND termination_reason indicates an intentional pause,
 * this is NOT an error - it's an intentional execution halt. 
 * The UI must display this as "Incomplete" with info severity, not as a failure/error.
 * 
 * Intentional pause reasons include:
 * - unprocessed_work_remaining: Batch complete, work remains
 * - execution_timeout: Time limit reached, partial progress preserved
 * - batch_limit_reached: Processing limit reached
 * - rate_limit_exceeded: External rate limiting
 */
export function isIncompleteRun(run: LatestRun | null): boolean {
  if (!run) return false;
  const status = run.status?.toLowerCase();
  const reason = run.termination_reason?.toLowerCase() || '';
  
  if (status !== 'failed') return false;
  
  // Check for intentional pause reasons
  return (
    reason === 'unprocessed_work_remaining' ||
    reason === 'execution_timeout' ||
    reason === 'batch_limit_reached' ||
    reason === 'rate_limit_exceeded' ||
    reason.includes('timeout') ||
    reason.includes('limit')
  );
}

/**
 * Check if a run stopped due to execution timeout specifically.
 */
export function isTimeoutRun(run: LatestRun | null): boolean {
  if (!run) return false;
  const status = run.status?.toLowerCase();
  const reason = run.termination_reason?.toLowerCase() || '';
  
  return status === 'failed' && (
    reason === 'execution_timeout' ||
    reason.includes('timeout')
  );
}

/**
 * Check if a run failed due to an invariant violation.
 * 
 * INVARIANT VIOLATION SEMANTICS:
 * When status = "failed" AND reason = "invariant_violation", this indicates
 * a critical system invariant was violated during execution. This is NOT
 * an intentional pause - it's a hard failure that should:
 * - Display an explicit failure banner
 * - NOT show results as valid
 * - NOT show "Completed – results available"
 * 
 * This ensures the UI correctly reflects execution truth and does not mask
 * invalid runs as completed.
 */
export function isInvariantViolation(run: LatestRun | null): boolean {
  if (!run) return false;
  const status = run.status?.toLowerCase();
  const reason = run.reason?.toLowerCase() || '';
  const failureReason = run.failure_reason?.toLowerCase() || '';
  const terminationReason = run.termination_reason?.toLowerCase() || '';
  
  if (status !== 'failed') return false;
  
  // Check all possible reason fields for invariant_violation
  return (
    reason === 'invariant_violation' ||
    failureReason === 'invariant_violation' ||
    terminationReason === 'invariant_violation' ||
    reason.includes('invariant') ||
    failureReason.includes('invariant') ||
    terminationReason.includes('invariant')
  );
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
        stage: getString(r.stage),
        execution_mode: getString(r.execution_mode),
        created_at: getString(r.created_at),
        updated_at: getString(r.updated_at),
        // Terminal metadata (passthrough from backend)
        error_message: getString(r.error_message) ?? null,
        failure_reason: getString(r.failure_reason) ?? null,
        termination_reason: getString(r.termination_reason) ?? getString(r.terminationReason) ?? null,
        reason: getString(r.reason) ?? null,
      },
    };
  }

  // Legacy shape: run fields are top-level
  return {
    noRuns: false,
    run: {
      run_id: getString((payload as Record<string, unknown>).run_id),
      status,
      stage: getString((payload as Record<string, unknown>).stage),
      execution_mode: getString((payload as Record<string, unknown>).execution_mode),
      created_at: getString((payload as Record<string, unknown>).created_at),
      updated_at: getString((payload as Record<string, unknown>).updated_at),
      // Terminal metadata (passthrough from backend)
      error_message: getString((payload as Record<string, unknown>).error_message) ?? null,
      failure_reason: getString((payload as Record<string, unknown>).failure_reason) ?? null,
      termination_reason: getString((payload as Record<string, unknown>).termination_reason) ?? getString((payload as Record<string, unknown>).terminationReason) ?? null,
      reason: getString((payload as Record<string, unknown>).reason) ?? null,
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
 * @deprecated LEGACY HOOK - DO NOT USE
 * 
 * This hook called /api/v1/campaigns/:id/runs/latest which is a LEGACY endpoint.
 * 
 * USE INSTEAD: useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus
 * which calls the canonical /api/v1/campaigns/:id/execution-state endpoint.
 * 
 * MIGRATION: Pass `run` data as props from useRealTimeStatus to components
 * instead of letting components fetch their own execution data.
 * 
 * LOCKDOWN: If campaignId is null, returns safe empty state (for compatibility
 * with components that conditionally skip the fetch). If campaignId is provided,
 * throws an error to prevent legacy endpoint usage.
 */
export function useLatestRunStatus(campaignId: string | null): LatestRunStatus {
  // Allow null campaignId for conditional skipping (component has prop data)
  if (campaignId === null) {
    // Return safe empty state without fetching - component has prop data
    return {
      run: null,
      noRuns: false,
      notFound: false,
      serviceUnavailable: false,
      loading: false,
      error: undefined,
      refetch: () => {
        console.error('[useLatestRunStatus] Legacy hook is deprecated. Use useRealTimeStatus and pass data via props.');
      },
    };
  }
  
  // LOCKDOWN: Throw error if called with actual campaignId
  // This ensures no legacy /runs/latest calls are made
  throw new Error(
    `[useLatestRunStatus] DEPRECATED: Legacy execution hook is deprecated and makes calls to /runs/latest. ` +
    `Use useRealTimeStatus from app/sales-engine/hooks/useRealTimeStatus instead, ` +
    `which calls the canonical /api/v1/campaigns/:id/execution-state endpoint. ` +
    `Campaign ID: ${campaignId}`
  );
}
