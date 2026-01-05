/**
 * Campaign State Machine
 * 
 * This module provides the canonical campaign state types and deterministic
 * mapping functions for deriving campaign governance states from backend data.
 */

/**
 * Target-state campaign governance states.
 * These replace legacy "RUNNABLE"/"RUNNING" semantics with governance-first terminology.
 */
export type CampaignGovernanceState =
  | 'DRAFT'                  // Campaign is being authored, editable
  | 'PENDING_APPROVAL'       // Submitted for review, awaiting approval
  | 'APPROVED_READY'         // Approved by governance, execution observed externally
  | 'BLOCKED'                // Cannot proceed due to governance issues
  | 'EXECUTED';             // Has been executed

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
 * 
 * IMPORTANT: Never display SAFE without explicit backend validation metadata.
 * If metadata is missing or uncertain, default to UNCLASSIFIED (treated as CONDITIONAL).
 */
export type MetricConfidence = 'SAFE' | 'CONDITIONAL' | 'BLOCKED';

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
 * - RUNNING/COMPLETED/FAILED -> EXECUTED
 * - ARCHIVED -> EXECUTED
 * 
 * @param legacyStatus - Backend status value
 * @param isRunnable - Backend-provided runnable flag
 * @returns Target-state governance state
 */
export function mapToGovernanceState(
  legacyStatus: LegacyCampaignStatus | string,
  isRunnable: boolean = false
): CampaignGovernanceState {
  switch (legacyStatus) {
    case 'DRAFT':
      return 'DRAFT';

    case 'PENDING_REVIEW':
      return 'PENDING_APPROVAL';

    case 'RUNNABLE':
      return isRunnable ? 'APPROVED_READY' : 'BLOCKED';

    case 'RUNNING':
    case 'COMPLETED':
    case 'FAILED':
    case 'ARCHIVED':
      return 'EXECUTED';

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
    EXECUTED: 'Executed',
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
    EXECUTED: { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
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
 * PRECEDENCE ORDER (critical for correctness):
 * 1. record.provenance - Explicit provenance field takes absolute precedence
 * 2. record.is_canonical === true/false - Explicit canonical flag
 * 3. Trusted source_system values (allowlist) - FALLBACK ONLY
 * 4. LEGACY_OBSERVED - Default when uncertain (safer for governance)
 * 
 * IMPORTANT: Heuristics (steps 3-4) are FALLBACK ONLY.
 * Always prefer explicit backend-provided provenance fields.
 * If the backend provides record.provenance, trust it unconditionally.
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
  // STEP 1: Explicit provenance field takes ABSOLUTE precedence
  // If the backend provides this, trust it unconditionally
  if (record.provenance === 'CANONICAL' || record.provenance === 'LEGACY_OBSERVED') {
    return record.provenance;
  }

  // STEP 2: Explicit is_canonical boolean flag
  if (record.is_canonical === true) {
    return 'CANONICAL';
  }
  if (record.is_canonical === false) {
    return 'LEGACY_OBSERVED';
  }

  // STEP 3 (FALLBACK): Check source_system against trusted allowlist
  // This is a heuristic and should only be used when explicit fields are absent
  if (record.source_system) {
    // Trusted canonical source identifiers (explicit allowlist)
    const TRUSTED_CANONICAL_SOURCES = ['ods', 'canonical', 'primary'];
    const sourceSystemLower = record.source_system.toLowerCase();
    if (TRUSTED_CANONICAL_SOURCES.some(s => sourceSystemLower.includes(s))) {
      return 'CANONICAL';
    }
  }

  // STEP 4 (FALLBACK): Check observed_via indicates legacy observation
  if (record.observed_via) {
    return 'LEGACY_OBSERVED';
  }

  // STEP 5: Default to LEGACY_OBSERVED when uncertain
  // This is the safest default for governance - treat as unverified
  return 'LEGACY_OBSERVED';
}

/**
 * Derive confidence from metric metadata.
 * 
 * CRITICAL: Never return SAFE without explicit validation metadata from backend.
 * If metadata is missing, return CONDITIONAL (uncertain) not SAFE.
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

  // Check validation status (explicit backend field)
  if (metric.validation_status === 'validated' || metric.is_validated === true) {
    return 'SAFE';
  }
  if (metric.validation_status === 'pending') {
    return 'CONDITIONAL';
  }
  if (metric.validation_status === 'failed' || metric.is_validated === false) {
    return 'BLOCKED';
  }

  // Check provenance - legacy observed data is conditionally trusted
  if (metric.provenance === 'LEGACY_OBSERVED') {
    return 'CONDITIONAL';
  }

  // NO EXPLICIT VALIDATION METADATA FOUND
  // Default to CONDITIONAL (uncertain), NOT SAFE
  // This ensures we never show "Safe" without backend confirmation
  return 'CONDITIONAL';
}

/**
 * Check if an email is a valid lead email (not a filler/placeholder).
 * 
 * IMPORTANT: This function is intended for use with QUALIFIED LEAD views ONLY.
 * "Contacts Observed" views should NOT filter by email validity - they display
 * all observed contact records regardless of email status.
 * 
 * Use this function when:
 * - Filtering leads for the "Qualified Leads" view
 * - Validating lead eligibility
 * 
 * Do NOT use this function when:
 * - Displaying "Contacts Observed" (all contacts should be shown)
 * - Showing raw contact data for observability
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
 * 
 * IMPORTANT DISTINCTION:
 * - "Qualified Leads" view: Use this function. Only shows records that pass all checks.
 * - "Contacts Observed" view: Do NOT use this function. Shows all observed contacts,
 *   even those without valid emails or qualification status.
 * 
 * This distinction ensures:
 * - Lead counts are accurate (only truly qualified leads)
 * - Contact observability is complete (all data visible)
 * - UI does not conflate contacts with qualified leads
 */
export function isQualifiedLead(record: {
  email?: string | null;
  lead_status?: string;
  is_qualified?: boolean;
  qualification_state?: string;
}): boolean {
  // Must have valid email - filters out placeholder/filler emails
  if (!isValidLeadEmail(record.email)) {
    return false;
  }

  // Check explicit qualification flags from backend
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
  // We never assume a record is a qualified lead without explicit backend confirmation
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
        explanation: 'This campaign is blocked due to unresolved governance issues.',
      };

    case 'EXECUTED':
      return {
        label: 'Executed',
        action: 'read_only',
        disabled: true,
        explanation: 'This campaign has been executed. View run history for observability data.',
      };
  }
}
