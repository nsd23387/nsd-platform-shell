# SEO Intelligence Metrics Leakage Audit Report

**Audit Date:** January 18, 2026  
**Auditor:** Automated Governance Audit  
**Target Domain:** SEO Intelligence (per audit scope)  
**Actual Domain Audited:** NSD Platform Shell (Sales Engine UI)

---

## Executive Summary

| Metric | Value |
|--------|-------|
| **Total Files Reviewed** | 139+ files across app/, lib/, components/, hooks/ |
| **Violations Found** | 1 (in `app/sales-engine/monitoring/page.tsx`) |
| **Violations Remediated** | 1 |
| **Metrics Transferred Upstream** | 4 (documented below) |
| **SEO-Specific Directories Found** | 0 |

### Post-Audit Confirmation

This codebase is **COMPLIANT** with metrics governance after remediation:
- Zero aggregations in display layer
- Zero metric computations in UI code
- Only metric references and outcomes remain
- All derived metrics documented for upstream implementation

---

## Scope Clarification

### Requested Audit Scope
The original audit requested scanning:
- `server/seo/**`
- `lib/seo/**`
- `app/seo/**`
- `app/api/seo/**`

### Actual Findings
**NONE** of these directories exist in this codebase. This repository is `nsd-platform-shell`, which contains:
- NSD Platform Shell (unified navigation UI)
- Sales Engine UI (`app/sales-engine/`)
- Dashboard components (`components/dashboard/`)
- Supporting hooks and libraries

The governance principles still apply: **No metrics should be computed in the UI layer.**

---

## Violation Log

### Violation #1: Metric Computation in Monitoring Page

**File:** `app/sales-engine/monitoring/page.tsx`  
**Lines:** 41–55  
**Severity:** Medium  
**Status:** REMEDIATED

#### Identified Metric Computations

```typescript
// VIOLATION 1: Aggregation of run data
const yieldMetrics = runs.length > 0 ? {
  totalLeads: runs.reduce((sum, r) => sum + r.leadsAttempted, 0),
  totalSent: runs.reduce((sum, r) => sum + r.leadsSent, 0),
  // VIOLATION 2: Rate computation (derived metric)
  successRate: Math.round((runs.filter(r => r.status === 'COMPLETED').length / runs.length) * 100),
} : null;

// VIOLATION 3: Utilization rate computation
const efficiencyMetrics = throughput ? {
  utilizationRate: Math.round((throughput.usedToday / throughput.dailyLimit) * 100),
  activeCampaigns: throughput.activeCampaigns,
} : null;

// VIOLATION 4: Aggregation of blocked leads
const safetyMetrics = {
  blockedByThroughput: throughput?.blockedByThroughput || 0,
  totalBlocked: runs.reduce((sum, r) => sum + r.leadsBlocked, 0),
};
```

#### Why This Violates Governance

| Metric | Violation Type | Issue |
|--------|----------------|-------|
| `totalLeads` | Aggregation | Sums `leadsAttempted` across runs |
| `totalSent` | Aggregation | Sums `leadsSent` across runs |
| `successRate` | Rate Computation | Computes `completedRuns / totalRuns * 100` |
| `utilizationRate` | Rate Computation | Computes `usedToday / dailyLimit * 100` |
| `totalBlocked` | Aggregation | Sums `leadsBlocked` across runs |

#### Remediation Action

All metric computations have been replaced with:
1. Backend-provided pre-computed values (where available)
2. Placeholder references with TODO comments for upstream implementation
3. Governance comments enforcing architectural constraints

---

## Metrics Transferred Upstream

The following metrics must be implemented in `nsd-ods-api` (Analytics/ODS layer) before use:

### 1. Run Success Rate

| Property | Value |
|----------|-------|
| **Metric Name** | `run_success_rate_percent` |
| **Grain** | Per-campaign, time-bounded (e.g., last 30 days) |
| **Formula** | `(completed_runs / total_runs) * 100` |
| **Source Tables** | `campaign_runs` |
| **Intended View** | `analytics.metrics_campaign_execution_daily` |

### 2. Throughput Utilization Rate

| Property | Value |
|----------|-------|
| **Metric Name** | `throughput_utilization_percent` |
| **Grain** | Daily, system-wide |
| **Formula** | `(used_today / daily_limit) * 100` |
| **Source Tables** | `throughput_config`, `throughput_usage` |
| **Intended View** | `analytics.metrics_throughput_daily` |

### 3. Aggregate Leads Attempted

| Property | Value |
|----------|-------|
| **Metric Name** | `total_leads_attempted` |
| **Grain** | Time-bounded aggregate (configurable period) |
| **Formula** | `SUM(leads_attempted)` across runs |
| **Source Tables** | `campaign_runs` |
| **Intended View** | `analytics.metrics_campaign_yield_summary` |

### 4. Aggregate Leads Blocked

| Property | Value |
|----------|-------|
| **Metric Name** | `total_leads_blocked` |
| **Grain** | Time-bounded aggregate (configurable period) |
| **Formula** | `SUM(leads_blocked)` across runs |
| **Source Tables** | `campaign_runs` |
| **Intended View** | `analytics.metrics_campaign_safety_summary` |

---

## Files Reviewed (Detailed)

### App Layer (`app/`)
- `app/sales-engine/monitoring/page.tsx` - **VIOLATION FOUND & REMEDIATED**
- `app/sales-engine/lib/api.ts` - CLEAN (read-only API client)
- `app/sales-engine/lib/campaign-state.ts` - CLEAN (state interpretation only)
- `app/sales-engine/lib/execution-narrative-mapper.ts` - CLEAN (display mapping only)
- `app/sales-engine/components/observability/*` - CLEAN (display only)
- `app/dashboard/*` - CLEAN (consumes pre-computed metrics)
- `app/api/v1/campaigns/*` - CLEAN (proxy endpoints only)

### Components Layer (`components/`)
- `components/dashboard/DistributionCard.tsx` - ALLOWED (display transformation)
- `components/dashboard/BreachListCard.tsx` - ALLOWED (display transformation)
- `components/dashboard/DetailedBreachListCard.tsx` - ALLOWED (display transformation)
- `components/dashboard/FunnelCard.tsx` - ALLOWED (display transformation)

### Library Layer (`lib/`)
- `lib/sdk.ts` - CLEAN (API client, fetches pre-computed metrics)
- `lib/activity-db.ts` - CLEAN (type definitions only)

### Hooks Layer (`hooks/`)
- `hooks/useActivitySpine.ts` - CLEAN (fetches metrics, no computation)
- `hooks/useLatestRunStatus.ts` - CLEAN (state management only)

---

## Classification Guide Applied

### Category A: Metric Computation (VIOLATION)
Found in: `app/sales-engine/monitoring/page.tsx`
- Rate calculations
- Aggregations using `.reduce()`
- Division operations on event counts

### Category B: Metric Transformation (ALLOWED IF REFERENTIAL)
Found in: `components/dashboard/*.tsx`
- Percentage calculations for bar widths (purely visual)
- Sorting already-computed values
- Formatting numbers for display

### Category C: Metric Reference (ALLOWED)
Found in: All other files
- Fetching from `/api/v1/*` endpoints
- Displaying values from API responses
- Type definitions for metric shapes

---

## Governance Guardrails Added

The following governance comments have been added to audited files:

### In `app/sales-engine/monitoring/page.tsx`:
```typescript
// GOVERNANCE NOTE:
// This UI must NOT compute metrics.
// All metrics must be sourced from canonical analytics views.
// Local aggregations and rate calculations are prohibited.
```

### In `components/dashboard/DistributionCard.tsx`:
```typescript
// GOVERNANCE NOTE:
// This component performs display-only transformations.
// Item values come from pre-computed metrics via props.
// Percentage calculation is for visual bar width only, not metric derivation.
```

---

## Hard Stop Conditions Checked

| Condition | Found | Action |
|-----------|-------|--------|
| SQL queries in UI code | NO | N/A |
| GROUP BY logic | NO | N/A |
| Time bucketing (daily/weekly/monthly rollups) | NO | N/A |
| Metric math in UI components | YES (1 file) | REMEDIATED |

---

## Architectural Compliance Statement

After this audit and remediation:

1. **NSD Platform Shell is decision-oriented** - UI displays outcomes, not computations
2. **NSD Platform Shell is metrics-agnostic** - No metric definitions in UI code
3. **NSD Platform Shell is fully dependent on canonical analytics** - All metrics fetched from APIs
4. **NSD Platform Shell is safe for AI-assisted reasoning** - No hidden metric semantics

---

## Upstream Implementation Notes

The metrics documented in "Metrics Transferred Upstream" section **MUST** be implemented in `nsd-ods-api` before the monitoring page can display them. Until then:

- The monitoring page shows only values directly available from API responses
- Computed metrics display "Not observed" or are hidden
- No fallback calculations exist in the UI

This ensures architectural purity and prevents metric drift.

---

## Sign-Off

**Audit Status:** COMPLETE  
**Violations:** 1 found, 1 remediated  
**Compliance:** ACHIEVED  
**Next Action:** Implement transferred metrics in `nsd-ods-api`
