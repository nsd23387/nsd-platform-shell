# Frontend Migration Readiness Audit Report

**Repository:** `nsd-platform-shell`  
**Date:** January 22, 2026  
**Purpose:** Determine if legacy `/runs` endpoints can be safely deleted from `nsd-sales-engine`

---

## Executive Summary

| Checklist Item | Status | Verdict |
|----------------|--------|---------|
| 1. API Usage Audit | ❌ FAIL | Legacy endpoints still referenced |
| 2. Execution State Exclusivity | ❌ FAIL | Not using `/execution-state` directly |
| 3. Run History Handling | ⚠️ MIXED | Using Option B with legacy endpoints |
| 4. Send Metrics Gating | ✅ PASS | Properly gated with `hasReachedSendStage` |
| 5. Empty State Honesty | ✅ PASS | Honest empty states implemented |
| 6. Network Failure Behavior | ✅ PASS | Errors surface visibly |
| 7. React Query / Caching | ✅ PASS | No React Query; proper TTL caching |
| 8. Logging & Debuggability | ⚠️ PARTIAL | Logs present but reference legacy endpoints |

**Overall Migration Status: ❌ NOT READY**

---

## Detailed Findings

### 1️⃣ API Usage Audit — ❌ FAIL

**Legacy endpoint references found:**

#### Hooks that fetch legacy endpoints:
| File | Endpoint Called | Status |
|------|-----------------|--------|
| `hooks/useLatestRunStatus.ts` | `/api/v1/campaigns/:id/runs/latest` | ❌ Active (fallback) |
| `app/sales-engine/hooks/useCampaignProgress.ts` | `/runs/latest`, `/observability/funnel` | ⚠️ Defined (not imported by page) |
| `app/sales-engine/hooks/useExecutionPolling.ts` | `/runs/latest`, `/observability/funnel` | ⚠️ Defined (not imported by page) |

#### API client functions calling legacy endpoints:
| Function | Endpoint | Used By |
|----------|----------|---------|
| `getCampaignRuns(id)` | `/${id}/runs` | `page.tsx` ✅ Active |
| `getCampaignRunsDetailed(id)` | `/${id}/runs` | `page.tsx` ✅ Active |
| `getCampaignObservability(id)` | `/${id}/observability` | `page.tsx` ✅ Active |
| `getCampaignObservabilityStatus(id)` | `/${id}/observability/status` | `getRealTimeExecutionStatus` |
| `getCampaignObservabilityFunnel(id)` | `/${id}/observability/funnel` | `getRealTimeExecutionStatus` |
| `getLatestRun(id)` | `/${id}/runs/latest` | `getRealTimeExecutionStatus` |

#### Critical Issue: `getRealTimeExecutionStatus()` is NOT using `/execution-status`

```typescript
// Current implementation (api.ts lines 1037-1041):
const [funnelResponse, statusResponse, latestRunResponse] = await Promise.allSettled([
  fetch(`/api/v1/campaigns/${id}/observability/funnel`),
  fetch(`/api/v1/campaigns/${id}/observability/status`),
  fetch(`/api/v1/campaigns/${id}/runs/latest`),  // ← Legacy endpoint!
]);
```

**Expected:** Single call to `/api/v1/campaigns/${id}/execution-status`

---

### 2️⃣ Execution State Exclusivity — ❌ FAIL

**Current data flow:**
```
useRealTimeStatus hook
    └── getRealTimeExecutionStatus()
        ├── /observability/funnel  ← Legacy
        ├── /observability/status  ← Legacy
        └── /runs/latest           ← Legacy
```

**Required data flow:**
```
useRealTimeStatus hook
    └── getRealTimeExecutionStatus()
        └── /execution-status      ← Single source of truth
```

**UI Element Source Mapping:**

| UI Element | Current Source | Required Source | Status |
|------------|----------------|-----------------|--------|
| Execution status | `executionStatus.latestRun.status` | `executionState.run.status` | ⚠️ Wrong endpoint |
| Current stage | `executionRun.stage` | `executionState.run.stage` | ⚠️ Wrong endpoint |
| Started timestamp | `executionRun.startedAt` | `executionState.run.startedAt` | ⚠️ Wrong endpoint |
| Ended timestamp | `executionRun.completedAt` | `executionState.run.endedAt` | ⚠️ Wrong endpoint |
| Termination reason | `executionRun.terminationReason` | `executionState.run.terminationReason` | ⚠️ Wrong endpoint |
| Funnel counts | `executionFunnel` | `executionState.funnel` | ⚠️ Wrong endpoint |

**Note:** The `/api/v1/campaigns/:id/execution-status` endpoint EXISTS and returns the correct shape, but `getRealTimeExecutionStatus()` doesn't use it.

---

### 3️⃣ Run History Handling — ⚠️ MIXED (Option B with legacy endpoints)

**Current implementation:**
- UI shows run history table via `CampaignRunHistoryTable`
- Data fetched via `getCampaignRuns()` and `getCampaignRunsDetailed()` → `/runs` endpoint
- This is **Option B behavior** but using **legacy endpoints**

**For Option B compliance, need:**
- `GET /api/v1/campaigns/:id/run-history` endpoint
- Backed only by `campaign_runs` table
- No event usage

**Current state:**
```typescript
// page.tsx lines 244-245:
getCampaignRuns(campaignId),
getCampaignRunsDetailed(campaignId),
```
These call `/${id}/runs` which is a legacy endpoint.

---

### 4️⃣ Send Metrics Gating — ✅ PASS

**Implementation verified in `SendMetricsPanel.tsx`:**

```typescript
// Line 144:
hasReachedSendStage = false,

// Lines 149-150:
const hasData = emailsSent !== undefined && emailsSent > 0;
const showNotObservedState = !hasData && !hasReachedSendStage;

// Lines 171-248: Empty state shows "Not Observed Yet" message
```

**Compliance:**
- ✅ Renders only if `hasReachedSendStage` is true OR has actual send data
- ✅ Shows "Send metrics will appear here after leads are approved and emails are dispatched."
- ✅ No metrics API queried pre-send
- ✅ No "show then suppress" logic

---

### 5️⃣ Empty State Honesty — ✅ PASS

| Situation | Component | Message | Status |
|-----------|-----------|---------|--------|
| Campaign never run | `ExecutionHealthIndicator` | "Ready for execution" | ✅ |
| No execution yet | `PipelineFunnelTable` | "No activity observed yet" | ✅ |
| No run history | `CampaignRunHistoryTable` | "No runs observed" | ✅ |
| Run failed | `ExecutionHealthBanner` | Shows failure with reason | ✅ |
| Service unavailable | `LatestRunStatusCard` | "Execution service unavailable" | ✅ |
| Campaign not found | `LatestRunStatusCard` | "Campaign not found" | ✅ |

---

### 6️⃣ Network Failure Behavior — ✅ PASS

**Error handling in `useRealTimeStatus`:**

```typescript
// Lines 145-147:
} catch (err) {
  console.error('[useRealTimeStatus] Fetch error:', err);
  throw err;
}

// Lines 168-172:
} catch (err) {
  if (mountedRef.current) {
    setError(err instanceof Error ? err.message : 'Failed to fetch status');
    setIsLoading(false);
  }
}
```

**Components handle errors:**
- `LatestRunStatusCard`: Shows `ErrorCard` with message
- `ExecutionExplainabilityPanel`: Shows `ErrorState` with message
- `PipelineFunnelTable`: Shows error state if `error` prop provided

**Verified behavior:**
- ✅ Errors surface visibly
- ✅ No silent fallback to stale data
- ✅ Network errors don't reuse cached data indefinitely (TTL = 7 seconds)

---

### 7️⃣ React Query / Caching — ✅ PASS

**No React Query usage detected** in the codebase.

**Current caching implementation (`useRealTimeStatus.ts`):**

```typescript
// Module-level cache
const statusCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 7000; // 7 seconds
const DEFAULT_POLLING_INTERVAL = 7000; // 7 seconds

// Cache invalidation on terminal state (lines 90-94):
function shouldInvalidateCache(status: RealTimeExecutionStatus): boolean {
  const runStatus = status.latestRun?.status?.toLowerCase();
  if (!runStatus) return false;
  return ['completed', 'failed'].includes(runStatus);
}

// Campaign change clears cache (lines 196-199):
if (lastCampaignIdRef.current !== campaignId) {
  lastCampaignIdRef.current = campaignId;
  setRealTimeStatus(null);
}
```

**Compliance:**
- ✅ 7-second TTL (no infinite stale time)
- ✅ Cache invalidated on run completion/failure
- ✅ Campaign change resets state
- ✅ No cross-campaign data reuse

---

### 8️⃣ Logging & Debuggability — ⚠️ PARTIAL

**Logging present:**
```typescript
// useRealTimeStatus.ts:
console.error('[useRealTimeStatus] Fetch error:', err);

// execution-status route:
console.log('[execution-status] Fetching status for campaign:', campaignId);
console.log('[execution-status] Fetched counts:', {...});
console.error('[execution-status] Error:', error);
```

**Issues:**
- ⚠️ Logs in `api.ts` reference legacy endpoints
- ⚠️ No centralized logging for execution state changes
- ⚠️ Run ID not consistently logged

---

## Required Remediation

### High Priority (Blocking Migration)

#### 1. Rewire `getRealTimeExecutionStatus()` to use `/execution-status`

**Current (api.ts):**
```typescript
export async function getRealTimeExecutionStatus(id: string): Promise<RealTimeExecutionStatus> {
  // ... fetches 3 legacy endpoints
}
```

**Required:**
```typescript
export async function getRealTimeExecutionStatus(id: string): Promise<RealTimeExecutionStatus> {
  const response = await fetch(`/api/v1/campaigns/${id}/execution-status`, {
    headers: buildHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Execution status unavailable: ${response.status}`);
  }
  
  return response.json();
}
```

#### 2. Remove legacy API calls from page.tsx

**Current:**
```typescript
const [
  metricsData,
  historyData,
  runsData,           // ← getCampaignRuns()
  runsDetailedData,   // ← getCampaignRunsDetailed()
  variantsData,
  throughputData,
  observabilityData,  // ← getCampaignObservability()
] = await Promise.allSettled([...]);
```

**Required:**
- Remove `getCampaignRuns`, `getCampaignRunsDetailed` calls
- Remove `getCampaignObservability` call
- Run history: Either disable (Option A) or create `/run-history` endpoint (Option B)
- Send metrics: Source from execution-status or dedicated send-metrics endpoint

#### 3. Disable or rewire run history

**Option A (Temporary - Acceptable):**
- Remove `CampaignRunHistoryTable` or show "No execution runs observed"
- Remove all `/runs` API calls

**Option B (Preferred):**
- Create `GET /api/v1/campaigns/:id/run-history` endpoint
- Source data from `campaign_runs` table only
- Update `CampaignRunHistoryTable` to use new endpoint

### Medium Priority

#### 4. Remove unused hooks

These hooks are defined but not imported by the campaign detail page:
- `useCampaignProgress.ts`
- `useExecutionPolling.ts`

They should be deleted to prevent accidental usage.

#### 5. Update `useLatestRunStatus` conditional fetch

Currently falls back to legacy endpoint when props not provided. Should:
- Remove hook entirely, OR
- Make it always require props (never fetch)

---

## Migration "Go" Criteria Status

| Criteria | Status |
|----------|--------|
| No frontend references to legacy `/runs` endpoints | ❌ |
| Execution UI uses only `/execution-state` | ❌ |
| Empty states are honest and intentional | ✅ |
| Network failures surface visibly | ✅ |
| No fallback or inference logic remains | ⚠️ |
| Team agrees run history semantics are clear | ⏳ Pending |
| Temporary compatibility endpoints can be removed safely | ❌ |

---

## Next Steps

1. **Immediate:** Rewire `getRealTimeExecutionStatus()` to call `/execution-status`
2. **Short-term:** Decide on run history approach (Option A or B)
3. **Short-term:** Remove legacy hook definitions
4. **Before migration:** Test with legacy endpoints returning 410 Gone
5. **Document:** Add "execution truth unavailable = UI reflects absence" rule

---

## Final Rule

> **If execution truth is unavailable, the UI must reflect that absence — not invent continuity.**

This rule should be added to the repository README or governance documentation.
