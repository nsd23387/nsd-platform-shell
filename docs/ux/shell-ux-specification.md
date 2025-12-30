# Platform Shell UX Specification

> **Version:** 1.0  
> **Status:** Locked (M13-01)  
> **Design System:** M12 (Frozen)

This document formally defines the user experience of the NSD Platform Shell.
The Shell is a **read-only observational interface** — it surfaces data but does not mutate it.

---

## Table of Contents

1. [Overview](#overview)
2. [Navigation Hierarchy](#navigation-hierarchy)
3. [Dashboard Structure](#dashboard-structure)
4. [App Registry](#app-registry)
5. [Search UX Intent](#search-ux-intent)
6. [Notification UX Intent](#notification-ux-intent)
7. [Read-Only Semantics](#read-only-semantics)
8. [Confidence Signaling](#confidence-signaling)
9. [UX Boundaries](#ux-boundaries)

---

## Overview

The Platform Shell provides unified internal visibility for Neon Signs Depot operations.
It is the **observational layer** of the NSD Unified Business Platform.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Read-Only** | No mutations, no workflow control, no business logic execution |
| **Observational** | Surfaces Activity Spine data for human situational awareness |
| **Calm** | White-space-forward, minimal, editorial aesthetic |
| **Trustworthy** | Data is authoritative and comes from a single source of truth |

### What the Shell IS

- A dashboard viewer
- A navigation hub
- An observational interface
- A read-only analytics surface

### What the Shell IS NOT

- An order management system
- A workflow control panel
- A decision execution tool
- A data entry interface

---

## Navigation Hierarchy

### Primary Navigation

The Shell uses a **sidebar navigation** pattern with a flat hierarchy:

```
Platform Shell
├── App Registry (Home)
└── Dashboards
    ├── Executive
    ├── Operations
    ├── Design
    ├── Media
    └── Sales
```

### Navigation Behavior

| Behavior | Implementation |
|----------|----------------|
| **Persistence** | Sidebar is always visible in dashboard views |
| **Active State** | Current page highlighted with violet accent border |
| **Read-Only Indicator** | Persistent banner in sidebar confirms read-only mode |
| **No Nested Routes** | All dashboards are top-level, no drill-down navigation |

### Navigation Intent

Navigation should feel:
- **Predictable** — users always know where they are
- **Flat** — no hidden menus or complex hierarchies
- **Calm** — no urgency, no notifications in nav
- **Stable** — navigation structure does not change based on data

---

## Dashboard Structure

Each dashboard follows a consistent structure:

```
Dashboard Page
├── Header
│   ├── Title
│   ├── Description
│   ├── Time Period Selector (7d / 30d)
│   └── Last Updated Timestamp
├── Sections (1-4)
│   ├── Section Title
│   ├── Section Description (optional)
│   └── Card Grid (2-4 columns)
│       └── Metric/SLA/Distribution Cards
└── Access Denied State (if unauthorized)
```

### Dashboard Purposes

| Dashboard | Audience | Purpose |
|-----------|----------|---------|
| **Executive** | Leadership | High-level KPIs, SLA compliance, volume trends |
| **Operations** | Production team | Bottlenecks, stage distribution, cycle times |
| **Design** | Design team | Mockup turnaround, SLA tiers, breach tracking |
| **Media** | Media team | Asset creation, approval workflows, utilization |
| **Sales** | Sales team | Funnel conversion, drop-off analysis, volume |

### Dashboard Consistency Rules

1. All dashboards use the same header component
2. All dashboards support 7d and 30d time period selection
3. All dashboards display loading, error, and empty states consistently
4. All dashboards use M12 design tokens exclusively
5. No dashboard contains edit controls or mutation affordances

---

## App Registry

The App Registry (Home page) is the entry point to the Platform Shell.

### Registry Behavior

| Aspect | Behavior |
|--------|----------|
| **Layout** | 5-column grid of dashboard cards |
| **Icons** | Consistent outline SVG icons (28×28, stroke: 1.5) |
| **Interaction** | Click navigates to dashboard |
| **Gating** | No visible gating — RBAC handled at dashboard level |

### Registry Intent

The App Registry should feel:
- **Light** — not data-dense, purely navigational
- **Calm** — no metrics, no alerts, no urgency
- **Welcoming** — clear entry point to the platform
- **Conceptual** — presents dashboards as destinations, not tasks

### Registry Non-Goals

- No dashboard previews or thumbnails
- No metric summaries on registry cards
- No status indicators per dashboard
- No recently-viewed or favorites

---

## Search UX Intent

> **Status:** Not yet implemented  
> **When implemented, follow these guidelines:**

### Search Semantics

| Aspect | Intent |
|--------|--------|
| **Scope** | Federated across Activity Spine entities |
| **Mode** | Read-only — search surfaces data, does not modify it |
| **Results** | Links to external systems (OMS, etc.) for details |
| **Behavior** | Type-ahead with debounced queries |

### Search Boundaries

- Search does NOT open inline editors
- Search does NOT allow bulk actions
- Search does NOT support filters that imply mutation
- Search results link OUT to source systems

---

## Notification UX Intent

> **Status:** Not yet implemented  
> **When implemented, follow these guidelines:**

### Notification Semantics

| Aspect | Intent |
|--------|--------|
| **Mode** | Append-only — notifications arrive but cannot be dismissed |
| **Source** | Activity Spine events (system-generated) |
| **Behavior** | Informational only — no action buttons |
| **Persistence** | Session-scoped (no permanent notification center) |

### Notification Boundaries

- Notifications do NOT trigger actions
- Notifications do NOT contain CTAs
- Notifications do NOT require acknowledgment
- Notifications do NOT modify system state

---

## Read-Only Semantics

The Platform Shell enforces read-only semantics at multiple levels:

### Visual Signaling

| Signal | Location | Purpose |
|--------|----------|---------|
| "Read-Only Mode" banner | Sidebar footer | Persistent reminder |
| "Read-Only Mode" banner | Home page | Entry point clarity |
| No edit buttons | All dashboards | No mutation affordances |
| No form inputs | All dashboards | No data entry fields |
| No checkboxes | All dashboards | No selection for bulk action |

### Semantic Guarantees

1. **No POST/PUT/DELETE requests** — Shell only makes GET requests
2. **No optimistic updates** — Shell does not assume mutation success
3. **No local state mutations** — Shell does not maintain mutable state
4. **No workflow transitions** — Shell cannot change order/task status

### Data Freshness

| Aspect | Behavior |
|--------|----------|
| **Refresh** | Manual via retry button on error states |
| **Polling** | Not implemented (explicit refresh only) |
| **Staleness** | "Last updated" timestamp shown in header |
| **Caching** | No client-side caching of Activity Spine data |

---

## Confidence Signaling

The Shell communicates data confidence through consistent visual patterns:

### Loading States

- Skeleton placeholders match final content layout
- Pulse animation indicates pending data
- No spinners or progress bars (calmer aesthetic)

### Error States

- Clear error message with ⚠️ icon
- Retry button for manual refresh
- Error does not block other cards from rendering

### Empty States

- Neutral messaging ("No data available")
- No alarming colors or icons
- Maintains card structure for layout stability

### SLA Status Coloring

| Status | Color | Meaning |
|--------|-------|---------|
| Exceptional | Green | ≤2h turnaround |
| Standard | Yellow | 2-24h turnaround |
| Breach | Red | >24h turnaround |
| Pending | Gray | In progress |

Colors are semantic but not alarming — labels carry the primary meaning.

---

## UX Boundaries

### What the Shell Does NOT Do

| Category | Excluded Behavior |
|----------|-------------------|
| **Mutations** | No create, update, delete operations |
| **Workflow Control** | No order state transitions |
| **Business Logic** | No calculations beyond display formatting |
| **Decision Execution** | No approvals, rejections, or assignments |
| **Data Entry** | No forms, no inputs, no file uploads |
| **Bulk Actions** | No multi-select, no batch operations |
| **Inline Editing** | No editable fields or cells |
| **Notifications (active)** | No toast dismissal, no action buttons |

### What the Shell DOES Do

| Category | Included Behavior |
|----------|-------------------|
| **Observation** | Display Activity Spine metrics |
| **Navigation** | Route between dashboards |
| **Time Selection** | Switch between 7d and 30d views |
| **Error Recovery** | Retry failed data fetches |
| **Access Control** | Respect RBAC from bootstrap |

### Extension Points

The Shell is designed to be extended by:
- Adding new read-only dashboards
- Adding new metric card types
- Adding search (read-only, federated)
- Adding notifications (append-only)

Extensions must:
- Use M12 design tokens exclusively
- Maintain read-only semantics
- Follow existing component patterns
- Not introduce new dependencies

---

## Appendix: Design System Reference

The Shell uses the M12 Unified Design System. Key references:

| Resource | Location |
|----------|----------|
| Design Tokens | `/design/tokens/` |
| Components | `/design/components/` |
| Patterns | `/design/patterns/` |
| Usage Rules | `/design/brand/usage-rules.md` |
| Anti-Patterns | `/design/brand/anti-patterns.md` |

**The design system is frozen.** No new tokens, components, or patterns
may be added without a formal design review process.
