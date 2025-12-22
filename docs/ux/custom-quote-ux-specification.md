# Custom Quote UX Specification

> **Version:** 1.0  
> **Status:** Locked (M28-01)  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Platform Shell (M13), OMS (M14)

This document defines the UX contract for the Custom Quote Form and its lifecycle.
The Custom Quote Form is a **customer-facing, write-safe submission interface** that
collects preliminary pricing requests. It is **governed**, meaning all inputs and
outputs are constrained and all behaviors are explicitly bounded.

---

## Table of Contents

1. [Overview](#overview)
2. [What the Custom Quote System IS and IS NOT](#what-the-custom-quote-system-is-and-is-not)
3. [UX Surfaces](#ux-surfaces)
   - [Customer-Facing Quote Form](#customer-facing-quote-form)
   - [Quote Confirmation / Acknowledgment](#quote-confirmation--acknowledgment)
   - [Internal Quote Visibility (Sales View)](#internal-quote-visibility-sales-view)
4. [Quote Lifecycle State Model](#quote-lifecycle-state-model)
5. [Field Immutability Rules](#field-immutability-rules)
6. [Pricing Semantics](#pricing-semantics)
7. [Language and Expectation Guidelines](#language-and-expectation-guidelines)
8. [Read-Only and Write-Safe Guarantees](#read-only-and-write-safe-guarantees)
9. [OMS Relationship](#oms-relationship)
10. [UX Boundaries](#ux-boundaries)
11. [Future Extension Notes](#future-extension-notes)

---

## Overview

### Purpose

The Custom Quote Form enables customers to request preliminary pricing for custom
signage products. It serves as:

| Function | Description |
|----------|-------------|
| **Collection** | Gather customer requirements for custom signage |
| **Estimation** | Provide indicative pricing based on disclosed parameters |
| **Intake** | Create a formal request record for internal follow-up |
| **Expectation Setting** | Communicate non-binding, preliminary nature of quotes |

### Scope

The Custom Quote Form is:
- **Customer-facing** — accessible to external users
- **Write-safe** — controlled submission with validation
- **Governed** — all fields and behaviors are explicitly defined
- **Intake-only** — creates requests, does not execute orders

### System Context

```
Customer Journey                    Internal Journey
────────────────                    ────────────────
                                    
Customer browses catalog            
         │                          
         ▼                          
Customer opens Quote Form           
         │                          
         ▼                          
Customer fills form                 
         │                          
         ▼                          
Customer submits request ─────────► Quote appears in Sales View
         │                                    │
         ▼                                    ▼
Customer sees acknowledgment        Sales reviews quote
         │                                    │
         ▼                                    ▼
Customer receives follow-up         (External workflow)
    (out of scope)                      (out of scope)
```

---

## What the Custom Quote System IS and IS NOT

### What It IS

| Aspect | Description |
|--------|-------------|
| **A request intake mechanism** | Collects structured customer requirements |
| **A preliminary estimator** | Shows indicative pricing based on inputs |
| **A formal record creator** | Generates traceable quote requests |
| **A communication channel** | Initiates dialogue between customer and sales |
| **A governed interface** | All behaviors are explicit and bounded |

### What It IS NOT

| Excluded Aspect | Rationale |
|-----------------|-----------|
| **An order system** | Quotes do not create orders |
| **An approval workflow** | No internal approvals occur in this interface |
| **A binding contract** | All pricing is explicitly preliminary |
| **A fulfillment trigger** | Submission does not initiate production |
| **A payment processor** | No financial transactions occur |
| **A shadow OMS** | Quote state does not control order state |
| **An automation engine** | No automated decisions or workflows |

### Governing Principle

> The Custom Quote Form collects and estimates. It does not decide, approve, or execute.

---

## UX Surfaces

### Customer-Facing Quote Form

#### Purpose

Enable customers to submit structured requests for custom signage pricing.
The form collects requirements, provides indicative pricing, and sets appropriate
expectations about the non-binding nature of the quote.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ Request a Custom Quote                                       │
│ Get preliminary pricing for your custom signage project      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PROJECT DETAILS                                         │ │
│ │                                                         │ │
│ │ Sign Type *                    [Dropdown ▾]             │ │
│ │ Dimensions (W × H) *           [___] × [___] inches     │ │
│ │ Quantity *                     [___]                    │ │
│ │ Material Preference            [Dropdown ▾]             │ │
│ │ Mounting Type                  [Dropdown ▾]             │ │
│ │ Illumination                   [Dropdown ▾]             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DESIGN REQUIREMENTS                                     │ │
│ │                                                         │ │
│ │ Design Description *           [                     ]  │ │
│ │                                [                     ]  │ │
│ │ Reference Files (optional)     [Upload files]          │ │
│ │   Accepted: JPG, PNG, PDF, AI, EPS (max 10MB each)     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CONTACT INFORMATION                                     │ │
│ │                                                         │ │
│ │ Full Name *                    [____________________]   │ │
│ │ Email Address *                [____________________]   │ │
│ │ Phone Number                   [____________________]   │ │
│ │ Company Name                   [____________________]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ PRELIMINARY ESTIMATE                                    │ │
│ │                                                         │ │
│ │   Estimated Range: $850 – $1,200                        │ │
│ │                                                         │ │
│ │   ⓘ This is an indicative estimate based on the        │ │
│ │     information provided. Final pricing will be         │ │
│ │     confirmed after review by our team.                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ I understand this is a preliminary quote request      │ │
│ │   and not a binding order.                              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│              [Submit Quote Request]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Field Specification

##### Project Details Section

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| **Sign Type** | Select | Yes | Must select from taxonomy | Predefined product categories |
| **Width** | Number | Yes | 1–999, numeric only | Inches |
| **Height** | Number | Yes | 1–999, numeric only | Inches |
| **Quantity** | Number | Yes | 1–999, integer only | Default: 1 |
| **Material Preference** | Select | No | Must select from taxonomy | "Not sure" is valid option |
| **Mounting Type** | Select | No | Must select from taxonomy | "Not sure" is valid option |
| **Illumination** | Select | No | Must select from taxonomy | None, LED, Neon, etc. |

##### Design Requirements Section

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| **Design Description** | Textarea | Yes | 10–2000 characters | Freeform requirements |
| **Reference Files** | File Upload | No | Max 5 files, 10MB each | JPG, PNG, PDF, AI, EPS |

##### Contact Information Section

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| **Full Name** | Text | Yes | 2–100 characters | |
| **Email Address** | Email | Yes | Valid email format | Primary contact method |
| **Phone Number** | Tel | No | Valid phone format | Secondary contact |
| **Company Name** | Text | No | 0–100 characters | For B2B context |

##### Acknowledgment Section

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| **Understanding Checkbox** | Checkbox | Yes | Must be checked | Explicit expectation setting |

#### Validation Behavior

All validation is **client-side only** and follows these principles:

| Behavior | Specification |
|----------|---------------|
| **Timing** | Validate on blur, re-validate on change after first error |
| **Display** | Inline error message below field, field border turns semantic red |
| **Blocking** | Submit button disabled until all required fields valid |
| **Messaging** | Clear, actionable error text (e.g., "Enter a valid email address") |
| **Recovery** | Error clears immediately when field becomes valid |

#### Upload Behavior

| Behavior | Specification |
|----------|---------------|
| **Method** | Drag-and-drop or click-to-browse |
| **Preview** | Filename with size, thumbnail for images |
| **Removal** | ✕ button to remove before submission |
| **Progress** | Upload progress indicator per file |
| **Failure** | Inline error with retry option |
| **Storage** | Files are attached to quote record, not processed |

#### Pricing Preview Semantics

The Preliminary Estimate section is **purely informational**:

| Aspect | Specification |
|--------|---------------|
| **Display Trigger** | Shows when all required Project Details fields are complete |
| **Format** | Range display (e.g., "$850 – $1,200") |
| **Calculation** | Based on sign type, dimensions, quantity, materials |
| **Disclaimer** | Always accompanied by indicative language |
| **Binding Status** | Explicitly NOT binding, NOT a commitment |
| **Accuracy** | Estimate only — final pricing determined by sales review |

> The pricing preview exists to help customers gauge budget expectations.
> It does NOT commit the business to any specific price.

#### Submission Behavior

| Behavior | Specification |
|----------|---------------|
| **Trigger** | Click "Submit Quote Request" button |
| **State** | Button shows loading state during submission |
| **Success** | Navigates to Confirmation screen |
| **Failure** | Inline error with retry option, form state preserved |
| **Retry** | User can retry submission without re-entering data |
| **Duplicate Prevention** | Button disabled during submission |

---

### Quote Confirmation / Acknowledgment

#### Purpose

Confirm successful submission and set clear expectations about next steps
and the preliminary nature of the quote request.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    ✓ Quote Request Received                  │
│                                                              │
│         Thank you for your custom quote request.             │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WHAT HAPPENS NEXT                                       │ │
│ │                                                         │ │
│ │ 1. Our team will review your request within             │ │
│ │    1-2 business days.                                   │ │
│ │                                                         │ │
│ │ 2. We'll contact you at [email@example.com] with        │ │
│ │    detailed pricing and options.                        │ │
│ │                                                         │ │
│ │ 3. You can ask questions or request changes at          │ │
│ │    any time before placing an order.                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ QUOTE SUMMARY                                           │ │
│ │                                                         │ │
│ │ Reference Number    QR-2024-00847                       │ │
│ │ Sign Type           Channel Letters                     │ │
│ │ Dimensions          48" × 12"                           │ │
│ │ Quantity            1                                   │ │
│ │ Preliminary Range   $850 – $1,200                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⓘ IMPORTANT                                             │ │
│ │                                                         │ │
│ │ This is a quote request, not an order.                  │ │
│ │ Pricing is preliminary and subject to review.           │ │
│ │ No payment is required at this time.                    │ │
│ │ No production will begin until you approve              │ │
│ │ final pricing and place an order.                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│              [Return to Homepage]                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Content Requirements

##### What the Customer Sees

| Element | Content |
|---------|---------|
| **Success Indicator** | Checkmark with "Quote Request Received" |
| **Acknowledgment** | Thank you message confirming receipt |
| **Next Steps** | Numbered list of what will happen |
| **Timeline** | Expected response time (1-2 business days) |
| **Contact Method** | Confirmation of email to be used |
| **Summary** | Key details from their submission |
| **Reference Number** | Unique identifier for their request |

##### What is Explicitly NOT Promised

The confirmation page must NOT contain:

| Excluded Content | Rationale |
|------------------|-----------|
| "Your order has been placed" | This is not an order |
| "Guaranteed pricing" | Pricing is preliminary |
| "Estimated delivery date" | No fulfillment commitment |
| "Payment confirmation" | No payment occurred |
| "Production has started" | No production trigger |
| Order tracking links | No order exists |
| Invoice or receipt | No transaction occurred |

##### Language Guidelines

| DO Use | DON'T Use |
|--------|-----------|
| "Quote request" | "Order" |
| "Preliminary estimate" | "Final price" |
| "Our team will review" | "Approved" |
| "Contact you with pricing" | "Your total is" |
| "Before placing an order" | "Your order will ship" |

---

### Internal Quote Visibility (Sales View)

#### Purpose

Enable sales users to observe submitted quote requests for follow-up.
This view is **read-only** — it surfaces quote data but does not provide
controls for quote modification or order creation.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ Quote Requests                                   [Filters ▾] │
│ Submitted customer quote requests                            │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ref # │ Customer │ Sign Type │ Status │ Est. │ Submitted │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ QR-847│ Acme Co  │ Channel   │ ● New  │$1,200│ 2h ago    │ │
│ │ QR-846│ Smith LLC│ Monument  │ ● Rev  │$3,400│ 1d ago    │ │
│ │ QR-845│ J. Brown │ Pylon     │ ● Cvt  │$8,500│ 2d ago    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Showing 1-50 of 127 requests               [← Prev] [Next →] │
└─────────────────────────────────────────────────────────────┘
```

#### Data Visibility

##### Visible Fields

| Field | Source | Mutability in View |
|-------|--------|-------------------|
| **Reference Number** | System-generated | Immutable |
| **Customer Name** | Form submission | Immutable |
| **Email Address** | Form submission | Immutable |
| **Phone Number** | Form submission | Immutable |
| **Company Name** | Form submission | Immutable |
| **Sign Type** | Form submission | Immutable |
| **Dimensions** | Form submission | Immutable |
| **Quantity** | Form submission | Immutable |
| **Material Preference** | Form submission | Immutable |
| **Mounting Type** | Form submission | Immutable |
| **Illumination** | Form submission | Immutable |
| **Design Description** | Form submission | Immutable |
| **Reference Files** | Form submission | Immutable (viewable) |
| **Preliminary Estimate** | System-calculated | Immutable |
| **Lifecycle State** | System-managed | Informational only |
| **Submission Timestamp** | System-recorded | Immutable |

##### Informational-Only Fields

| Field | Description |
|-------|-------------|
| **Lifecycle State** | Current state (observable, not controllable) |
| **State Timestamp** | When current state was entered |
| **Days Since Submission** | Calculated display field |

#### View Constraints

| Constraint | Specification |
|------------|---------------|
| **No Edit Controls** | No inline editing, no edit buttons |
| **No State Transitions** | No buttons to change quote status |
| **No Approval Buttons** | No approve/reject controls |
| **No Order Creation** | No "Convert to Order" button |
| **No Delete Controls** | No delete or archive actions |
| **No Assignment** | No assign-to-user functionality |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Row Click** | Opens Quote Detail View (read-only) |
| **Sorting** | Client-side column sorting |
| **Filtering** | By state, date range, sign type |
| **Pagination** | Standard page navigation |
| **Refresh** | Manual refresh via page reload |

---

## Quote Lifecycle State Model

### State Definitions

The Quote Lifecycle represents the journey of a quote request through internal
processes. These states are **observational only** — they describe reality,
they do not control it.

| State | Definition | Entry Condition |
|-------|------------|-----------------|
| **Draft** | Customer is filling form, not yet submitted | Form opened (client-side only) |
| **Submitted** | Quote request received by system | Form submitted successfully |
| **Reviewed** | Sales has examined the request | External workflow completion |
| **Quoted** | Formal pricing provided to customer | External workflow completion |
| **Approved** | Customer accepted quoted price | External customer action |
| **Converted** | Quote became an order | Order creation in external system |
| **Expired** | Quote validity period elapsed | Time-based, system-calculated |
| **Declined** | Customer declined the quote | External customer action |
| **Cancelled** | Quote withdrawn by either party | External action |

### State Diagram

```
                    ┌─────────┐
                    │  Draft  │ (client-side only)
                    └────┬────┘
                         │ submit
                         ▼
                   ┌───────────┐
                   │ Submitted │
                   └─────┬─────┘
                         │ review
                         ▼
                   ┌───────────┐
           ┌───────│  Reviewed │───────┐
           │       └─────┬─────┘       │
           │             │ quote       │ cannot quote
           │             ▼             │
           │       ┌───────────┐       │
           │       │  Quoted   │───────┤
           │       └─────┬─────┘       │
           │            / \            │
           │   approve /   \ decline   │
           │          ▼     ▼          │
           │   ┌─────────┐ ┌─────────┐ │
           │   │Approved │ │Declined │ │
           │   └────┬────┘ └─────────┘ │
           │        │ convert          │
           │        ▼                  ▼
           │   ┌─────────┐       ┌─────────┐
           │   │Converted│       │Cancelled│
           │   └─────────┘       └─────────┘
           │                           ▲
           │         (time elapses)    │
           │              │            │
           │              ▼            │
           │        ┌─────────┐        │
           └───────►│ Expired │────────┘
                    └─────────┘
```

### State Ownership

| State | Owned By | Transition Trigger |
|-------|----------|-------------------|
| **Draft** | Client application | Customer action only |
| **Submitted** | Quote system | Form submission |
| **Reviewed** | External workflow | Sales CRM / manual process |
| **Quoted** | External workflow | Sales CRM / manual process |
| **Approved** | External workflow | Customer response via sales |
| **Converted** | OMS | Order creation |
| **Expired** | Quote system | Time-based calculation |
| **Declined** | External workflow | Customer response via sales |
| **Cancelled** | External workflow | Either party via sales |

### Observable vs. Terminal States

| Classification | States |
|----------------|--------|
| **Observable (in-flight)** | Submitted, Reviewed, Quoted, Approved |
| **Terminal (final)** | Converted, Expired, Declined, Cancelled |
| **Client-only (not persisted)** | Draft |

### State Truth Ownership

> The Quote system owns **Submitted** and **Expired** states.
> All other state transitions are controlled by **external systems**.
> The Quote system observes and displays these states but does not control them.

---

## Field Immutability Rules

### Post-Submission Immutability

Once a quote is submitted, the following fields are **permanently immutable**:

| Category | Immutable Fields |
|----------|------------------|
| **Identity** | Reference number, submission timestamp |
| **Customer** | Name, email, phone, company (as submitted) |
| **Project** | Sign type, dimensions, quantity, materials, mounting, illumination |
| **Design** | Description, reference files |
| **Pricing** | Preliminary estimate (as calculated at submission) |

### Rationale

| Principle | Explanation |
|-----------|-------------|
| **Auditability** | Original request must be preserved for reference |
| **Dispute Prevention** | Customer and business see same original data |
| **Traceability** | Changes should create new quotes, not modify existing |
| **Simplicity** | No versioning, no change history, no conflicts |

### Modification Path

If a quote needs to be modified after submission:
1. Original quote is marked as Cancelled
2. New quote request is submitted
3. New reference number is generated
4. Original quote remains as historical record

> There is no "edit quote" capability. Modifications require new submissions.

---

## Pricing Semantics

### What Pricing IS

| Aspect | Specification |
|--------|---------------|
| **Nature** | Indicative, preliminary, estimate |
| **Format** | Range (min–max) |
| **Calculation** | Based on form inputs at submission time |
| **Visibility** | Customer and sales both see same range |
| **Immutability** | Frozen at submission |

### What Pricing IS NOT

| Excluded Aspect | Rationale |
|-----------------|-----------|
| **Binding** | Estimate only, subject to review |
| **Guaranteed** | Final pricing determined by sales |
| **Contractual** | No contract formed by estimate |
| **Invoice-ready** | Not a quote in accounting terms |
| **Automated** | Does not trigger any financial systems |

### Price Range Calculation

The preliminary estimate is calculated client-side using:

| Factor | Weight | Source |
|--------|--------|--------|
| Sign type base price | Primary | Static pricing table |
| Dimensional multiplier | Primary | Width × Height formula |
| Quantity factor | Primary | Volume pricing table |
| Material modifier | Secondary | Material pricing table |
| Illumination modifier | Secondary | Illumination pricing table |

> Calculation formula is informational only. Business is not bound to honor calculated estimate.

### Price Validity

| Aspect | Specification |
|--------|---------------|
| **Validity Period** | 30 days from submission |
| **Expiration Display** | "Valid until [date]" shown in confirmation |
| **Post-Expiration** | Quote moves to Expired state |
| **No Auto-Extension** | Expiration is not extended automatically |

---

## Language and Expectation Guidelines

### Customer-Facing Language

#### Approved Terminology

| Use This | Instead Of |
|----------|------------|
| Quote request | Order |
| Preliminary estimate | Price / Total |
| Indicative pricing | Final pricing |
| Request received | Order confirmed |
| Our team will review | Approved |
| Before placing an order | When your order ships |
| Subject to review | Guaranteed |

#### Disclaimers (Required)

The following disclaimers must appear in the quote form and confirmation:

| Location | Required Disclaimer |
|----------|---------------------|
| **Estimate Section** | "This is an indicative estimate based on the information provided. Final pricing will be confirmed after review by our team." |
| **Confirmation Page** | "This is a quote request, not an order. Pricing is preliminary and subject to review. No payment is required at this time. No production will begin until you approve final pricing and place an order." |
| **Acknowledgment Checkbox** | "I understand this is a preliminary quote request and not a binding order." |

### Internal Language

| Use This | Instead Of |
|----------|------------|
| Quote request | Lead |
| Preliminary estimate | Committed price |
| Customer requirements | Customer order |
| Review queue | Approval queue |
| Follow-up required | Action required |

---

## Read-Only and Write-Safe Guarantees

### Customer Interface (Quote Form)

The quote form is **write-safe**, meaning:

| Guarantee | Implementation |
|-----------|----------------|
| **No order creation** | Submit creates quote request only |
| **No payment processing** | No payment fields or flows |
| **No account creation** | Form submission does not create user account |
| **No binding commitment** | Explicit disclaimers throughout |
| **Validation before submit** | All required fields validated client-side |
| **Confirmation required** | Acknowledgment checkbox required |

### Internal Interface (Sales View)

The sales view is **read-only**, meaning:

| Guarantee | Implementation |
|-----------|----------------|
| **No edit controls** | All data displayed as text, never in inputs |
| **No state buttons** | No approve/reject/convert buttons |
| **No inline editing** | No editable fields or cells |
| **No bulk actions** | No multi-select, no batch operations |
| **No delete capability** | No delete or archive controls |
| **No write endpoints** | View only makes GET requests |

### Forbidden UI Elements

The following UI elements must NOT appear in any quote interface:

| Element | Reason |
|---------|--------|
| "Approve" button | No approval workflow in quote system |
| "Reject" button | No rejection workflow in quote system |
| "Convert to Order" button | Order creation is external |
| "Edit Quote" button | Quotes are immutable after submission |
| "Delete" button | Quotes are preserved for audit |
| Payment forms | No payment in quote system |
| Shipping selection | No fulfillment in quote system |
| Order confirmation language | Quotes are not orders |

---

## OMS Relationship

### High-Level Integration

The Custom Quote system and OMS are **separate systems** with a defined relationship:

| Aspect | Specification |
|--------|---------------|
| **Direction** | Quotes may become visible in OMS; OMS does not control quotes |
| **Trigger** | Quote-to-order conversion is an external process |
| **Boundary** | Quote system ends at Converted state |
| **Ownership** | OMS owns orders; Quote system owns quote requests |

### What OMS Can Observe

When a quote is converted to an order, OMS may observe:

| Field | Availability |
|-------|--------------|
| **Quote Reference** | Source attribution on order |
| **Original Estimate** | Historical reference only |
| **Customer Information** | As captured in quote |
| **Project Requirements** | As submitted in quote |

### What OMS Cannot Do

| Prohibited Action | Rationale |
|-------------------|-----------|
| Modify quote records | Quotes are immutable |
| Trigger quote state changes | Quote states are external |
| Delete quotes | Quotes preserved for audit |
| Create quotes | Quote creation is customer-initiated |
| Access draft quotes | Drafts are client-side only |

### Conversion Representation

Quote-to-order conversion is represented as:

1. Quote enters **Converted** state (terminal)
2. Order is created in OMS (separate record)
3. Order contains quote reference (attribution)
4. Quote and order are linked but independent

> The Quote system observes the Converted state but does not trigger order creation.
> Order creation is the responsibility of external sales/ordering workflows.

---

## UX Boundaries

### What the Custom Quote System Does

| Capability | Scope |
|------------|-------|
| **Collect requirements** | Form fields capture customer needs |
| **Calculate estimates** | Indicative pricing based on inputs |
| **Store submissions** | Quote requests persisted for follow-up |
| **Display confirmations** | Acknowledge receipt, set expectations |
| **Surface quotes internally** | Read-only visibility for sales |
| **Track lifecycle states** | Observable state progression |
| **Enforce expiration** | Time-based quote validity |

### What the Custom Quote System Does NOT Do

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Create orders** | Order creation is external |
| **Process payments** | No financial transactions |
| **Trigger production** | No fulfillment integration |
| **Send emails** | Notification is external concern |
| **Manage customers** | No customer account system |
| **Assign to users** | No assignment workflow |
| **Calculate taxes** | Estimates are pre-tax, indicative |
| **Validate inventory** | No inventory integration |
| **Schedule delivery** | No fulfillment scope |
| **Generate invoices** | No accounting integration |
| **Modify existing quotes** | Immutable after submission |
| **Execute approvals** | No approval workflow |

### Boundary Enforcement

If a feature request contains any of these phrases, it is **OUT OF SCOPE**:

- "Automatically create an order when..."
- "Send a notification when..."
- "Allow sales to edit..."
- "Trigger production if..."
- "Calculate final price with..."
- "Process payment..."
- "Assign quote to..."
- "Approve the quote..."
- "Convert to order..."
- "Update the customer record..."

---

## Future Extension Notes

### Guarded Extension Points

The following extensions may be considered in future iterations,
subject to formal UX review:

| Extension | Conditions |
|-----------|------------|
| **Quote PDF export** | Read-only, customer-initiated download |
| **Quote email copy** | Triggered by customer, not automatic |
| **Quote history view** | Customer can see past submissions (read-only) |
| **Additional product types** | New sign types in taxonomy |
| **Additional material options** | Expanded material selection |

### Forbidden Extensions

The following extensions are **explicitly prohibited** as they would
violate the governing principles of this specification:

| Extension | Why Prohibited |
|-----------|----------------|
| Quote editing | Violates immutability |
| Order creation from quote | Quote system is not OMS |
| Payment integration | Quote system is not checkout |
| Automated pricing commits | Estimates must remain indicative |
| Approval workflows | Quote system is intake-only |
| Customer accounts | Quote system is stateless for customers |
| Bulk quote operations | No batch processing |
| Quote assignment | No internal workflow management |

### Extension Process

Any extension to the Custom Quote system must:

1. Maintain submission-only, read-only semantics
2. Preserve quote immutability
3. Use M12 components exclusively
4. Follow existing layout patterns
5. Document in this specification
6. Pass formal UX review before implementation

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Quote Request** | Customer-submitted form seeking preliminary pricing |
| **Preliminary Estimate** | Non-binding indicative price range |
| **Reference Number** | System-generated unique identifier (QR-YYYY-NNNNN) |
| **Submission** | Completed form sent to system |
| **Converted** | Terminal state indicating order was created |
| **Expired** | Terminal state indicating validity period elapsed |
| **Immutable** | Cannot be changed after submission |
| **Write-Safe** | Controlled, validated submission with no side effects |
| **Read-Only** | Observable but not modifiable |
| **Governed** | All behaviors explicitly defined and bounded |

---

## Appendix: Component Mapping

The Custom Quote system uses M12 design tokens and components exclusively.

| Quote Element | M12 Components Used |
|---------------|---------------------|
| **Quote Form** | Card, form inputs (text, select, textarea, checkbox, file upload) |
| **Validation** | Inline error styling per M12 semantic colors |
| **Estimate Display** | Card with muted background, info icon |
| **Confirmation** | Card, StatusPill (success variant) |
| **Sales List View** | Table, TableHeader, TableBody, TableRow, TableCell, StatusPill |
| **Quote Detail** | Card, MetadataPanel (read-only) |
| **Filters** | Button (ghost), StatusPill |
| **Pagination** | Button (secondary) |

---

## Appendix: State Color Mapping

| State | StatusPill Variant | Visual Treatment |
|-------|-------------------|------------------|
| **Submitted** | `active` | Blue background |
| **Reviewed** | `standard` | Yellow background |
| **Quoted** | `standard` | Yellow background |
| **Approved** | `exceptional` | Green background |
| **Converted** | `exceptional` | Green background |
| **Expired** | `pending` | Gray background |
| **Declined** | `breach` | Red background |
| **Cancelled** | `pending` | Gray background |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial specification (M28-01) |

**This specification is LOCKED.** Changes require formal UX review.
