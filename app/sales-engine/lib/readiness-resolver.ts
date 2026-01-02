/**
 * M68-04.1: Readiness Resolver (Non-Executing)
 * 
 * This module provides a comprehensive readiness evaluation system that:
 * - Evaluates mailbox_health, deliverability, throughput, kill_switch
 * - Returns explicit states: READY | NOT_READY
 * - Provides explainable blocking reasons
 * - Works with mock data when API_MODE is enabled but runtime is gated
 * 
 * HARD CONSTRAINTS:
 * - No execution, no writes, no side effects
 * - All logic is read-only and reversible
 * - Does NOT change execution guards or runtime gating
 * - Independent of governance state (orthogonal concern)
 */

import type { ReadinessStatus, ThroughputConfig, BlockingReason } from '../types/campaign';
import { isRuntimeKillSwitchActive } from '../../../config/appConfig';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Readiness evaluation result.
 * Explicit binary state with detailed explanation.
 */
export type ReadinessState = 'READY' | 'NOT_READY';

/**
 * Individual readiness check result.
 */
export interface ReadinessCheckResult {
  /** Check identifier */
  check: 'mailbox_health' | 'deliverability' | 'throughput' | 'kill_switch';
  /** Whether this check passed */
  passed: boolean;
  /** Human-readable status */
  status: string;
  /** Detailed message explaining the result */
  message: string;
  /** Severity if check failed */
  severity?: 'warning' | 'error' | 'info';
  /** Raw value (for display) */
  value?: string | number | boolean;
  /** Threshold (if applicable) */
  threshold?: string | number;
}

/**
 * Complete readiness resolution result.
 */
export interface ReadinessResolution {
  /** Overall readiness state */
  state: ReadinessState;
  /** Individual check results */
  checks: ReadinessCheckResult[];
  /** Blocking reasons (human-readable) */
  blockingReasons: string[];
  /** Summary message */
  summary: string;
  /** Timestamp of resolution */
  resolvedAt: string;
  /** Whether any data was missing/unavailable */
  hasIncompleteData: boolean;
  /** List of missing data fields */
  missingFields: string[];
}

// =============================================================================
// THRESHOLDS (Configurable)
// =============================================================================

/**
 * Readiness thresholds.
 * These are the minimum requirements for each check to pass.
 */
export const READINESS_THRESHOLDS = {
  /** Minimum deliverability score (0-100) */
  deliverabilityMinimum: 95,
  /** Maximum daily throughput usage percentage before warning */
  throughputWarningPercent: 80,
  /** Maximum daily throughput usage percentage before blocking */
  throughputBlockingPercent: 100,
} as const;

// =============================================================================
// CHECK FUNCTIONS
// =============================================================================

/**
 * Evaluate mailbox health.
 */
function checkMailboxHealth(
  readiness: ReadinessStatus | null | undefined
): ReadinessCheckResult {
  // No data available
  if (!readiness || readiness.mailbox_healthy === undefined) {
    return {
      check: 'mailbox_health',
      passed: false,
      status: 'Unknown',
      message: 'Mailbox health status is not available. Verification required.',
      severity: 'warning',
      value: undefined,
    };
  }

  if (readiness.mailbox_healthy === true) {
    return {
      check: 'mailbox_health',
      passed: true,
      status: 'Healthy',
      message: 'Mailbox is healthy and ready for sending.',
      value: true,
    };
  }

  return {
    check: 'mailbox_health',
    passed: false,
    status: 'Unhealthy',
    message: 'Mailbox is not healthy. Check mailbox configuration and warmup status.',
    severity: 'error',
    value: false,
  };
}

/**
 * Evaluate deliverability score.
 */
function checkDeliverability(
  readiness: ReadinessStatus | null | undefined
): ReadinessCheckResult {
  const threshold = READINESS_THRESHOLDS.deliverabilityMinimum;

  // No data available
  if (!readiness || readiness.deliverability_score === undefined) {
    return {
      check: 'deliverability',
      passed: false,
      status: 'Unknown',
      message: 'Deliverability score is not available. Verification required.',
      severity: 'warning',
      value: undefined,
      threshold,
    };
  }

  const score = readiness.deliverability_score;

  if (score >= threshold) {
    return {
      check: 'deliverability',
      passed: true,
      status: `${score}%`,
      message: `Deliverability score (${score}%) meets the minimum threshold (${threshold}%).`,
      value: score,
      threshold,
    };
  }

  return {
    check: 'deliverability',
    passed: false,
    status: `${score}%`,
    message: `Deliverability score (${score}%) is below the minimum threshold (${threshold}%).`,
    severity: 'error',
    value: score,
    threshold,
  };
}

/**
 * Evaluate throughput availability.
 */
function checkThroughput(
  throughput: ThroughputConfig | null | undefined
): ReadinessCheckResult {
  // No data available
  if (!throughput) {
    return {
      check: 'throughput',
      passed: false,
      status: 'Unknown',
      message: 'Throughput configuration is not available.',
      severity: 'warning',
      value: undefined,
    };
  }

  // Check if explicitly blocked
  if (throughput.is_blocked) {
    const reason = throughput.block_reason?.replace(/_/g, ' ').toLowerCase() || 'Unknown reason';
    return {
      check: 'throughput',
      passed: false,
      status: 'Blocked',
      message: `Throughput is blocked: ${reason}.`,
      severity: 'error',
      value: `${throughput.current_daily_usage}/${throughput.daily_limit}`,
    };
  }

  const usagePercent = (throughput.current_daily_usage / throughput.daily_limit) * 100;
  const remaining = throughput.daily_limit - throughput.current_daily_usage;

  // Check if at or over limit
  if (usagePercent >= READINESS_THRESHOLDS.throughputBlockingPercent) {
    return {
      check: 'throughput',
      passed: false,
      status: 'Exhausted',
      message: `Daily throughput limit reached (${throughput.current_daily_usage}/${throughput.daily_limit}).`,
      severity: 'error',
      value: `${throughput.current_daily_usage}/${throughput.daily_limit}`,
      threshold: throughput.daily_limit,
    };
  }

  // Warning if approaching limit
  if (usagePercent >= READINESS_THRESHOLDS.throughputWarningPercent) {
    return {
      check: 'throughput',
      passed: true, // Still passes, but with warning
      status: 'Limited',
      message: `Throughput is limited. ${remaining} remaining (${Math.round(usagePercent)}% used).`,
      severity: 'warning',
      value: `${throughput.current_daily_usage}/${throughput.daily_limit}`,
      threshold: throughput.daily_limit,
    };
  }

  return {
    check: 'throughput',
    passed: true,
    status: 'Available',
    message: `Throughput capacity available: ${remaining} remaining of ${throughput.daily_limit} daily limit.`,
    value: `${throughput.current_daily_usage}/${throughput.daily_limit}`,
    threshold: throughput.daily_limit,
  };
}

/**
 * Evaluate kill switch status.
 * Checks both campaign-level and global runtime kill switch.
 */
function checkKillSwitch(
  readiness: ReadinessStatus | null | undefined
): ReadinessCheckResult {
  // Check global runtime kill switch first (M68-03)
  if (isRuntimeKillSwitchActive) {
    return {
      check: 'kill_switch',
      passed: false,
      status: 'Active (Global)',
      message: 'Global runtime kill switch is active. All execution is disabled.',
      severity: 'error',
      value: true,
    };
  }

  // Check campaign-level kill switch
  if (readiness?.kill_switch_enabled === true) {
    return {
      check: 'kill_switch',
      passed: false,
      status: 'Active (Campaign)',
      message: 'Campaign-level kill switch is enabled. Execution is paused.',
      severity: 'error',
      value: true,
    };
  }

  // No data about campaign kill switch - check if we have any readiness data
  if (!readiness) {
    return {
      check: 'kill_switch',
      passed: true, // Assume not active if no data
      status: 'Unknown',
      message: 'Kill switch status unknown. Assuming not active.',
      severity: 'info',
      value: undefined,
    };
  }

  return {
    check: 'kill_switch',
    passed: true,
    status: 'Inactive',
    message: 'Kill switch is not active.',
    value: false,
  };
}

// =============================================================================
// MAIN RESOLVER
// =============================================================================

/**
 * Resolve readiness state from available data.
 * 
 * This is the main entry point for readiness evaluation.
 * It runs all checks and aggregates results into a comprehensive resolution.
 * 
 * @param readiness - Campaign readiness status (may be null/undefined)
 * @param throughput - Throughput configuration (may be null/undefined)
 * @returns Complete readiness resolution with all check results
 */
export function resolveReadiness(
  readiness: ReadinessStatus | null | undefined,
  throughput: ThroughputConfig | null | undefined
): ReadinessResolution {
  // Run all checks
  const checks: ReadinessCheckResult[] = [
    checkMailboxHealth(readiness),
    checkDeliverability(readiness),
    checkThroughput(throughput),
    checkKillSwitch(readiness),
  ];

  // Determine overall state
  const failedChecks = checks.filter(c => !c.passed);
  const state: ReadinessState = failedChecks.length === 0 ? 'READY' : 'NOT_READY';

  // Build blocking reasons from failed checks
  const blockingReasons = failedChecks.map(c => c.message);

  // Also include any blocking reasons from backend readiness data
  if (readiness?.blocking_reasons) {
    readiness.blocking_reasons.forEach(reason => {
      const humanReadable = reason.replace(/_/g, ' ').toLowerCase()
        .replace(/^\w/, c => c.toUpperCase());
      if (!blockingReasons.includes(humanReadable)) {
        blockingReasons.push(humanReadable);
      }
    });
  }

  // Identify missing data
  const missingFields: string[] = [];
  if (!readiness) {
    missingFields.push('readiness_status');
  } else {
    if (readiness.mailbox_healthy === undefined) missingFields.push('mailbox_healthy');
    if (readiness.deliverability_score === undefined) missingFields.push('deliverability_score');
    if (readiness.kill_switch_enabled === undefined) missingFields.push('kill_switch_enabled');
  }
  if (!throughput) {
    missingFields.push('throughput_config');
  }

  // Generate summary
  const passedCount = checks.filter(c => c.passed).length;
  const summary = state === 'READY'
    ? `All ${checks.length} readiness checks passed.`
    : `${failedChecks.length} of ${checks.length} readiness checks failed.`;

  return {
    state,
    checks,
    blockingReasons,
    summary,
    resolvedAt: new Date().toISOString(),
    hasIncompleteData: missingFields.length > 0,
    missingFields,
  };
}

// =============================================================================
// MOCK DATA FOR TESTING
// =============================================================================

/**
 * Generate mock readiness data for testing.
 * Used when API_MODE is enabled but runtime is gated.
 */
export function getMockReadinessStatus(scenario: 'ready' | 'not_ready' | 'partial' = 'ready'): ReadinessStatus {
  switch (scenario) {
    case 'ready':
      return {
        is_ready: true,
        blocking_reasons: [],
        last_checked: new Date().toISOString(),
        mailbox_healthy: true,
        deliverability_score: 98,
        kill_switch_enabled: false,
      };
    case 'not_ready':
      return {
        is_ready: false,
        blocking_reasons: ['MISSING_HUMAN_APPROVAL', 'SMARTLEAD_NOT_CONFIGURED'],
        last_checked: new Date().toISOString(),
        mailbox_healthy: false,
        deliverability_score: 72,
        kill_switch_enabled: false,
      };
    case 'partial':
      return {
        is_ready: false,
        blocking_reasons: ['NO_LEADS_PERSISTED'],
        last_checked: new Date().toISOString(),
        mailbox_healthy: true,
        deliverability_score: 95,
        kill_switch_enabled: false,
      };
  }
}

/**
 * Generate mock throughput data for testing.
 */
export function getMockThroughputConfig(scenario: 'available' | 'limited' | 'blocked' = 'available'): ThroughputConfig {
  switch (scenario) {
    case 'available':
      return {
        campaign_id: 'mock-campaign',
        daily_limit: 100,
        hourly_limit: 20,
        mailbox_limit: 50,
        current_daily_usage: 25,
        current_hourly_usage: 5,
        is_blocked: false,
      };
    case 'limited':
      return {
        campaign_id: 'mock-campaign',
        daily_limit: 100,
        hourly_limit: 20,
        mailbox_limit: 50,
        current_daily_usage: 85,
        current_hourly_usage: 15,
        is_blocked: false,
      };
    case 'blocked':
      return {
        campaign_id: 'mock-campaign',
        daily_limit: 100,
        hourly_limit: 20,
        mailbox_limit: 50,
        current_daily_usage: 100,
        current_hourly_usage: 20,
        is_blocked: true,
        block_reason: 'DAILY_LIMIT_EXCEEDED',
      };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get styling for readiness state.
 */
export function getReadinessStateStyle(state: ReadinessState): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  if (state === 'READY') {
    return {
      bg: '#D1FAE5',
      text: '#065F46',
      border: '#6EE7B7',
      icon: '✓',
    };
  }
  return {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#FECACA',
    icon: '✕',
  };
}

/**
 * Get styling for individual check result.
 */
export function getCheckResultStyle(result: ReadinessCheckResult): {
  bg: string;
  text: string;
  icon: string;
} {
  if (result.passed) {
    if (result.severity === 'warning') {
      return { bg: '#FEF3C7', text: '#92400E', icon: '⚠' };
    }
    return { bg: '#D1FAE5', text: '#065F46', icon: '✓' };
  }

  switch (result.severity) {
    case 'error':
      return { bg: '#FEE2E2', text: '#991B1B', icon: '✕' };
    case 'warning':
      return { bg: '#FEF3C7', text: '#92400E', icon: '⚠' };
    case 'info':
    default:
      return { bg: '#EFF6FF', text: '#1E40AF', icon: 'ℹ' };
  }
}

/**
 * Get human-readable label for check type.
 */
export function getCheckLabel(check: ReadinessCheckResult['check']): string {
  const labels: Record<ReadinessCheckResult['check'], string> = {
    mailbox_health: 'Mailbox Health',
    deliverability: 'Deliverability Score',
    throughput: 'Throughput Capacity',
    kill_switch: 'Kill Switch',
  };
  return labels[check];
}
