/**
 * Campaign State Machine - Unit Tests
 * 
 * Tests for the deterministic campaign state mapping functions.
 */

import { describe, it, expect } from 'vitest';
import {
  mapToGovernanceState,
  getGovernanceStateLabel,
  getGovernanceStateStyle,
  deriveProvenance,
  deriveConfidence,
  isValidLeadEmail,
  isQualifiedLead,
  getPrimaryAction,
  getConfidenceLabel,
  getProvenanceLabel,
} from '../campaign-state';

describe('mapToGovernanceState', () => {
  describe('DRAFT state mapping', () => {
    it('should map DRAFT status to DRAFT governance state', () => {
      expect(mapToGovernanceState('DRAFT', [], false)).toBe('DRAFT');
    });

    it('should map DRAFT with blocking reasons to BLOCKED', () => {
      expect(mapToGovernanceState('DRAFT', ['MISSING_HUMAN_APPROVAL'], false)).toBe('BLOCKED');
    });
  });

  describe('PENDING_REVIEW state mapping', () => {
    it('should map PENDING_REVIEW to PENDING_APPROVAL', () => {
      expect(mapToGovernanceState('PENDING_REVIEW', [], false)).toBe('PENDING_APPROVAL');
    });

    it('should map PENDING_REVIEW with blocking reasons to BLOCKED', () => {
      expect(mapToGovernanceState('PENDING_REVIEW', ['KILL_SWITCH_ENABLED'], false)).toBe('BLOCKED');
    });
  });

  describe('RUNNABLE state mapping', () => {
    it('should map RUNNABLE with isRunnable=true to APPROVED_READY', () => {
      expect(mapToGovernanceState('RUNNABLE', [], true)).toBe('APPROVED_READY');
    });

    it('should map RUNNABLE with isRunnable=false to BLOCKED', () => {
      expect(mapToGovernanceState('RUNNABLE', [], false)).toBe('BLOCKED');
    });

    it('should map RUNNABLE with blocking reasons to BLOCKED', () => {
      expect(mapToGovernanceState('RUNNABLE', ['NO_LEADS_PERSISTED'], true)).toBe('BLOCKED');
    });
  });

  describe('Execution states mapping', () => {
    it('should map RUNNING to EXECUTED_READ_ONLY', () => {
      expect(mapToGovernanceState('RUNNING', [], false)).toBe('EXECUTED_READ_ONLY');
    });

    it('should map COMPLETED to EXECUTED_READ_ONLY', () => {
      expect(mapToGovernanceState('COMPLETED', [], false)).toBe('EXECUTED_READ_ONLY');
    });

    it('should map FAILED to EXECUTED_READ_ONLY', () => {
      expect(mapToGovernanceState('FAILED', [], false)).toBe('EXECUTED_READ_ONLY');
    });

    it('should map ARCHIVED to EXECUTED_READ_ONLY', () => {
      expect(mapToGovernanceState('ARCHIVED', [], false)).toBe('EXECUTED_READ_ONLY');
    });

    it('should keep COMPLETED as EXECUTED_READ_ONLY even with blocking reasons', () => {
      // Execution states should not become BLOCKED
      expect(mapToGovernanceState('COMPLETED', ['SOME_BLOCKER'], false)).toBe('EXECUTED_READ_ONLY');
    });
  });

  describe('Unknown status handling', () => {
    it('should map unknown status to BLOCKED for safety', () => {
      expect(mapToGovernanceState('UNKNOWN_STATUS', [], false)).toBe('BLOCKED');
    });
  });
});

describe('getGovernanceStateLabel', () => {
  it('should return correct label for DRAFT', () => {
    expect(getGovernanceStateLabel('DRAFT')).toBe('Draft');
  });

  it('should return correct label for PENDING_APPROVAL', () => {
    expect(getGovernanceStateLabel('PENDING_APPROVAL')).toBe('Pending Approval');
  });

  it('should return correct label for APPROVED_READY', () => {
    expect(getGovernanceStateLabel('APPROVED_READY')).toBe('Approved (Execution Observed)');
  });

  it('should return correct label for BLOCKED', () => {
    expect(getGovernanceStateLabel('BLOCKED')).toBe('Blocked');
  });

  it('should return correct label for EXECUTED_READ_ONLY', () => {
    expect(getGovernanceStateLabel('EXECUTED_READ_ONLY')).toBe('Executed (Read-Only)');
  });
});

describe('getGovernanceStateStyle', () => {
  it('should return style object with bg, text, and border properties', () => {
    const style = getGovernanceStateStyle('DRAFT');
    expect(style).toHaveProperty('bg');
    expect(style).toHaveProperty('text');
    expect(style).toHaveProperty('border');
  });

  it('should return different styles for different states', () => {
    const draftStyle = getGovernanceStateStyle('DRAFT');
    const blockedStyle = getGovernanceStateStyle('BLOCKED');
    expect(draftStyle.bg).not.toBe(blockedStyle.bg);
  });
});

describe('deriveProvenance', () => {
  it('should return CANONICAL when is_canonical is true', () => {
    expect(deriveProvenance({ is_canonical: true })).toBe('CANONICAL');
  });

  it('should return LEGACY_OBSERVED when is_canonical is false', () => {
    expect(deriveProvenance({ is_canonical: false })).toBe('LEGACY_OBSERVED');
  });

  it('should return CANONICAL when source_system contains "ods"', () => {
    expect(deriveProvenance({ source_system: 'ods-primary' })).toBe('CANONICAL');
  });

  it('should return CANONICAL when source_system contains "canonical"', () => {
    expect(deriveProvenance({ source_system: 'canonical-db' })).toBe('CANONICAL');
  });

  it('should return LEGACY_OBSERVED when observed_via is present', () => {
    expect(deriveProvenance({ observed_via: 'legacy-system' })).toBe('LEGACY_OBSERVED');
  });

  it('should default to LEGACY_OBSERVED when no indicators present', () => {
    expect(deriveProvenance({})).toBe('LEGACY_OBSERVED');
  });
});

describe('deriveConfidence', () => {
  it('should return SAFE when validation_status is validated', () => {
    expect(deriveConfidence({ validation_status: 'validated' })).toBe('SAFE');
  });

  it('should return SAFE when is_validated is true', () => {
    expect(deriveConfidence({ is_validated: true })).toBe('SAFE');
  });

  it('should return CONDITIONAL when validation_status is pending', () => {
    expect(deriveConfidence({ validation_status: 'pending' })).toBe('CONDITIONAL');
  });

  it('should return BLOCKED when validation_status is failed', () => {
    expect(deriveConfidence({ validation_status: 'failed' })).toBe('BLOCKED');
  });

  it('should return BLOCKED when is_validated is false', () => {
    expect(deriveConfidence({ is_validated: false })).toBe('BLOCKED');
  });

  it('should use explicit confidence field when present', () => {
    expect(deriveConfidence({ confidence: 'BLOCKED' })).toBe('BLOCKED');
    expect(deriveConfidence({ confidence: 'safe' })).toBe('SAFE');
  });

  it('should return CONDITIONAL when provenance is LEGACY_OBSERVED', () => {
    expect(deriveConfidence({ provenance: 'LEGACY_OBSERVED' })).toBe('CONDITIONAL');
  });

  it('should default to CONDITIONAL when uncertain', () => {
    expect(deriveConfidence({})).toBe('CONDITIONAL');
  });
});

describe('isValidLeadEmail', () => {
  it('should return false for null/undefined email', () => {
    expect(isValidLeadEmail(null)).toBe(false);
    expect(isValidLeadEmail(undefined)).toBe(false);
    expect(isValidLeadEmail('')).toBe(false);
  });

  it('should return false for filler emails', () => {
    expect(isValidLeadEmail('email_not_unlocked@domain.com')).toBe(false);
    expect(isValidLeadEmail('no_email@company.com')).toBe(false);
    expect(isValidLeadEmail('placeholder@test.com')).toBe(false);
    expect(isValidLeadEmail('unknown@domain.com')).toBe(false);
    expect(isValidLeadEmail('test@example.com')).toBe(false);
    expect(isValidLeadEmail('noreply@company.com')).toBe(false);
  });

  it('should return true for valid emails', () => {
    expect(isValidLeadEmail('john.doe@company.com')).toBe(true);
    expect(isValidLeadEmail('sales@enterprise.io')).toBe(true);
  });
});

describe('isQualifiedLead', () => {
  it('should return false for records without valid email', () => {
    expect(isQualifiedLead({ is_qualified: true })).toBe(false);
    expect(isQualifiedLead({ email: 'email_not_unlocked@domain.com', is_qualified: true })).toBe(false);
  });

  it('should return true for qualified leads with valid email', () => {
    expect(isQualifiedLead({ email: 'john@company.com', is_qualified: true })).toBe(true);
    expect(isQualifiedLead({ email: 'john@company.com', qualification_state: 'qualified' })).toBe(true);
    expect(isQualifiedLead({ email: 'john@company.com', lead_status: 'mql' })).toBe(true);
  });

  it('should return false for explicitly unqualified leads', () => {
    expect(isQualifiedLead({ email: 'john@company.com', is_qualified: false })).toBe(false);
  });

  it('should return false for records without qualification indicators', () => {
    expect(isQualifiedLead({ email: 'john@company.com' })).toBe(false);
  });
});

describe('getPrimaryAction', () => {
  describe('DRAFT state', () => {
    it('should return submit action when canSubmit is true', () => {
      const action = getPrimaryAction('DRAFT', true, false);
      expect(action.label).toBe('Submit for Approval');
      expect(action.action).toBe('submit_for_approval');
      expect(action.disabled).toBe(false);
    });

    it('should return disabled action when canSubmit is false', () => {
      const action = getPrimaryAction('DRAFT', false, false);
      expect(action.label).toBe('Not Ready to Submit');
      expect(action.disabled).toBe(true);
    });
  });

  describe('PENDING_APPROVAL state', () => {
    it('should return pending action (always disabled)', () => {
      const action = getPrimaryAction('PENDING_APPROVAL', false, false);
      expect(action.label).toBe('Pending Approval');
      expect(action.action).toBe('pending');
      expect(action.disabled).toBe(true);
    });
  });

  describe('APPROVED_READY state', () => {
    it('should return observed action (always disabled - no run button)', () => {
      const action = getPrimaryAction('APPROVED_READY', false, false);
      expect(action.label).toBe('Approved (Execution Observed)');
      expect(action.action).toBe('approved_observed');
      expect(action.disabled).toBe(true);
    });
  });

  describe('BLOCKED state', () => {
    it('should return blocked action', () => {
      const action = getPrimaryAction('BLOCKED', false, false);
      expect(action.label).toBe('Blocked');
      expect(action.action).toBe('blocked');
      expect(action.disabled).toBe(true);
    });
  });

  describe('EXECUTED_READ_ONLY state', () => {
    it('should return read-only action', () => {
      const action = getPrimaryAction('EXECUTED_READ_ONLY', false, false);
      expect(action.label).toBe('Executed (Read-Only)');
      expect(action.action).toBe('read_only');
      expect(action.disabled).toBe(true);
    });
  });
});

describe('Label functions', () => {
  it('getConfidenceLabel should return correct labels', () => {
    expect(getConfidenceLabel('SAFE')).toBe('Safe');
    expect(getConfidenceLabel('CONDITIONAL')).toBe('Conditional');
    expect(getConfidenceLabel('BLOCKED')).toBe('Blocked');
  });

  it('getProvenanceLabel should return correct labels', () => {
    expect(getProvenanceLabel('CANONICAL')).toBe('Canonical');
    expect(getProvenanceLabel('LEGACY_OBSERVED')).toBe('Legacy (Observed)');
  });
});
