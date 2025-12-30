# OMS UX Specification

> **Version:** 1.0  
> **Status:** Locked (M14-01)  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Platform Shell (M13)

This document defines the UX contract for the Order Management System (OMS) UI.
The OMS is a **read-only observational interface** that surfaces order lifecycle
data for situational awareness and decision support.

---

## Table of Contents

1. [Overview](#overview)
2. [OMS vs Platform Shell](#oms-vs-platform-shell)
3. [OMS Surfaces](#oms-surfaces)
   - [Orders List View](#orders-list-view)
   - [Order Detail View](#order-detail-view)
   - [Exceptions View](#exceptions-view)
   - [Activity Timeline](#activity-timeline)
4. [Component Reuse Mapping](#component-reuse-mapping)
5. [Read-Only Semantics](#read-only-semantics)
6. [Write-Safe Guarantees](#write-safe-guarantees)
7. [UX Boundaries](#ux-boundaries)
8. [Extension Points](#extension-points)

---

## Overview

### Purpose

The OMS provides **observational visibility** into order lifecycle, enabling humans to:

| Capability | Description |
|------------|-------------|
| **Locate** | Understand where an order is in its lifecycle |
| **Contextualize** | Understand why an order is in its current state |
| **Trace** | Review the complete history of events and transitions |
| **Identify** | Surface exceptions and anomalies requiring attention |
| **Attribute** | Know which system owns the next action |

### Non-Purpose

The OMS explicitly does NOT enable:

| Excluded Capability | Rationale |
|---------------------|-----------|
| State transitions | Mutations belong to backend workflows |
| Data editing | OMS is observational, not operational |
| Workflow triggering | OMS surfaces data, it does not control flow |
| Decision execution | Decisions are made elsewhere and observed here |
| Bulk operations | No multi-select, no batch processing |

### Core Principles

1. **Confidence over Speed** — Accurate data presentation trumps fast interactions
2. **Clarity over Density** — White space and hierarchy improve comprehension
3. **Observation over Control** — Every screen is read-only by design
4. **Traceability over Summarization** — Full history is always accessible
5. **Calm over Urgent** — Exceptions are factual, not alarming

---

## OMS vs Platform Shell

The OMS operates within the Platform Shell but serves a distinct purpose.

### Responsibility Matrix

| Aspect | Platform Shell | OMS |
|--------|----------------|-----|
| **Scope** | Cross-functional dashboards | Order-specific deep inspection |
| **Granularity** | Aggregate metrics | Individual order detail |
| **Navigation** | Dashboard selection | Order discovery and drill-down |
| **Data Model** | Activity Spine summaries | Order lifecycle events |
| **Primary User** | Executives, team leads | Operations, support, fulfillment |

### Visual Relationship

```
Platform Shell
├── App Registry (Home)
├── Dashboards
│   ├── Executive
│   ├── Operations
│   ├── Design
│   ├── Media
│   └── Sales
└── OMS  ← NEW
    ├── Orders List
    ├── Order Detail
    ├── Exceptions
    └── Activity Timeline
```

### Shared Elements

OMS inherits from Platform Shell:
- Sidebar navigation structure
- Header component patterns
- Read-only mode indicator
- M12 design tokens (colors, typography, spacing)
- Card, Table, StatusPill components

### Distinct Elements

OMS introduces (using M12 patterns only):
- Order-centric list views
- Lifecycle timeline visualization
- Exception surfacing patterns
- Metadata inspection panels

---

## OMS Surfaces

### Orders List View

#### Purpose

Provide situational awareness across all orders. Enable discovery and navigation
to individual order details without implying selection or action capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ Orders                                           [Filters ▾] │
│ Observational list of all orders                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Order ID │ Type │ State │ SLA Status │ Source │ Updated │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ORD-001  │ Std  │ Prod  │ ● On Track │ Web    │ 2h ago  │ │
│ │ ORD-002  │ Rush │ Ship  │ ● Breach   │ Phone  │ 1h ago  │ │
│ │ ORD-003  │ Std  │ Design│ ● Pending  │ Email  │ 30m ago │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Showing 1-50 of 234 orders                    [← Prev] [Next →] │
└─────────────────────────────────────────────────────────────┘
```

#### Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| **Order ID** | Canonical identifier, clickable for detail | Yes |
| **Type** | Order classification (Standard, Rush, Custom, etc.) | Yes |
| **Current State** | Lifecycle state from Activity Spine | Yes |
| **SLA Status** | StatusPill showing compliance (On Track, At Risk, Breach) | Yes |
| **Source** | Origin channel (Web, Phone, Email, API) | Yes |
| **Last Updated** | Relative timestamp of last event | Yes |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Row Click** | Navigates to Order Detail View |
| **Sorting** | Client-side only, no server requests on sort |
| **Filtering** | Observational filters (by state, type, status) |
| **Pagination** | Server-side, standard page navigation |
| **Row Hover** | Subtle background change (M12 hover token) |
| **No Row Selection** | No checkboxes, no multi-select |
| **No Bulk Actions** | No action bar, no batch operations |

#### Filter Panel

Filters are observational refinements, not action triggers:

| Filter | Type | Options |
|--------|------|---------|
| **State** | Multi-select chips | All lifecycle states |
| **Type** | Multi-select chips | Order type taxonomy |
| **SLA Status** | Multi-select chips | On Track, At Risk, Breach, Pending |
| **Source** | Multi-select chips | All origin channels |
| **Date Range** | Date picker | Preset ranges (7d, 30d, 90d, Custom) |

Filter UI uses M12 Button (ghost variant) and StatusPill components.

#### Empty State

```
No orders match the current filters.
Adjust filters or clear all to see orders.
```

Uses M12 empty state pattern: centered, muted text, no alarming colors.

---

### Order Detail View

#### Purpose

Provide comprehensive inspection of a single order. Surface all relevant
context, history, and exceptions without offering any mutation capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Orders                                             │
│                                                              │
│ Order ORD-12345                                              │
│ Standard Order • Created 2024-01-15                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────┐  ┌────────────────────────────────┐ │
│ │ ORDER HEADER        │  │ LIFECYCLE TIMELINE             │ │
│ │                     │  │                                │ │
│ │ Status: Production  │  │ ○ Order Created                │ │
│ │ SLA: ● On Track     │  │ │ Jan 15, 10:00 AM             │ │
│ │ Owner: Production   │  │ ○ Design Completed             │ │
│ │                     │  │ │ Jan 15, 2:30 PM              │ │
│ └─────────────────────┘  │ ● Production Started           │ │
│                          │   Jan 16, 9:00 AM              │ │
│ ┌─────────────────────┐  └────────────────────────────────┘ │
│ │ METADATA            │                                     │
│ │                     │  ┌────────────────────────────────┐ │
│ │ Customer: Acme Co   │  │ EXCEPTIONS (1)                 │ │
│ │ Source: Web         │  │                                │ │
│ │ Priority: Normal    │  │ ⚠ Material Delay               │ │
│ │ ...                 │  │   Aluminum stock backordered   │ │
│ └─────────────────────┘  │   Detected: Jan 16, 11:00 AM   │ │
│                          └────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ACTIVITY FEED                                           │ │
│ │                                                         │ │
│ │ Jan 16, 11:00 AM • System                               │ │
│ │ Exception detected: Material delay                      │ │
│ │                                                         │ │
│ │ Jan 16, 9:00 AM • Production System                     │ │
│ │ Production stage entered                                │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Sections

##### Order Header

| Field | Description |
|-------|-------------|
| **Order ID** | Canonical identifier (prominent, H1 style) |
| **Order Type** | Classification badge |
| **Created Date** | Original creation timestamp |
| **Current State** | Lifecycle state with StatusPill |
| **SLA Status** | Compliance indicator with StatusPill |
| **System Owner** | Which system owns the next action |

Uses M12 Card component with no variant (neutral header).

##### Lifecycle Timeline

Visualizes the order's journey through states using M12 Timeline pattern.

| Element | Specification |
|---------|---------------|
| **Events** | Chronological, newest at bottom (append-only) |
| **Indicators** | Status-colored dots per M12 StatusPill variants |
| **Timestamps** | Absolute datetime with relative hint |
| **Connectors** | Vertical line connecting events |
| **No Interaction** | Timeline is read-only, no expand/collapse |

Event types to display:
- State transitions
- Milestone completions
- System handoffs
- SLA status changes

##### Metadata Panel

Displays immutable order attributes using M12 MetadataPanel pattern.

| Group | Fields |
|-------|--------|
| **Order Info** | ID, Type, Priority, Source, Created |
| **Customer** | Name, Account ID, Contact (if available) |
| **Fulfillment** | Ship Method, Address (read-only display) |
| **Financials** | Total, Currency (no breakdowns in OMS) |

All fields are read-only. No edit icons, no hover states implying editability.

##### Exceptions Panel

Displays active exceptions using M12 ExceptionPanel pattern.

| Element | Specification |
|---------|---------------|
| **Severity** | Info, Warning, Critical (via left border) |
| **Title** | Exception type name |
| **Description** | Brief factual description |
| **Timestamp** | When exception was detected |
| **No Actions** | No resolve, dismiss, or acknowledge buttons |

Empty state: "No active exceptions" with success-tinted background.

##### Activity Feed

Chronological log of all events using M12 Timeline pattern (compact variant).

| Element | Specification |
|---------|---------------|
| **Timestamp** | Datetime of event |
| **Actor** | System or user that generated event |
| **Description** | What happened |
| **No Annotations** | Users cannot add comments |
| **Append-Only** | New events appear at top, history is immutable |

---

### Exceptions View

#### Purpose

Provide focused visibility into orders with active exceptions. Enable
risk assessment without implying resolution capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ Exceptions                                       [Filters ▾] │
│ Orders with active exceptions requiring attention            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CRITICAL (2)                                            │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ORD-456 • Production Halt                           │ │ │
│ │ │ Equipment failure in cutting station                │ │ │
│ │ │ Detected: 2 hours ago                               │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ORD-789 • SLA Breach                                │ │ │
│ │ │ Order exceeded 48-hour production window            │ │ │
│ │ │ Detected: 4 hours ago                               │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WARNING (5)                                             │ │
│ │ ...                                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Structure

Exceptions are grouped by severity:
1. **Critical** — Requires immediate awareness
2. **Warning** — Requires monitoring
3. **Info** — Informational anomalies

Each group uses M12 DashboardSection pattern with count in header.

#### Exception Card

| Element | Specification |
|---------|---------------|
| **Order ID** | Clickable link to Order Detail |
| **Exception Type** | Category name |
| **Description** | Factual explanation |
| **Detected Time** | When exception was raised |
| **Severity Indicator** | Left border color (M12 semantic colors) |
| **No Actions** | No resolve, escalate, or dismiss buttons |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Order Click** | Navigates to Order Detail View |
| **Filtering** | By severity, exception type, date range |
| **Sorting** | By severity (default), by date |
| **No Selection** | No checkboxes, no bulk operations |
| **Auto-Refresh** | Not implemented (explicit refresh only) |

#### Visual Treatment

- Exceptions are **calm and factual**, not urgent or alarming
- Red is used sparingly (severity indicator only)
- No pulsing, flashing, or attention-grabbing animations
- Empty state: "No active exceptions" with neutral styling

---

### Activity Timeline

#### Purpose

Provide complete traceability of order lifecycle events. Enable auditing
and investigation without allowing modification or annotation.

#### Layout Intent

The Activity Timeline appears within Order Detail View (see above) but
can also be accessed as a standalone filtered view.

#### Standalone View

```
┌─────────────────────────────────────────────────────────────┐
│ Activity Timeline                                [Filters ▾] │
│ Chronological events across all orders                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Jan 16, 2024                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 11:00 AM • ORD-456 • System                             │ │
│ │ Exception detected: Equipment failure                   │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 10:30 AM • ORD-123 • Production System                  │ │
│ │ State transition: Production → Quality Check            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 9:00 AM • ORD-789 • Design System                       │ │
│ │ Mockup approved                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Jan 15, 2024                                                 │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Event Structure

| Field | Description |
|-------|-------------|
| **Timestamp** | Absolute datetime |
| **Order ID** | Clickable link to Order Detail |
| **Actor** | System, service, or user attribution |
| **Event Type** | Category of event |
| **Description** | What happened |

#### Event Types

| Type | Examples |
|------|----------|
| **State Transition** | Order moved from Design to Production |
| **Milestone** | Mockup completed, Shipment created |
| **Exception** | SLA breach detected, Material delay |
| **Assignment** | Order assigned to production queue |
| **External** | Customer contacted, Payment received |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Chronological** | Newest first (descending) |
| **Grouping** | By date (collapsible sections) |
| **Filtering** | By order, event type, date range, actor |
| **No Editing** | Events cannot be modified or deleted |
| **No Annotations** | Users cannot add comments or notes |
| **System Attribution** | Every event shows its source system |

---

## Component Reuse Mapping

OMS must exclusively reuse M12 design system components.

### Token Usage

| OMS Element | M12 Token |
|-------------|-----------|
| Page background | `background.page` |
| Card background | `background.surface` |
| Primary text | `text.primary` |
| Secondary text | `text.secondary` |
| Muted text | `text.muted` |
| Borders | `border.default` |
| SLA indicators | `statusColors.*` |
| Exception severity | `semantic.*` |

### Component Mapping

| OMS Surface | M12 Components Used |
|-------------|---------------------|
| **Orders List** | Table, TableHeader, TableBody, TableRow, TableCell, StatusPill, Button (ghost) |
| **Order Header** | Card, StatusPill |
| **Lifecycle Timeline** | Timeline, StatusPill |
| **Metadata Panel** | MetadataPanel |
| **Exceptions Panel** | ExceptionPanel, Card |
| **Activity Feed** | Timeline (compact) |
| **Filters** | Button (ghost), StatusPill |
| **Pagination** | Button (secondary) |
| **Empty States** | Card with muted text |
| **Access Denied** | AccessDenied component |

### Pattern Mapping

| OMS Pattern | M12 Pattern |
|-------------|-------------|
| Order detail layout | Two-column responsive grid |
| Exception grouping | DashboardSection with count |
| Timeline visualization | Timeline pattern |
| Metadata display | MetadataPanel pattern |
| Exception cards | ExceptionPanel pattern |

### Forbidden Components

OMS must NOT use or create:
- Form inputs (text, select, checkbox, radio)
- Modal dialogs for core data
- Inline edit controls
- Action buttons (Save, Submit, Approve, etc.)
- Confirmation dialogs
- Toast notifications for mutations

---

## Read-Only Semantics

OMS enforces read-only semantics at every layer.

### API Contract

| HTTP Method | Allowed | Purpose |
|-------------|---------|---------|
| **GET** | ✅ Yes | Fetch order data, lists, events |
| **POST** | ❌ No | No creation |
| **PUT** | ❌ No | No updates |
| **PATCH** | ❌ No | No partial updates |
| **DELETE** | ❌ No | No deletion |

### UI Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **No editable fields** | All data displayed as text, never in inputs |
| **No action buttons** | No Save, Submit, Approve, Reject, Cancel |
| **No confirmation dialogs** | Nothing that implies mutation completion |
| **No optimistic updates** | UI never assumes backend mutation |
| **No local mutation state** | No React state for editable data |
| **No selection for action** | Checkboxes are never present |

### Visual Signaling

| Signal | Location |
|--------|----------|
| "Read-Only" indicator | Sidebar footer (inherited from Shell) |
| No edit icons | Nowhere in OMS |
| No hover states implying edit | Metadata, timeline, etc. |
| Cursor: default | No pointer cursor on non-navigational elements |

---

## Write-Safe Guarantees

OMS is **write-safe by default**. A user cannot accidentally trigger mutations.

### Guarantee Matrix

| User Action | System Response |
|-------------|-----------------|
| Click on order row | Navigate to detail (read-only) |
| Click on filter | Refine displayed data (client-side) |
| Click on sort column | Reorder displayed data (client-side) |
| Click on pagination | Fetch next page (GET only) |
| Click on timeline event | No action (display only) |
| Click on exception | No action (display only) |
| Click on metadata | No action (display only) |

### No Accidental Mutations

| Protection | Implementation |
|------------|----------------|
| **No double-click handlers** | Clicks never trigger mutations |
| **No keyboard shortcuts** | No Ctrl+S, no Enter to submit |
| **No drag-and-drop** | No reordering that implies persistence |
| **No context menus** | Right-click does nothing special |
| **No form submission** | No forms exist |

---

## UX Boundaries

### What OMS Does

| Capability | Description |
|------------|-------------|
| **Display orders** | List and detail views |
| **Show lifecycle** | Timeline of state transitions |
| **Surface exceptions** | Grouped by severity |
| **Present metadata** | All order attributes |
| **Enable navigation** | Between orders and views |
| **Support filtering** | Observational refinement |
| **Allow sorting** | Client-side column sorting |
| **Provide attribution** | System-of-record visibility |

### What OMS Does NOT Do

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Change order state** | Mutations are backend-only |
| **Edit order data** | OMS is observational |
| **Trigger workflows** | No action buttons |
| **Execute decisions** | Decisions happen elsewhere |
| **Bulk operations** | No multi-select, no batch |
| **Create orders** | Order creation is external |
| **Delete orders** | Deletion is external |
| **Add comments** | Activity feed is append-only from systems |
| **Upload files** | No file operations |
| **Send notifications** | OMS reads, it doesn't write |
| **Manage users** | User management is external |
| **Configure settings** | No settings in OMS |

### Boundary Enforcement

If a feature request implies any of the following, it is OUT OF SCOPE:

- "Allow users to..."
- "Let operators..."
- "Enable staff to..."
- "Trigger when..."
- "Send a notification..."
- "Update the record..."
- "Mark as..."
- "Assign to..."
- "Resolve..."

---

## Extension Points

Future extensions must maintain read-only semantics.

### Allowed Extensions

| Extension | Conditions |
|-----------|------------|
| **New order types** | Display only, no type-specific actions |
| **New metadata fields** | Read-only display in MetadataPanel |
| **New exception types** | Informational display only |
| **New event types** | Append to timeline, no interaction |
| **New filters** | Observational refinement only |
| **Search** | Read-only federated search |
| **Export** | Read-only data export (CSV, PDF) |

### Forbidden Extensions

| Extension | Why Forbidden |
|-----------|---------------|
| **Inline editing** | Violates read-only semantics |
| **Quick actions** | Implies mutation capability |
| **Approval workflows** | OMS is not a control plane |
| **Assignment UI** | Assignment is external |
| **Status toggles** | State changes are external |
| **Comment threads** | OMS doesn't write |
| **File attachments** | OMS doesn't write |

### Extension Process

Any extension to OMS UX must:
1. Maintain read-only semantics
2. Use M12 components exclusively
3. Follow existing layout patterns
4. Document in this specification
5. Pass UX review before implementation

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Activity Spine** | Central event bus and data source |
| **Canonical State** | Authoritative lifecycle state from Activity Spine |
| **Exception** | Detected anomaly or risk condition |
| **Lifecycle** | Ordered sequence of states an order passes through |
| **Metadata** | Immutable attributes of an order |
| **Mutation** | Any create, update, or delete operation |
| **Observational** | Read-only visibility without control |
| **SLA** | Service Level Agreement / compliance status |
| **System Owner** | The system responsible for the next action |
| **Write-Safe** | Guaranteed inability to accidentally mutate |

---

## Appendix: Design System Reference

OMS uses M12 design tokens and components exclusively.

| Resource | Path |
|----------|------|
| Color Tokens | `/design/tokens/colors.ts` |
| Typography Tokens | `/design/tokens/typography.ts` |
| Spacing Tokens | `/design/tokens/spacing.ts` |
| Button Component | `/design/components/Button.tsx` |
| Card Component | `/design/components/Card.tsx` |
| Table Components | `/design/components/Table.tsx` |
| StatusPill Component | `/design/components/StatusPill.tsx` |
| Timeline Pattern | `/design/patterns/Timeline.tsx` |
| MetadataPanel Pattern | `/design/patterns/MetadataPanel.tsx` |
| ExceptionPanel Pattern | `/design/patterns/ExceptionPanel.tsx` |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial specification (M14-01) |

**This specification is LOCKED.** Changes require formal UX review.
