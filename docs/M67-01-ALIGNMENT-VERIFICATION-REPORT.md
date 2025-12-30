# M67-01 Alignment Verification Report

> **Document:** Alignment Verification Report  
> **Target:** `docs/SALES_ENGINE_UI_ARCHITECTURE_CONTRACT.md` v1.0  
> **Authoritative Source:** `nsd-sales-engine: UI-Facing Contract Extract` (2024-12-30)  
> **Verification Date:** 2024-12-30  
> **Status:** ❌ **FAIL — CRITICAL MISMATCHES DETECTED**

---

## 1. Alignment Summary

| Verdict | Status |
|---------|--------|
| **Overall Alignment** | ❌ **FAIL** |
| **Critical Issues** | 4 |
| **High Issues** | 3 |
| **Medium Issues** | 2 |

### Summary Statement

The drafted `SALES_ENGINE_UI_ARCHITECTURE_CONTRACT.md` contains **critical mismatches** with the authoritative M60 UI-Facing Contract Extract. The contract was drafted with **speculative assumptions** about a "quotes" domain that **do not exist** in the actual M60 API surface.

**The contract MUST be revised before M67-01 can be approved.**

---

## 2. Confirmed Matches (What Aligns)

Despite the API surface mismatches, the following architectural principles are correctly stated:

### 2.1 Authority Boundaries ✅ ALIGNED

| Assertion in Contract | M60 Extract Evidence | Status |
|-----------------------|----------------------|--------|
| UI has zero execution authority | M60 §3: "No Execution Triggers — UI cannot start/stop/trigger campaign runs" | ✅ CORRECT |
| UI has zero approval authority | M60 §2.5: Approval happens via governed `/approve` endpoint only | ✅ CORRECT |
| UI has zero lifecycle authority | M60 §2.5: Status transitions via `/submit` and `/approve` only | ✅ CORRECT |
| All execution decisions remain server-side | M60 §1.3: "NO EXECUTE ENDPOINTS EXIST IN M60 API" | ✅ CORRECT |
| Platform Shell enforces access, not behavior | M60 §3: "Business rules live server-side only" | ✅ CORRECT |

### 2.2 Forbidden Patterns ✅ ALIGNED

| Contract Prohibition | M60 Extract Confirmation | Status |
|----------------------|--------------------------|--------|
| No Direct ODS Access | M60 §3: "No Direct Database Logic — All DB access through storage layer" | ✅ ALIGNED |
| No Orchestration Logic | M60 §3: "No Orchestration — UI does not coordinate multi-step processes" | ✅ ALIGNED |
| No Policy Duplication | M60 §3: "No Policy Duplication — Business rules live server-side only" | ✅ ALIGNED |
| No Bypassing Gates | M60 §3: "No Bypassing Gates — Cannot circumvent approval/readiness/throughput" | ✅ ALIGNED |
| No AI Logic | M60 §3: "No AI — No AI/ML logic in API layer" | ✅ ALIGNED |

### 2.3 Safety Gate Principles ✅ ALIGNED (Structurally)

| Contract Claim | M60 Extract Evidence | Status |
|----------------|----------------------|--------|
| Kill switch enforcement | M60 §2.1: `killSwitchEnabled: boolean` blocks runs | ✅ ALIGNED |
| Human approval required | M60 §2.2: `approvals.humanApproved === true` required | ✅ ALIGNED |
| Readiness ≠ Execution | M60 §2.3: "Passing Readiness ≠ Execution; outbound requires separate action" | ✅ ALIGNED |

### 2.4 Environment & Auth Model ✅ ALIGNED

| Contract Claim | M60 Extract Evidence | Status |
|----------------|----------------------|--------|
| Auth handled at platform layer | M60 §5: "No explicit auth middleware visible; assumed handled at platform layer" | ✅ ALIGNED |
| Legacy endpoints blocked | M60 §5: "Legacy API Surface... should be blocked at platform shell level" | ✅ ALIGNED |

---

## 3. Mismatches (Critical Failures)

### 3.1 CRITICAL: Wrong API Namespace ❌

| Aspect | Contract States | M60 Extract States | Severity |
|--------|-----------------|-------------------|----------|
| **API Namespace** | `/api/sales-engine/quotes/*` | `/api/v1/campaigns/*` | 🔴 CRITICAL |
| **Domain Entity** | "quotes" | "campaigns" | 🔴 CRITICAL |

**Impact:** Every endpoint listed in Section 5 of the contract is WRONG.

**Evidence from M60 Extract:**
> "The governed UI-facing API is registered via registerCampaignManagementApi() in server/api/campaignManagementApi.ts. All routes are versioned under /api/v1/campaigns."

**Required Fix:** Complete rewrite of Section 5 with correct namespace and entity.

---

### 3.2 CRITICAL: Wrong Read APIs ❌

| Contract Lists | M60 Extract Provides |
|----------------|----------------------|
| `GET /api/sales-engine/quotes` | `GET /api/v1/campaigns` |
| `GET /api/sales-engine/quotes/:id` | `GET /api/v1/campaigns/:id` |
| `GET /api/sales-engine/quotes/:id/status` | ❌ **DOES NOT EXIST** |
| `GET /api/sales-engine/quotes/:id/history` | ❌ **DOES NOT EXIST** |
| `GET /api/sales-engine/config/options` | ❌ **DOES NOT EXIST** |
| *(missing)* | `GET /api/v1/campaigns/:id/metrics` |
| *(missing)* | `GET /api/v1/campaigns/:id/metrics/history` |
| *(missing)* | `GET /api/v1/campaigns/:id/runs` |
| *(missing)* | `GET /api/v1/campaigns/:id/runs/latest` |
| *(missing)* | `GET /api/v1/campaigns/:id/variants` |
| *(missing)* | `GET /api/v1/campaigns/:id/throughput` |

**Correct M60 Read APIs (8 endpoints):**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/campaigns` | List all campaigns, optional `?status=` filter |
| GET | `/api/v1/campaigns/:id` | Campaign details with governance metadata |
| GET | `/api/v1/campaigns/:id/metrics` | Latest campaign metrics snapshot (M56) |
| GET | `/api/v1/campaigns/:id/metrics/history` | Historical metrics snapshots |
| GET | `/api/v1/campaigns/:id/runs` | Campaign run summaries (M59) |
| GET | `/api/v1/campaigns/:id/runs/latest` | Most recent run summary |
| GET | `/api/v1/campaigns/:id/variants` | Personalization variants (M57) |
| GET | `/api/v1/campaigns/:id/throughput` | Active throughput configuration (M58) |

**Required Fix:** Replace Section 5.2 entirely with correct M60 Read APIs.

---

### 3.3 CRITICAL: Wrong Write APIs ❌

| Contract Lists | M60 Extract Provides |
|----------------|----------------------|
| `POST /api/sales-engine/quotes` | `POST /api/v1/campaigns` |
| `PATCH /api/sales-engine/quotes/:id` | `PATCH /api/v1/campaigns/:id` |
| `POST /api/sales-engine/quotes/:id/items` | ❌ **DOES NOT EXIST** |
| `PATCH /api/sales-engine/quotes/:id/items/:itemId` | ❌ **DOES NOT EXIST** |
| `DELETE /api/sales-engine/quotes/:id/items/:itemId` | ❌ **DOES NOT EXIST** |
| *(missing — in Write, not Execute)* | `POST /api/v1/campaigns/:id/submit` |
| *(missing — in Write, not Execute)* | `POST /api/v1/campaigns/:id/approve` |

**Correct M60 Write APIs (4 endpoints):**

| Method | Path | Purpose | Constraints |
|--------|------|---------|-------------|
| POST | `/api/v1/campaigns` | Create new campaign | Always DRAFT status |
| PATCH | `/api/v1/campaigns/:id` | Update campaign config | DRAFT only; no status change |
| POST | `/api/v1/campaigns/:id/submit` | Submit for review | Requires `submittedBy`; DRAFT → PENDING_REVIEW |
| POST | `/api/v1/campaigns/:id/approve` | Approve campaign | Requires `approvedBy`; PENDING_REVIEW → RUNNABLE |

**Classification Note:** M60 classifies `/submit` and `/approve` as **WRITE Operations** (state transitions), NOT Execute APIs. This is correct because they are lifecycle transitions, not execution triggers.

**Required Fix:** Replace Section 5.3 entirely with correct M60 Write APIs.

---

### 3.4 CRITICAL: Execute APIs Are FORBIDDEN ❌

| Contract Lists | M60 Extract States |
|----------------|-------------------|
| `POST /api/sales-engine/quotes/:id/submit` | ⚠️ This is a WRITE, not Execute |
| `POST /api/sales-engine/quotes/:id/approve` | ⚠️ This is a WRITE, not Execute |
| `POST /api/sales-engine/quotes/:id/execute` | 🔴 **EXPLICITLY FORBIDDEN — Returns 404** |
| `POST /api/sales-engine/quotes/:id/cancel` | ❌ **DOES NOT EXIST** |

**M60 Extract Explicitly States:**

> "⚠️ NO EXECUTE ENDPOINTS EXIST IN M60 API"
>
> "The M60 API explicitly does NOT expose any execution triggers."

**Prohibited Execute Patterns (verified by test coverage):**

| Pattern | Status |
|---------|--------|
| `POST /api/v1/campaigns/:id/execute` | Returns 404 |
| `POST /api/v1/campaigns/:id/run` | Returns 404 |
| `POST /api/v1/campaigns/:id/trigger` | Returns 404 |
| `POST /api/v1/campaigns/:id/schedule` | Returns 404 |
| `PATCH /api/v1/campaigns/:id/runs/:runId` | Returns 404 |
| `DELETE /api/v1/campaigns/:id/runs/:runId` | Returns 404 |

**This is the most critical mismatch.** The contract implies the UI can call `/execute`, but M60 **explicitly prohibits** any execution endpoints. This would create a false expectation that execution is possible via UI.

**Required Fix:** 
1. Remove Section 5.4 "Execute APIs" entirely
2. Add explicit prohibition: "NO EXECUTE ENDPOINTS EXIST"
3. Clarify that `/submit` and `/approve` are WRITE operations (lifecycle transitions), not execution triggers
4. Add M60's prohibited patterns list to Section 6

---

### 3.5 HIGH: Governance Metadata Not Documented ⚠️

M60 Extract specifies that `GET /api/v1/campaigns/:id` returns governance metadata:

> "Get campaign details with governance metadata (canEdit, canSubmit, canApprove, isRunnable)"

The contract does not specify that UI must render these governance flags. This is important for UI to correctly enable/disable affordances.

**Required Fix:** Add governance metadata response shape to contract.

---

### 3.6 HIGH: Lifecycle States Incorrect ⚠️

| Contract Implies | M60 Extract States |
|------------------|-------------------|
| `DRAFT` → `APPROVED` | `DRAFT` → `PENDING_REVIEW` → `APPROVED/RUNNABLE` |
| Direct approval | Two-step: submit then approve |

**M60 Lifecycle (from §2.5):**

| Status | Mutability | Governance |
|--------|------------|------------|
| `DRAFT` | Fully editable | canEdit: true, canSubmit: true |
| `PENDING_REVIEW` | Immutable config | canEdit: false, canApprove: true |
| `APPROVED` / `RUNNABLE` | Immutable | Triggers blocked |
| `ARCHIVED` | Immutable | Preserved for learning |

**Required Fix:** Document correct lifecycle states in contract.

---

### 3.7 HIGH: M65/M66 Readiness Conditions Not Fully Documented ⚠️

M60 Extract §2.2 specifies ALL readiness conditions:

| Rule | Condition | Block Reason |
|------|-----------|--------------|
| Human Approval | `approvals.humanApproved === true` | `MISSING_HUMAN_APPROVAL` |
| Zero Persistence Errors | `persistenceSummary.persistenceErrors === 0` | `PERSISTENCE_ERRORS` |
| Leads Persisted | `persistenceSummary.leadsPersisted > 0` | `NO_LEADS_PERSISTED` |
| Kill Switch OFF | `safetyChecks.killSwitchEnabled === false` | `KILL_SWITCH_ENABLED` |
| Smartlead Configured | `safetyChecks.smartleadConfigured === true` | `SMARTLEAD_NOT_CONFIGURED` |
| Credit Balance OK | `safetyChecks.creditBalanceSufficient === true` | `INSUFFICIENT_CREDITS` |

The contract mentions kill switch and approval but omits other blocking reasons.

**Required Fix:** Document all M65 blocking reasons that UI may need to display.

---

### 3.8 MEDIUM: Throughput Validation Not Mentioned ⚠️

M60 Extract §2.4 documents throughput validation with specific block reasons:
- `DAILY_LIMIT_EXCEEDED`
- `HOURLY_LIMIT_EXCEEDED`
- `MAILBOX_LIMIT_EXCEEDED`
- `CONFIG_INACTIVE`
- `NO_CONFIG_FOUND`

The contract does not mention throughput constraints.

**Required Fix:** Add throughput visibility endpoint and potential error responses.

---

### 3.9 MEDIUM: Legacy Endpoint Blocking Not Explicit ⚠️

M60 Extract §5 notes:
> "Legacy API Surface: /api/campaigns/* (non-versioned) endpoints exist in routes.ts but are NOT part of M60 governed access; these should be blocked at platform shell level"

The contract should explicitly list legacy patterns to block.

**Required Fix:** Add legacy endpoint patterns to forbidden patterns list.

---

## 4. Speculation / Assumptions Detected

### 4.1 Fabricated API Surface 🔴 CRITICAL

The entire Section 5 of the contract appears to be **speculative/fabricated**:

| Speculated | Reality |
|------------|---------|
| "quotes" domain | "campaigns" domain |
| `/api/sales-engine/*` namespace | `/api/v1/*` namespace |
| Item sub-resources | Do not exist |
| Execute endpoints | Explicitly forbidden |
| Cancel endpoint | Does not exist |

**Assessment:** Section 5 must be completely rewritten based on M60 extract.

---

### 4.2 Response Schema Assumptions ⚠️

The contract includes example response schemas:

```json
{
  "error": {
    "code": "APPROVAL_REQUIRED",
    "approver_roles": ["sales_manager", "sales_director"]
  }
}
```

M60 Extract does not specify this exact schema. The actual governance metadata includes:
- `canEdit`, `canSubmit`, `canApprove`, `isRunnable`

**Assessment:** Response schemas should be based on M60 extract, not assumed.

---

### 4.3 No Unauthorized Future APIs ✅

The contract does not assume APIs beyond its (incorrect) M60 interpretation. The architectural posture of "only M60 APIs" is correct, even though the specific APIs listed are wrong.

---

## 5. Required Changes Before Approval

### 5.1 BLOCKING — Must Fix Before Approval

| ID | Change Required | Section | Severity |
|----|-----------------|---------|----------|
| **FIX-001** | Change API namespace from `/api/sales-engine/quotes` to `/api/v1/campaigns` | 5.x | 🔴 CRITICAL |
| **FIX-002** | Replace Section 5.2 Read APIs with correct 8 M60 endpoints | 5.2 | 🔴 CRITICAL |
| **FIX-003** | Replace Section 5.3 Write APIs with correct 4 M60 endpoints | 5.3 | 🔴 CRITICAL |
| **FIX-004** | Remove Section 5.4 Execute APIs — NO EXECUTE ENDPOINTS EXIST | 5.4 | 🔴 CRITICAL |
| **FIX-005** | Add explicit prohibition of execute patterns from M60 §1.3 | 6.x | 🔴 CRITICAL |
| **FIX-006** | Clarify `/submit` and `/approve` are WRITE operations (lifecycle), not execution | 5.3 | 🔴 CRITICAL |
| **FIX-007** | Document correct lifecycle states (DRAFT → PENDING_REVIEW → RUNNABLE) | 5.3 | 🟠 HIGH |
| **FIX-008** | Document governance metadata response (canEdit, canSubmit, canApprove, isRunnable) | 5.2 | 🟠 HIGH |
| **FIX-009** | Document all M65 blocking reasons from M60 §2.2 | 8.x | 🟠 HIGH |

### 5.2 Recommended Improvements

| ID | Improvement | Section | Priority |
|----|-------------|---------|----------|
| REC-001 | Add throughput visibility endpoint and error codes | 5.2, 8.x | 🟡 MEDIUM |
| REC-002 | Add legacy endpoint patterns to forbidden list | 6.x | 🟡 MEDIUM |
| REC-003 | Add M58 throughput, M57 variants, M56 metrics terminology | 5.2 | 🟢 LOW |
| REC-004 | Reference actual source files from M60 extract | 11.x | 🟢 LOW |

---

## 6. Approval Recommendation

### Verdict: ❌ **BLOCK — DO NOT APPROVE**

| Option | Conditions | Recommendation |
|--------|------------|----------------|
| **APPROVE** | — | ❌ NOT POSSIBLE — Critical mismatches |
| **APPROVE WITH CONDITIONS** | — | ❌ NOT POSSIBLE — Errors too severe |
| **BLOCK** | Contract must be revised | ✅ **REQUIRED** |

### Rationale

The contract's API surface (Section 5) is **entirely incorrect**. It describes a "quotes" API that does not exist. More critically, it implies execution endpoints exist when M60 **explicitly prohibits** them. This could lead to:

1. **Implementation Failure** — Replit cannot implement against non-existent endpoints
2. **Security Expectations Violation** — Contract implies `/execute` is gated; M60 says it's forbidden
3. **Architectural Confusion** — Wrong domain entity (quotes vs campaigns)
4. **Lifecycle Misunderstanding** — Wrong state machine

### Required Actions

1. **REVISE CONTRACT** — Fix all items in Section 5.1 (BLOCKING)
2. **RE-SUBMIT** — New version for re-verification
3. **RE-VERIFY** — This report must be re-run against revised contract
4. **THEN APPROVE** — Only after PASS status

---

## 7. Correct API Surface (For Reference)

The following is the correct M60 API surface that should replace Section 5:

### 7.1 Read APIs (8 endpoints)

| Method | Path | Purpose | Source |
|--------|------|---------|--------|
| GET | `/api/v1/campaigns` | List campaigns, optional `?status=` filter | M60 §1.1 |
| GET | `/api/v1/campaigns/:id` | Campaign details with governance metadata | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/metrics` | Latest metrics snapshot (M56) | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/metrics/history` | Historical metrics | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/runs` | Run summaries (M59) | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/runs/latest` | Most recent run | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/variants` | Personalization variants (M57) | M60 §1.1 |
| GET | `/api/v1/campaigns/:id/throughput` | Throughput config (M58) | M60 §1.1 |

### 7.2 Write APIs (4 endpoints)

| Method | Path | Purpose | Constraints |
|--------|------|---------|-------------|
| POST | `/api/v1/campaigns` | Create campaign | Always DRAFT |
| PATCH | `/api/v1/campaigns/:id` | Update config | DRAFT only |
| POST | `/api/v1/campaigns/:id/submit` | Submit for review | DRAFT → PENDING_REVIEW |
| POST | `/api/v1/campaigns/:id/approve` | Approve campaign | PENDING_REVIEW → RUNNABLE |

### 7.3 Execute APIs

**⚠️ NO EXECUTE ENDPOINTS EXIST IN M60 API**

The following patterns are **explicitly forbidden** and return 404:

| Forbidden Pattern |
|-------------------|
| `POST /api/v1/campaigns/:id/execute` |
| `POST /api/v1/campaigns/:id/run` |
| `POST /api/v1/campaigns/:id/trigger` |
| `POST /api/v1/campaigns/:id/schedule` |
| `PATCH /api/v1/campaigns/:id/runs/:runId` |
| `DELETE /api/v1/campaigns/:id/runs/:runId` |

---

## 8. Verification Checklist

### Completed Checks

| Check | Result | Evidence |
|-------|--------|----------|
| Authority Boundaries | ✅ PASS | Contract correctly states UI has no execution authority |
| Forbidden Patterns (principles) | ✅ PASS | Aligned with M60 §3 non-goals |
| Environment Model | ✅ PASS | Auth at platform layer acknowledged |
| Kill Switch Concept | ✅ PASS | Contract mentions kill switch correctly |

### Failed Checks

| Check | Result | Evidence |
|-------|--------|----------|
| API Namespace | ❌ FAIL | Wrong namespace (`/api/sales-engine/` vs `/api/v1/`) |
| Read API Endpoints | ❌ FAIL | 5 wrong endpoints vs 8 correct ones |
| Write API Endpoints | ❌ FAIL | 5 wrong endpoints vs 4 correct ones |
| Execute API Endpoints | ❌ FAIL | 4 listed vs 0 allowed (all forbidden) |
| Lifecycle States | ❌ FAIL | Missing PENDING_REVIEW state |
| Governance Metadata | ❌ FAIL | Not documented |
| M65 Blocking Reasons | ❌ FAIL | Incomplete list |

---

## 9. Document Control

| Attribute | Value |
|-----------|-------|
| **Report ID** | M67-01-ALIGN-002 |
| **Report Version** | 2.0 |
| **Target Document** | `docs/SALES_ENGINE_UI_ARCHITECTURE_CONTRACT.md` v1.0 |
| **Source Document** | `nsd-sales-engine: UI-Facing Contract Extract` (2024-12-30) |
| **Verification Status** | ❌ FAIL |
| **Auditor** | Architecture Auditor |
| **Date** | 2024-12-30 |

---

## 10. Next Steps

| Step | Owner | Timeline |
|------|-------|----------|
| 1. Revise contract with FIX-001 through FIX-009 | Architecture Author | Immediate |
| 2. Re-submit revised contract for verification | Architecture Author | After revision |
| 3. Re-run this alignment verification | Architecture Auditor | Upon re-submission |
| 4. Issue PASS or FAIL on revised contract | Architecture Auditor | Same day |
| 5. Collect approval signatures (if PASS) | Platform Owner | After PASS |
| 6. Hand off to Replit for M67-02 | Platform Owner | After signatures |

---

**END OF REPORT**

*This report identifies critical mismatches between the drafted contract and the authoritative M60 extract. The contract must be revised before approval.*
