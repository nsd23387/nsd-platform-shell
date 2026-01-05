# Shared SDK Contract Reconciliation

> **Date:** 2024  
> **Objective:** Ensure SDK reflects final canonical contracts without drift  
> **Status:** COMPLETE

---

## Executive Summary

This document verifies that the Platform Shell SDK (`lib/sdk.ts`) and associated types
correctly mirror the canonical M60 API schemas without drift or repo-specific logic.

### Contract Alignment Status

| Domain | Status | Notes |
|--------|--------|-------|
| Bootstrap (`/api/v1/me`) | ✅ Aligned | Canonical schema matched |
| Activity Spine Metrics | ✅ Aligned | Read-only, summary-only |
| SLA Tiers | ✅ Aligned | v1.5.1 tiered model |
| RBAC | ✅ Aligned | Bootstrap-driven only |

---

## SDK Architecture Review

### Source Files

| File | Purpose | Status |
|------|---------|--------|
| `lib/sdk.ts` | API client wrapper | ✅ Canonical |
| `types/bootstrap.ts` | Bootstrap response types | ✅ Canonical |
| `types/activity-spine.ts` | Metrics response types | ✅ Canonical |
| `types/index.ts` | Type re-exports | ✅ Canonical |

### Governance Compliance

| Rule | Status | Evidence |
|------|--------|----------|
| Read-only methods only | ✅ Pass | All functions use `GET` |
| No mutation endpoints | ✅ Pass | No POST/PUT/DELETE |
| No local calculations | ✅ Pass | APIs are source of truth |
| No JWT parsing | ✅ Pass | Token passed verbatim |
| No permission inference | ✅ Pass | Bootstrap-driven |
| Version-stable types | ✅ Pass | Matches Activity Spine v1.5.1 |

---

## Canonical Contract Verification

### 1. Bootstrap Contract (`/api/v1/me`)

**Expected Schema:**
```typescript
interface BootstrapResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  roles: string[];           // Opaque strings, no hierarchy
  permissions: string[];     // Opaque strings, no inference
  environment: {
    name: 'development' | 'staging' | 'production';
    api_version: string;
  };
  feature_visibility: Record<string, boolean>;
}
```

**Implementation Status:** ✅ Matched in `types/bootstrap.ts`

**Verification Points:**
- [ ] `roles` is `string[]` (no `RoleConfig` objects)
- [ ] `permissions` is `string[]` (no hierarchy logic)
- [ ] No `level` or `priority` fields
- [ ] No role-to-permission mappings

---

### 2. Activity Spine Metrics Contract

**Expected Endpoints (Read-Only):**

| Endpoint | Method | Response Type |
|----------|--------|---------------|
| `/metrics/orders` | GET | `OrderMetrics` |
| `/metrics/media` | GET | `MediaMetrics` |
| `/metrics/mockups` | GET | `MockupMetrics` |
| `/funnels/orders` | GET | `OrderFunnel` |
| `/slas` | GET | `SLAMetrics` |
| `/slas/mockups` | GET | `MockupSLAMetrics` |

**Implementation Status:** ✅ All matched in `lib/sdk.ts`

---

### 3. SLA Tier Model (Activity Spine v1.5.1)

**Canonical Tiers:**

| Tier | Threshold | Color |
|------|-----------|-------|
| Exceptional | ≤ 2 hours | Green |
| Standard | > 2h, ≤ 24h | Yellow |
| Breach | > 24h | Red |
| Pending | No delivery | Gray |

**Implementation Status:** ✅ Matched in `types/activity-spine.ts`

```typescript
export interface MockupSLADistribution {
  exceptional: number;  // ≤ 2h
  standard: number;     // > 2h, ≤ 24h
  breach: number;       // > 24h
  pending: number;      // No mockup yet
}
```

**Verification Points:**
- [ ] Tier thresholds are NOT computed in UI
- [ ] Distribution comes from API response
- [ ] Colors are for display only (M12 tokens)

---

## Divergent Contract Detection

### Branches with SDK Changes

| Branch | SDK Changes | Status |
|--------|-------------|--------|
| `main` | Canonical | ✅ Reference |
| `cursor/platform-shell-scaffolding-718d` | Separate SDK | ⛔ Superseded |
| `cursor/data-governance-documentation-artifacts-33c6` | OMS types | ⛔ Violates M60 |

### Divergent Types Found

#### ❌ `cursor/platform-shell-scaffolding-718d`

This branch contains a completely separate SDK at `nsd-platform-shell/lib/sdk.ts`:

**Issues:**
1. Different API base URL structure
2. Contains auth-related POST endpoints
3. Uses different type definitions
4. Not aligned with Activity Spine v1.5.1

**Resolution:** Delete branch — superseded by main.

---

#### ❌ `cursor/data-governance-documentation-artifacts-33c6`

This branch introduces `types/oms.ts` with mutation types:

**Issues:**
1. `OMSActionType` defines lifecycle mutations
2. `OMSActionConfig` hardcodes business rules
3. Hooks for executing mutations
4. Violates read-only contract

**Resolution:** Block merge — remove mutation types.

---

## Breaking Change Analysis

### Potential Breaking Changes

| Change | Impact | Status |
|--------|--------|--------|
| `MockupMetrics.distribution` (added v1.5.1) | Non-breaking (optional field) | ✅ Safe |
| `MockupSLAMetrics.slaTargets` (added v1.5.1) | Non-breaking (optional field) | ✅ Safe |
| Deprecated fields marked | Non-breaking (still present) | ✅ Safe |

### Deprecated Fields

The following fields are deprecated but retained for backward compatibility:

| Field | Type | Deprecated Reason |
|-------|------|-------------------|
| `MockupSLAMetrics.complianceRate` | `number` | Use tiered distribution |
| `MockupSLAMetrics.targetMinutes` | `number` | Use `slaTargets` |

**Note:** Deprecated fields should NOT be removed without coordinated migration.

---

## Final Contract Set Recommendation

### Canonical Types (Keep)

| File | Types | Status |
|------|-------|--------|
| `types/bootstrap.ts` | `BootstrapResponse`, `BootstrapUser`, `BootstrapOrganization`, `BootstrapEnvironment`, `BootstrapState`, `BootstrapContextValue` | ✅ Final |
| `types/activity-spine.ts` | `OrderMetrics`, `MediaMetrics`, `MockupMetrics`, `MockupSLADistribution`, `MockupSLATargets`, `FunnelStage`, `OrderFunnel`, `SLAMetrics`, `MockupBreachItem`, `MockupSLAMetrics`, `TimePeriod`, `ActivitySpineResponse`, `AsyncState` | ✅ Final |

### Non-Canonical Types (Remove/Block)

| File | Types | Action |
|------|-------|--------|
| `types/oms.ts` (data-governance branch) | `OMSActionType`, `OMSActionConfig`, `OMSEntityReference`, `OMSActionResponse` | ⛔ Block merge |

---

## SDK Versioning Strategy

### Current Version

| Component | Version | Notes |
|-----------|---------|-------|
| Activity Spine Types | v1.5.1 | Tiered SLA model |
| Bootstrap Types | v1.0 | Canonical |
| SDK Methods | v1.0 | Read-only only |

### Version Stability Rules

1. **Types are append-only** — new optional fields may be added
2. **Existing fields are immutable** — no type changes to existing fields
3. **Deprecated fields are retained** — removed only with major version
4. **Breaking changes require coordination** — API and UI versions must align

---

## Recommendations

### Immediate

1. ✅ Keep `types/bootstrap.ts` as canonical
2. ✅ Keep `types/activity-spine.ts` as canonical
3. ⛔ Block merge of `types/oms.ts` from data-governance branch
4. 🗑️ Delete superseded SDK in scaffolding branch

### Short-Term

1. Document deprecation timeline for legacy fields
2. Add TypeScript strict mode to prevent type drift
3. Add schema validation tests against API responses

### Long-Term

1. Consider extracting SDK to shared package (if multi-repo)
2. Implement contract testing (API ↔ SDK type alignment)

---

## Appendix: Type Comparison Matrix

### Bootstrap Types

| Field Path | Main Branch | Scaffolding Branch | Match |
|------------|-------------|-------------------|-------|
| `user.id` | `string` | `string` | ✅ |
| `user.email` | `string` | `string` | ✅ |
| `user.roles` | N/A (on root) | `string[]` | ⚠️ Different location |
| `roles` | `string[]` | N/A | ⚠️ Different structure |
| `permissions` | `string[]` | N/A | ⛔ Missing in scaffolding |
| `feature_visibility` | `Record<string, boolean>` | N/A | ⛔ Missing in scaffolding |

**Conclusion:** Scaffolding branch SDK is not compatible with M60 contract.

### Activity Spine Types

| Type | Main Branch | Scaffolding Branch | Match |
|------|-------------|-------------------|-------|
| `OrderMetrics` | ✅ Present | ❌ Missing | ⛔ |
| `MediaMetrics` | ✅ Present | ❌ Missing | ⛔ |
| `MockupMetrics` | ✅ Present | ❌ Missing | ⛔ |
| `MockupSLADistribution` | ✅ Present | ❌ Missing | ⛔ |

**Conclusion:** Scaffolding branch lacks Activity Spine types entirely.

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial reconciliation |

---

**This SDK reconciliation confirms the main branch as the canonical contract source. Divergent branches must not be merged.**
