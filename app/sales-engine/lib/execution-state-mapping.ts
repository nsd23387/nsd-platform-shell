/**
 * Execution State Mapping Adapter
 * 
 * Transforms raw backend signals into user-meaningful execution states.
 * This adapter provides deterministic, outcome-oriented translations
 * that explain execution behavior using ONLY EXPLICIT SIGNALS.
 * 
 * HARD CONSTRAINTS:
 * - READ-ONLY: No backend changes
 * - NO INFERENCE: Only use explicit signals from LatestRun model
 * - OUTCOME-ORIENTED: Focus on what happened, not technical status
 * - UNKNOWN IS VALID: When we don't have explicit signals, we say "unknown"
 * 
 * Available Explicit Signals (from LatestRun model):
 * - run_id: string | undefined
 * - status: string | undefined (queued, running, completed, failed, etc.)
 * - execution_mode: string | undefined
 * - created_at: string | undefined
 * - updated_at: string | undefined
 * 
 * Backend Condition → UI Meaning Mapping (EXPLICIT SIGNALS ONLY):
 * ┌─────────────────────────────────────┬─────────────────────────────────────────────────┐
 * │ Backend Condition                   │ UI Meaning                                      │
 * ├─────────────────────────────────────┼─────────────────────────────────────────────────┤
 * │ No run exists (noRuns=true)         │ "Campaign not executed yet"                     │
 * │ Run exists + status=queued          │ "Awaiting worker pickup"                        │
 * │ Run exists + status=running         │ "Execution in progress"                         │
 * │ Run exists + status=completed       │ "Execution finished"                            │
 * │ Run exists + status=failed          │ "Execution failed"                              │
 * │ Run exists + unknown status         │ "Status unknown"                                │
 * └─────────────────────────────────────┴─────────────────────────────────────────────────┘
 * 
 * NOTE: We do NOT infer "no work done", "no external calls", or "cron idle"
 * because the LatestRun model does not include explicit fields for these.
 */

import type { LatestRun } from '../../../hooks/useLatestRunStatus';

/**
 * User-facing execution confidence levels.
 * These replace ambiguous "Running" semantics with clear states.
 * 
 * STRICT: All states are derived from EXPLICIT backend signals only.
 * We do not infer states that the backend does not explicitly provide.
 */
export type ExecutionConfidence = 
  | 'completed'           // Execution finished (status explicitly indicates completion)
  | 'in_progress'         // Execution actively running (status=running)
  | 'queued'              // Awaiting execution (status=queued)
  | 'not_executed'        // Never executed (noRuns=true)
  | 'failed'              // Execution failed (status=failed)
  | 'unknown';            // Cannot determine state from available signals

/**
 * Timeline event for rendering the Execution Timeline.
 */
export interface TimelineEvent {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  label: string;
  timestamp?: string;
  isCompleted: boolean;
}

/**
 * Complete execution state derived from backend signals.
 * 
 * NOTE: Fields that would require inference are intentionally omitted.
 * We only include fields that can be derived from explicit signals.
 */
export interface ExecutionState {
  confidence: ExecutionConfidence;
  confidenceLabel: string;
  confidenceDescription: string;
  outcomeStatement: string;
  timeline: TimelineEvent[];
  nextStepRecommendation: string | null;
}

/**
 * Normalize status string to lowercase for comparison.
 */
function normalizeStatus(status?: string): string {
  return typeof status === 'string' ? status.toLowerCase().trim() : '';
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

/**
 * Derive ExecutionState from backend signals.
 * 
 * This is the main adapter function that transforms raw run data
 * into user-meaningful execution state.
 */
export function deriveExecutionState(
  run: LatestRun | null,
  noRuns: boolean
): ExecutionState {
  // Case 1: No runs exist
  if (noRuns || !run) {
    return {
      confidence: 'not_executed',
      confidenceLabel: 'Not Yet Executed',
      confidenceDescription: 'This campaign has not been executed yet.',
      outcomeStatement: 'No execution has been requested for this campaign.',
      timeline: [
        {
          id: 'not_executed',
          type: 'info',
          label: 'Awaiting first execution',
          isCompleted: false,
        },
      ],
      nextStepRecommendation: null,
    };
  }

  const status = normalizeStatus(run.status);
  const mode = normalizeStatus(run.execution_mode);
  const createdAt = formatTimestamp(run.created_at);
  const updatedAt = formatTimestamp(run.updated_at);

  // Case 2: Run is queued
  if (status === 'queued' || status === 'run_requested' || status === 'pending') {
    return {
      confidence: 'queued',
      confidenceLabel: 'Queued',
      confidenceDescription: 'Execution has been requested and is awaiting worker pickup.',
      outcomeStatement: 'This campaign is queued for execution. The worker will process it shortly.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'awaiting_pickup',
          type: 'info',
          label: 'Awaiting worker pickup',
          isCompleted: false,
        },
      ],
      nextStepRecommendation: null,
    };
  }

  // Case 3: Run is in progress
  if (status === 'running' || status === 'in_progress') {
    return {
      confidence: 'in_progress',
      confidenceLabel: 'In Progress',
      confidenceDescription: 'Execution is actively running.',
      outcomeStatement: 'This campaign is currently being executed by the worker.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'worker_started',
          type: 'success',
          label: 'Worker started execution',
          isCompleted: true,
        },
        {
          id: 'executing',
          type: 'info',
          label: 'Execution in progress...',
          isCompleted: false,
        },
      ],
      nextStepRecommendation: null,
    };
  }

  // Case 4: Run failed
  if (status === 'failed' || status === 'error') {
    return {
      confidence: 'failed',
      confidenceLabel: 'Failed',
      confidenceDescription: 'Execution encountered an error.',
      outcomeStatement: 'This execution failed. Check the timeline for details.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'execution_failed',
          type: 'error',
          label: `Execution failed${updatedAt ? ` (${updatedAt})` : ''}`,
          timestamp: run.updated_at,
          isCompleted: true,
        },
      ],
      nextStepRecommendation: 'Review the execution logs and retry when the issue is resolved.',
    };
  }

  // Case 5: Run completed
  // STRICT: We only state what we explicitly know from the data.
  // We do NOT infer whether external services were contacted or whether work was done.
  if (status === 'completed' || status === 'success' || status === 'succeeded') {
    return {
      confidence: 'completed',
      confidenceLabel: 'Completed',
      confidenceDescription: 'Execution finished.',
      outcomeStatement: 'This execution completed. Check the pipeline funnel for detailed results.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'execution_completed',
          type: 'success',
          label: `Execution completed${updatedAt ? ` (${updatedAt})` : ''}`,
          timestamp: run.updated_at,
          isCompleted: true,
        },
      ],
      nextStepRecommendation: null,
    };
  }

  // Case 6: Partial completion
  if (status === 'partial' || status === 'partial_success') {
    return {
      confidence: 'completed',
      confidenceLabel: 'Partially Completed',
      confidenceDescription: 'Execution finished with some steps incomplete.',
      outcomeStatement: 'This execution partially completed. Some steps may not have finished.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'partial_completion',
          type: 'warning',
          label: `Partially completed${updatedAt ? ` (${updatedAt})` : ''}`,
          timestamp: run.updated_at,
          isCompleted: true,
        },
      ],
      nextStepRecommendation: 'Review the timeline to see which steps completed.',
    };
  }

  // Case 7: Unknown/idle state
  return {
    confidence: 'unknown',
    confidenceLabel: 'Unknown',
    confidenceDescription: 'Unable to determine execution state.',
    outcomeStatement: `Status: ${run.status || 'Unknown'}`,
    timeline: [
      {
        id: 'unknown',
        type: 'info',
        label: `Status: ${run.status || 'Unknown'}`,
        isCompleted: false,
      },
    ],
    nextStepRecommendation: null,
  };
}

/**
 * Tooltip explanations for execution terminology.
 * These help non-technical users understand execution behavior.
 * 
 * STRICT: Only include explanations for terms we can explicitly observe.
 * Do not include explanations for inferred states.
 */
export const EXECUTION_TOOLTIPS: Record<string, string> = {
  queue_mode: 
    'Queue mode means the campaign was submitted for background processing. ' +
    'A worker checks the queue periodically and executes eligible campaigns.',
  
  awaiting_pickup: 
    'Awaiting pickup means your campaign is in the execution queue. ' +
    'The worker will process it shortly, typically within a few minutes.',
  
  completed: 
    'Completed means the execution finished. ' +
    'Check the pipeline funnel for detailed results about what was processed.',
  
  failed: 
    'Failed means the execution encountered an error. ' +
    'Check the run history for details about what went wrong.',
};
