/**
 * resolveActiveRun.ts
 * 
 * GOVERNANCE LOCK: This file implements read-only run resolution logic.
 * DO NOT add any mutation logic, retry buttons, or state changes.
 * 
 * Single source of truth for determining which run is "active" for UI display.
 * Aligns with backend execution watchdog semantics:
 * - Stale running runs (>30 min) are treated as inactive
 * - Queued runs always supersede older running runs
 * - At most ONE run is ever displayed as "active"
 */

/**
 * Minimal run interface for resolution logic.
 * This is intentionally flexible to support both API response shapes
 * (lowercase statuses from API, uppercase from internal model).
 */
export interface ResolvableRun {
  id?: string;
  run_id?: string;
  campaign_id?: string;
  status: string;
  started_at?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

/**
 * Staleness threshold matching backend watchdog semantics.
 * A running run older than this is considered stale and will be cleaned up by cron.
 */
export const RUN_STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Terminal run statuses - runs in these states are complete (case-insensitive).
 */
export const TERMINAL_STATUSES = ['completed', 'failed', 'skipped', 'partial'] as const;

/**
 * Active run statuses - runs in these states may still be progressing (case-insensitive).
 */
export const ACTIVE_STATUSES = ['queued', 'running', 'in_progress', 'run_requested', 'pending'] as const;

export type RunResolutionResult<T extends ResolvableRun = ResolvableRun> = {
  /** The resolved active run, or null if no runs exist */
  activeRun: T | null;
  /** Whether the resolved run is stale (was running but exceeded threshold) */
  isStale: boolean;
  /** Human-readable reason for the resolution */
  resolutionReason: 'queued' | 'running' | 'stale_running' | 'terminal' | 'none';
};

/**
 * Normalize status to lowercase for comparison.
 */
function normalizeStatus(status: string | undefined | null): string {
  return (status || '').toLowerCase().trim();
}

/**
 * Determines if a running run is stale based on the watchdog threshold.
 * A run is stale if:
 * - status === 'running' or 'in_progress'
 * - started_at exists
 * - now - started_at > RUN_STALE_THRESHOLD_MS
 */
export function isRunStale(run: ResolvableRun): boolean {
  const status = normalizeStatus(run.status);
  
  if (status !== 'running' && status !== 'in_progress') {
    return false;
  }
  
  // Use started_at or created_at as fallback
  const startedAt = run.started_at || run.created_at;
  if (!startedAt) {
    return false;
  }
  
  const startedAtTime = new Date(startedAt).getTime();
  const now = Date.now();
  
  return now - startedAtTime > RUN_STALE_THRESHOLD_MS;
}

/**
 * Resolves which run should be displayed as "active" in the UI.
 * 
 * Resolution precedence:
 * 1. Queued runs always win (newest first)
 * 2. Running run only if NOT stale
 * 3. Latest terminal run (completed/failed/skipped)
 * 
 * This function is the ONLY source of truth for determining the active run.
 * All UI components must consume this, not raw API ordering.
 */
export function resolveActiveRun<T extends ResolvableRun>(runs: T[]): RunResolutionResult<T> {
  if (!runs || runs.length === 0) {
    return {
      activeRun: null,
      isStale: false,
      resolutionReason: 'none',
    };
  }

  // Sort by created_at descending (newest first)
  const sorted = [...runs].sort((a, b) => {
    const aTime = new Date(a.created_at || a.started_at || 0).getTime();
    const bTime = new Date(b.created_at || b.started_at || 0).getTime();
    return bTime - aTime;
  });

  // 1. Queued runs always win
  const queued = sorted.find(r => {
    const status = normalizeStatus(r.status);
    return status === 'queued' || status === 'run_requested' || status === 'pending';
  });
  if (queued) {
    return {
      activeRun: queued,
      isStale: false,
      resolutionReason: 'queued',
    };
  }

  // 2. Running run only if NOT stale
  const running = sorted.find(r => {
    const status = normalizeStatus(r.status);
    return status === 'running' || status === 'in_progress';
  });
  if (running) {
    if (isRunStale(running)) {
      // Stale running run - return it but mark as stale
      return {
        activeRun: running,
        isStale: true,
        resolutionReason: 'stale_running',
      };
    }
    return {
      activeRun: running,
      isStale: false,
      resolutionReason: 'running',
    };
  }

  // 3. Otherwise show latest terminal run
  const terminal = sorted.find(r => {
    const status = normalizeStatus(r.status);
    return TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number]);
  });
  
  if (terminal) {
    return {
      activeRun: terminal,
      isStale: false,
      resolutionReason: 'terminal',
    };
  }

  // No recognizable runs - return newest
  return {
    activeRun: sorted[0] ?? null,
    isStale: false,
    resolutionReason: 'none',
  };
}

/**
 * Gets the display status for a run, accounting for staleness.
 * Stale running runs should NOT be displayed as "Running".
 */
export function getDisplayStatus(run: ResolvableRun | null): string {
  if (!run) return 'unknown';
  
  const status = normalizeStatus(run.status);
  
  if ((status === 'running' || status === 'in_progress') && isRunStale(run)) {
    return 'stale';
  }
  
  return status;
}

/**
 * Determines if a run should show activity indicators (spinners, pulses, etc.)
 * Stale runs should NOT show activity indicators.
 */
export function shouldShowActivityIndicators(run: ResolvableRun | null): boolean {
  if (!run) return false;
  
  const status = normalizeStatus(run.status);
  const isActive = status === 'running' || status === 'in_progress' || status === 'queued' || status === 'run_requested' || status === 'pending';
  
  if (!isActive) return false;
  
  // Stale running runs should not show activity
  if ((status === 'running' || status === 'in_progress') && isRunStale(run)) {
    return false;
  }
  
  return true;
}

/**
 * Get staleness info for display purposes.
 */
export function getStalenessInfo(run: ResolvableRun | null): {
  isStale: boolean;
  staleMinutes: number;
  thresholdMinutes: number;
} {
  if (!run) {
    return { isStale: false, staleMinutes: 0, thresholdMinutes: 30 };
  }
  
  const status = normalizeStatus(run.status);
  if (status !== 'running' && status !== 'in_progress') {
    return { isStale: false, staleMinutes: 0, thresholdMinutes: 30 };
  }
  
  const startedAt = run.started_at || run.created_at;
  if (!startedAt) {
    return { isStale: false, staleMinutes: 0, thresholdMinutes: 30 };
  }
  
  const startedAtTime = new Date(startedAt).getTime();
  const now = Date.now();
  const elapsedMs = now - startedAtTime;
  const staleMinutes = Math.floor(elapsedMs / 60000);
  
  return {
    isStale: elapsedMs > RUN_STALE_THRESHOLD_MS,
    staleMinutes,
    thresholdMinutes: 30,
  };
}
