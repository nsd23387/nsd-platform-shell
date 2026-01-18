/**
 * Execution Narrative Governance Types
 * 
 * ❗ GOVERNANCE LOCK: This file defines the ONLY permitted interface for
 * execution state consumption in UI components.
 * 
 * All execution-related UI MUST consume ExecutionNarrative output only.
 * No component may interpret raw execution data independently.
 * 
 * PROHIBITED in UI components (outside ENM module):
 * - campaign_runs.status
 * - started_at / completed_at
 * - Raw activity.events
 * - Funnel counts for state derivation
 * - Timers or timestamps for state logic
 * 
 * This is a read-path governance lock only.
 * No backend execution behavior is modified.
 */

import type { ExecutionNarrative, NarrativeStage, TerminalState } from './execution-narrative-mapper';

// Re-export canonical types
export type { ExecutionNarrative, NarrativeStage, TerminalState };

/**
 * Execution mode - the canonical UI state machine
 */
export type ExecutionMode = 'idle' | 'queued' | 'running' | 'terminal';

/**
 * Health level for visual styling
 */
export type HealthLevel = 'success' | 'warning' | 'error' | 'info' | 'neutral';

/**
 * Map ExecutionNarrative mode + state to HealthLevel
 * 
 * This is the ONLY place health level derivation should occur.
 * UI components receive HealthLevel, never derive it.
 */
export function narrativeToHealthLevel(narrative: ExecutionNarrative): HealthLevel {
  const { mode, isStalled, terminal } = narrative;

  if (mode === 'idle') return 'neutral';
  if (mode === 'queued') return 'info';
  
  if (mode === 'running') {
    return isStalled ? 'warning' : 'info';
  }
  
  if (mode === 'terminal' && terminal) {
    if (terminal.status === 'failed') return 'error';
    if (terminal.status === 'completed') return 'success';
    if (terminal.status === 'skipped') return 'warning';
  }
  
  return 'neutral';
}

/**
 * Semantic color configuration for health levels
 */
export interface HealthStyles {
  bg: string;
  text: string;
  border: string;
  icon: 'check' | 'warning' | 'info' | 'clock' | 'refresh';
}

/**
 * Get icon name for narrative mode
 */
export function narrativeToIcon(
  narrative: ExecutionNarrative
): 'check' | 'warning' | 'info' | 'clock' | 'refresh' {
  const { mode, isStalled, terminal } = narrative;

  if (mode === 'idle') return 'info';
  if (mode === 'queued') return 'clock';
  
  if (mode === 'running') {
    return isStalled ? 'warning' : 'refresh';
  }
  
  if (mode === 'terminal' && terminal) {
    if (terminal.status === 'failed') return 'warning';
    if (terminal.status === 'completed') return 'check';
  }
  
  return 'info';
}

/**
 * Check if narrative represents an active execution
 */
export function isNarrativeActive(narrative: ExecutionNarrative): boolean {
  return narrative.mode === 'queued' || 
         (narrative.mode === 'running' && !narrative.isStalled);
}

/**
 * Check if narrative represents a terminal state
 */
export function isNarrativeTerminal(narrative: ExecutionNarrative): boolean {
  return narrative.mode === 'terminal';
}

/**
 * Check if narrative represents a failed state
 */
export function isNarrativeFailed(narrative: ExecutionNarrative): boolean {
  return narrative.mode === 'terminal' && narrative.terminal?.status === 'failed';
}

/**
 * Check if narrative represents a completed state
 */
export function isNarrativeCompleted(narrative: ExecutionNarrative): boolean {
  return narrative.mode === 'terminal' && narrative.terminal?.status === 'completed';
}

/**
 * ========================================================================
 * COMPONENT PROPS INTERFACES
 * 
 * These are the ONLY permitted prop shapes for execution-aware components.
 * Components MUST NOT accept raw execution data (runs, events, status).
 * ========================================================================
 */

/**
 * Props for components that display execution state
 * 
 * GOVERNANCE: Components accepting this interface MUST NOT:
 * - Access raw campaign_runs data
 * - Access raw activity.events
 * - Derive state from timestamps or counts
 */
export interface ExecutionNarrativeConsumerProps {
  narrative: ExecutionNarrative;
}

/**
 * Props for components with optional narrative
 */
export interface OptionalNarrativeConsumerProps {
  narrative?: ExecutionNarrative | null;
}

/**
 * ENM-aware component props with loading state
 */
export interface ExecutionNarrativeWithLoadingProps extends OptionalNarrativeConsumerProps {
  isLoading?: boolean;
  error?: string | null;
}

/**
 * ========================================================================
 * CANONICAL COPY CONSTANTS
 * 
 * All user-visible execution copy MUST originate from here or from ENM.
 * No inline strings for execution states are permitted in components.
 * ========================================================================
 */

export const EXECUTION_COPY = {
  IDLE: {
    headline: 'No execution has run yet',
    subheadline: 'This campaign has not been executed.',
    trustNote: 'This campaign has not been executed.',
    label: 'Idle',
  },
  QUEUED: {
    headline: 'Execution queued',
    subheadline: 'The system will begin processing shortly.',
    trustNote: 'Execution has been requested and is awaiting worker pickup.',
    label: 'Queued',
  },
  RUNNING: {
    headline: 'Execution in progress',
    subheadline: 'Processing campaign stages.',
    trustNote: 'Counts update as stages complete. Some results may not be visible yet.',
    label: 'Running',
  },
  STALLED: {
    headline: 'Execution stalled',
    subheadline: 'The system will automatically mark this execution failed if it does not progress.',
    trustNote: 'This execution has exceeded the 30-minute threshold without completing.',
    label: 'Stalled',
  },
  COMPLETED: {
    headline: 'Execution completed successfully',
    trustNote: 'The system is idle. You are viewing historical execution data.',
    label: 'Completed',
  },
  COMPLETED_NO_RESULTS: {
    headline: 'Execution completed — no matching organizations',
    subheadline: 'No organizations matched the current ICP criteria.',
    label: 'Completed',
  },
  FAILED: {
    headline: 'Execution failed',
    subheadline: 'The last execution did not complete successfully.',
    trustNote: 'The system is idle. You are viewing historical execution data.',
    label: 'Failed',
  },
} as const;

/**
 * ========================================================================
 * GOVERNANCE VALIDATION (Development Only)
 * ========================================================================
 */

/**
 * Validate that a component is receiving ENM output, not raw data.
 * 
 * Use in development to catch governance violations.
 */
export function assertValidNarrative(narrative: unknown): asserts narrative is ExecutionNarrative {
  if (!narrative || typeof narrative !== 'object') {
    throw new Error('[ENM Governance] Invalid narrative: expected ExecutionNarrative object');
  }
  
  const n = narrative as Record<string, unknown>;
  
  if (!['idle', 'queued', 'running', 'terminal'].includes(n.mode as string)) {
    throw new Error(`[ENM Governance] Invalid narrative mode: ${n.mode}`);
  }
  
  if (typeof n.headline !== 'string') {
    throw new Error('[ENM Governance] Invalid narrative: headline must be a string');
  }
}
