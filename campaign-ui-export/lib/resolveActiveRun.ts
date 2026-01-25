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
  // Terminal metadata for invariant violation detection
  failure_reason?: string | null;
  termination_reason?: string | null;
  reason?: string | null;
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

/**
 * CANONICAL RUN STATE
 * 
 * This is the SINGLE SOURCE OF TRUTH for execution state.
 * campaign_runs.status is authoritative. ODS events are descriptive only.
 * 
 * All UI components MUST use this function to determine execution state.
 * No component may compute execution state independently.
 */
export type CanonicalRunState = 
  | 'idle'                  // No runs exist
  | 'queued'                // status = 'queued' | 'run_requested' | 'pending'
  | 'running'               // status = 'running' | 'in_progress' AND not stale
  | 'stalled'               // status = 'running' | 'in_progress' AND stale (>30 min)
  | 'failed'                // status = 'failed' | 'error'
  | 'invariant_violation'   // status = 'failed' AND reason = 'invariant_violation'
  | 'completed'             // status = 'completed' | 'success' | 'succeeded'
  | 'skipped';              // status = 'skipped' | 'partial'

/**
 * Check if a run failed due to an invariant violation.
 * 
 * INVARIANT VIOLATION SEMANTICS:
 * When status = "failed" AND reason = "invariant_violation", this indicates
 * a critical system invariant was violated during execution. This is NOT
 * an intentional pause - it's a hard failure that must be surfaced explicitly.
 * The UI must NOT present this as completed or show results as valid.
 */
export function isInvariantViolation(run: ResolvableRun | null): boolean {
  if (!run) return false;
  const status = normalizeStatus(run.status);
  if (status !== 'failed' && status !== 'error') return false;
  
  const reason = (run.reason || '').toLowerCase();
  const failureReason = (run.failure_reason || '').toLowerCase();
  const terminationReason = (run.termination_reason || '').toLowerCase();
  
  return (
    reason === 'invariant_violation' ||
    failureReason === 'invariant_violation' ||
    terminationReason === 'invariant_violation' ||
    reason.includes('invariant') ||
    failureReason.includes('invariant') ||
    terminationReason.includes('invariant')
  );
}

export interface CanonicalRunStateResult {
  /** The canonical state derived from campaign_runs.status */
  state: CanonicalRunState;
  /** The raw status from the run (for display) */
  rawStatus: string | null;
  /** Formatted timestamp for display */
  timestamp: string | null;
  /** Whether this represents an active execution (queued or running) */
  isActive: boolean;
  /** Human-readable message for display */
  message: string;
}

/**
 * MANDATORY MESSAGING MATRIX
 * 
 * Canonical Status → UI Message (STRICTLY ENFORCED)
 * 
 * failed               → "Last execution failed"
 * invariant_violation  → "Execution failed — invariant violation"
 * completed            → "Last execution completed successfully"
 * skipped              → "Execution skipped (planning only)"
 * none/idle            → "No execution has run yet"
 * queued               → "Execution queued"
 * running              → "Execution in progress"
 * stalled              → "Execution stalled — system will mark failed"
 * 
 * NO OTHER COMBINATIONS ARE ALLOWED.
 */
const CANONICAL_MESSAGES: Record<CanonicalRunState, string> = {
  idle: 'No execution has run yet',
  queued: 'Execution queued',
  running: 'Execution in progress',
  stalled: 'Execution stalled — system will mark failed',
  failed: 'Last execution failed',
  invariant_violation: 'Execution failed — invariant violation',
  completed: 'Last execution completed successfully',
  skipped: 'Execution skipped (planning only)',
};

/**
 * Resolve the CANONICAL run state from campaign_runs data.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * 1. campaign_runs.status is the ONLY source of truth
 * 2. ODS events may provide context but NEVER override status
 * 3. No component may compute state independently
 * 4. No "cleanup" or "awaiting cleanup" messaging unless status = 'running' AND > 30 min
 * 5. No "queued" messaging unless status = 'queued'
 * 
 * @param run - The latest campaign run from campaign_runs table
 * @param noRuns - True if no runs exist for this campaign
 */
export function resolveCanonicalRunState(
  run: ResolvableRun | null,
  noRuns: boolean
): CanonicalRunStateResult {
  // Case 1: No runs exist
  if (noRuns || !run) {
    return {
      state: 'idle',
      rawStatus: null,
      timestamp: null,
      isActive: false,
      message: CANONICAL_MESSAGES.idle,
    };
  }

  const status = normalizeStatus(run.status);
  const timestamp = run.completed_at || run.updated_at || run.started_at || run.created_at || null;

  // Case 2: Queued
  if (status === 'queued' || status === 'run_requested' || status === 'pending') {
    return {
      state: 'queued',
      rawStatus: run.status,
      timestamp,
      isActive: true,
      message: CANONICAL_MESSAGES.queued,
    };
  }

  // Case 3: Running (check for staleness)
  if (status === 'running' || status === 'in_progress') {
    if (isRunStale(run)) {
      // STALLED: Running > 30 minutes
      return {
        state: 'stalled',
        rawStatus: run.status,
        timestamp,
        isActive: false, // Stalled runs are NOT active
        message: CANONICAL_MESSAGES.stalled,
      };
    }
    return {
      state: 'running',
      rawStatus: run.status,
      timestamp,
      isActive: true,
      message: CANONICAL_MESSAGES.running,
    };
  }

  // Case 4: Failed - check for invariant violation first
  if (status === 'failed' || status === 'error') {
    // Check for invariant violation (critical failure - must surface explicitly)
    if (isInvariantViolation(run)) {
      return {
        state: 'invariant_violation',
        rawStatus: run.status,
        timestamp,
        isActive: false,
        message: CANONICAL_MESSAGES.invariant_violation,
      };
    }
    
    return {
      state: 'failed',
      rawStatus: run.status,
      timestamp,
      isActive: false,
      message: CANONICAL_MESSAGES.failed,
    };
  }

  // Case 5: Completed
  if (status === 'completed' || status === 'success' || status === 'succeeded') {
    return {
      state: 'completed',
      rawStatus: run.status,
      timestamp,
      isActive: false,
      message: CANONICAL_MESSAGES.completed,
    };
  }

  // Case 6: Skipped / Partial
  if (status === 'skipped' || status === 'partial' || status === 'partial_success') {
    return {
      state: 'skipped',
      rawStatus: run.status,
      timestamp,
      isActive: false,
      message: CANONICAL_MESSAGES.skipped,
    };
  }

  // Case 7: Unknown status - treat as idle (no active execution)
  return {
    state: 'idle',
    rawStatus: run.status,
    timestamp,
    isActive: false,
    message: `Status: ${run.status || 'Unknown'}`,
  };
}
