# Quote → OMS Visibility Contract

> **Version:** 1.0  
> **Status:** Locked (M28-02)  
> **Design System:** M12 (Frozen)  
> **Dependencies:** M14 (OMS UX), M28-01 (Custom Quote UX)

This document defines the visibility contract between the Custom Quote system
and the Order Management System (OMS). It specifies exactly how and when quote
data becomes observable in OMS, what data surfaces, and what controls are
explicitly forbidden.

**Governing Principle:** OMS observes quote context. OMS does not control quotes.

---

## Table of Contents

1. [Overview](#overview)
2. [System Ownership Model](#system-ownership-model)
3. [Visibility Rules](#visibility-rules)
4. [Field Visibility Mapping](#field-visibility-mapping)
5. [UX Representation in OMS](#ux-representation-in-oms)
6. [Event and Traceability Model](#event-and-traceability-model)
7. [Failure and Edge Cases](#failure-and-edge-cases)
8. [Explicit UX Boundaries](#explicit-ux-boundaries)
9. [Future Extension Notes](#future-extension-notes)

---

## Overview

### Purpose

This contract establishes the rules by which quote data becomes visible
within OMS, ensuring:

| Goal | Description |
|------|-------------|
| **Separation** | Clear boundary between Quote and OMS responsibilities |
| **Observability** | OMS can display relevant quote context for orders |
| **Safety** | No write leakage, no accidental control paths |
| **Traceability** | Orders can reference their originating quote |

### Scope

This contract covers:
- When quotes become visible to OMS
- What quote data OMS can access
- How quote data appears in OMS UI
- What quote data is intentionally hidden
- What actions are forbidden

This contract does NOT cover:
- Quote system internals
- OMS order management
- Implementation details
- Data transport mechanisms

### Non-Goals

| Excluded | Rationale |
|----------|-----------|
| Quote editing via OMS | OMS is read-only for quotes |
| Quote approval workflows | Quote lifecycle is external to OMS |
| Automated quote processing | No automation in this contract |
| Quote pricing logic | Pricing is Quote system concern |
| Quote-to-order conversion logic | Conversion is external workflow |

---

## System Ownership Model

### Authoritative Ownership Matrix

| Domain | Owner | Authority |
|--------|-------|-----------|
| Quote intake | Quote System | Exclusive |
| Quote form fields | Quote System | Exclusive |
| Quote lifecycle states | Quote System | Exclusive |
| Quote validation | Quote System | Exclusive |
| Quote expiration | Quote System | Exclusive |
| Preliminary pricing | Quote System | Exclusive |
| Quote-to-order conversion | External Workflow | Exclusive |
| Order creation | OMS | Exclusive |
| Order lifecycle | OMS | Exclusive |
| Order fulfillment tracking | OMS | Exclusive |
| Quote visibility in OMS | This Contract | Shared (read-only) |

### What Quote System Owns

| Responsibility | Description |
|----------------|-------------|
| **Intake** | Customer-facing form and submission |
| **Validation** | Client-side field validation |
| **Storage** | Quote request persistence |
| **Lifecycle** | State progression from Submitted to terminal states |
| **Pricing Context** | Indicative estimate calculation and display |
| **Immutability** | Field protection post-submission |
| **Expiration** | Time-based validity enforcement |

### What OMS Owns

| Responsibility | Description |
|----------------|-------------|
| **Orders** | Order creation, storage, and management |
| **Order Lifecycle** | State transitions for orders |
| **Production Tracking** | Visibility into fulfillment stages |
| **Exception Surfacing** | Order-level exception display |
| **Order Attribution** | Linking orders to their sources |

### What OMS Does NOT Own

| Excluded Responsibility | Rationale |
|-------------------------|-----------|
| Quote creation | Customer-initiated via Quote system |
| Quote modification | Quotes are immutable |
| Quote approval | External workflow responsibility |
| Quote rejection | External workflow responsibility |
| Quote conversion | External workflow responsibility |
| Quote expiration | Quote system responsibility |
| Quote pricing | Quote system responsibility |
| Quote state transitions | Quote system responsibility |

### Ownership Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        QUOTE SYSTEM                                  │
│                                                                      │
│  ┌──────────┐   ┌───────────┐   ┌────────┐   ┌─────────┐           │
│  │  Draft   │──▶│ Submitted │──▶│Reviewed│──▶│ Quoted  │           │
│  └──────────┘   └───────────┘   └────────┘   └────┬────┘           │
│                                                    │                 │
│                      ┌────────────────────────────┼────────┐        │
│                      │                            │        │        │
│                      ▼                            ▼        ▼        │
│               ┌───────────┐                ┌─────────┐ ┌────────┐   │
│               │  Expired  │                │Approved │ │Declined│   │
│               └───────────┘                └────┬────┘ └────────┘   │
│                                                 │                    │
└─────────────────────────────────────────────────┼────────────────────┘
                                                  │
                    ════════════════════════════════════════════════
                              VISIBILITY BOUNDARY (this contract)
                    ════════════════════════════════════════════════
                                                  │
                                                  │ Converted
                                                  │ (terminal)
                                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           OMS                                        │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ORDER (with quote reference)                                  │   │
│  │                                                               │   │
│  │  Order ID: ORD-12345                                         │   │
│  │  Source: Quote QR-2024-00847 (read-only context)             │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  OMS can SEE quote context.                                         │
│  OMS CANNOT modify, approve, or control the quote.                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Visibility Rules

### Which Quote States Are Visible in OMS

| State | Visible in OMS | Rationale |
|-------|----------------|-----------|
| **Draft** | ❌ No | Client-side only, not persisted |
| **Submitted** | ❌ No | Pre-conversion, no order linkage |
| **Reviewed** | ❌ No | Internal workflow, no order linkage |
| **Quoted** | ❌ No | Awaiting customer response, no order |
| **Approved** | ❌ No | Pre-conversion, order not yet created |
| **Converted** | ✅ Yes | Order exists, quote is source context |
| **Expired** | ❌ No | No order created, quote invalid |
| **Declined** | ❌ No | No order created, customer rejected |
| **Cancelled** | ❌ No | No order created, withdrawn |

### Visibility Rule Summary

> **Only quotes in Converted state are visible in OMS.**

This ensures:
- OMS only sees quotes that resulted in orders
- No visibility into sales pipeline or pending quotes
- No exposure of expired or declined quotes
- Clear 1:1 relationship between visible quote and order

### When Visibility Occurs

| Aspect | Specification |
|--------|---------------|
| **Trigger** | Quote enters Converted state |
| **Mechanism** | Event-based notification (not polling) |
| **Timing** | At moment of conversion, not before |
| **Persistence** | Quote context attached to order record |
| **Revocability** | Once visible, remains visible (immutable) |

### Event Sequence

```
1. Quote is in Approved state (Quote system)
2. External workflow initiates order creation
3. Order is created in OMS
4. Quote transitions to Converted state (Quote system)
5. Quote reference is attached to Order (attribution)
6. OMS can now observe quote context for this order
```

### What OMS Can See

| Category | Visible Data | Format |
|----------|--------------|--------|
| **Identity** | Quote reference number | `QR-YYYY-NNNNN` |
| **Timestamps** | Original submission date | ISO 8601 |
| **Timestamps** | Conversion date | ISO 8601 |
| **Customer** | Customer name | Text (as submitted) |
| **Customer** | Company name | Text (if provided) |
| **Project** | Sign type | Taxonomy value |
| **Project** | Dimensions (W × H) | Numeric (inches) |
| **Project** | Quantity | Integer |
| **Project** | Material preference | Taxonomy value |
| **Project** | Mounting type | Taxonomy value |
| **Project** | Illumination type | Taxonomy value |
| **Design** | Design description | Text (as submitted) |
| **Design** | Reference file names | Filename list (not content) |
| **Pricing** | Preliminary estimate range | Min–Max (as calculated at submission) |
| **Pricing** | Estimate validity period | Date range |

### What OMS Must NOT See

| Category | Hidden Data | Rationale |
|----------|-------------|-----------|
| **Drafts** | Unsaved form state | Client-side only |
| **Non-converted quotes** | All non-Converted states | No order linkage |
| **Internal notes** | Sales annotations | Sales-only context |
| **Pricing logic** | Calculation formulas | Business-sensitive |
| **Pricing breakdown** | Per-item cost details | Estimate only, not invoice |
| **Customer contact** | Email, phone | Privacy, not needed for OMS |
| **Reference file content** | Actual file bytes | Files are Quote system asset |
| **Quote history** | Prior quote versions | Lineage is Quote system concern |
| **Expiration logic** | Validity calculations | Quote system internal |

---

## Field Visibility Mapping

### Visible Fields (Read-Only in OMS)

| Field | Source | OMS Display Name | Immutable | Notes |
|-------|--------|------------------|-----------|-------|
| `quote_reference` | Quote System | Quote Reference | ✅ Yes | Primary identifier |
| `submission_timestamp` | Quote System | Quote Submitted | ✅ Yes | Original submission |
| `conversion_timestamp` | Quote System | Quote Converted | ✅ Yes | Conversion moment |
| `customer_name` | Form Input | Customer Name | ✅ Yes | As submitted |
| `company_name` | Form Input | Company | ✅ Yes | As submitted (nullable) |
| `sign_type` | Form Input | Sign Type | ✅ Yes | Taxonomy value |
| `width` | Form Input | Width | ✅ Yes | Inches |
| `height` | Form Input | Height | ✅ Yes | Inches |
| `quantity` | Form Input | Quantity | ✅ Yes | Integer |
| `material_preference` | Form Input | Material | ✅ Yes | Taxonomy value |
| `mounting_type` | Form Input | Mounting | ✅ Yes | Taxonomy value |
| `illumination` | Form Input | Illumination | ✅ Yes | Taxonomy value |
| `design_description` | Form Input | Design Notes | ✅ Yes | Freeform text |
| `reference_file_names` | Form Input | Reference Files | ✅ Yes | Filename list only |
| `estimate_min` | Calculated | Estimate (Low) | ✅ Yes | At submission |
| `estimate_max` | Calculated | Estimate (High) | ✅ Yes | At submission |
| `estimate_valid_until` | Calculated | Estimate Valid Until | ✅ Yes | 30 days from submission |

### Hidden Fields (Never Exposed to OMS)

| Field | Rationale |
|-------|-----------|
| `customer_email` | Privacy; not needed for order fulfillment |
| `customer_phone` | Privacy; not needed for order fulfillment |
| `internal_notes` | Sales-only context |
| `pricing_formula` | Business-sensitive calculation logic |
| `pricing_breakdown` | Not applicable to preliminary estimate |
| `reference_file_content` | Binary assets remain in Quote system |
| `lifecycle_history` | State transitions are Quote system internal |
| `expiration_calculations` | Quote system internal logic |
| `sales_assignee` | Internal workflow context |

### Immutability Confirmation

> All fields visible to OMS are immutable.
> OMS displays quote data as **historical context only**.
> There are no editable fields. There are no pending fields.
> The data represents a frozen snapshot from the moment of quote submission.

---

## UX Representation in OMS

### Where Quotes Appear

Quotes appear in exactly one location within OMS:

| Location | Context |
|----------|---------|
| **Order Detail View** | Quote Origin Panel (contextual sidebar) |

Quotes do NOT appear in:
- Orders List View (no quote column)
- Exceptions View
- Activity Timeline (as first-class entities)
- Search results (quotes are not searchable in OMS)
- Navigation (no "Quotes" section in OMS)

### Quote Origin Panel

The Quote Origin Panel appears within the Order Detail View as a
read-only contextual section. It provides attribution and historical
context for orders that originated from quotes.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ Order ORD-12345                                              │
│ Standard Order • Created 2024-01-15                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────┐  ┌────────────────────────────────┐ │
│ │ ORDER HEADER        │  │ LIFECYCLE TIMELINE             │ │
│ │ ...                 │  │ ...                            │ │
│ └─────────────────────┘  └────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────┐  ┌────────────────────────────────┐ │
│ │ METADATA            │  │ QUOTE ORIGIN                   │ │
│ │ ...                 │  │ ────────────────────────────── │ │
│ └─────────────────────┘  │ ⓘ This order originated from   │ │
│                          │   a custom quote request.       │ │
│                          │                                 │ │
│                          │ Reference      QR-2024-00847    │ │
│                          │ Submitted      Jan 10, 2024     │ │
│                          │ Converted      Jan 15, 2024     │ │
│                          │                                 │ │
│                          │ ── Original Request ──          │ │
│                          │ Sign Type      Channel Letters  │ │
│                          │ Dimensions     48" × 12"        │ │
│                          │ Quantity       1                │ │
│                          │ Material       Aluminum         │ │
│                          │ Illumination   LED              │ │
│                          │                                 │ │
│                          │ ── Preliminary Estimate ──      │ │
│                          │ Range          $850 – $1,200    │ │
│                          │ Valid Until    Feb 10, 2024     │ │
│                          │                                 │ │
│                          │ ⓘ Quote data is read-only.      │ │
│                          │   This is historical context.   │ │
│                          └────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Panel Specifications

| Element | Specification |
|---------|---------------|
| **Component** | M12 Card with MetadataPanel pattern |
| **Position** | Sidebar, below Metadata or Exceptions panel |
| **Visibility** | Only shown if order has quote origin |
| **Collapse** | Not collapsible (always fully visible) |
| **Header** | "Quote Origin" with info icon |

### Panel Content Sections

#### Header Section

| Element | Content |
|---------|---------|
| **Title** | "Quote Origin" |
| **Subtitle** | "This order originated from a custom quote request." |
| **Icon** | Info icon (ⓘ) — informational, not warning |

#### Reference Section

| Field | Display |
|-------|---------|
| **Reference** | Quote reference number (QR-YYYY-NNNNN) |
| **Submitted** | Original submission date |
| **Converted** | Conversion date |

#### Original Request Section

| Field | Display |
|-------|---------|
| **Sign Type** | As submitted |
| **Dimensions** | W" × H" format |
| **Quantity** | Integer |
| **Material** | As submitted (or "Not specified") |
| **Mounting** | As submitted (or "Not specified") |
| **Illumination** | As submitted (or "Not specified") |

#### Preliminary Estimate Section

| Field | Display |
|-------|---------|
| **Range** | $min – $max format |
| **Valid Until** | Date (may be past) |

#### Footer Section

| Element | Content |
|---------|---------|
| **Disclaimer** | "Quote data is read-only. This is historical context." |

### Visual Treatment

| Aspect | Specification |
|--------|---------------|
| **Background** | M12 `background.muted` (#f5f5f5) |
| **Border** | M12 `border.default` (#e5e5e5) |
| **Typography** | M12 body text, muted labels |
| **Icons** | Info icon only (no warning, no action icons) |
| **Hover** | No hover effects (non-interactive) |
| **Cursor** | Default cursor (not pointer) |

### No Interactivity

The Quote Origin Panel is completely non-interactive:

| Forbidden Element | Rationale |
|-------------------|-----------|
| Links to quote system | OMS does not navigate to Quote system |
| Edit buttons | Quote data is immutable |
| Expand/collapse | All data always visible |
| Copy buttons | No clipboard actions |
| Download buttons | Reference files not accessible |
| Action buttons | No quote actions possible |

### Orders Without Quote Origin

For orders that did not originate from quotes:

| Behavior | Specification |
|----------|---------------|
| **Panel Visibility** | Hidden (panel does not render) |
| **Placeholder** | No placeholder, no empty state |
| **Indication** | No indication that quote context is absent |

### How Users Know Quotes Are Non-Actionable

| Signal | Implementation |
|--------|----------------|
| **Visual treatment** | Muted background (informational styling) |
| **Disclaimer text** | "Quote data is read-only" |
| **No buttons** | Absence of any action affordances |
| **No links** | No navigation to external systems |
| **Cursor** | Default cursor (not pointer) |
| **Info icon** | Signals informational, not actionable |

---

## Event and Traceability Model

### Conceptual Event Flow

This section describes the logical event sequence that makes a quote
visible to OMS. Implementation details are out of scope.

#### Conversion Event

```
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL WORKFLOW (Sales/Ordering System)                    │
│                                                              │
│ 1. Customer approves quoted price                            │
│ 2. Sales initiates order creation                            │
│ 3. Order creation request sent to OMS                        │
│    - Includes quote reference (QR-YYYY-NNNNN)               │
│                                                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ OMS                                                          │
│                                                              │
│ 4. OMS creates Order record                                  │
│    - Order ID generated (ORD-NNNNN)                         │
│    - Quote reference stored as source attribution           │
│                                                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ QUOTE SYSTEM                                                 │
│                                                              │
│ 5. Quote transitions to Converted state                      │
│    - Conversion timestamp recorded                           │
│    - State becomes terminal (immutable)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quote-to-Order Linkage

| Aspect | Specification |
|--------|---------------|
| **Link Direction** | Order references Quote (not vice versa) |
| **Link Cardinality** | One Order : One Quote (1:1) |
| **Link Immutability** | Once linked, cannot be changed |
| **Link Storage** | Quote reference stored on Order record |

### Quote Reference Format

| Component | Format | Example |
|-----------|--------|---------|
| **Prefix** | `QR-` | `QR-` |
| **Year** | 4-digit year | `2024` |
| **Sequence** | 5-digit padded | `00847` |
| **Full** | `QR-YYYY-NNNNN` | `QR-2024-00847` |

### Quote Snapshot Selection

When an order references a quote, OMS receives a **snapshot** of quote data
as it existed at the moment of conversion. This ensures:

| Guarantee | Description |
|-----------|-------------|
| **Point-in-time accuracy** | Data reflects conversion moment |
| **Immutability** | Snapshot never changes after creation |
| **Independence** | Quote system changes don't affect snapshot |
| **Completeness** | All visible fields captured at once |

### Multiple Quote Submissions (Lineage)

If a customer submits multiple quotes before conversion:

| Scenario | Handling |
|----------|----------|
| **Multiple quotes, one converted** | Only converted quote visible |
| **Earlier quotes cancelled** | Cancelled quotes never visible |
| **Quote superseded** | Only final converted quote visible |
| **Quote lineage** | Not exposed to OMS (Quote system internal) |

> OMS sees only the single, authoritative quote that was converted.
> Quote history and lineage are Quote system concerns, not OMS concerns.

### Authoritative Quote Selection

| Rule | Description |
|------|-------------|
| **Single source** | Each order has exactly one quote reference |
| **Conversion-based** | The quote in Converted state is authoritative |
| **No alternatives** | OMS does not see "related" or "prior" quotes |
| **No selection logic** | OMS does not choose between quotes |

---

## Failure and Edge Cases

### Guiding Principle

> OMS must always fail SAFE and READ-ONLY.
> Missing or incomplete quote data does not block order operations.
> Quote context is informational, not operational.

### Edge Case Handling

#### Quote Converted But Data Incomplete

| Scenario | OMS Behavior |
|----------|--------------|
| **Missing optional fields** | Display "Not specified" for missing values |
| **Missing required fields** | Display available fields, omit missing |
| **No quote data received** | Hide Quote Origin Panel entirely |
| **Malformed quote reference** | Hide Quote Origin Panel entirely |

**Rationale:** Quote context is supplementary. Order operations must not
depend on quote data availability.

#### Quote Superseded After Conversion

| Scenario | OMS Behavior |
|----------|--------------|
| **New quote created post-conversion** | OMS shows original converted quote |
| **Original quote reference unchanged** | Snapshot remains immutable |
| **Quote system updates** | Do not propagate to OMS |

**Rationale:** OMS holds a frozen snapshot. Post-conversion changes in
Quote system do not affect OMS display.

#### Multiple Mockups for Same Quote

| Scenario | OMS Behavior |
|----------|--------------|
| **Multiple reference files** | Display list of filenames (read-only) |
| **No file content access** | Filenames only, no preview, no download |
| **File count display** | "3 reference files" format acceptable |

**Rationale:** Reference files are Quote system assets. OMS displays
attribution only.

#### Quote Expires After Conversion Attempt

| Scenario | OMS Behavior |
|----------|--------------|
| **Conversion succeeds before expiry** | Normal visibility |
| **Conversion fails due to expiry** | No order created, no visibility |
| **Race condition** | Quote system determines outcome |

**Rationale:** If conversion succeeded, quote is Converted (visible).
If conversion failed, no order exists (nothing to display).

#### Order Deleted or Cancelled

| Scenario | OMS Behavior |
|----------|--------------|
| **Order cancelled** | Quote Origin Panel still visible (historical) |
| **Order data purged** | Quote snapshot purged with order |

**Rationale:** Quote context follows order lifecycle. No independent
quote visibility in OMS.

### Failure Mode Summary

| Failure | OMS Response | User Impact |
|---------|--------------|-------------|
| Quote data unavailable | Hide panel | User sees order without quote context |
| Quote data incomplete | Show partial | User sees available fields |
| Quote reference invalid | Hide panel | User sees order without quote context |
| Quote system unreachable | Show cached | User sees snapshot (if available) |
| Snapshot corrupted | Hide panel | User sees order without quote context |

---

## Explicit UX Boundaries

### What OMS Cannot Do With Quotes

| Forbidden Action | Rationale |
|------------------|-----------|
| **Convert quotes** | Conversion is external workflow |
| **Approve quotes** | Approval is external workflow |
| **Reject quotes** | Rejection is external workflow |
| **Expire quotes** | Expiration is Quote system |
| **Edit quotes** | Quotes are immutable |
| **Delete quotes** | Deletion not permitted |
| **Request changes** | No write path to Quote system |
| **Trigger mockups** | Mockups are Quote system concern |
| **Recalculate pricing** | Pricing is Quote system concern |
| **Extend validity** | Validity is Quote system concern |
| **Reassign quotes** | Assignment is external workflow |
| **Add notes to quotes** | Notes are Quote system concern |
| **Link multiple quotes** | One quote per order only |
| **Search quotes** | Quotes not indexed in OMS |
| **Filter by quotes** | No quote-based filtering |
| **Sort by quotes** | No quote-based sorting |
| **Export quote data** | Quote export is Quote system concern |

### Forbidden UI Elements in OMS

| Element | Reason |
|---------|--------|
| "View Quote" button | No navigation to Quote system |
| "Edit Quote" button | Quotes are immutable |
| "Convert Quote" button | Conversion is external |
| "Approve Quote" button | Approval is external |
| "Reject Quote" button | Rejection is external |
| "Request Changes" button | No write path |
| "Download Files" button | Files are Quote system assets |
| Quote status indicator | Quote is always Converted when visible |
| Quote action menu | No actions available |
| Quote edit icon | No editing possible |
| Quote delete icon | No deletion possible |
| Links to Quote system | No cross-system navigation |

### Boundary Enforcement

If a feature request contains any of these phrases, it is **OUT OF SCOPE**:

- "OMS should be able to..."
- "Allow OMS users to..."
- "Let operators change..."
- "Update the quote when..."
- "Sync quote data..."
- "Show pending quotes in OMS..."
- "Filter orders by quote status..."
- "Navigate to the quote from OMS..."
- "Edit the quote from the order..."
- "Recalculate the estimate..."

### Read-Only Guarantee

> Every interaction with quote data in OMS is a **read operation**.
> There are no write operations, no state changes, no side effects.
> Quote data in OMS is a frozen, immutable snapshot.

---

## Future Extension Notes

### Guarded Extension Points

The following extensions may be considered in future iterations,
subject to formal governance review:

| Extension | Conditions |
|-----------|------------|
| **Quote reference in Orders List** | Column display only (no links, no actions) |
| **Quote metadata in Activity Feed** | "Order created from Quote QR-..." event |
| **Quote-sourced order filter** | Filter orders by "has quote origin" (boolean) |

### Extension Constraints

Any future extension must:
1. Maintain read-only semantics
2. Not introduce navigation to Quote system
3. Not expose non-Converted quotes
4. Not add action affordances
5. Not create write paths
6. Pass formal governance review

### Forbidden Extensions

The following extensions are **permanently out of scope**:

| Extension | Why Forbidden |
|-----------|---------------|
| Quote editing in OMS | Violates immutability |
| Quote approval in OMS | Violates ownership |
| Quote rejection in OMS | Violates ownership |
| Quote search in OMS | Exposes non-Converted quotes |
| Quote list view in OMS | OMS is not Quote system |
| Quote dashboard in OMS | OMS is not Quote system |
| Quote notifications in OMS | Notifications are Quote system concern |
| Quote-to-quote linking | Lineage is Quote system concern |
| Live quote sync | Snapshots are immutable |

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Quote Origin** | The quote that resulted in an order |
| **Converted State** | Terminal quote state indicating order creation |
| **Snapshot** | Frozen copy of quote data at conversion time |
| **Attribution** | Link from order to originating quote |
| **Visibility Boundary** | Point at which quote data becomes observable |
| **Read-Only** | No write operations, no state changes |
| **Immutable** | Cannot be changed after creation |
| **External Workflow** | Process outside both Quote and OMS systems |

---

## Appendix: Component Mapping

Quote visibility in OMS uses M12 design tokens and components exclusively.

| OMS Element | M12 Components Used |
|-------------|---------------------|
| **Quote Origin Panel** | Card, MetadataPanel |
| **Section Headers** | Typography (h4) |
| **Field Labels** | Typography (label, muted) |
| **Field Values** | Typography (body) |
| **Disclaimer** | Typography (small, muted), info icon |
| **Panel Background** | `background.muted` token |
| **Panel Border** | `border.default` token |

---

## Appendix: Validation Checklist

Before implementation, verify:

- [ ] OMS only displays quotes in Converted state
- [ ] No quote data from non-Converted states is accessible
- [ ] Quote Origin Panel has no action buttons
- [ ] Quote Origin Panel has no links
- [ ] Quote Origin Panel has no editable fields
- [ ] Quote Origin Panel has no hover effects implying interactivity
- [ ] Customer email and phone are NOT displayed
- [ ] Reference file content is NOT accessible
- [ ] Pricing breakdown is NOT displayed
- [ ] Internal notes are NOT displayed
- [ ] Disclaimer text is present
- [ ] Panel is hidden when quote data is unavailable
- [ ] No Quote-related navigation items in OMS

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial contract (M28-02) |

**This contract is LOCKED.** Changes require formal governance review.
