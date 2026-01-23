/**
 * Outcome Type Messaging System
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * This module provides semantic messaging for run outcomes.
 * 
 * CRITICAL RULES:
 * - VALID_EMPTY_OBSERVATION is INFORMATIONAL, not an error
 * - Zero leads does NOT imply failure
 * - Outcome type determines tone, color, and copy
 * - UI must clearly distinguish governance ≠ execution ≠ outcome
 * 
 * INVARIANT:
 * Each outcome type has distinct visual and textual treatment.
 * Do NOT collapse outcome types into binary success/failure.
 */

import { NSD_COLORS } from './design-tokens';

/**
 * Outcome types from the Observations-First architecture.
 * Each type has distinct semantic meaning and UI treatment.
 */
export type OutcomeType = 
  | 'VALID_EMPTY_OBSERVATION'  // Success - market observed, zero qualifying data
  | 'CONFIG_INCOMPLETE'         // User action required - missing configuration
  | 'INFRA_ERROR'               // System error - infrastructure failure
  | 'EXECUTION_ERROR'           // System error - logic failure during execution
  | 'SUCCESS';                  // Standard success with data

/**
 * Tone classification for outcome messaging.
 * Determines the emotional register of the message.
 */
export type OutcomeTone = 'informational' | 'success' | 'warning' | 'critical';

/**
 * Complete outcome messaging configuration.
 */
export interface OutcomeMessage {
  /** The outcome type being mapped */
  type: OutcomeType;
  /** Emotional tone of the message */
  tone: OutcomeTone;
  /** Short status label (e.g., "Market Observed") */
  label: string;
  /** Headline message for the outcome */
  headline: string;
  /** Detailed explanation for users */
  description: string;
  /** Actionable guidance if applicable */
  action?: string;
  /** Icon name to display */
  icon: string;
  /** Color configuration from design tokens */
  colors: {
    bg: string;
    text: string;
    border: string;
  };
}

/**
 * Map outcome type to complete messaging configuration.
 * 
 * CRITICAL: VALID_EMPTY_OBSERVATION is NOT an error.
 * It means the market was successfully observed but no data qualified.
 * This is a valid business outcome, not a system failure.
 */
export function getOutcomeMessage(outcomeType: OutcomeType | undefined | null): OutcomeMessage {
  switch (outcomeType) {
    case 'VALID_EMPTY_OBSERVATION':
      return {
        type: 'VALID_EMPTY_OBSERVATION',
        tone: 'informational',
        label: 'Market Observed',
        headline: 'Market observation complete',
        description: 'The market was successfully analyzed. No organizations or contacts matched your targeting criteria. This is a valid outcome — the system correctly identified that your ICP does not currently have qualifying opportunities in the observed market.',
        action: 'Consider broadening your ICP criteria or targeting different market segments.',
        icon: 'target',
        colors: NSD_COLORS.semantic.info,
      };

    case 'CONFIG_INCOMPLETE':
      return {
        type: 'CONFIG_INCOMPLETE',
        tone: 'warning',
        label: 'Configuration Required',
        headline: 'Campaign configuration incomplete',
        description: 'The campaign could not execute because required configuration is missing. This is not a system error — it means the campaign needs additional setup before it can run.',
        action: 'Review campaign settings and complete the required configuration.',
        icon: 'warning',
        colors: NSD_COLORS.semantic.attention,
      };

    case 'INFRA_ERROR':
      return {
        type: 'INFRA_ERROR',
        tone: 'critical',
        label: 'System Error',
        headline: 'Infrastructure error occurred',
        description: 'An infrastructure-level error prevented execution. This is a system issue that has been logged for investigation. Your campaign configuration is correct.',
        action: 'No action required. The engineering team has been notified.',
        icon: 'warning',
        colors: NSD_COLORS.semantic.critical,
      };

    case 'EXECUTION_ERROR':
      return {
        type: 'EXECUTION_ERROR',
        tone: 'critical',
        label: 'Execution Failed',
        headline: 'Execution error occurred',
        description: 'An error occurred during campaign execution. The system encountered an unexpected condition while processing your campaign.',
        action: 'Review the error details below. If the issue persists, contact support.',
        icon: 'warning',
        colors: NSD_COLORS.semantic.critical,
      };

    case 'SUCCESS':
    default:
      return {
        type: 'SUCCESS',
        tone: 'success',
        label: 'Completed',
        headline: 'Execution completed successfully',
        description: 'The campaign executed successfully and processed the available market data.',
        icon: 'check',
        colors: NSD_COLORS.semantic.positive,
      };
  }
}

/**
 * Check if an outcome type represents a user-actionable issue.
 * These require user intervention to resolve.
 */
export function isUserActionRequired(outcomeType: OutcomeType | undefined | null): boolean {
  return outcomeType === 'CONFIG_INCOMPLETE';
}

/**
 * Check if an outcome type represents a system error.
 * These do NOT require user intervention — engineering will investigate.
 */
export function isSystemError(outcomeType: OutcomeType | undefined | null): boolean {
  return outcomeType === 'INFRA_ERROR' || outcomeType === 'EXECUTION_ERROR';
}

/**
 * Check if an outcome type represents a valid business outcome.
 * IMPORTANT: VALID_EMPTY_OBSERVATION IS a valid outcome.
 */
export function isValidOutcome(outcomeType: OutcomeType | undefined | null): boolean {
  return outcomeType === 'SUCCESS' || outcomeType === 'VALID_EMPTY_OBSERVATION';
}

/**
 * Get a brief status summary for list views.
 */
export function getOutcomeStatusBrief(outcomeType: OutcomeType | undefined | null): string {
  const message = getOutcomeMessage(outcomeType);
  return message.label;
}
