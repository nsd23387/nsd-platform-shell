# Media Approval UX Specification

> **Version:** 1.0  
> **Status:** Locked (M16-02)  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Media Catalog (M16-01)

This document defines the UX contract for observing media approval state.
The approval UX is a **read-only observational interface** that surfaces
approval status, usage context, and approval history without enabling
any approval actions.

---

## Table of Contents

1. [Overview](#overview)
2. [Approval Semantics](#approval-semantics)
3. [Approval UX Surfaces](#approval-ux-surfaces)
   - [Approval Status Indicators](#approval-status-indicators)
   - [Usage Context Panel](#usage-context-panel)
   - [Approval History](#approval-history)
4. [Integration with Media Catalog](#integration-with-media-catalog)
5. [Component Reuse Mapping](#component-reuse-mapping)
6. [Read-Only Guarantees](#read-only-guarantees)
7. [UX Boundaries](#ux-boundaries)
8. [Extension Points](#extension-points)

---

## Overview

### Purpose

The Media Approval UX provides **observational visibility** into the approval
state of media assets, enabling humans to answer:

| Question | Answer Provided |
|----------|-----------------|
| **Has this asset been approved?** | Approval status indicator |
| **For what purpose?** | Usage context and scope |
| **By whom?** | Approver attribution |
| **When?** | Approval timestamp |
| **What's the history?** | Approval event timeline |

### Non-Purpose

The Media Approval UX explicitly does NOT enable:

| Excluded Capability | Rationale |
|---------------------|-----------|
| Approving assets | Approval authority is external |
| Rejecting assets | Rejection authority is external |
| Revoking approvals | Revocation authority is external |
| Publishing assets | Publishing is a separate system |
| Replacing assets | Asset management is external |
| Contacting external platforms | No outbound actions |
| Triggering workflows | No workflow control |
| Editing approval metadata | Approvals are immutable records |

### Core Principles

1. **Visibility over Authority** — Show approval state, never grant approval
2. **Observation over Control** — Every element is read-only by design
3. **Attribution over Anonymity** — Always show who approved and when
4. **Confidence over Ambiguity** — Clear status signaling, no guesswork
5. **History over Snapshot** — Full approval timeline, not just current state

### Governance Alignment

This UX respects the separation between:

| Concern | Responsibility |
|---------|----------------|
| **Visibility** | Media Approval UX (this specification) |
| **Authority** | External approval systems |
| **Enforcement** | Backend services and policies |
| **Audit** | Activity Spine event log |

---

## Approval Semantics

### Approval as External Event

Approval is:
- **External** — Decisions made outside the Media Catalog
- **Event-driven** — Recorded as immutable events
- **Append-only** — History cannot be modified or deleted
- **Authoritative** — Status reflects source-of-truth systems

The UX only **reflects** approval status. It does not **grant** approval.

### Approval Status Model

| Status | Description | Authority |
|--------|-------------|-----------|
| **Approved** | Asset cleared for specified usage | External approver |
| **Pending** | Awaiting approval decision | N/A (no decision yet) |
| **Restricted** | Approval denied or revoked | External authority |
| **Unknown** | Approval state not available | System limitation |

### Approval Scope

Approval is scoped to specific usage contexts:

| Scope Dimension | Examples |
|-----------------|----------|
| **Channel** | Web, Print, Social, Retail |
| **Campaign** | Specific marketing campaign |
| **Duration** | Time-limited approvals |
| **Geography** | Regional restrictions |
| **Product** | Associated product lines |

### Approval Event Structure

Each approval event (observable, not editable) contains:

| Field | Description |
|-------|-------------|
| **Event ID** | Unique identifier |
| **Timestamp** | When the event occurred |
| **Status** | Resulting approval status |
| **Scope** | Usage context granted or denied |
| **Approver** | Who made the decision |
| **Source System** | Which system recorded the event |
| **Notes** | Optional context (read-only) |

---

## Approval UX Surfaces

### Approval Status Indicators

#### Purpose

Provide immediate visual signaling of an asset's approval state.
Status must be unambiguous and accessible (not color-only).

#### Visual Status Tokens

| Status | Visual Treatment | Icon | Label |
|--------|------------------|------|-------|
| **Approved** | Green StatusPill | ✓ | "Approved" |
| **Pending** | Gray StatusPill | ○ | "Pending Approval" |
| **Restricted** | Yellow StatusPill | ⚠ | "Restricted" |
| **Unknown** | Muted StatusPill | ? | "Status Unknown" |

Uses M12 StatusPill component with semantic color variants.

#### Confidence Signaling

Status indicators include confidence metadata:

| Confidence | Description | Visual Hint |
|------------|-------------|-------------|
| **Verified** | Status confirmed by source system | Solid indicator |
| **Stale** | Status may be outdated | Muted indicator with timestamp |
| **Partial** | Some scopes approved, others not | Split indicator |

#### Placement

Status indicators appear in:

| Location | Context |
|----------|---------|
| **Media List View** | Column or badge on asset card |
| **Media Detail View** | Prominent header position |
| **Linked Entity Views** | When asset is referenced elsewhere |

#### Layout Intent — List View Column

```
┌─────────────────────────────────────────────────────────────┐
│ Thumb │ Asset ID │ Type   │ Approval    │ Source │ Created │
├─────────────────────────────────────────────────────────────┤
│ [img] │ MDA-001  │ Image  │ ✓ Approved  │ Design │ 2d ago  │
│ [img] │ MDA-002  │ Mockup │ ○ Pending   │ Agency │ 1d ago  │
│ [img] │ MDA-003  │ Video  │ ⚠ Restricted│ Factory│ 3h ago  │
│ [img] │ MDA-004  │ Render │ ? Unknown   │ Design │ 5d ago  │
└─────────────────────────────────────────────────────────────┘
```

#### Layout Intent — Detail View Header

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Media Catalog                                      │
│                                                              │
│ Asset MDA-12345                        ┌─────────────────┐  │
│ Image • PNG • Created 2024-01-15       │ ✓ Approved      │  │
│                                        │ Web, Print      │  │
│                                        │ Jan 20, 2024    │  │
│                                        └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
```

#### No Action Affordances

Status indicators are **display-only**:
- No click handlers to change status
- No hover states implying editability
- No dropdown menus for status selection
- No inline approval buttons

---

### Usage Context Panel

#### Purpose

Display where an approved asset is authorized for use. Context is
observational — it shows what has been granted, not what can be requested.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ USAGE CONTEXT                                                │
│ Where this asset is approved for use                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Channels                                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                        │
│ │ ✓ Web   │ │ ✓ Print │ │ ○ Social│                        │
│ └─────────┘ └─────────┘ └─────────┘                        │
│                                                              │
│ Campaigns                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Summer Sale 2024                          Approved       │ │
│ │ CAM-789 • Active until Aug 31, 2024                     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Holiday Promo 2024                        Pending        │ │
│ │ CAM-890 • Awaiting approval                             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Orders                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ORD-456 • Acme Corp                       Approved       │ │
│ │ ORD-789 • Beta Inc                        Approved       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Restrictions                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Not approved for retail signage                       │ │
│ │ ⚠ Geographic restriction: US only                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Context Sections

##### Channels

| Element | Description |
|---------|-------------|
| **Channel Name** | Web, Print, Social, Retail, etc. |
| **Approval Status** | ✓ Approved, ○ Pending, ⚠ Restricted |
| **Display** | Chip/pill format, read-only |

##### Campaigns

| Element | Description |
|---------|-------------|
| **Campaign Name** | Marketing campaign title |
| **Campaign ID** | Clickable link to campaign (external) |
| **Status** | Approval status for this campaign |
| **Duration** | Active dates if time-limited |

##### Orders

| Element | Description |
|---------|-------------|
| **Order ID** | Clickable link to OMS |
| **Customer** | Associated customer name |
| **Status** | Approval status for this order |

##### Restrictions

| Element | Description |
|---------|-------------|
| **Restriction Type** | Category of restriction |
| **Description** | Human-readable explanation |
| **Display** | Warning-styled list items |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Entity Links** | Navigate to external systems (read-only) |
| **Expand/Collapse** | Sections may collapse for long lists |
| **No Request Actions** | Cannot request approval for new contexts |
| **No Removal Actions** | Cannot remove approved contexts |

#### Empty State

```
No usage context defined.
Approval scope has not been specified for this asset.
```

---

### Approval History

#### Purpose

Provide complete chronological record of approval events for traceability
and audit purposes. History is append-only and cannot be modified.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ APPROVAL HISTORY                                             │
│ Chronological record of approval events                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ○───────────────────────────────────────────────────────○   │
│                                                              │
│ Jan 20, 2024 • 2:30 PM                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✓ Approved for Web, Print                               │ │
│ │                                                         │ │
│ │ Approver: Jane Smith (Design Lead)                      │ │
│ │ Source: Approval System                                 │ │
│ │ Scope: Web, Print channels                              │ │
│ │ Notes: "Cleared for Q1 campaign usage"                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ │                                                            │
│ Jan 18, 2024 • 10:15 AM                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠ Restricted for Social                                 │ │
│ │                                                         │ │
│ │ Approver: Brand Compliance                              │ │
│ │ Source: Compliance System                               │ │
│ │ Scope: Social media channels                            │ │
│ │ Notes: "Requires format adjustment for social"          │ │
│ └─────────────────────────────────────────────────────────┘ │
│ │                                                            │
│ Jan 15, 2024 • 9:00 AM                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ Submitted for Approval                                │ │
│ │                                                         │ │
│ │ Submitter: Design System                                │ │
│ │ Source: Asset Creation                                  │ │
│ │ Scope: All channels                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Timeline Structure

Uses M12 Timeline pattern with approval-specific content.

| Element | Description |
|---------|-------------|
| **Timestamp** | Absolute datetime of event |
| **Event Type** | Approved, Restricted, Submitted, Revoked |
| **Status Indicator** | Colored icon matching event type |
| **Approver** | Name and role (if available) |
| **Source System** | Which system recorded the event |
| **Scope** | Usage context affected |
| **Notes** | Optional context from approver (read-only) |

#### Event Types

| Event Type | Description | Icon | Color |
|------------|-------------|------|-------|
| **Approved** | Approval granted | ✓ | Green |
| **Restricted** | Approval denied or limited | ⚠ | Yellow |
| **Revoked** | Previous approval withdrawn | ✕ | Red |
| **Submitted** | Asset submitted for approval | ○ | Gray |
| **Expired** | Time-limited approval ended | ⊘ | Gray |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Chronological Order** | Newest first (descending) |
| **No Editing** | Events cannot be modified |
| **No Deletion** | Events cannot be removed |
| **No Annotations** | Users cannot add comments |
| **Expand/Collapse** | Events may show summary or full detail |
| **System Attribution** | Every event shows source system |

#### Empty State

```
No approval history available.
This asset has not entered an approval workflow.
```

Uses M12 empty state pattern: centered, muted text, no alarming colors.

---

## Integration with Media Catalog

### Placement within Media Catalog

Approval UX elements appear within the Media Catalog (M16-01) surfaces:

| Media Catalog Surface | Approval Integration |
|----------------------|----------------------|
| **Media List View** | Approval status column/badge |
| **Media Detail View** | Approval Status header + panels |
| **Filter Panel** | Approval status filter dimension |

### Media Detail View Integration

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Media Catalog                                      │
│                                                              │
│ Asset MDA-12345                        ┌─────────────────┐  │
│ Image • PNG • Created 2024-01-15       │ ✓ Approved      │  │
│                                        └─────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [ASSET PREVIEW]                                              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌───────────────────────┐  ┌──────────────────────────────┐ │
│ │ ASSET METADATA        │  │ USAGE CONTEXT                │ │
│ │ (from M16-01)         │  │ (from M16-02)                │ │
│ │ ...                   │  │ ...                          │ │
│ └───────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│ ┌───────────────────────┐  ┌──────────────────────────────┐ │
│ │ LINKED ENTITIES       │  │ APPROVAL HISTORY             │ │
│ │ (from M16-01)         │  │ (from M16-02)                │ │
│ │ ...                   │  │ ...                          │ │
│ └───────────────────────┘  └──────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Filter Integration

Approval status adds a filter dimension to Media List View:

```
┌─────────────────────────────────────────────────────────────┐
│ Filters                                          [Clear All] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Type                                                         │
│ ┌───────┐ ┌────────┐ ┌────────┐ ┌───────┐                  │
│ │ Image │ │ Mockup │ │ Render │ │ Video │                  │
│ └───────┘ └────────┘ └────────┘ └───────┘                  │
│                                                              │
│ Approval Status                     ← NEW from M16-02        │
│ ┌──────────┐ ┌─────────┐ ┌────────────┐ ┌─────────┐        │
│ │ Approved │ │ Pending │ │ Restricted │ │ Unknown │        │
│ └──────────┘ └─────────┘ └────────────┘ └─────────┘        │
│                                                              │
│ Source                                                       │
│ ...                                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Reuse Mapping

Media Approval UX must exclusively reuse M12 design system components.

### Token Usage

| Approval Element | M12 Token |
|------------------|-----------|
| Approved status | `statusColors.exceptional` (green) |
| Pending status | `statusColors.pending` (gray) |
| Restricted status | `statusColors.standard` (yellow) |
| Unknown status | `text.muted` |
| Panel background | `background.surface` |
| Panel borders | `border.default` |
| Timeline connector | `border.subtle` |

### Component Mapping

| Approval Surface | M12 Components Used |
|------------------|---------------------|
| **Status Indicators** | StatusPill |
| **Usage Context Panel** | Card, MetadataPanel |
| **Channel Chips** | StatusPill (compact) |
| **Campaign/Order List** | Card (nested), clickable links |
| **Restrictions List** | Card (warning variant border) |
| **Approval History** | Timeline |
| **History Events** | Card (compact) |
| **Empty States** | Card with muted text |

### Pattern Mapping

| Approval Pattern | M12 Pattern |
|------------------|-------------|
| Status header | StatusPill in Card header |
| Context sections | DashboardSection pattern |
| Event timeline | Timeline pattern |
| Metadata display | MetadataPanel pattern |

### Forbidden Components

Media Approval UX must NOT use or create:
- Approve/Reject buttons
- Status dropdown selectors
- Inline editing controls
- Form inputs for approval requests
- Modal dialogs for approval actions
- Confirmation dialogs for status changes
- Toggle switches for approval state

---

## Read-Only Guarantees

Media Approval UX enforces read-only semantics at every layer.

### API Contract

| HTTP Method | Allowed | Purpose |
|-------------|---------|---------|
| **GET** | ✅ Yes | Fetch approval status, history, context |
| **POST** | ❌ No | No approval submission |
| **PUT** | ❌ No | No status updates |
| **PATCH** | ❌ No | No partial updates |
| **DELETE** | ❌ No | No revocation |

### UI Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **No approve button** | Approval is not a Catalog function |
| **No reject button** | Rejection is not a Catalog function |
| **No revoke button** | Revocation is not a Catalog function |
| **No status selector** | Status cannot be changed |
| **No request form** | Cannot request approval |
| **No scope editor** | Usage context is read-only |
| **No history editing** | Timeline is append-only |
| **No notes addition** | Cannot add annotations |

### Visual Signaling

| Signal | Location |
|--------|----------|
| "Read-Only" indicator | Inherited from Platform Shell |
| No action buttons | Nowhere in approval panels |
| No edit icons | Nowhere in approval UX |
| Static cursor | No pointer on non-navigational elements |

### External System Boundaries

This UX does NOT:

| Boundary | Enforcement |
|----------|-------------|
| **Contact external platforms** | No outbound API calls for actions |
| **Trigger publishing** | Publishing is a separate system |
| **Notify approvers** | Notification is external |
| **Queue approval requests** | Request handling is external |

---

## UX Boundaries

### What Approval UX Does

| Capability | Description |
|------------|-------------|
| **Display status** | Show current approval state |
| **Show usage context** | Display approved channels, campaigns, orders |
| **Present restrictions** | Show where asset is not approved |
| **Show history** | Display chronological approval events |
| **Attribute decisions** | Show who approved and when |
| **Support filtering** | Filter by approval status |
| **Link to entities** | Navigate to related campaigns, orders |

### What Approval UX Does NOT Do

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Approve assets** | Approval authority is external |
| **Reject assets** | Rejection authority is external |
| **Revoke approvals** | Revocation authority is external |
| **Request approval** | Request workflows are external |
| **Escalate pending** | Escalation is external |
| **Edit scope** | Usage context is immutable |
| **Add notes** | History is append-only |
| **Trigger publishing** | Publishing is separate |
| **Contact platforms** | No outbound actions |
| **Send notifications** | Notification is external |

### Boundary Enforcement

If a feature request implies any of the following, it is OUT OF SCOPE:

- "Allow users to approve..."
- "Let staff reject..."
- "Enable revoking..."
- "Request approval for..."
- "Escalate to..."
- "Publish to..."
- "Notify the approver..."
- "Add a note to the approval..."
- "Change the scope..."

### Authority Separation

| Concern | Owner | This UX |
|---------|-------|---------|
| **Granting approval** | External approval system | ❌ Cannot |
| **Viewing approval status** | This UX | ✅ Can |
| **Revoking approval** | External authority | ❌ Cannot |
| **Viewing revocation** | This UX | ✅ Can |
| **Requesting approval** | External workflow | ❌ Cannot |
| **Viewing pending state** | This UX | ✅ Can |

---

## Extension Points

Future extensions must maintain read-only semantics.

### Allowed Extensions

| Extension | Conditions |
|-----------|------------|
| **New approval statuses** | Display only, no status mutation |
| **New scope dimensions** | Read-only context display |
| **New event types** | Append to timeline, no interaction |
| **Approval metrics** | Aggregate read-only statistics |
| **Compliance indicators** | Display-only policy status |
| **Expiration warnings** | Visual indicators for time-limited approvals |

### Forbidden Extensions

| Extension | Why Forbidden |
|-----------|---------------|
| **Approve button** | Violates read-only semantics |
| **Reject button** | Violates read-only semantics |
| **Quick approve** | Violates governance separation |
| **Batch approval** | Violates read-only semantics |
| **Approval request form** | Request handling is external |
| **Status toggle** | Status mutation is external |
| **Scope editor** | Scope management is external |
| **Comment thread** | Annotation is external |

### Extension Process

Any extension to Approval UX must:
1. Maintain read-only semantics
2. Preserve authority separation
3. Use M12 components exclusively
4. Follow existing layout patterns
5. Document in this specification
6. Pass UX and governance review

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Approval** | Authorization for asset usage in specific context |
| **Approver** | Person or system granting approval |
| **Authority** | The power to grant or revoke approval |
| **Context** | Scope of approved usage (channel, campaign, etc.) |
| **Restriction** | Limitation on asset usage |
| **Revocation** | Withdrawal of previously granted approval |
| **Scope** | Usage dimensions covered by an approval |
| **Visibility** | Ability to see status (this UX provides) |

---

## Appendix: Design System Reference

Media Approval UX uses M12 design tokens and components exclusively.

| Resource | Path |
|----------|------|
| Color Tokens | `/design/tokens/colors.ts` |
| Typography Tokens | `/design/tokens/typography.ts` |
| Spacing Tokens | `/design/tokens/spacing.ts` |
| StatusPill Component | `/design/components/StatusPill.tsx` |
| Card Component | `/design/components/Card.tsx` |
| Timeline Pattern | `/design/patterns/Timeline.tsx` |
| MetadataPanel Pattern | `/design/patterns/MetadataPanel.tsx` |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial specification (M16-02) |

**This specification is LOCKED.** Changes require formal UX and governance review.
