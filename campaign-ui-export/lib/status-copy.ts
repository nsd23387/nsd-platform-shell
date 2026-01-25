/**
 * Canonical Status Copy Map
 * 
 * SINGLE SOURCE OF TRUTH for all campaign status language.
 * Used across: status banner, list view, tooltips, decision panels.
 * 
 * PRINCIPLES:
 * - Labels remain short and operational
 * - Explanatory copy carries narrative meaning
 * - No implication of execution unless execution is occurring
 * - "Stopped" for human/safety halts, "Failed" only for system errors
 * 
 * STATUS SEMANTICS:
 * - DRAFT: Campaign is being authored
 * - PENDING_REVIEW: Awaiting governance approval
 * - RUNNABLE: Approved and ready to execute (not yet started)
 * - RUNNING: Execution in progress
 * - COMPLETED: Execution finished successfully
 * - STOPPED: Execution halted by human or safety mechanism
 * - FAILED: System error during execution
 * - ARCHIVED: Campaign is archived/retired
 */

import { NSD_COLORS } from './design-tokens';

/**
 * Canonical campaign status values.
 */
export type CampaignStatusKey = 
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'RUNNABLE'
  | 'RUNNING'
  | 'COMPLETED'
  | 'STOPPED'
  | 'FAILED'
  | 'ARCHIVED';

/**
 * Status copy configuration for a single status.
 */
export interface StatusCopy {
  /** Short operational label (e.g., "Draft", "Running") */
  label: string;
  /** Narrative explanation for the status */
  explanation: string;
  /** Even shorter label for constrained spaces */
  shortLabel: string;
  /** Tooltip text for hover states */
  tooltip: string;
  /** Whether this status implies active execution */
  isExecuting: boolean;
  /** Whether this status represents a terminal state */
  isTerminal: boolean;
  /** Whether user action is typically required */
  requiresAction: boolean;
  /** Semantic color configuration */
  color: { bg: string; text: string; border: string };
}

/**
 * CANONICAL STATUS COPY MAP
 * 
 * This is the single source of truth for all status-related copy.
 * Import and use this everywhere status text is needed.
 */
export const STATUS_COPY: Record<CampaignStatusKey, StatusCopy> = {
  DRAFT: {
    label: 'Draft',
    shortLabel: 'Draft',
    explanation: 'Campaign is being configured and is not yet ready for review.',
    tooltip: 'This campaign is in draft mode. Complete configuration to submit for approval.',
    isExecuting: false,
    isTerminal: false,
    requiresAction: true,
    color: NSD_COLORS.semantic.muted,
  },
  PENDING_REVIEW: {
    label: 'Pending Approval',
    shortLabel: 'Pending',
    explanation: 'Campaign is fully configured but cannot execute until governance approval is granted.',
    tooltip: 'Awaiting governance approval. No execution will occur until approved.',
    isExecuting: false,
    isTerminal: false,
    requiresAction: false,
    color: NSD_COLORS.semantic.attention,
  },
  RUNNABLE: {
    label: 'Approved',
    shortLabel: 'Ready',
    explanation: 'Campaign is approved and ready to execute when you choose.',
    tooltip: 'Governance approved. Ready to run when you decide.',
    isExecuting: false,
    isTerminal: false,
    requiresAction: true,
    color: NSD_COLORS.semantic.info,
  },
  RUNNING: {
    label: 'Running',
    shortLabel: 'Running',
    explanation: 'Execution is in progress. Results will appear as stages complete.',
    tooltip: 'Campaign is actively executing. Monitor progress below.',
    isExecuting: true,
    isTerminal: false,
    requiresAction: false,
    color: NSD_COLORS.semantic.active,
  },
  COMPLETED: {
    label: 'Completed',
    shortLabel: 'Done',
    explanation: 'Execution has finished. Review results and insights below.',
    tooltip: 'Campaign execution completed successfully.',
    isExecuting: false,
    isTerminal: true,
    requiresAction: false,
    color: NSD_COLORS.semantic.positive,
  },
  STOPPED: {
    label: 'Stopped',
    shortLabel: 'Stopped',
    explanation: 'Execution was halted before completion. This may be intentional or due to a safety check.',
    tooltip: 'Campaign was stopped. Review the reason below.',
    isExecuting: false,
    isTerminal: true,
    requiresAction: true,
    color: NSD_COLORS.semantic.attention,
  },
  FAILED: {
    label: 'Failed',
    shortLabel: 'Failed',
    explanation: 'Execution encountered a system error. Engineering has been notified.',
    tooltip: 'System error occurred during execution.',
    isExecuting: false,
    isTerminal: true,
    requiresAction: false,
    color: NSD_COLORS.semantic.critical,
  },
  ARCHIVED: {
    label: 'Archived',
    shortLabel: 'Archived',
    explanation: 'Campaign is archived and no longer active.',
    tooltip: 'This campaign has been archived.',
    isExecuting: false,
    isTerminal: true,
    requiresAction: false,
    color: NSD_COLORS.semantic.muted,
  },
};

/**
 * Get status copy for a given status key.
 * Returns DRAFT copy if status is unknown.
 */
export function getStatusCopy(status: string): StatusCopy {
  const normalized = status?.toUpperCase() as CampaignStatusKey;
  return STATUS_COPY[normalized] || STATUS_COPY.DRAFT;
}

/**
 * Get the appropriate status key from governance state and execution state.
 * This handles the mapping from backend states to canonical display states.
 */
export function deriveStatusKey(
  governanceStatus: string,
  hasRun: boolean,
  runStatus?: string | null,
  terminationReason?: string | null
): CampaignStatusKey {
  // If there's an active or completed run, derive from execution state
  if (hasRun && runStatus) {
    switch (runStatus.toLowerCase()) {
      case 'running':
      case 'queued':
        return 'RUNNING';
      case 'completed':
        return 'COMPLETED';
      case 'failed':
        // Distinguish between stopped (intentional) and failed (system error)
        if (terminationReason) {
          const reason = terminationReason.toLowerCase();
          if (
            reason.includes('stopped') ||
            reason.includes('paused') ||
            reason.includes('safety') ||
            reason.includes('user') ||
            reason.includes('manual')
          ) {
            return 'STOPPED';
          }
        }
        return 'FAILED';
    }
  }

  // Otherwise, derive from governance state
  const normalized = governanceStatus?.toUpperCase();
  switch (normalized) {
    case 'DRAFT':
      return 'DRAFT';
    case 'PENDING_REVIEW':
      return 'PENDING_REVIEW';
    case 'RUNNABLE':
    case 'APPROVED':
      return 'RUNNABLE';
    case 'RUNNING':
      return 'RUNNING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    case 'ARCHIVED':
      return 'ARCHIVED';
    default:
      return 'DRAFT';
  }
}

/**
 * Decision context explanations.
 * Maps blocked or action-required states to plain-English reasons.
 */
export interface DecisionContext {
  /** Whether an action is blocked */
  isBlocked: boolean;
  /** Plain-English reason for the current state */
  reason: string;
  /** Suggested next step (if any) */
  nextStep?: string;
}

/**
 * Get decision context for a campaign.
 * Provides plain-English explanations for blocked states.
 */
export function getDecisionContext(
  statusKey: CampaignStatusKey,
  options: {
    isPlanningOnly?: boolean;
    isApproved?: boolean;
    hasRun?: boolean;
    outcomeType?: string;
  } = {}
): DecisionContext {
  const { isPlanningOnly, isApproved, hasRun, outcomeType } = options;

  // Planning-only mode
  if (isPlanningOnly) {
    return {
      isBlocked: true,
      reason: 'Campaign is in planning-only mode.',
      nextStep: 'Disable planning mode to enable execution.',
    };
  }

  // Status-specific contexts
  switch (statusKey) {
    case 'DRAFT':
      return {
        isBlocked: true,
        reason: 'Campaign configuration is incomplete.',
        nextStep: 'Complete configuration and submit for approval.',
      };

    case 'PENDING_REVIEW':
      return {
        isBlocked: true,
        reason: 'Awaiting governance approval.',
        nextStep: 'Contact your admin if approval is delayed.',
      };

    case 'RUNNABLE':
      if (hasRun) {
        return {
          isBlocked: false,
          reason: 'Campaign has already been executed.',
        };
      }
      return {
        isBlocked: false,
        reason: 'Campaign is approved and ready.',
        nextStep: 'Select execution mode and run when ready.',
      };

    case 'RUNNING':
      return {
        isBlocked: true,
        reason: 'Execution is in progress.',
        nextStep: 'Monitor progress below.',
      };

    case 'COMPLETED':
      if (outcomeType === 'VALID_EMPTY_OBSERVATION') {
        return {
          isBlocked: false,
          reason: 'Execution completed with no matching results. This is a valid outcome reflecting market reality.',
        };
      }
      return {
        isBlocked: false,
        reason: 'Execution completed successfully.',
        nextStep: 'Review results and insights below.',
      };

    case 'STOPPED':
      return {
        isBlocked: false,
        reason: 'Execution was intentionally stopped.',
        nextStep: 'Review the reason and consider adjustments.',
      };

    case 'FAILED':
      return {
        isBlocked: false,
        reason: 'A system error occurred during execution.',
        nextStep: 'Engineering has been notified. You may retry later.',
      };

    case 'ARCHIVED':
      return {
        isBlocked: true,
        reason: 'Campaign is archived.',
        nextStep: 'Duplicate this campaign to create a new version.',
      };

    default:
      return {
        isBlocked: false,
        reason: 'Status unknown.',
      };
  }
}

/**
 * Outcome type display configuration.
 * Maps backend outcome types to user-friendly display.
 */
export interface OutcomeDisplay {
  label: string;
  description: string;
  tone: 'neutral' | 'positive' | 'attention' | 'critical';
}

export const OUTCOME_DISPLAY: Record<string, OutcomeDisplay> = {
  VALID_EMPTY_OBSERVATION: {
    label: 'No Matching Results',
    description: 'The campaign executed successfully but found no organizations or contacts matching your criteria. This is a valid outcome reflecting current market reality.',
    tone: 'neutral',
  },
  CONFIG_INCOMPLETE: {
    label: 'Configuration Incomplete',
    description: 'The campaign could not execute because required configuration is missing. Please review your campaign settings.',
    tone: 'attention',
  },
  INFRA_ERROR: {
    label: 'Infrastructure Error',
    description: 'A system infrastructure error occurred. The engineering team has been notified.',
    tone: 'critical',
  },
  EXECUTION_ERROR: {
    label: 'Execution Error',
    description: 'An error occurred during campaign execution. Please review the details.',
    tone: 'critical',
  },
  SUCCESS: {
    label: 'Completed Successfully',
    description: 'Campaign execution completed and produced results.',
    tone: 'positive',
  },
};

/**
 * Get outcome display for a given outcome type.
 */
export function getOutcomeDisplay(outcomeType?: string | null): OutcomeDisplay | null {
  if (!outcomeType) return null;
  return OUTCOME_DISPLAY[outcomeType] || null;
}
