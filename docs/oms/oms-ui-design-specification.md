# OMS UI Design Specification (M8-01)

> **Version:** 1.0  
> **Status:** Authoritative  
> **Milestone:** 8  
> **Last Updated:** 2024-12-20

---

## Governance Statement

This document defines the **READ-ONLY** OMS UI surface embedded in the NSD Platform Shell.

- **READ-ONLY ONLY**: No create, update, or delete operations
- **No mutations**: OMS UI cannot modify any data
- **No workflow triggers**: OMS UI cannot initiate processes
- **No business logic**: All canonical meaning is defined in `nsd-ods-api`
- **Changes require review** by platform governance stakeholders

---

## 1. Overview

### 1.1 Purpose

The OMS (Operations Management System) UI provides **visibility only** into operational entities and their lifecycle states. It consumes canonical states and activity events defined upstream in `nsd-ods-api`.

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Read-Only** | No write paths exist in the OMS UI |
| **Observational** | Displays current state without interpretation |
| **Non-Authoritative** | Does not define business meaning |
| **Integrated** | Lives inside existing Platform Shell navigation |
| **RBAC-Aware** | Respects existing role-based access control |

### 1.3 What OMS UI Is NOT

- ❌ A workflow engine
- ❌ A data entry system
- ❌ A business rules engine
- ❌ A KPI calculator
- ❌ An authority on canonical states

---

## 2. OMS Views

### 2.1 Quotes Overview

| Attribute | Value |
|-----------|-------|
| **View Name** | Quotes Overview |
| **Path** | `/dashboard/oms/quotes` |
| **Intended Audience** | Sales, Executive, Operations |
| **Access Mode** | **READ-ONLY** ✓ |

#### Canonical Entities Shown

| Entity | Source | Description |
|--------|--------|-------------|
| Quote | `nsd-ods-api` | Sales quote records |

#### Canonical States Referenced

| State Name | State ID | Description |
|------------|----------|-------------|
| `draft` | `quote.draft` | Quote is being prepared |
| `pending_review` | `quote.pending_review` | Quote awaiting internal review |
| `sent` | `quote.sent` | Quote sent to customer |
| `accepted` | `quote.accepted` | Customer accepted quote |
| `rejected` | `quote.rejected` | Customer rejected quote |
| `expired` | `quote.expired` | Quote validity period ended |
| `converted` | `quote.converted` | Quote converted to order |

#### Activity Taxonomy IDs Consumed

| Event ID | Description |
|----------|-------------|
| `quote.created` | Quote was created |
| `quote.updated` | Quote was modified |
| `quote.sent` | Quote was sent to customer |
| `quote.accepted` | Quote was accepted |
| `quote.rejected` | Quote was rejected |
| `quote.converted` | Quote was converted to order |

#### Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│ Quotes Overview                              [READ-ONLY] 🔒 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │   Draft     │ │   Pending   │ │    Sent     │            │
│ │     12      │ │      5      │ │     28      │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Quote ID    │ Customer      │ Amount   │ State       │  │
│ ├─────────────┼───────────────┼──────────┼─────────────┤  │
│ │ Q-2024-001  │ Acme Corp     │ $5,200   │ pending     │  │
│ │ Q-2024-002  │ Beta Inc      │ $12,500  │ sent        │  │
│ │ Q-2024-003  │ Gamma LLC     │ $3,800   │ draft       │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Last activity: quote.sent (Q-2024-002) - 15 min ago        │
└─────────────────────────────────────────────────────────────┘
```

**Explicit Confirmation: READ-ONLY** ✓

---

### 2.2 Orders Overview

| Attribute | Value |
|-----------|-------|
| **View Name** | Orders Overview |
| **Path** | `/dashboard/oms/orders` |
| **Intended Audience** | Operations, Executive, Production, Sales |
| **Access Mode** | **READ-ONLY** ✓ |

#### Canonical Entities Shown

| Entity | Source | Description |
|--------|--------|-------------|
| Order | `nsd-ods-api` | Customer order records |

#### Canonical States Referenced

| State Name | State ID | Description |
|------------|----------|-------------|
| `received` | `order.received` | Order received from customer |
| `confirmed` | `order.confirmed` | Order confirmed and validated |
| `in_production` | `order.in_production` | Order currently in production |
| `quality_check` | `order.quality_check` | Order undergoing QC |
| `ready_for_shipment` | `order.ready_for_shipment` | Order ready to ship |
| `shipped` | `order.shipped` | Order has been shipped |
| `delivered` | `order.delivered` | Order delivered to customer |
| `completed` | `order.completed` | Order lifecycle complete |
| `cancelled` | `order.cancelled` | Order was cancelled |
| `on_hold` | `order.on_hold` | Order is on hold |

#### Activity Taxonomy IDs Consumed

| Event ID | Description |
|----------|-------------|
| `order.created` | Order was created |
| `order.confirmed` | Order was confirmed |
| `order.stage_advanced` | Order moved to next stage |
| `order.assigned` | Owner assigned to order |
| `order.shipped` | Order was shipped |
| `order.delivered` | Order was delivered |
| `order.completed` | Order lifecycle completed |
| `order.cancelled` | Order was cancelled |

#### Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│ Orders Overview                              [READ-ONLY] 🔒 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Pipeline Summary (counts by state):                         │
│ ┌────────┬────────┬────────┬────────┬────────┬────────┐    │
│ │Received│Confirm │In Prod │  QC    │ Ready  │Shipped │    │
│ │   8    │   12   │   45   │   7    │   15   │   23   │    │
│ └────────┴────────┴────────┴────────┴────────┴────────┘    │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Order ID    │ Customer      │ State        │ Age     │  │
│ ├─────────────┼───────────────┼──────────────┼─────────┤  │
│ │ ORD-2024-01 │ Acme Corp     │ in_production│ 3 days  │  │
│ │ ORD-2024-02 │ Beta Inc      │ quality_check│ 1 day   │  │
│ │ ORD-2024-03 │ Gamma LLC     │ received     │ 2 hours │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Last activity: order.stage_advanced - 8 min ago            │
└─────────────────────────────────────────────────────────────┘
```

**Explicit Confirmation: READ-ONLY** ✓

---

### 2.3 Production Status

| Attribute | Value |
|-----------|-------|
| **View Name** | Production Status |
| **Path** | `/dashboard/oms/production` |
| **Intended Audience** | Production, Operations, Executive |
| **Access Mode** | **READ-ONLY** ✓ |

#### Canonical Entities Shown

| Entity | Source | Description |
|--------|--------|-------------|
| Order | `nsd-ods-api` | Orders in production stages |
| Mockup | `nsd-ods-api` | Design mockups for orders |

#### Canonical States Referenced

| State Name | State ID | Description |
|------------|----------|-------------|
| `in_production` | `order.in_production` | Order currently in production |
| `quality_check` | `order.quality_check` | Order undergoing QC |
| `mockup_pending` | `mockup.pending` | Mockup awaiting creation |
| `mockup_in_progress` | `mockup.in_progress` | Mockup being created |
| `mockup_review` | `mockup.review` | Mockup awaiting approval |
| `mockup_approved` | `mockup.approved` | Mockup approved |
| `mockup_revision` | `mockup.revision` | Mockup needs revision |

#### Activity Taxonomy IDs Consumed

| Event ID | Description |
|----------|-------------|
| `order.stage_advanced` | Order moved to next stage |
| `order.assigned` | Owner assigned to order |
| `mockup.created` | Mockup was created |
| `mockup.submitted` | Mockup submitted for review |
| `mockup.approved` | Mockup was approved |
| `mockup.revision_requested` | Revision requested on mockup |
| `entity.reviewed` | Entity was reviewed |

#### Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│ Production Status                            [READ-ONLY] 🔒 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Production Pipeline:                                        │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ In Production (45) ──▶ QC (7) ──▶ Ready (15) ──▶ Ship  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Mockup Status:                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ Pending │ │In Prog  │ │ Review  │ │Approved │            │
│ │    8    │ │   12    │ │    5    │ │   67    │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                             │
│ Current Production Items:                                   │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Order       │ Stage        │ Mockup    │ Owner       │  │
│ ├─────────────┼──────────────┼───────────┼─────────────┤  │
│ │ ORD-2024-01 │ in_production│ approved  │ J. Smith    │  │
│ │ ORD-2024-02 │ quality_check│ approved  │ M. Johnson  │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Last activity: mockup.approved - 22 min ago                │
└─────────────────────────────────────────────────────────────┘
```

**Explicit Confirmation: READ-ONLY** ✓

---

### 2.4 Exceptions / Stalled Items

| Attribute | Value |
|-----------|-------|
| **View Name** | Exceptions & Stalled Items |
| **Path** | `/dashboard/oms/exceptions` |
| **Intended Audience** | Operations, Executive, Support |
| **Access Mode** | **READ-ONLY** ✓ (Observational Only) |

#### Canonical Entities Shown

| Entity | Source | Description |
|--------|--------|-------------|
| Order | `nsd-ods-api` | Orders with exceptions |
| Quote | `nsd-ods-api` | Stalled quotes |
| Mockup | `nsd-ods-api` | Overdue mockups |

#### Canonical States Referenced

| State Name | State ID | Description |
|------------|----------|-------------|
| `on_hold` | `order.on_hold` | Order is on hold |
| `exception` | `*.exception` | Entity has flagged exception |
| `stalled` | Derived | No activity beyond threshold |
| `overdue` | Derived | Past SLA threshold |

#### Activity Taxonomy IDs Consumed

| Event ID | Description |
|----------|-------------|
| `entity.exception_flagged` | Exception was flagged |
| `order.on_hold` | Order placed on hold |
| `system.error` | System error occurred |

#### Wireframe Description

```
┌─────────────────────────────────────────────────────────────┐
│ Exceptions & Stalled Items                   [READ-ONLY] 🔒 │
│                                          (Observational)    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ⚠️  This view is for observation only. No actions can be   │
│     taken from this interface.                              │
│                                                             │
│ Summary:                                                    │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │  Exceptions  │ │   Stalled    │ │   Overdue    │         │
│ │      3       │ │      7       │ │      2       │         │
│ │   ⚠️ Alert   │ │  ⏰ Warning  │ │   🔴 Critical │         │
│ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                             │
│ Exception Details:                                          │
│ ┌───────────────────────────────────────────────────────┐  │
│ │ Entity      │ Type     │ Reason           │ Age      │  │
│ ├─────────────┼──────────┼──────────────────┼──────────┤  │
│ │ ORD-2024-05 │ Order    │ Payment issue    │ 2 days   │  │
│ │ Q-2024-008  │ Quote    │ No response      │ 5 days   │  │
│ │ M-2024-012  │ Mockup   │ Revision pending │ 48 hours │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                             │
│ Note: Resolution requires action in source systems.        │
└─────────────────────────────────────────────────────────────┘
```

**Explicit Confirmation: READ-ONLY** ✓ (Observational Only)

---

## 3. UI Integration

### 3.1 Navigation Placement

The OMS views integrate into the existing Platform Shell navigation:

```
Dashboards
├── Overview
├── Executive
├── Operations
├── Design
├── Media
├── Sales
└── OMS ◀── New Section
    ├── Quotes Overview
    ├── Orders Overview
    ├── Production Status
    └── Exceptions
```

### 3.2 Visual Indicators

All OMS views must display:

| Indicator | Purpose |
|-----------|---------|
| `[READ-ONLY]` badge | Explicit confirmation of read-only mode |
| 🔒 Lock icon | Visual cue that no edits are possible |
| Last activity timestamp | Shows data freshness |
| Data source attribution | References `nsd-ods-api` as source |

### 3.3 Empty States

When no data exists:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         📋                                  │
│                                                             │
│              No [entities] to display                       │
│                                                             │
│     Data will appear here when [entities] are created       │
│              in the source system.                          │
│                                                             │
│                    [READ-ONLY VIEW]                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Data Flow

### 4.1 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   nsd-ods-api   │────▶│  Activity Spine │────▶│  OMS UI (Shell) │
│                 │     │                 │     │                 │
│ - Canonical     │     │ - Events        │     │ - READ-ONLY     │
│   States        │     │ - Timestamps    │     │ - Display only  │
│ - Entities      │     │ - Actor IDs     │     │ - No mutations  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       ▲                                               │
       │                                               │
       └───────────── NO WRITE PATH ──────────────────┘
```

### 4.2 Data Consumption Only

| Operation | Allowed |
|-----------|---------|
| Read entities | ✓ Yes |
| Read states | ✓ Yes |
| Read events | ✓ Yes |
| Create entities | ✗ No |
| Update entities | ✗ No |
| Delete entities | ✗ No |
| Trigger workflows | ✗ No |

---

## 5. References

- **[Data Dictionary](../data/data-dictionary.md)**: Schema definitions for entities
- **[Activity Event Taxonomy](../data/activity-event-taxonomy.md)**: Event type definitions
- **[OMS RBAC Specification](./oms-rbac-specification.md)**: Role-based access control
- **[Executive Dashboard Spec](../analytics/executive-dashboard-v1.md)**: Dashboard patterns

---

## Appendix: View Summary

| View | Path | Audience | Entities | Mode |
|------|------|----------|----------|------|
| Quotes Overview | `/dashboard/oms/quotes` | Sales, Exec, Ops | Quote | READ-ONLY |
| Orders Overview | `/dashboard/oms/orders` | Ops, Exec, Prod, Sales | Order | READ-ONLY |
| Production Status | `/dashboard/oms/production` | Prod, Ops, Exec | Order, Mockup | READ-ONLY |
| Exceptions | `/dashboard/oms/exceptions` | Ops, Exec, Support | Order, Quote, Mockup | READ-ONLY |

**All views are READ-ONLY. No mutations are possible.**
