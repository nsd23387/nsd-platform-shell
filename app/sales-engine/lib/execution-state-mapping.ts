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
 * - OBSERVATION-BASED: State what we observe, not what we infer
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
 * Backend Condition → UI Meaning Mapping (OBSERVATION-BASED):
 * ┌─────────────────────────────────────┬─────────────────────────────────────────────────┐
 * │ Backend Condition                   │ UI Meaning                                      │
 * ├─────────────────────────────────────┼─────────────────────────────────────────────────┤
 * │ No run exists (noRuns=true)         │ "Campaign not executed yet"                     │
 * │ Run exists + status=queued          │ "Awaiting worker pickup"                        │
 * │ Run exists + status=running         │ "Execution in progress"                         │
 * │ Run exists + status=completed       │ "Execution finished - no steps observed"        │
 * │ Run exists + status=failed          │ "Execution failed"                              │
 * │ Run exists + unknown status         │ "Status unknown"                                │
 * └─────────────────────────────────────┴─────────────────────────────────────────────────┘
 * 
 * OBSERVATION: The LatestRun model provides only start/end timestamps without
 * intermediate execution steps. When a run completes, we observe that no execution
 * steps are visible in the data. This is stated as an observation, not inference.
 */

import type { LatestRun } from '../../../hooks/useLatestRunStatus';
import { isRunStale, RUN_STALE_THRESHOLD_MS, type ResolvableRun } from './resolveActiveRun';

/**
 * User-facing execution confidence levels.
 * These replace ambiguous "Running" semantics with clear states.
 * 
 * STRICT: All states are derived from EXPLICIT backend signals only.
 * We do not infer states that the backend does not explicitly provide.
 * 
 * OBSERVATION-BASED: 'completed_no_steps_observed' is based on observing
 * that the LatestRun model contains no intermediate execution step data.
 * 
 * STALENESS HANDLING: 'stale' is for runs marked 'running' that exceed
 * the 30-minute threshold, aligning with backend watchdog semantics.
 */
export type ExecutionConfidence = 
  | 'completed'                    // Execution finished with observable steps
  | 'completed_no_steps_observed'  // Execution finished but no steps observed in data
  | 'in_progress'                  // Execution actively running (status=running)
  | 'queued'                       // Awaiting execution (status=queued)
  | 'not_executed'                 // Never executed (noRuns=true)
  | 'failed'                       // Execution failed (status=failed)
  | 'stale'                        // Run was running but exceeded staleness threshold
  | 'unknown';                     // Cannot determine state from available signals

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
 * Convert LatestRun to ResolvableRun for staleness check.
 */
function toResolvableRun(run: LatestRun): ResolvableRun {
  return {
    id: run.run_id,
    status: run.status || '',
    started_at: run.created_at, // API uses created_at as start time
    created_at: run.created_at,
    updated_at: run.updated_at,
  };
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
  // STALENESS HANDLING: Check if running run exceeds 30-minute threshold
  if (status === 'running' || status === 'in_progress') {
    const resolvable = toResolvableRun(run);
    const stale = isRunStale(resolvable);
    
    // Case 3a: Stale running run - display warning state
    if (stale) {
      return {
        confidence: 'stale',
        confidenceLabel: 'Stale',
        confidenceDescription: 'A previous execution did not complete and is being cleaned up by the system.',
        outcomeStatement: 'This execution has been running for over 30 minutes and is considered stale. The backend watchdog will clean it up automatically.',
        timeline: [
          {
            id: 'run_created',
            type: 'success',
            label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
            timestamp: run.created_at,
            isCompleted: true,
          },
          {
            id: 'stale_warning',
            type: 'warning',
            label: 'Execution exceeded 30-minute threshold',
            isCompleted: true,
          },
          {
            id: 'awaiting_cleanup',
            type: 'info',
            label: 'Awaiting system cleanup',
            isCompleted: false,
          },
        ],
        nextStepRecommendation: 'This run will be marked as failed by the system watchdog. A new execution can be requested after cleanup.',
      };
    }
    
    // Case 3b: Active running run (not stale)
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
  // OBSERVATION-BASED: The LatestRun model provides only start/end data.
  // We observe that no intermediate execution steps are present in the data.
  // This is stated as an observation ("no execution steps were observed"),
  // not an inference about what the system did or didn't do.
  //
  // DESIGN DECISION: Since the current LatestRun model does NOT include
  // intermediate step data (e.g., `steps: []`, `phases: []`), ALL completed
  // runs are classified as 'completed_no_steps_observed'. This is correct
  // because we're observing what data is available, not inferring what happened.
  //
  // FUTURE EXTENSIBILITY: If the backend adds step data to LatestRun (e.g.,
  // `run.steps` or `run.phases`), check for their presence here to distinguish
  // between 'completed' (steps observed) and 'completed_no_steps_observed'.
  if (status === 'completed' || status === 'success' || status === 'succeeded') {
    // Check if step data exists in the run (future extensibility)
    // Currently, LatestRun never includes step data, so this is always false.
    const hasObservableSteps = Boolean(
      (run as Record<string, unknown>).steps || 
      (run as Record<string, unknown>).phases ||
      (run as Record<string, unknown>).execution_steps
    );
    
    if (hasObservableSteps) {
      // Future path: when backend provides step data
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
    
    // Current path: LatestRun model contains no step data
    // We observe the absence of steps and communicate this clearly
    return {
      confidence: 'completed_no_steps_observed',
      confidenceLabel: 'Completed',
      confidenceDescription: 'Execution finished. No execution steps were observed in the available data.',
      outcomeStatement: 
        'This execution completed, but no execution steps were observed. ' +
        'Check the pipeline funnel to verify whether any results were produced.',
      timeline: [
        {
          id: 'run_created',
          type: 'success',
          label: `Run created${createdAt ? ` (${createdAt})` : ''}`,
          timestamp: run.created_at,
          isCompleted: true,
        },
        {
          id: 'no_steps_observed',
          type: 'warning',
          label: 'No execution steps observed',
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
      nextStepRecommendation: 
        'Review the pipeline funnel for results. If empty, consider reviewing ICP criteria or sourcing parameters.',
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
  
  no_steps_observed:
    'No execution steps were observed in the available data. ' +
    'This means the run completed but intermediate step details are not visible here. ' +
    'Check the pipeline funnel to see if any results were produced.',
  
  failed: 
    'Failed means the execution encountered an error. ' +
    'Check the run history for details about what went wrong.',
    
  stale:
    'A stale run means the execution was marked as running but has not completed ' +
    'within 30 minutes. The backend watchdog will automatically mark it as failed ' +
    'and clean up the state. A new execution can be requested after cleanup.',
};
