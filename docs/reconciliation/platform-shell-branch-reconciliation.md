# Platform Shell Branch Reconciliation Report

> **Date:** 2024  
> **Objective:** Reconcile UI branches against finalized M60 API contract  
> **Status:** COMPLETE

---

## Executive Summary

This report analyzes all branches in the platform-shell repository against the M60 API contract
requirements. The analysis identifies branches that violate governance constraints and provides
a merge/cleanup plan aligned with the read-only metrics façade architecture.

### Key Findings

| Finding | Count | Action Required |
|---------|-------|-----------------|
| FINAL (aligned) | 5 branches | Preserve, clean up merged |
| SUPERSEDED | 4 branches | Delete after verification |
| EXPERIMENTAL | 3 branches | Review before merge |
| VIOLATES M60 | 1 branch | Block merge, remediate |

---

## M60 API Contract Constraints

The M60 API contract establishes these non-negotiable boundaries for the Platform Shell:

### ✅ PERMITTED

| Capability | Implementation |
|------------|----------------|
| Read-only metrics display | GET requests to Activity Spine |
| Summary dashboards | Aggregate data visualization |
| Bootstrap-driven RBAC | Permissions from `/api/v1/me` |
| Thin API façade | SDK wrapper, no business logic |

### ❌ PROHIBITED

| Violation | Rationale |
|-----------|-----------|
| Backend logic | Shell is observational only |
| Policy duplication | Permissions come from bootstrap |
| Execution assumptions | No lifecycle state transitions |
| Hardcoded business rules | No role hierarchies, no SLA calculations |
| Mutation endpoints | No POST/PUT/DELETE for business entities |

---

## Branch Inventory

### 1. FINAL — Aligned with M60

| Branch | Status | Commits Ahead | Notes |
|--------|--------|---------------|-------|
| `main` | ✅ FINAL | 0 | Canonical baseline |
| `cursor/platform-shell-api-alignment-1f14` | ✅ FINAL | 0 (same as main) | Current working branch |
| `cursor/branch-analysis-and-classification-2473` | ✅ MERGED | 0 | Fully merged into main |
| `cursor/activity-spine-dashboards-integration-1c4c` | ✅ MERGED | 0 | Fully merged into main |
| `docs/platform-shell-governance-baseline` | ✅ MERGED | 0 | Fully merged into main |
| `feat/m12-design-system` | ✅ MERGED | 0 | Fully merged into main |

**Verification:** These branches contain only:
- Read-only Activity Spine SDK calls
- Bootstrap-driven permission checks
- M12 design tokens
- Locked UX specifications (M13, M14, M16)

---

### 2. SUPERSEDED — Safe to Delete

| Branch | Reason | Action |
|--------|--------|--------|
| `cursor/activity-spine-dashboards-integration-1c4c` | All commits in main | DELETE |
| `cursor/branch-analysis-and-classification-2473` | All commits in main | DELETE |
| `docs/platform-shell-governance-baseline` | All commits in main | DELETE |
| `feat/m12-design-system` | All commits in main | DELETE |

**Verification Command:**
```bash
git log origin/main..origin/<branch> --oneline
# Should return empty (0 commits ahead)
```

---

### 3. EXPERIMENTAL — Requires Review

#### 3.1 `cursor/custom-quote-ux-specification-3d52`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 2 |
| **Content** | Quote UX documentation, OMS visibility contract |
| **Violations Found** | None — documentation only |
| **Classification** | EXPERIMENTAL |
| **Recommendation** | Merge after M28 contract finalization |

**Unique Commits:**
- `b28f1e7` feat: Add quote to OMS visibility contract documentation
- `1125ae2` docs: Add custom quote UX specification

---

#### 3.2 `cursor/media-catalog-ux-specification-96ad`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 1 |
| **Content** | Media catalog UX specification |
| **Violations Found** | None — documentation only |
| **Classification** | EXPERIMENTAL |
| **Recommendation** | Merge after M16 contract review |

**Unique Commits:**
- `5dd5dcb` feat: Add Media Catalog UX specification document

---

#### 3.3 `cursor/design-system-extraction-and-normalization-d6f4`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 1 |
| **Content** | Design token refactoring |
| **Violations Found** | None — styling only |
| **Classification** | EXPERIMENTAL |
| **Recommendation** | Merge after visual regression testing |

**Unique Commits:**
- `5c7064c` Refactor: Integrate design system tokens

---

#### 3.4 `cursor/social-content-governance-rules-7335`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 6 |
| **Content** | Social content governance documentation, AI guardrails |
| **Violations Found** | None — documentation only, read-only compliant |
| **Classification** | EXPERIMENTAL |
| **Recommendation** | Merge after M17 governance approval |

**Unique Commits:**
- `141ab65` Add UX documentation for Sales Dashboard and Touchpoint Inventory
- `1665787` feat: Add UX specification for social planning and approval
- `d80bdac` feat: Add social AI guardrails document
- `3185e41` feat: Add social activity taxonomy documentation
- `6c9aa0b` Update social content governance to approved status
- `645e02c` feat: Add social content governance policy

---

### 4. VIOLATES M60 — Block Merge

#### 4.1 `cursor/data-governance-documentation-artifacts-33c6`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 4 |
| **Classification** | ⛔ VIOLATES M60 |
| **Recommendation** | DO NOT MERGE — remediation required |

**Unique Commits:**
- `cccac69` feat: Add OMS RBAC and UI design specifications
- `20b733e` feat: Implement OMS functionality and UI components
- `04fdc7c` feat: Add Overview dashboard and related metrics
- `34da6b5` feat: Add data documentation and executive dashboard spec

**Violations Identified:**

| Violation | File | Description |
|-----------|------|-------------|
| Lifecycle mutations | `app/dashboard/oms/page.tsx` | Contains 5 OMS actions that mutate state |
| Execution triggers | `types/oms.ts` | Defines `advance_lifecycle_stage` action |
| Business rules | `types/oms.ts` | Hardcoded action configurations |
| Policy duplication | `hooks/useOMSActions.ts` | Contains mutation hooks |

**Evidence — OMS Mutation Types (PROHIBITED):**
```typescript
export type OMSActionType =
  | 'assign_owner'
  | 'acknowledge_review'
  | 'advance_lifecycle_stage'  // ❌ Lifecycle assumption
  | 'flag_exception'
  | 'mark_ready_for_handoff';
```

**Conflict with Locked Specification:**

The M14 OMS UX Specification explicitly states:
> "The OMS is a **read-only observational interface**"  
> "Mutations belong to backend workflows"  
> "No action buttons (Save, Submit, Approve, Reject, Cancel)"

The data-governance branch violates these locked constraints.

---

#### 4.2 `cursor/platform-shell-scaffolding-718d`

| Attribute | Value |
|-----------|-------|
| **Commits Ahead** | 2 |
| **Classification** | ⛔ VIOLATES M60 |
| **Recommendation** | DO NOT MERGE — superseded by main |

**Violations Identified:**

| Violation | File | Description |
|-----------|------|-------------|
| Hardcoded role hierarchy | `config/roles.ts` | Contains `level` property for role comparison |
| Policy duplication | `config/roles.ts` | Hardcodes role-to-permission mappings |
| Auth state management | `lib/auth.ts` | Uses Zustand for local auth state |

**Evidence — Hardcoded Role Hierarchy (PROHIBITED):**
```typescript
export const ROLES: RoleConfig[] = [
  { role_id: 'admin', level: 100 },        // ❌ Hardcoded hierarchy
  { role_id: 'sales_manager', level: 80 }, // ❌ Policy duplication
  { role_id: 'operations', level: 70 },    // ❌ Business rules in UI
  // ...
];
```

**Note:** This branch contains an entirely separate codebase in `nsd-platform-shell/` subdirectory,
which has been superseded by the current architecture in main.

---

## Merge & Cleanup Plan

### Phase 1: Immediate Cleanup

| Action | Branch | Command | Risk |
|--------|--------|---------|------|
| Delete | `cursor/activity-spine-dashboards-integration-1c4c` | `git push origin --delete cursor/activity-spine-dashboards-integration-1c4c` | None |
| Delete | `cursor/branch-analysis-and-classification-2473` | `git push origin --delete cursor/branch-analysis-and-classification-2473` | None |
| Delete | `docs/platform-shell-governance-baseline` | `git push origin --delete docs/platform-shell-governance-baseline` | None |
| Delete | `feat/m12-design-system` | `git push origin --delete feat/m12-design-system` | None |

### Phase 2: Blocked Merges

| Branch | Issue | Resolution Required |
|--------|-------|---------------------|
| `cursor/data-governance-documentation-artifacts-33c6` | OMS mutations violate M14/M60 | Remove all mutation code; extract documentation only |
| `cursor/platform-shell-scaffolding-718d` | Hardcoded role logic | Archive or delete; superseded by bootstrap-driven RBAC |

### Phase 3: Conditional Merges

| Branch | Condition | Priority |
|--------|-----------|----------|
| `cursor/design-system-extraction-and-normalization-d6f4` | Visual regression testing passes | Medium |
| `cursor/media-catalog-ux-specification-96ad` | M16 contract finalized | Low |
| `cursor/custom-quote-ux-specification-3d52` | M28 contract finalized | Low |
| `cursor/social-content-governance-rules-7335` | M17 governance approval | Low |

---

## UI/API Alignment Risks

### High Risk

| Risk | Branch | Impact | Mitigation |
|------|--------|--------|------------|
| OMS mutations in UI | `data-governance-*` | Violates read-only contract | Block merge |
| Hardcoded role hierarchy | `platform-shell-scaffolding-*` | Policy duplication | Delete branch |

### Medium Risk

| Risk | Description | Mitigation |
|------|-------------|------------|
| Stale documentation | Experimental branches may contain outdated specs | Review before merge |
| Design token drift | Design system changes may conflict | Visual regression testing |

### Low Risk

| Risk | Description | Mitigation |
|------|-------------|------------|
| Branch proliferation | Too many branches to track | Clean up superseded branches |

---

## SDK Contract Verification

### Current SDK (`lib/sdk.ts`) — ALIGNED ✅

| Check | Status | Evidence |
|-------|--------|----------|
| Read-only methods only | ✅ Pass | All functions use `method: 'GET'` |
| No mutation endpoints | ✅ Pass | No POST/PUT/DELETE for business entities |
| Bootstrap-driven auth | ✅ Pass | Uses `getMe()` for identity |
| No JWT parsing | ✅ Pass | Token passed verbatim |
| No permission inference | ✅ Pass | Permissions from bootstrap only |
| No local metric calculations | ✅ Pass | APIs are source of truth |

### SDK Governance Comments — ALIGNED ✅

From `lib/sdk.ts`:
```typescript
* IMPORTANT GOVERNANCE RULES:
* - All calls are READ-ONLY (GET requests only)
* - No CRUD operations are allowed
* - No local metric calculations - APIs are the single source of truth
* - No JWT parsing - tokens passed verbatim
* - No permission inference - permissions come from bootstrap
* - No direct database access - SDK only
```

---

## Recommendations

### Immediate Actions

1. **Delete 4 superseded branches** (Phase 1)
2. **Block merge of `data-governance-*` branch** until mutations removed
3. **Archive `platform-shell-scaffolding-*` branch** — superseded

### Short-Term Actions

1. **Merge design system tokens** after visual testing
2. **Review documentation branches** for M16/M17/M28 alignment

### Governance Reminders

1. **No new mutation endpoints** in Platform Shell
2. **No hardcoded business rules** — all logic in backend
3. **Bootstrap is the only authority** for permissions
4. **Activity Spine is the only authority** for metrics

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial reconciliation |

---

**This reconciliation is based on the M60 API contract. Branches marked VIOLATES M60 must not be merged without remediation.**
