/**
 * Campaign State Machine - Target-State Architecture
 * 
 * This module provides the canonical campaign state types and deterministic
 * mapping functions for deriving campaign governance states from backend data.
 * 
 * Non-negotiable constraints:
 * - UI is read-only; execution is observed, not initiated
 * - States reflect governance/approval stages, not execution triggers
 * - Provenance must be explicitly tracked (Canonical vs Legacy)
 */

/**
 * Target-state campaign governance states.
 * These replace legacy "RUNNABLE"/"RUNNING" semantics with governance-first terminology.
 */
export type CampaignGovernanceState =
  | 'DRAFT'                  // Campaign is being authored, editable
  | 'PENDING_APPROVAL'       // Submitted for review, awaiting approval
  | 'APPROVED_READY'         // Approved by governance, execution observed externally
  | 'BLOCKED'                // Cannot proceed due to readiness/governance issues
  | 'EXECUTED_READ_ONLY';    // Has been executed, now in observability-only mode

/**
 * Legacy backend status values that may still appear in API responses.
 * Used for mapping to target-state governance states.
 */
export type LegacyCampaignStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'RUNNABLE'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ARCHIVED';

/**
 * Provenance classification for data records.
 * Must be derived from backend fields, never inferred client-side.
 */
export type ProvenanceType = 'CANONICAL' | 'LEGACY_OBSERVED';

/**
 * Confidence classification for metrics.
 * Determines how metrics should be displayed and whether they're actionable.
 */
export type MetricConfidence = 'SAFE' | 'CONDITIONAL' | 'BLOCKED';

/**
 * Readiness status for execution readiness panel.
 */
export type ReadinessLevel = 'READY' | 'NOT_READY' | 'UNKNOWN';

/**
 * Autonomy levels for learning signals (L0-L2 only per constraints).
 * UI must not imply autonomous optimization beyond L2.
 */
export type AutonomyLevel = 'L0' | 'L1' | 'L2';

/**
 * Extended campaign metadata for target-state display.
 */
export interface CampaignGovernanceMetadata {
  governanceState: CampaignGovernanceState;
  provenance: ProvenanceType;
  readinessLevel: ReadinessLevel;
  blockingReasons: string[];
  lastReadinessCheck?: string;
  approvedAt?: string;
  approvedBy?: string;
}

/**
 * Deterministic mapping from legacy backend status to target-state governance state.
 * 
 * Rules:
 * - DRAFT -> DRAFT (editable)
 * - PENDING_REVIEW -> PENDING_APPROVAL (awaiting governance)
 * - RUNNABLE -> APPROVED_READY (approved, execution observed externally)
 * - RUNNING/COMPLETED/FAILED -> EXECUTED_READ_ONLY (observability only)
 * - ARCHIVED -> EXECUTED_READ_ONLY (historical, read-only)
 * - If blocking reasons present -> BLOCKED (regardless of backend status)
 * 
 * @param legacyStatus - Backend status value
 * @param blockingReasons - List of blocking reasons from readiness check
 * @param isRunnable - Backend-provided runnable flag
 * @returns Target-state governance state
 */
export function mapToGovernanceState(
  legacyStatus: LegacyCampaignStatus | string,
  blockingReasons: string[] = [],
  isRunnable: boolean = false
): CampaignGovernanceState {
  // If there are blocking reasons, the campaign is blocked regardless of status
  if (blockingReasons.length > 0 && legacyStatus !== 'COMPLETED' && legacyStatus !== 'FAILED') {
    return 'BLOCKED';
  }

  switch (legacyStatus) {
    case 'DRAFT':
      return 'DRAFT';

    case 'PENDING_REVIEW':
      return 'PENDING_APPROVAL';

    case 'RUNNABLE':
      // RUNNABLE without blocking reasons = approved and ready
      return isRunnable ? 'APPROVED_READY' : 'BLOCKED';

    case 'RUNNING':
    case 'COMPLETED':
    case 'FAILED':
    case 'ARCHIVED':
      // All execution states are read-only observability
      return 'EXECUTED_READ_ONLY';

    default:
      // Unknown status treated as blocked for safety
      return 'BLOCKED';
  }
}

/**
 * Get human-readable label for governance state.
 */
export function getGovernanceStateLabel(state: CampaignGovernanceState): string {
  const labels: Record<CampaignGovernanceState, string> = {
    DRAFT: 'Draft',
    PENDING_APPROVAL: 'Pending Approval',
    APPROVED_READY: 'Approved (Execution Observed)',
    BLOCKED: 'Blocked',
    EXECUTED_READ_ONLY: 'Executed (Read-Only)',
  };
  return labels[state] || state;
}

/**
 * Get styling configuration for governance state badges.
 */
export function getGovernanceStateStyle(state: CampaignGovernanceState): {
  bg: string;
  text: string;
  border: string;
} {
  const styles: Record<CampaignGovernanceState, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
    PENDING_APPROVAL: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    APPROVED_READY: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
    BLOCKED: { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
    EXECUTED_READ_ONLY: { bg: '#F3F4F6', text: '#4B5563', border: '#D1D5DB' },
  };
  return styles[state] || styles.BLOCKED;
}

/**
 * Get confidence label for metrics.
 */
export function getConfidenceLabel(confidence: MetricConfidence): string {
  const labels: Record<MetricConfidence, string> = {
    SAFE: 'Safe',
    CONDITIONAL: 'Conditional',
    BLOCKED: 'Blocked',
  };
  return labels[confidence] || confidence;
}

/**
 * Get styling for confidence badges.
 */
export function getConfidenceStyle(confidence: MetricConfidence): {
  bg: string;
  text: string;
  border: string;
  muted: boolean;
} {
  const styles: Record<MetricConfidence, { bg: string; text: string; border: string; muted: boolean }> = {
    SAFE: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', muted: false },
    CONDITIONAL: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', muted: false },
    BLOCKED: { bg: '#F3F4F6', text: '#9CA3AF', border: '#D1D5DB', muted: true },
  };
  return styles[confidence] || styles.BLOCKED;
}

/**
 * Get provenance label.
 */
export function getProvenanceLabel(provenance: ProvenanceType): string {
  const labels: Record<ProvenanceType, string> = {
    CANONICAL: 'Canonical',
    LEGACY_OBSERVED: 'Legacy (Observed)',
  };
  return labels[provenance] || provenance;
}

/**
 * Get styling for provenance pills.
 */
export function getProvenanceStyle(provenance: ProvenanceType): {
  bg: string;
  text: string;
  border: string;
} {
  const styles: Record<ProvenanceType, { bg: string; text: string; border: string }> = {
    CANONICAL: { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' },
    LEGACY_OBSERVED: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  };
  return styles[provenance] || styles.LEGACY_OBSERVED;
}

/**
 * Derive provenance from backend record metadata.
 * 
 * TODO: This should be replaced with explicit backend field when available.
 * Current implementation uses heuristics based on existing stable fields.
 * 
 * @param record - Record with optional provenance metadata
 * @returns Provenance type
 */
export function deriveProvenance(record: {
  source_system?: string;
  observed_via?: string;
  is_canonical?: boolean;
  provenance?: ProvenanceType;
}): ProvenanceType {
  // Explicit canonical flag takes precedence
  if (record.is_canonical === true) {
    return 'CANONICAL';
  }
  if (record.is_canonical === false) {
    return 'LEGACY_OBSERVED';
  }

  // Check source_system field
  if (record.source_system) {
    const canonicalSources = ['ods', 'canonical', 'primary'];
    if (canonicalSources.some(s => record.source_system?.toLowerCase().includes(s))) {
      return 'CANONICAL';
    }
  }

  // Check observed_via field
  if (record.observed_via) {
    return 'LEGACY_OBSERVED';
  }

  // Default to legacy if uncertain (safer for governance)
  return 'LEGACY_OBSERVED';
}

/**
 * Derive confidence from metric metadata.
 * 
 * @param metric - Metric with optional confidence metadata
 * @returns Confidence classification
 */
export function deriveConfidence(metric: {
  confidence?: string;
  validation_status?: string;
  provenance?: ProvenanceType;
  is_validated?: boolean;
}): MetricConfidence {
  // Explicit confidence field takes precedence
  if (metric.confidence) {
    const conf = metric.confidence.toUpperCase();
    if (conf === 'SAFE' || conf === 'CONDITIONAL' || conf === 'BLOCKED') {
      return conf as MetricConfidence;
    }
  }

  // Check validation status
  if (metric.validation_status === 'validated' || metric.is_validated === true) {
    return 'SAFE';
  }
  if (metric.validation_status === 'pending') {
    return 'CONDITIONAL';
  }
  if (metric.validation_status === 'failed' || metric.is_validated === false) {
    return 'BLOCKED';
  }

  // Check provenance mismatch
  if (metric.provenance === 'LEGACY_OBSERVED') {
    return 'CONDITIONAL';
  }

  // Default to conditional if uncertain
  return 'CONDITIONAL';
}

/**
 * Check if an email is a valid lead email (not a filler/placeholder).
 */
export function isValidLeadEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const fillerPatterns = [
    /email_not_unlocked/i,
    /no_email/i,
    /placeholder/i,
    /unknown@/i,
    /@example\.com$/i,
    /@test\.com$/i,
    /noreply/i,
    /donotreply/i,
  ];

  return !fillerPatterns.some(pattern => pattern.test(email));
}

/**
 * Determine if a record qualifies as a lead (not just a contact).
 * 
 * Per constraints: Lead views must only show records in "lead-ready/qualified" state.
 */
export function isQualifiedLead(record: {
  email?: string | null;
  lead_status?: string;
  is_qualified?: boolean;
  qualification_state?: string;
}): boolean {
  // Must have valid email
  if (!isValidLeadEmail(record.email)) {
    return false;
  }

  // Check explicit qualification flags
  if (record.is_qualified === true) {
    return true;
  }
  if (record.is_qualified === false) {
    return false;
  }

  // Check qualification state
  const qualifiedStates = ['qualified', 'lead-ready', 'ready', 'mql', 'sql'];
  if (record.qualification_state) {
    return qualifiedStates.includes(record.qualification_state.toLowerCase());
  }

  // Check lead status
  if (record.lead_status) {
    return qualifiedStates.includes(record.lead_status.toLowerCase());
  }

  // Default to false if uncertain (conservative for governance)
  return false;
}

/**
 * Get autonomy level description.
 */
export function getAutonomyLevelDescription(level: AutonomyLevel): string {
  const descriptions: Record<AutonomyLevel, string> = {
    L0: 'No automation - Human review required for all decisions',
    L1: 'Assisted - AI suggests, human approves',
    L2: 'Supervised - AI acts within pre-approved boundaries, human monitors',
  };
  return descriptions[level] || `Level ${level}`;
}

/**
 * Primary action configuration based on governance state.
 * Replaces legacy "Run/Start/Launch" semantics with approval-gated actions.
 */
export function getPrimaryAction(
  state: CampaignGovernanceState,
  canSubmit: boolean = false,
  canApprove: boolean = false
): {
  label: string;
  action: 'submit_for_approval' | 'pending' | 'approved_observed' | 'blocked' | 'read_only' | null;
  disabled: boolean;
  explanation: string;
} {
  switch (state) {
    case 'DRAFT':
      return {
        label: canSubmit ? 'Submit for Approval' : 'Not Ready to Submit',
        action: canSubmit ? 'submit_for_approval' : null,
        disabled: !canSubmit,
        explanation: canSubmit 
          ? 'Submit this campaign for governance review before execution can be scheduled.'
          : 'Complete required fields before submitting for approval.',
      };

    case 'PENDING_APPROVAL':
      return {
        label: 'Pending Approval',
        action: 'pending',
        disabled: true,
        explanation: 'This campaign is awaiting governance approval. Execution cannot be initiated from this UI.',
      };

    case 'APPROVED_READY':
      return {
        label: 'Approved (Execution Observed)',
        action: 'approved_observed',
        disabled: true,
        explanation: 'This campaign is approved. Execution is managed by backend systems and observed in this UI.',
      };

    case 'BLOCKED':
      return {
        label: 'Blocked',
        action: 'blocked',
        disabled: true,
        explanation: 'This campaign is blocked due to unresolved governance or readiness issues.',
      };

    case 'EXECUTED_READ_ONLY':
      return {
        label: 'Executed (Read-Only)',
        action: 'read_only',
        disabled: true,
        explanation: 'This campaign has been executed. View run history for observability data.',
      };
  }
}
