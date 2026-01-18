# Execution Narrative Governance

## Overview

The Execution Narrative Mapper (ENM) is the **sole interpreter of execution state** in the Sales Engine UI. This document defines the governance rules that ensure consistent, truthful execution messaging across all UI components.

## Core Principle

> **The frontend can only ever say what the backend has provably done — never what it assumes is happening.**

## Governance Rules

### 1. ENM is the Only Execution Interface

All execution-related UI MUST consume `ExecutionNarrative` output only. No component may interpret raw execution data independently.

**Allowed in UI components:**
- `ExecutionNarrative` object from ENM
- `narrativeToHealthLevel()` helper
- `narrativeToIcon()` helper
- `isNarrativeActive()`, `isNarrativeTerminal()`, etc.

**Prohibited in UI components:**
- Direct access to `campaign_runs.status`
- Direct access to `started_at` / `completed_at`
- Raw `activity.events` processing
- Funnel counts for state derivation
- Timers or timestamps for state logic
- Any heuristic-based state interpretation

### 2. Component Prop Contracts

Execution-aware components MUST accept `ExecutionNarrative` as a prop:

```typescript
interface ExecutionNarrativeConsumerProps {
  narrative: ExecutionNarrative;
}
```

Components MUST NOT accept raw execution data (runs, events, status) as props.

### 3. Canonical Copy Centralization

All user-visible execution copy MUST originate from:
- ENM output (`narrative.headline`, `narrative.subheadline`, `narrative.trustNote`)
- `EXECUTION_COPY` constants in `execution-narrative-governance.ts`

**Prohibited inline strings:**
- "No organizations found"
- "Execution idle"
- "In progress"
- "Awaiting cleanup"
- Any status-derived messaging

### 4. ENM Canonical States

ENM produces exactly these modes:

| Mode | Meaning |
|------|---------|
| `idle` | No campaign_runs exist |
| `queued` | Latest run status = queued, no run.started event |
| `running` | Latest run status = running with recent stage.boundary |
| `terminal` | Latest run status = completed, failed, or skipped |

Special states:
- `isStalled = true`: Running > 30 min AND no recent stage.boundary events

### 5. Staleness Detection

**STALLED requires BOTH conditions:**
1. `status = running` AND `now − started_at > 30 min`
2. No recent `stage.boundary` events within the threshold

A running execution with recent stage activity is NEVER marked as stalled.

### 6. Hard UI Rules

| Rule | Enforcement |
|------|-------------|
| Never show "No organizations found" while running | ENM subheadline logic |
| Never show "0 organizations" while running | ENM guards against this |
| Running executions never display terminal conclusions | Mode-based rendering |
| Stale runs never show as "Running" | `isStalled` flag |

## ENM-Compliant Components

The following components consume ENM output only:

- `ExecutionHealthIndicatorENM`
- `ActiveStageFocusPanelENM`
- `LatestRunStatusCardENM`
- `LastExecutionSummaryCardENM`
- `ExecutionNarrativeCard`

## Architectural Violations

The following are considered architectural regressions:

1. Adding execution state logic to UI components
2. Reading raw `campaign_runs` in presentation components
3. Deriving state from timestamps or counts outside ENM
4. Creating inline execution messaging strings
5. Bypassing ENM for "quick fixes"

## Migration Path

Legacy components should be migrated to ENM:

1. Replace raw prop consumption with `narrative` prop
2. Remove internal state derivation logic
3. Use ENM helper functions for styling
4. Import copy from `EXECUTION_COPY` constants

## Testing

ENM is designed to be deterministic and testable:

```typescript
const narrative = mapExecutionNarrative(runs, events);
expect(narrative.mode).toBe('running');
expect(narrative.isStalled).toBe(false);
```

## Maintenance

When adding new execution features:

1. Add new states to ENM, not to individual components
2. Add new copy to `EXECUTION_COPY` constants
3. Ensure all components consume ENM output
4. Document new states in this governance doc
