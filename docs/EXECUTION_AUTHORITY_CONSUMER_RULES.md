# Execution Authority Consumer Rules

## Overview

**Platform-shell is a PURE CONSUMER of execution data.**

Sales-engine is the SOLE execution authority. Platform-shell must never infer, compute, or reconcile execution state. This document defines the rules that ensure architectural integrity.

---

## Core Invariant

> **Execution truth comes ONLY from sales-engine.**

This is non-negotiable. Any code that violates this invariant is an architecture bug.

---

## Allowed Endpoints

Platform-shell may ONLY consume these execution-related endpoints:

### 1. Execution State (Current Run + Funnel)

```
GET /api/v1/campaigns/:id/execution-state
```

**Purpose:** Current execution state including active/latest run and pipeline funnel counts.

**Proxy:** `/api/proxy/execution-state?campaignId=xxx`

**Response Shape:**
```typescript
interface ExecutionState {
  campaignId: string;
  run: {
    id: string;
    status: string;
    stage?: string;
    startedAt?: string;
    endedAt?: string;
    terminationReason?: string;
    errorMessage?: string;
  } | null;
  funnel: {
    organizations: { total, qualified, review, disqualified };
    contacts: { total, sourced, ready, withEmail };
    leads: { total, pending, approved };
  };
  lastUpdatedAt: string;
}
```

### 2. Run History (Historical Runs)

```
GET /api/v1/campaigns/:id/run-history
```

**Purpose:** List of historical campaign runs.

**Proxy:** `/api/proxy/run-history?campaignId=xxx`

**Response Shape:**
```typescript
interface RunHistoryResponse {
  campaignId: string;
  runs: HistoricalRun[];
  available: boolean;
  lastUpdatedAt?: string;
}
```

**Behavior when unavailable:**
- Returns `{ available: false, runs: [] }`
- UI shows "Run history not available yet"
- Do NOT fallback to legacy endpoints

---

## Forbidden Behaviors

### ❌ Legacy Endpoint Usage

These endpoints are FORBIDDEN:

```
GET /api/v1/campaigns/:id/runs
GET /api/v1/campaigns/:id/runs/latest
GET /api/v1/campaigns/:id/observability/*
GET /api/campaigns/:id/runs/*
GET /api/campaign-runs/*
```

**Why:** These endpoints were part of the legacy architecture where platform-shell queried the database directly. This violates the execution authority contract.

### ❌ Execution State Inference

Do NOT:
- Compute status transitions from events
- Reconstruct run history from activity logs
- Infer completion from absence of errors
- Derive funnel counts from contact queries

**Why:** Inference can diverge from sales-engine's truth, causing UI/backend inconsistency.

### ❌ Local Database Queries for Execution Data

Do NOT query these tables directly for execution data:
- `campaign_runs`
- `execution_logs`
- `activity.events`

**Why:** Platform-shell is a frontend consumer, not a data authority.

### ❌ Fallback Logic

Do NOT:
- Fall back to legacy endpoints if `/execution-state` fails
- Use cached data beyond TTL
- Show stale data when sales-engine is unreachable

**Instead:** Show explicit error state: "Execution service unavailable"

---

## Error Handling

### Sales-Engine Unreachable

When `/execution-state` fails:
1. Log the error with campaign ID
2. Show error UI: "Unable to load execution status"
3. Do NOT fall back to legacy endpoints
4. Do NOT show fabricated/cached data

### Run History Unavailable

When `/run-history` returns `available: false`:
1. Show: "Run history not available yet"
2. Do NOT attempt legacy fallback
3. Do NOT reconstruct from events

---

## Testing with Legacy Endpoints Returning 410

To verify the frontend is migration-ready:

### 1. Local Testing

Add to your Next.js middleware or API routes:

```typescript
// Simulate legacy endpoints returning 410 Gone
if (request.nextUrl.pathname.includes('/runs/latest')) {
  return new Response(
    JSON.stringify({ error: 'GONE', message: 'Legacy endpoint removed' }),
    { status: 410 }
  );
}
```

### 2. Verification Checklist

With legacy endpoints returning 410:

- [ ] Campaign list loads correctly
- [ ] Campaign detail page loads
- [ ] Execution status shows (from `/execution-state`)
- [ ] Run history shows "not available" or actual data
- [ ] No console errors referencing legacy endpoints
- [ ] No network requests to `/runs/latest`, `/observability/*`

### 3. Expected Behavior

| Scenario | Expected Behavior |
|----------|-------------------|
| `/execution-state` succeeds | UI shows current execution state |
| `/execution-state` fails (5xx) | UI shows "Execution service unavailable" |
| `/run-history` returns `available: false` | UI shows "Run history not available yet" |
| `/run-history` returns runs | UI shows run history table |
| Legacy endpoint called | Dev console error (guardrail) |

---

## Code Locations

### Execution State Hook
```
app/sales-engine/hooks/useRealTimeStatus.ts
```

### API Client Functions
```
app/sales-engine/lib/api.ts
- getExecutionState()
- getRunHistory()
```

### Proxy Endpoints
```
app/api/proxy/execution-state/route.ts
app/api/proxy/run-history/route.ts
```

### Run History UI
```
app/sales-engine/components/observability/RunHistoryPanel.tsx
```

---

## Guardrails

### Dev-Only Legacy Detection

The `useRealTimeStatus` hook includes a dev-only warning:

```typescript
// If any code tries to call legacy endpoints, this will warn
warnIfLegacyEndpoint(url);
```

### Inline Contract Comments

All execution-related files include:

```typescript
/**
 * EXECUTION AUTHORITY CONTRACT
 * INVARIANT: Execution truth comes ONLY from sales-engine.
 */
```

---

## Migration Status

| Endpoint | Status |
|----------|--------|
| `/execution-state` | ✅ Active (sole authority) |
| `/run-history` | ✅ Active (optional) |
| `/runs/latest` | ❌ Forbidden |
| `/observability/*` | ❌ Forbidden |
| `/campaign-runs/*` | ❌ Forbidden |

---

## Summary

1. **Sales-engine is the execution authority** - Platform-shell only renders
2. **Two allowed endpoints** - `/execution-state` and `/run-history`
3. **No inference** - Display exactly what sales-engine provides
4. **No fallback** - If sales-engine fails, show error
5. **Guardrails prevent regression** - Comments and dev warnings

When in doubt: **Does this code derive execution truth from sales-engine, or does it compute/infer it locally?**

If the answer is "compute/infer locally", it's a bug.
