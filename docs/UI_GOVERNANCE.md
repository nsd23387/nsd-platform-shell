# UI Governance Architecture

This document describes the governance-first architecture principles enforced in the Sales Engine UI.

## Core Principles

### 1. Read-Only UI Façade

The Sales Engine UI is a **read-only observation layer**. It does not initiate, control, or mutate any backend state.

- **Allowed HTTP methods:** GET, HEAD, OPTIONS only
- **Forbidden HTTP methods:** POST, PUT, PATCH, DELETE to canonical entities
- **Enforcement:** Runtime guard (`read-only-guard.ts`) + ESLint rules

### 2. Governance-First, Not Execution-First

The UI displays governance and approval stages, not execution controls. There are no "Run", "Start", or "Execute" buttons.

- Campaigns follow a governance state machine: `DRAFT` → `PENDING_APPROVAL` → `APPROVED_READY` → `EXECUTED_READ_ONLY`
- Execution is observed, not initiated
- The `BLOCKED` state indicates governance or readiness issues

### 3. Canonical ODS as Source of Truth

All displayed data originates from backend systems. The UI does not generate, infer, or compute authoritative values.

---

## Readiness vs Governance State

**These are orthogonal concepts.** This is a critical architectural distinction.

### Governance State

Governance state reflects the **approval workflow stage** of a campaign:

| State | Meaning |
|-------|---------|
| `DRAFT` | Campaign is being authored |
| `PENDING_APPROVAL` | Submitted for governance review |
| `APPROVED_READY` | Approved by governance team |
| `BLOCKED` | Cannot proceed due to issues |
| `EXECUTED_READ_ONLY` | Has been executed, now observability only |

**Mapped from:** Backend `status` field via `mapToGovernanceState()`

### Readiness Level

Readiness level reflects the **system's capability to execute** a campaign:

| Level | Meaning |
|-------|---------|
| `READY` | All readiness checks passed |
| `NOT_READY` | One or more blocking reasons present |
| `UNKNOWN` | Readiness validation not performed or incomplete |

**Computed from:** Backend readiness payload via `computeReadinessLevel()`

### Key Distinction

A campaign can be:
- `APPROVED_READY` governance state but `UNKNOWN` readiness (not yet validated)
- `APPROVED_READY` governance state but `NOT_READY` (mailbox unhealthy, deliverability low)
- `PENDING_APPROVAL` governance state but `READY` readiness (technically capable, awaiting approval)

**The UI never infers readiness from governance state.**

### Implementation

```typescript
// CORRECT: Compute readiness from backend payload only
const readinessLevel = computeReadinessLevel(campaign.readiness);

// INCORRECT: Do NOT do this
const readinessLevel = governanceState === 'APPROVED_READY' ? 'READY' : 'NOT_READY';
```

---

## Why UNKNOWN is a Valid State

**UNKNOWN is intentional and correct** when:

1. Backend has not performed readiness validation
2. Readiness payload is missing or incomplete
3. Required fields (e.g., `mailbox_healthy`) are undefined

### UI Behavior for UNKNOWN

When readiness is UNKNOWN:
- Display "Unknown (Not Validated)" labels
- Show explanation: "Readiness validation has not been performed"
- Do NOT default to READY or infer readiness from other data

### Why This Matters

- **Truth over completeness:** Showing "Unknown" is more accurate than guessing "Ready"
- **No false confidence:** Users see the actual system state
- **Backend responsibility:** The backend owns readiness validation, not the UI

---

## Confidence Classification

Metrics display a confidence classification:

| Confidence | Meaning |
|------------|---------|
| `SAFE` | Backend explicitly validated this metric |
| `CONDITIONAL` | Uncertain or legacy data source |
| `BLOCKED` | Validation failed, metric is unreliable |

### Rules

1. **Never show SAFE without explicit backend validation metadata**
2. If `metrics.confidence` or `metrics.validation_status` is present, use it
3. If absent, default to `CONDITIONAL` (not SAFE)
4. Display "Observed (Unclassified)" notice when metadata is missing

### Implementation

```typescript
// deriveConfidence returns CONDITIONAL if no explicit validation metadata
const confidence = deriveConfidence({
  confidence: metrics.confidence,           // explicit field
  validation_status: metrics.validation_status, // explicit field
  provenance: metrics.provenance,
});
```

---

## Provenance Derivation

Provenance indicates data source trustworthiness:

| Provenance | Meaning |
|------------|---------|
| `CANONICAL` | From authoritative ODS source |
| `LEGACY_OBSERVED` | From legacy or unverified source |

### Precedence Order (Critical)

1. **`record.provenance`** - Explicit backend field (ABSOLUTE precedence)
2. **`record.is_canonical`** - Boolean flag
3. **`record.source_system`** - Trusted allowlist (fallback heuristic)
4. **Default** - `LEGACY_OBSERVED` (safest assumption)

### Rules

- **Explicit provenance is never overridden by heuristics**
- If backend provides `provenance: 'CANONICAL'`, trust it unconditionally
- Heuristics are fallback only, documented as such in code

### Implementation

```typescript
// CORRECT: Explicit provenance honored first
deriveProvenance({ provenance: 'CANONICAL', is_canonical: false }) // Returns 'CANONICAL'

// Fallback heuristics only when explicit field is absent
deriveProvenance({ source_system: 'ods-primary' }) // Returns 'CANONICAL'
deriveProvenance({}) // Returns 'LEGACY_OBSERVED' (default)
```

---

## Lead Model Integrity

### Qualified Leads vs Contacts Observed

| View | Description | Email Filtering |
|------|-------------|-----------------|
| Qualified Leads | Only lead-ready/qualified records | Required: valid, non-filler email |
| Contacts Observed | All observed contact records | No filtering - shows all records |

### Rules

- `isValidLeadEmail()` - Use ONLY for Qualified Leads view
- `isQualifiedLead()` - Verifies email validity AND qualification state
- Contacts Observed shows records even without valid emails

### Why This Matters

- "Contact with email" ≠ Lead
- Lead counts must be accurate (only truly qualified leads)
- Contact observability must be complete (all data visible)

---

## API Guard

The `read-only-guard.ts` module enforces read-only constraints:

```typescript
// Throws ReadOnlyViolationError for forbidden methods
assertReadOnly('POST', '/api/campaigns'); // Throws

// createReadOnlyFetch wraps fetch with guard
const safeFetch = createReadOnlyFetch(fetch);
await safeFetch('/api/campaigns', { method: 'POST' }); // Throws
```

### Behavior

- Logs violations to console with timestamp
- Throws `ReadOnlyViolationError` for POST/PUT/PATCH/DELETE
- Allows GET/HEAD/OPTIONS

---

## Testing Requirements

All governance logic has unit tests:

- `campaign-state.test.ts` - 66+ tests for state mapping, provenance, confidence
- `read-only-guard.test.ts` - 30+ tests for API guard

### Key Test Cases

1. Provenance precedence (explicit field overrides heuristics)
2. Readiness computed from backend, NOT governance state
3. UNKNOWN returned when data is missing
4. No SAFE confidence without explicit validation

---

## Summary

| Principle | Implementation |
|-----------|---------------|
| Read-only UI | API guard, ESLint rules |
| Governance-first | State machine, no execution buttons |
| Readiness ≠ Governance | `computeReadinessLevel()` independent of state |
| UNKNOWN is valid | Show "Unknown" when data missing |
| No inferred confidence | `deriveConfidence()` defaults to CONDITIONAL |
| Provenance precedence | Explicit field > heuristics |
| Lead model integrity | Qualified Leads ≠ Contacts Observed |
