# Sales Dashboard Alignment

> **Version:** 1.0  
> **Status:** Locked  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Platform Shell (M13)  
> **Aligned With:** M14 OMS UX, M28-01 Custom Quote UX, M28-02 Quote→OMS Visibility

This document aligns the Sales Dashboard to the approved Quote and OMS governance contracts.
This is a **consolidation document**, not a new UX design.

---

## Table of Contents

1. [Purpose](#purpose)
2. [Non-Negotiables](#non-negotiables)
3. [Metric-to-State Mapping](#metric-to-state-mapping)
4. [Quote Representation Rules](#quote-representation-rules)
5. [Alignment with M28-02](#alignment-with-m28-02)
6. [Anti-Patterns](#anti-patterns)
7. [Boundary Enforcement](#boundary-enforcement)

---

## Purpose

### What the Sales Dashboard IS

The Sales Dashboard is an **observational surface only**. It provides:

| Capability | Description |
|------------|-------------|
| **Funnel Visibility** | Observe Lead → Quote → Order conversion |
| **Drop-off Analysis** | Identify where prospects leave the funnel |
| **Volume Trends** | Track counts by funnel stage |
| **Conversion Metrics** | Display rates computed by Activity Spine |

### What the Sales Dashboard IS NOT

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Quote Manager** | Quote lifecycle is owned externally |
| **Order Manager** | Order lifecycle is owned by OMS |
| **CRM** | Customer relationship data is external |
| **Approval Tool** | No approval authority exists in this surface |
| **Conversion Executor** | Quote→Order conversion is external |
| **Pricing Tool** | Pricing is external to the Platform Shell |

### Dashboard Authority

| Authority | Status |
|-----------|--------|
| **Read Data** | ✅ Yes — from Activity Spine only |
| **Display Metrics** | ✅ Yes — as computed by Activity Spine |
| **Modify Quotes** | ❌ No — not possible |
| **Modify Orders** | ❌ No — not possible |
| **Trigger Workflows** | ❌ No — not possible |
| **Approve Anything** | ❌ No — not possible |

---

## Non-Negotiables

### Absolute Constraints

1. **No write flows** — Dashboard cannot create, update, or delete any data
2. **No quote editing** — Dashboard cannot modify quote content, pricing, or status
3. **No approval controls** — Dashboard cannot approve, reject, or escalate quotes
4. **No conversion controls** — Dashboard cannot convert quotes to orders
5. **No CRM assumptions** — Dashboard does not assume or integrate with CRM systems
6. **No runtime behavior** — Dashboard is documentation/observation only

### Data Source Constraint

The Sales Dashboard displays **only** data from the Activity Spine:

| Data Source | Allowed |
|-------------|---------|
| **Activity Spine** | ✅ Yes — sole source of truth |
| **Direct Quote API** | ❌ No — not accessed |
| **Direct Order API** | ❌ No — not accessed |
| **CRM API** | ❌ No — not accessed |
| **External Systems** | ❌ No — not accessed |

---

## Metric-to-State Mapping

### Funnel Stages

The Sales Dashboard displays funnel stages as computed by Activity Spine.

| Funnel Stage | Quote State (M28-01) | Order State (M14) | Visible In |
|--------------|---------------------|-------------------|------------|
| **Lead** | Pre-quote inquiry | N/A | Sales Dashboard |
| **Quote** | Quote Created, Quote Sent, Quote Viewed | N/A | Sales Dashboard |
| **Order** | Quote Converted | Order Created → subsequent states | Sales Dashboard, OMS |

### Quote States (Reference from M28-01)

The following quote states are implied by the funnel:

| Quote State | Description | Counted In Funnel Stage |
|-------------|-------------|------------------------|
| **Draft** | Quote being prepared | Not counted (internal) |
| **Sent** | Quote delivered to customer | "Quote" stage |
| **Viewed** | Customer has viewed quote | "Quote" stage |
| **Expired** | Quote validity period ended | Drop-off from "Quote" |
| **Declined** | Customer explicitly declined | Drop-off from "Quote" |
| **Converted** | Quote accepted, order created | "Order" stage |

### Order States (Reference from M14)

Orders are visible in OMS after conversion:

| Order State | Description | Visible In Sales Dashboard |
|-------------|-------------|---------------------------|
| **Created** | Order exists in system | ✅ As count in "Order" stage |
| **Design** | In design workflow | ❌ Not broken out |
| **Production** | In production | ❌ Not broken out |
| **Quality** | Quality check | ❌ Not broken out |
| **Shipping** | Being shipped | ❌ Not broken out |
| **Completed** | Delivered | ❌ Not broken out |

### What Each Metric Does NOT Imply

| Metric | Does NOT Imply |
|--------|----------------|
| **Lead Count** | Sales can create leads |
| **Quote Count** | Sales can create or edit quotes |
| **Conversion Rate** | Sales can influence conversion directly |
| **Drop-off Rate** | Sales can recover dropped prospects |
| **Order Volume** | Sales can create or modify orders |
| **Stage Duration** | Sales can accelerate stages |

---

## Quote Representation Rules

### Volume Metrics

| Metric | Representation | Constraint |
|--------|----------------|------------|
| **Quote Volume** | Count of quotes in period | Read-only observation |
| **Quotes by Stage** | Distribution across states | Read-only observation |
| **Quote Age** | Time since quote creation | Read-only observation |

### Conversion Metrics

| Metric | Representation | Constraint |
|--------|----------------|------------|
| **Quote→Order Conversion** | Percentage of quotes that became orders | Computed by Activity Spine only |
| **Stage Conversion** | Percentage progressing to next stage | Computed by Activity Spine only |
| **Overall Conversion** | Lead→Order end-to-end rate | Computed by Activity Spine only |

### Drop-off Metrics

| Metric | Representation | Constraint |
|--------|----------------|------------|
| **Drop-off by Stage** | Percentage leaving at each stage | Computed by Activity Spine only |
| **Drop-off Reasons** | NOT displayed | Would imply action capability |
| **Recoverable Quotes** | NOT displayed | Would imply action capability |

### Metric Authority Confirmation

| Statement | Confirmed |
|-----------|-----------|
| No metric implies approval authority | ✅ |
| No metric implies pricing control | ✅ |
| No metric implies conversion authority | ✅ |
| No metric implies edit capability | ✅ |
| No metric implies workflow control | ✅ |

---

## Alignment with M28-02

### Quote→OMS Visibility Contract

M28-02 establishes that **only Converted quotes are visible in OMS**.

| Rule | Sales Dashboard Alignment |
|------|--------------------------|
| **Only Converted quotes appear in OMS** | ✅ Sales Dashboard shows Order count; OMS shows order details |
| **Non-converted quotes are not in OMS** | ✅ Sales Dashboard shows Quote stage; OMS does not show these |
| **Quote origin is visible in OMS** | ✅ OMS shows "Quote Origin" for orders; Sales Dashboard shows funnel |

### Visibility Boundary

```
┌─────────────────────────────────────────────────────────────┐
│ SALES DASHBOARD                                             │
│ (Observational — funnel metrics only)                       │
│                                                             │
│ Lead ──► Quote ──► Order (count only)                       │
│                      │                                      │
│                      │ Conversion (external process)        │
│                      ▼                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
                       │ M28-02 Visibility Contract
                       │ (Only Converted quotes cross this boundary)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ OMS                                                         │
│ (Observational — order lifecycle visibility)                │
│                                                             │
│ Order Created ──► Design ──► Production ──► Shipping ──► ✓  │
│                                                             │
│ Quote Origin Panel: Shows source quote (read-only)          │
└─────────────────────────────────────────────────────────────┘
```

### Non-Contradiction Rules

| Rule | Enforcement |
|------|-------------|
| Sales Dashboard Order count = OMS Order count for period | ✅ Both read from Activity Spine |
| No quote details visible in Sales Dashboard that aren't in Quote system | ✅ Dashboard shows counts only |
| No order details visible in Sales Dashboard that contradict OMS | ✅ Dashboard shows counts only |

---

## Anti-Patterns

### Prohibited Sales UX Patterns

The following mental models and UX patterns are **explicitly prohibited**:

#### "Approve Quote" Mental Model

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| "Approve this quote" button | Sales Dashboard has no approval authority |
| "Mark as reviewed" action | Implies quote state mutation |
| "Ready for customer" toggle | Implies workflow control |
| Approval status filters implying action | Filters are observational only |

#### "Fix Quote" Assumptions

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| "Edit quote" link | Dashboard cannot edit quotes |
| "Correct pricing" action | Dashboard has no pricing authority |
| "Update customer info" form | Dashboard has no data entry |
| Inline quote editing | Violates read-only semantics |

#### Sales-Driven Lifecycle Transitions

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| "Convert to order" button | Conversion is external |
| "Send to customer" action | Quote delivery is external |
| "Move to next stage" control | Stage transitions are external |
| "Escalate quote" button | Escalation is external |
| Drag-and-drop stage changes | Implies mutation |

#### CRM Integration Assumptions

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| "Sync with CRM" button | No CRM integration exists |
| "Update Salesforce" action | No CRM integration exists |
| Customer 360 views | Customer data is external |
| Activity logging to CRM | Dashboard doesn't write |

#### Implied Action Metrics

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| "Quotes needing follow-up" list | Implies action queue |
| "At-risk quotes" with action buttons | Implies intervention capability |
| "Recommended actions" panel | Dashboard doesn't recommend actions |
| "Win probability" with "Improve" button | Implies optimization control |

### Visual Anti-Patterns

| Anti-Pattern | Why Prohibited |
|--------------|----------------|
| Edit icons (pencil) anywhere | Implies editability |
| Action buttons of any kind | Dashboard is observational |
| Forms or input fields | No data entry allowed |
| Checkboxes for selection | No bulk actions exist |
| Context menus with actions | No actions available |

---

## Boundary Enforcement

### System Ownership

| Lifecycle | System of Record | Sales Dashboard Authority |
|-----------|------------------|--------------------------|
| **Lead Lifecycle** | External (Marketing/CRM) | None — observation only |
| **Quote Lifecycle** | Quote System (M28-01) | None — observation only |
| **Order Lifecycle** | OMS Backend (M14) | None — observation only |

### Where Sales Authority Ends

Sales authority in the Platform Shell context is **strictly observational**:

| Boundary | Description |
|----------|-------------|
| **Data Creation** | Sales cannot create leads, quotes, or orders via Dashboard |
| **Data Modification** | Sales cannot edit any entity via Dashboard |
| **State Transitions** | Sales cannot change quote or order states via Dashboard |
| **Workflow Triggers** | Sales cannot initiate workflows via Dashboard |
| **Approvals** | Sales cannot approve anything via Dashboard |
| **External Actions** | Sales cannot trigger emails, notifications, or integrations |

### Interaction Boundaries

| User Action | Dashboard Response |
|-------------|-------------------|
| Click funnel stage | No drill-down (future: may link to filtered view) |
| Click metric card | No action (display only) |
| Hover on data point | Tooltip with values (no action) |
| Right-click | No context menu |
| Keyboard shortcuts | None defined (no actions to trigger) |

### Data Boundaries

| Data Type | Visible in Sales Dashboard | Editable |
|-----------|---------------------------|----------|
| **Funnel counts** | ✅ Yes | ❌ No |
| **Conversion rates** | ✅ Yes | ❌ No |
| **Drop-off rates** | ✅ Yes | ❌ No |
| **Quote details** | ❌ No (counts only) | ❌ No |
| **Order details** | ❌ No (counts only) | ❌ No |
| **Customer information** | ❌ No | ❌ No |
| **Pricing information** | ❌ No | ❌ No |

---

## Appendix: Sales Dashboard Current Implementation

Reference: `/app/dashboard/sales/page.tsx`

### Current Widgets

| Widget | Data Source | Read-Only |
|--------|-------------|-----------|
| Lead → Quote → Order Funnel | `OrderFunnel` from Activity Spine | ✅ |
| Overall Conversion Rate | Computed from `OrderFunnel` | ✅ |
| Orders Volume | `OrderMetrics` from Activity Spine | ✅ |
| Drop-off by Stage | Computed from `FunnelStage.dropOffRate` | ✅ |
| Volume by Stage | `FunnelStage.count` values | ✅ |

### Confirmed Compliance

| Requirement | Status |
|-------------|--------|
| No edit controls | ✅ Compliant |
| No action buttons | ✅ Compliant |
| No form inputs | ✅ Compliant |
| Data from Activity Spine only | ✅ Compliant |
| Role-based access via DashboardGuard | ✅ Compliant |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | Platform Team | Initial alignment document |

---

*This document aligns Sales Dashboard to M28 contracts. It does not introduce new UX surfaces or capabilities.*
