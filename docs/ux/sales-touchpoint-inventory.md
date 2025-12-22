# Sales Touchpoint Inventory

> **Version:** 1.0  
> **Status:** Locked  
> **Design System:** M12 (Frozen)  
> **Aligned With:** M14 OMS UX, M28-01 Custom Quote UX, M28-02 Quote→OMS Visibility

This document inventories all current and implied Sales touchpoints across the NSD platform.
This is a **consolidation document**, not a new UX design.

---

## Table of Contents

1. [Purpose](#purpose)
2. [Touchpoint Inventory](#touchpoint-inventory)
3. [Touchpoint Details](#touchpoint-details)
4. [Visibility Classification](#visibility-classification)
5. [Boundary Enforcement](#boundary-enforcement)
6. [Risk Registry](#risk-registry)

---

## Purpose

### What This Document Does

| Purpose | Description |
|---------|-------------|
| **Inventory** | Catalog all Sales-related touchpoints |
| **Classify** | Define visibility type and access mode for each |
| **Clarify** | Establish which systems own which data |
| **Align** | Ensure all touchpoints respect M28 contracts |

### What This Document Does NOT Do

| Excluded Purpose | Rationale |
|------------------|-----------|
| **Define new touchpoints** | This is inventory, not design |
| **Specify implementations** | Implementation is separate |
| **Assume future tools** | No speculation about M29+ |
| **Define runtime behavior** | Runtime is out of scope |

---

## Touchpoint Inventory

### Summary Table

| Touchpoint | System of Record | Visibility Type | Access Mode | Primary User |
|------------|------------------|-----------------|-------------|--------------|
| Custom Quote Form | Quote System | Authoritative | Write (customer) | Customer |
| Quote Confirmation Email | Quote System | Contextual | Read-only | Customer |
| Platform Shell (Sales Dashboard) | Activity Spine | Contextual | Read-only | Sales Team |
| OMS (Quote Origin Panel) | OMS Backend | Contextual | Read-only | Operations |
| Email (Manual) | External | Contextual | Read/Write | Sales Team |
| Trello (Manual) | External | Contextual | Read/Write | Sales Team |
| Phone/In-Person | External | N/A | N/A | Sales Team |

---

## Touchpoint Details

### 1. Custom Quote Form

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Custom Quote Form |
| **System of Record** | Quote System (M28-01) |
| **Visibility Type** | Authoritative |
| **Access Mode** | Write (customer-initiated) |
| **Primary User Role** | Customer (external) |
| **Location** | Customer-facing website |

#### Capabilities

| Capability | Status |
|------------|--------|
| Submit quote request | ✅ Customer can submit |
| View quote status | ❌ Not in this touchpoint |
| Edit submitted quote | ❌ Not possible |
| Cancel quote request | ❌ Not in this touchpoint |

#### Data Flow

```
Customer ──► Custom Quote Form ──► Quote System ──► Activity Spine
                                                          │
                                                          ▼
                                                   Sales Dashboard
                                                   (as funnel metric)
```

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Customer confusion about status | Medium | Quote confirmation email |
| Duplicate submissions | Low | Form validation |
| Incomplete information | Medium | Required field validation |

---

### 2. Quote Confirmation Email

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Quote Confirmation / Status Email |
| **System of Record** | Quote System (M28-01) |
| **Visibility Type** | Contextual |
| **Access Mode** | Read-only (customer receives) |
| **Primary User Role** | Customer (external) |
| **Location** | Email delivery |

#### Capabilities

| Capability | Status |
|------------|--------|
| Receive confirmation | ✅ Automatic on submission |
| View quote summary | ✅ In email body |
| Track quote status | ❌ Email is point-in-time |
| Reply to modify | ❌ Not a supported workflow |

#### Data Flow

```
Quote System ──► Email Service ──► Customer Inbox
      │
      └──► Activity Spine (email sent event)
```

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Email delivery failure | Medium | Delivery tracking |
| Customer replies expecting action | Medium | Clear "do not reply" messaging |
| Outdated information if quote changes | Low | Emails are snapshots |

---

### 3. Platform Shell (Sales Dashboard)

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Sales Dashboard |
| **System of Record** | Activity Spine |
| **Visibility Type** | Contextual (aggregated metrics) |
| **Access Mode** | Read-only |
| **Primary User Role** | Sales Team (internal) |
| **Location** | Platform Shell |

#### Capabilities

| Capability | Status |
|------------|--------|
| View funnel metrics | ✅ Observation only |
| View conversion rates | ✅ Observation only |
| View drop-off analysis | ✅ Observation only |
| Modify quotes | ❌ Not possible |
| Modify orders | ❌ Not possible |
| Trigger actions | ❌ Not possible |

#### Data Flow

```
Activity Spine ──► Sales Dashboard ──► Sales Team (visual consumption)

No data flows FROM Sales Dashboard to any system.
```

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Misinterpretation as action tool | Medium | Clear read-only signaling |
| Expectation of drill-down to quotes | Medium | Document limitations |
| Confusion about metric ownership | Low | Clear Activity Spine attribution |

#### Alignment Reference

See: [Sales Dashboard Alignment](./sales-dashboard-alignment.md)

---

### 4. OMS (Quote Origin Panel)

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Quote Origin Panel (within Order Detail) |
| **System of Record** | OMS Backend |
| **Visibility Type** | Contextual (reference only) |
| **Access Mode** | Read-only |
| **Primary User Role** | Operations (internal) |
| **Location** | OMS Order Detail View |

#### Capabilities

| Capability | Status |
|------------|--------|
| View source quote ID | ✅ For converted quotes only |
| View quote submission date | ✅ Reference only |
| View customer from quote | ✅ Reference only |
| Navigate to quote | ❌ No link (quote system is external) |
| Modify quote | ❌ Not possible |

#### Data Flow

```
Quote System ──► (Conversion) ──► OMS ──► Quote Origin Panel
                                              │
                                              ▼
                                         Operations Team
                                         (contextual reference)
```

#### Visibility Boundary (M28-02)

| Rule | Enforcement |
|------|-------------|
| Only Converted quotes visible | ✅ By design |
| Quote details are reference only | ✅ No edit capability |
| No link back to quote system | ✅ Boundary respected |

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Expectation of quote edit from OMS | Medium | Clear read-only display |
| Stale quote data if not synced | Low | Data flows from quote at conversion |
| Confusion about quote vs order | Low | Clear panel labeling |

---

### 5. External Tools: Email (Manual)

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Email Communication |
| **System of Record** | External (email provider) |
| **Visibility Type** | Contextual (not integrated) |
| **Access Mode** | Read/Write (manual) |
| **Primary User Role** | Sales Team (internal) |
| **Location** | External email client |

#### Capabilities

| Capability | Status |
|------------|--------|
| Send emails to customers | ✅ Manual process |
| Receive customer inquiries | ✅ Manual process |
| Log activity to quote system | ❌ Not integrated |
| Trigger quote status changes | ❌ Not integrated |

#### Data Flow

```
Sales Team ◄──► Email ◄──► Customer

No integration with Quote System or Activity Spine.
Activity is not captured in platform metrics.
```

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Activity not captured in funnel | High | Accept as limitation |
| Inconsistent customer communication | Medium | Sales process training |
| No audit trail in platform | Medium | Email retention policies |

---

### 6. External Tools: Trello (Manual)

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Trello Board (Sales Pipeline) |
| **System of Record** | External (Trello) |
| **Visibility Type** | Contextual (not integrated) |
| **Access Mode** | Read/Write (manual) |
| **Primary User Role** | Sales Team (internal) |
| **Location** | External Trello application |

#### Capabilities

| Capability | Status |
|------------|--------|
| Track sales pipeline manually | ✅ Manual process |
| Move cards between stages | ✅ Manual process |
| Sync with quote system | ❌ Not integrated |
| Reflect in Sales Dashboard | ❌ Not integrated |

#### Data Flow

```
Sales Team ──► Trello ──► Sales Team (visual tracking)

No integration with Quote System or Activity Spine.
Trello state may diverge from system of record.
```

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Trello diverges from quote system | High | Accept as limitation; Trello is informal |
| Duplicate data entry | Medium | Process discipline |
| False sense of pipeline accuracy | Medium | Clear that Dashboard is authoritative |

---

### 7. External: Phone/In-Person

#### Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Phone / In-Person Communication |
| **System of Record** | N/A |
| **Visibility Type** | N/A |
| **Access Mode** | N/A |
| **Primary User Role** | Sales Team (internal) |
| **Location** | Physical / Phone |

#### Capabilities

| Capability | Status |
|------------|--------|
| Communicate with customers | ✅ Manual process |
| Log activity to systems | ❌ Not integrated |
| Trigger quote actions | ❌ Must use quote system |

#### Known Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Activity not captured | High | Accept as limitation |
| Commitments made offline | Medium | Process training |
| No visibility to platform | High | Accept as limitation |

---

## Visibility Classification

### Authoritative vs Contextual

| Classification | Definition | Examples |
|----------------|------------|----------|
| **Authoritative** | System of record; source of truth | Quote System, OMS Backend |
| **Contextual** | Displays data from authoritative source; read-only | Sales Dashboard, Quote Origin Panel |

### Touchpoint Classification Matrix

| Touchpoint | Creates Data | Owns Data | Displays Data | Modifies Data |
|------------|--------------|-----------|---------------|---------------|
| Custom Quote Form | ✅ | ❌ (Quote System owns) | ❌ | ❌ |
| Quote Confirmation Email | ❌ | ❌ | ✅ (snapshot) | ❌ |
| Sales Dashboard | ❌ | ❌ | ✅ (aggregated) | ❌ |
| OMS Quote Origin Panel | ❌ | ❌ | ✅ (reference) | ❌ |
| Email (Manual) | ❌ | ❌ | ❌ | ❌ |
| Trello (Manual) | ❌ | ❌ | ❌ | ❌ |

### Read-Only vs Write-Safe

| Touchpoint | Read-Only | Write-Safe | Notes |
|------------|-----------|------------|-------|
| Custom Quote Form | ❌ | N/A | Customer write interface |
| Quote Confirmation Email | ✅ | ✅ | No actions possible |
| Sales Dashboard | ✅ | ✅ | Guaranteed no mutations |
| OMS Quote Origin Panel | ✅ | ✅ | Guaranteed no mutations |
| Email (Manual) | ❌ | ❌ | External; can write |
| Trello (Manual) | ❌ | ❌ | External; can write |

---

## Boundary Enforcement

### System Ownership

| Lifecycle | System of Record | Authoritative Touchpoint |
|-----------|------------------|-------------------------|
| **Quote Lifecycle** | Quote System | Custom Quote Form (creation) |
| **Order Lifecycle** | OMS Backend | OMS (post-conversion) |
| **Sales Metrics** | Activity Spine | Sales Dashboard (observation) |

### Authority Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMER-FACING                                                 │
│                                                                 │
│ Custom Quote Form ──► Quote System (authoritative)              │
│                              │                                  │
│ Quote Confirmation Email ◄───┘                                  │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Events to Activity Spine
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ INTERNAL OBSERVATION                                            │
│                                                                 │
│ Activity Spine ──► Sales Dashboard (contextual, read-only)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Conversion (M28-02 boundary)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ ORDER LIFECYCLE                                                 │
│                                                                 │
│ OMS Backend (authoritative) ──► OMS UI (read-only)              │
│       │                              │                          │
│       └──► Quote Origin Panel ◄──────┘                          │
│            (contextual reference)                               │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ Not integrated
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXTERNAL / MANUAL                                               │
│                                                                 │
│ Email ──► Not captured                                          │
│ Trello ──► Not captured                                         │
│ Phone ──► Not captured                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Where Sales Authority Ends

| Boundary | Description |
|----------|-------------|
| **Quote Creation** | Sales does not create quotes; customers do via form |
| **Quote Modification** | Sales cannot modify quotes via Platform Shell |
| **Quote Approval** | Sales cannot approve quotes via Platform Shell |
| **Quote Conversion** | Sales cannot convert quotes via Platform Shell |
| **Order Creation** | Orders are created by conversion, not Sales action |
| **Order Modification** | Sales cannot modify orders via Platform Shell |

---

## Risk Registry

### High Severity Risks

| Risk | Touchpoint | Description | Current Mitigation |
|------|------------|-------------|-------------------|
| **Activity not captured** | Email, Phone, Trello | Sales activities in external tools not reflected in funnel metrics | Accept as limitation; funnel shows system-tracked activity only |
| **Trello divergence** | Trello | Trello pipeline may show different state than quote system | Clear communication that Dashboard is authoritative |

### Medium Severity Risks

| Risk | Touchpoint | Description | Current Mitigation |
|------|------------|-------------|-------------------|
| **Dashboard misinterpretation** | Sales Dashboard | Users may expect action capabilities | Read-only signaling, this documentation |
| **Quote edit expectation in OMS** | OMS Quote Origin | Users may expect to edit quote from order | Read-only display, no edit affordances |
| **Email reply expectation** | Quote Confirmation | Customers may reply expecting action | "Do not reply" messaging |

### Low Severity Risks

| Risk | Touchpoint | Description | Current Mitigation |
|------|------------|-------------|-------------------|
| **Metric ownership confusion** | Sales Dashboard | Unclear that Activity Spine computes metrics | Clear data source attribution |
| **Quote vs Order confusion** | OMS Quote Origin | Panel labeling may be unclear | Clear "Quote Origin" header |

### Ambiguities Requiring Future Resolution

| Ambiguity | Description | Resolution Path |
|-----------|-------------|-----------------|
| **Quote detail drill-down** | Should Sales Dashboard link to quote details? | M29 Sales UX may address |
| **Activity capture from external** | Should email/phone activity be captured? | CRM integration decision |
| **Trello sync** | Should Trello be integrated or deprecated? | Process decision |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | Platform Team | Initial inventory document |

---

*This document inventories Sales touchpoints. It does not introduce new touchpoints or capabilities.*
