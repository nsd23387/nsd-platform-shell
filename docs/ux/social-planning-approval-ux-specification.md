# Social Planning & Approval UX Specification

> **Version:** 1.0  
> **Status:** Locked (M18-01)  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Platform Shell (M13)  
> **Governance:** M17-01, M17-02, M17-03

This document defines the UX contract for the Social Planning & Approval interface.
This is a **read-only observational interface** that surfaces social content planning
and approval status for situational awareness and governance visibility.

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Constraints](#critical-constraints)
3. [Social Planning vs Platform Shell](#social-planning-vs-platform-shell)
4. [UX Surfaces](#ux-surfaces)
   - [Content Planning View](#content-planning-view)
   - [Approval Review View](#approval-review-view)
   - [Content Detail View](#content-detail-view)
5. [Approval Visibility Model](#approval-visibility-model)
6. [Component Reuse Mapping](#component-reuse-mapping)
7. [Read-Only Semantics](#read-only-semantics)
8. [Write-Safe Guarantees](#write-safe-guarantees)
9. [UX Boundaries](#ux-boundaries)
10. [Governance Alignment](#governance-alignment)
11. [Extension Points](#extension-points)

---

## Overview

### Purpose

The Social Planning & Approval interface provides **observational visibility** into social content planning and approval workflows, enabling humans to:

| Capability | Description |
|------------|-------------|
| **Observe** | View planned social content and its current status |
| **Understand** | Comprehend where content is in the approval workflow |
| **Trace** | Review the complete approval history for any content item |
| **Identify** | Surface content requiring approval attention |
| **Attribute** | Know who approved what, when, and with what scope |

### Non-Purpose

This interface explicitly does NOT enable:

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Publishing** | No publish buttons exist; publishing is external |
| **Scheduling** | No schedule controls; scheduling is external |
| **Approving** | No approve buttons; approval decisions are external |
| **Rejecting** | No reject buttons; rejection is external |
| **Editing** | No content editing; modifications are external |
| **Automating** | No automation triggers; all actions are human-driven elsewhere |

### Core Principles

1. **Observation over Control** — Every screen is read-only by design
2. **Governance by Design** — UX cannot be misused as a posting tool
3. **Authority Visibility** — Who can approve what is always clear
4. **Traceability over Summarization** — Full approval history is accessible
5. **Calm over Urgent** — Status is factual, not alarming
6. **Clarity over Density** — White space and hierarchy improve comprehension

---

## Critical Constraints

### Absolute Prohibitions

The following are **explicitly prohibited** in this UX specification:

| Prohibition | Rationale |
|-------------|-----------|
| **Publish buttons** | Publishing occurs outside this system |
| **Schedule execution controls** | Scheduling occurs outside this system |
| **Approve/Reject buttons** | Approval decisions occur outside this system |
| **Auto-posting features** | Automation is explicitly prohibited (M17-03) |
| **AI autonomy triggers** | AI guardrails prohibit autonomous actions (M17-03) |
| **Platform API write calls** | No mutations to external platforms |
| **Inline content editing** | Content creation is external |
| **Bulk action controls** | No multi-select operations |

### Why These Constraints Exist

1. **Social automation runtime (M26-02) does not exist** — No infrastructure to receive actions
2. **Governance requires human authority** — All actions must occur through governed channels
3. **Write-safety is mandatory** — Users cannot accidentally trigger mutations
4. **Future-proofing** — When M26-02 exists, this UX remains observation-only

---

## Social Planning vs Platform Shell

The Social Planning & Approval interface operates within the Platform Shell but serves a distinct purpose.

### Responsibility Matrix

| Aspect | Platform Shell | Social Planning & Approval |
|--------|----------------|---------------------------|
| **Scope** | Cross-functional dashboards | Social content lifecycle visibility |
| **Granularity** | Aggregate metrics | Individual content item detail |
| **Navigation** | Dashboard selection | Content discovery and inspection |
| **Data Model** | Activity Spine summaries | Social Activity events (M17-02) |
| **Primary User** | Executives, team leads | Marketing, Communications, Approvers |

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
├── OMS
│   ├── Orders List
│   ├── Order Detail
│   ├── Exceptions
│   └── Activity Timeline
└── Social  ← THIS SPECIFICATION
    ├── Content Planning View
    ├── Approval Review View
    └── Content Detail View
```

### Shared Elements

Social Planning & Approval inherits from Platform Shell:

- Sidebar navigation structure
- Header component patterns
- Read-only mode indicator (always displayed)
- M12 design tokens (colors, typography, spacing)
- Card, Table, StatusPill, Timeline, MetadataPanel components

### Distinct Elements

Social Planning & Approval introduces (using M12 patterns only):

- Content-centric list views
- Approval status visualization
- Approval history timeline
- AI assistance disclosure indicators

---

## UX Surfaces

### Content Planning View

#### Purpose

Provide situational awareness across all planned social content. Enable discovery and navigation to individual content details without implying selection or action capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────────┐
│ Social Content                                      [Filters ▾] │
│ Observational view of planned content                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  READ-ONLY — This view displays content status. Publishing and   │
│  approval actions occur through governed external processes.     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Content ID │ Platform │ Type │ Status │ Owner │ Updated     │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ SC-001     │ LinkedIn │ Post │ ● Approved │ J.Smith │ 2h ago│ │
│ │ SC-002     │ Twitter  │ Post │ ● Pending  │ A.Jones │ 1h ago│ │
│ │ SC-003     │ Instagram│ Reel │ ● Draft    │ J.Smith │ 30m   │ │
│ │ SC-004     │ LinkedIn │ Post │ ● Rejected │ B.Chen  │ 4h ago│ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Showing 1-50 of 127 content items              [← Prev] [Next →]│
└─────────────────────────────────────────────────────────────────┘
```

#### Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| **Content ID** | Canonical identifier, clickable for detail | Yes |
| **Platform** | Target platform (LinkedIn, Twitter, Instagram, etc.) | Yes |
| **Type** | Content type (Post, Story, Reel, Video, Article, Thread) | Yes |
| **Status** | Approval status via StatusPill | Yes |
| **Owner** | Content creator/owner | Yes |
| **Last Updated** | Relative timestamp of last status change | Yes |

#### Status Values

| Status | StatusPill Variant | Meaning |
|--------|-------------------|---------|
| **Draft** | `pending` (gray) | Content created, not yet submitted |
| **Pending** | `standard` (yellow) | Awaiting approval decision |
| **Approved** | `exceptional` (green) | Approval granted |
| **Rejected** | `breach` (red) | Approval denied |
| **Escalated** | `active` (blue) | Escalated to higher authority |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Row Click** | Navigates to Content Detail View |
| **Sorting** | Client-side only, no server mutations |
| **Filtering** | Observational filters (by status, platform, type, owner) |
| **Pagination** | Server-side fetch, standard page navigation |
| **Row Hover** | Subtle background change (M12 `background.hover`) |
| **No Row Selection** | No checkboxes, no multi-select |
| **No Bulk Actions** | No action bar, no batch operations |
| **No Create Button** | Content creation is external |

#### Filter Panel

Filters are observational refinements, not action triggers:

| Filter | Type | Options |
|--------|------|---------|
| **Status** | Multi-select chips | Draft, Pending, Approved, Rejected, Escalated |
| **Platform** | Multi-select chips | LinkedIn, Twitter, Instagram, Facebook, YouTube, TikTok |
| **Type** | Multi-select chips | Post, Story, Reel, Video, Article, Thread |
| **Owner** | Text search | Partial match on owner name |
| **Date Range** | Date picker | Preset ranges (7d, 30d, 90d, Custom) |

Filter UI uses M12 Button (ghost variant) and StatusPill components.

#### Empty State

```
No content matches the current filters.
Adjust filters or clear all to see content.

Content creation and submission occur through
governed external processes.
```

Uses M12 empty state pattern: centered, muted text, no action buttons.

---

### Approval Review View

#### Purpose

Provide focused visibility into content requiring approval attention. Surface approval queue and history without offering any approval controls.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────────┐
│ Approval Status                                     [Filters ▾] │
│ Observational view of approval workflow status                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  READ-ONLY — Approval decisions occur through governed external  │
│  processes. This view displays status only.                      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PENDING APPROVAL (3)                                        │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ SC-002 • LinkedIn Post                                  │ │ │
│ │ │ "Announcing our new product line..."                    │ │ │
│ │ │ ● Pending • Requires: Marketing Director                │ │ │
│ │ │ Submitted: 2 hours ago by A.Jones                       │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ SC-007 • Instagram Reel                                 │ │ │
│ │ │ "Behind the scenes at NSD..."                           │ │ │
│ │ │ ● Pending • Requires: Brand Manager                     │ │ │
│ │ │ Submitted: 4 hours ago by J.Smith                       │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RECENTLY APPROVED (5)                                       │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ RECENTLY REJECTED (1)                                       │ │
│ │ ...                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Sections

Content is grouped by approval status:

1. **Pending Approval** — Content awaiting decisions
2. **Recently Approved** — Content approved in last 7 days
3. **Recently Rejected** — Content rejected in last 7 days
4. **Escalated** — Content escalated to higher authority

Each group uses M12 DashboardSection pattern with count in header.

#### Approval Card

| Element | Specification |
|---------|---------------|
| **Content ID** | Clickable link to Content Detail View |
| **Platform + Type** | Platform icon and content type |
| **Preview** | First 80 characters of content text |
| **Status Indicator** | StatusPill showing current state |
| **Required Approvers** | Who must approve (role, not individual) |
| **Submission Info** | When submitted and by whom |
| **No Action Buttons** | No approve, reject, or escalate buttons |

#### Approval Requirements Display

| Display Element | Description |
|-----------------|-------------|
| **Required Approvers** | Roles needed for approval (per M17-01) |
| **Approvals Received** | Count of approvals obtained |
| **Approvals Remaining** | Count of approvals still needed |
| **Current Blocker** | Which approval is holding up progress |

All displayed as **read-only text**, never as interactive controls.

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Card Click** | Navigates to Content Detail View |
| **Filtering** | By status, platform, required approver role |
| **Sorting** | By submission date, status |
| **No Selection** | No checkboxes, no bulk operations |
| **No Action Buttons** | No approve/reject/escalate controls |
| **Auto-Refresh** | Not implemented (explicit refresh only) |

---

### Content Detail View

#### Purpose

Provide comprehensive inspection of a single content item. Surface all relevant context, approval history, and requirements without offering any mutation capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Content                                                │
│                                                                  │
│ Content SC-002                                                   │
│ LinkedIn Post • Created Dec 22, 2025                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  READ-ONLY — This view displays content for review purposes.     │
│  Editing, approval, and publishing occur through governed        │
│  external processes.                                             │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────┐  ┌────────────────────────────────┐ │
│ │ CONTENT PREVIEW         │  │ APPROVAL STATUS                │ │
│ │                         │  │                                │ │
│ │ ┌─────────────────────┐ │  │ Status: ● Pending              │ │
│ │ │                     │ │  │                                │ │
│ │ │  [Content preview   │ │  │ Required:                      │ │
│ │ │   rendered as it    │ │  │ ☐ Marketing Director           │ │
│ │ │   would appear on   │ │  │ ☐ Brand Manager                │ │
│ │ │   the platform]     │ │  │                                │ │
│ │ │                     │ │  │ Submitted: Dec 22, 2:00 PM     │ │
│ │ └─────────────────────┘ │  │ By: A.Jones                    │ │
│ │                         │  │                                │ │
│ │ Character count: 280    │  └────────────────────────────────┘ │
│ │ Hashtags: 3             │                                     │
│ │ Media: 1 image          │  ┌────────────────────────────────┐ │
│ └─────────────────────────┘  │ AI ASSISTANCE DISCLOSURE       │ │
│                              │                                │ │
│ ┌─────────────────────────┐  │ ⓘ AI-Assisted Draft            │ │
│ │ METADATA                │  │                                │ │
│ │                         │  │ This content was created with  │ │
│ │ Platform: LinkedIn      │  │ AI drafting assistance.        │ │
│ │ Type: Post              │  │                                │ │
│ │ Category: Promotional   │  │ Tool: Approved AI Tool         │ │
│ │ Owner: A.Jones          │  │ Human Review: Completed        │ │
│ │ Created: Dec 22, 1:30 PM│  │ Fact Check: Verified           │ │
│ │ Target Audience: Public │  │                                │ │
│ └─────────────────────────┘  └────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ APPROVAL HISTORY                                            │ │
│ │                                                             │ │
│ │ ○ Content Created                                           │ │
│ │ │ Dec 22, 1:30 PM • A.Jones                                 │ │
│ │ │ Draft saved with AI drafting assistance                   │ │
│ │ │                                                           │ │
│ │ ○ Submitted for Approval                                    │ │
│ │ │ Dec 22, 2:00 PM • A.Jones                                 │ │
│ │ │ Submitted to Marketing Director, Brand Manager            │ │
│ │ │                                                           │ │
│ │ ● Awaiting Approval                                         │ │
│ │   Dec 22, 2:00 PM • System                                  │ │
│ │   Pending approval from required approvers                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

#### Sections

##### Content Preview

| Element | Specification |
|---------|---------------|
| **Preview Area** | Read-only rendering of content as it would appear |
| **Platform Styling** | Visual approximation of platform presentation |
| **Media Thumbnails** | Read-only display of attached media |
| **Character Count** | Informational display |
| **Hashtag Count** | Informational display |
| **Media Count** | Informational display |
| **No Edit Controls** | No text inputs, no media upload |

Uses M12 Card component. Content is displayed as styled text, never in editable inputs.

##### Approval Status Panel

| Element | Specification |
|---------|---------------|
| **Current Status** | StatusPill with current approval state |
| **Required Approvers** | Checklist display (read-only) showing required roles |
| **Approval Progress** | Visual indication of approvals received vs. required |
| **Submission Info** | Who submitted and when |
| **No Action Buttons** | No approve, reject, or escalate controls |

Approver checkboxes are **display-only indicators**, not interactive controls. They show:
- ☐ Unchecked = Approval not yet received
- ☑ Checked = Approval received (with approver name and timestamp on hover)

##### Metadata Panel

Displays immutable content attributes using M12 MetadataPanel pattern.

| Group | Fields |
|-------|--------|
| **Content Info** | ID, Type, Category, Created Date |
| **Platform** | Target Platform, Visibility Setting |
| **Ownership** | Creator, Team, Department |
| **Classification** | Content category per M17-01 governance |

All fields are read-only. No edit icons, no hover states implying editability.

##### AI Assistance Disclosure

Required by M17-03 AI Guardrails. Displayed when content has AI involvement.

| Element | Specification |
|---------|---------------|
| **Disclosure Badge** | "AI-Assisted" indicator |
| **AI Tool Used** | Name of approved AI tool |
| **Assistance Type** | Drafting, Variants, Analysis |
| **Human Review Status** | Confirmed that human reviewed |
| **Fact Check Status** | Confirmed that facts were verified |

Uses M12 Card with info variant (blue left border). Always visible when AI was involved.

##### Approval History Timeline

Chronological log of all approval-related events using M12 Timeline pattern.

| Element | Specification |
|---------|---------------|
| **Timestamp** | Datetime of event |
| **Actor** | Who triggered the event |
| **Event Type** | Created, Submitted, Approved, Rejected, Escalated |
| **Description** | What happened |
| **Status Indicator** | Color-coded per event type |
| **No Annotations** | Users cannot add comments in this view |

Event types follow M17-02 Social Activity Taxonomy:
- `social.content.created`
- `social.content.approved`
- `social.content.scheduled`
- `social.content.published`

---

## Approval Visibility Model

### What the UX Shows

| Visibility | Display |
|------------|---------|
| **Current Status** | Approved / Pending / Rejected / Escalated / Draft |
| **Who Approved** | Name of approver(s) who granted approval |
| **When Approved** | Timestamp of approval decision |
| **Approval Scope** | What type of approval (content, brand, legal, executive) |
| **Required Approvers** | Roles required per M17-01 governance |
| **Approval Progress** | How many approvals received vs. required |

### What the UX Does NOT Allow

| Prohibited Action | Enforcement |
|-------------------|-------------|
| **Approving content** | No approve button exists |
| **Rejecting content** | No reject button exists |
| **Escalating content** | No escalate button exists |
| **Requesting approval** | No submit button exists |
| **Bypassing approval** | No bypass mechanism exists |
| **Delegating approval** | No delegation controls exist |

### Approval State Transitions

Approval state changes are **observed**, not **triggered** by this UX:

```
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL SYSTEM                                             │
│ (Governed approval process - outside this UX)               │
│                                                             │
│ Draft → Pending → Approved/Rejected/Escalated               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Events (M17-02)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ ACTIVITY SPINE                                              │
│ (Event storage and query)                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Read-only queries
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ THIS UX                                                     │
│ (Observational display only)                                │
│                                                             │
│ Displays: Status, History, Requirements                     │
│ Cannot: Approve, Reject, Escalate, Publish                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Reuse Mapping

This UX must exclusively reuse M12 design system components.

### Token Usage

| UX Element | M12 Token |
|------------|-----------|
| Page background | `background.page` |
| Card background | `background.surface` |
| Primary text | `text.primary` |
| Secondary text | `text.secondary` |
| Muted text | `text.muted` |
| Borders | `border.default` |
| Status indicators | `statusColors.*` |
| AI disclosure | `semantic.info.*` |

### Component Mapping

| UX Surface | M12 Components Used |
|------------|---------------------|
| **Content Planning View** | Table, TableHeader, TableBody, TableRow, TableCell, StatusPill, Button (ghost) |
| **Approval Review View** | Card, DashboardSection, StatusPill |
| **Content Preview** | Card |
| **Approval Status Panel** | Card, StatusPill |
| **Metadata Panel** | MetadataPanel |
| **AI Disclosure** | Card (info variant) |
| **Approval History** | Timeline |
| **Filters** | Button (ghost), StatusPill |
| **Pagination** | Button (secondary) |
| **Empty States** | Card with muted text |
| **Read-Only Banner** | ReadOnlyBanner component |

### Pattern Mapping

| UX Pattern | M12 Pattern |
|------------|-------------|
| Content detail layout | Two-column responsive grid |
| Status grouping | DashboardSection with count |
| History visualization | Timeline pattern |
| Metadata display | MetadataPanel pattern |
| Approval indicators | StatusPill pattern |

### Forbidden Components

This UX must NOT use or create:

- Form inputs (text, select, checkbox, radio)
- Modal dialogs for actions
- Inline edit controls
- Action buttons (Approve, Reject, Publish, Schedule, etc.)
- Confirmation dialogs for mutations
- Toast notifications for mutations

---

## Read-Only Semantics

This UX enforces read-only semantics at every layer.

### API Contract

| HTTP Method | Allowed | Purpose |
|-------------|---------|---------|
| **GET** | ✅ Yes | Fetch content data, approval status, history |
| **POST** | ❌ No | No creation |
| **PUT** | ❌ No | No updates |
| **PATCH** | ❌ No | No partial updates |
| **DELETE** | ❌ No | No deletion |

### UI Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **No editable fields** | All data displayed as text, never in inputs |
| **No action buttons** | No Approve, Reject, Publish, Schedule, Submit |
| **No confirmation dialogs** | Nothing that implies mutation completion |
| **No optimistic updates** | UI never assumes backend mutation |
| **No local mutation state** | No React state for editable data |
| **No selection for action** | Checkboxes are never interactive |

### Visual Signaling

| Signal | Location |
|--------|----------|
| "Read-Only" banner | Top of every view |
| No edit icons | Nowhere in this UX |
| No hover states implying edit | Metadata, content, etc. |
| Cursor: default | No pointer cursor on non-navigational elements |

---

## Write-Safe Guarantees

This UX is **write-safe by default**. A user cannot accidentally trigger mutations.

### Guarantee Matrix

| User Action | System Response |
|-------------|-----------------|
| Click on content row | Navigate to detail (read-only) |
| Click on filter | Refine displayed data (client-side) |
| Click on sort column | Reorder displayed data (client-side) |
| Click on pagination | Fetch next page (GET only) |
| Click on timeline event | No action (display only) |
| Click on approval indicator | No action (display only) |
| Click on metadata | No action (display only) |
| Click on content preview | No action (display only) |

### No Accidental Mutations

| Protection | Implementation |
|------------|----------------|
| **No double-click handlers** | Clicks never trigger mutations |
| **No keyboard shortcuts** | No Ctrl+S, no Enter to submit |
| **No drag-and-drop** | No reordering that implies persistence |
| **No context menus** | Right-click does nothing special |
| **No form submission** | No forms exist |

### No Posting Controls

This UX contains **zero controls** that could initiate posting:

| Absent Control | Why Absent |
|----------------|------------|
| **Publish button** | Publishing is external |
| **Schedule button** | Scheduling is external |
| **Post now button** | Immediate posting is external |
| **Queue button** | Queue management is external |
| **Share button** | Sharing is external |

### No Scheduling Controls

This UX contains **zero controls** that could initiate scheduling:

| Absent Control | Why Absent |
|----------------|------------|
| **Date picker for scheduling** | Scheduling is external |
| **Time picker for scheduling** | Scheduling is external |
| **Calendar view with slots** | Scheduling is external |
| **Drag-to-schedule** | Scheduling is external |
| **Recurring schedule** | Scheduling is external |

### No API-Triggering Actions

This UX makes **only GET requests**:

| API Interaction | Method | Purpose |
|-----------------|--------|---------|
| Fetch content list | GET | Display content items |
| Fetch content detail | GET | Display single content |
| Fetch approval history | GET | Display timeline events |
| Fetch filter options | GET | Populate filter dropdowns |
| Refresh data | GET | Re-fetch current view |

---

## UX Boundaries

### What This UX Does

| Capability | Description |
|------------|-------------|
| **Show planned content** | List view of all content items |
| **Show approval status** | Current state per content item |
| **Show approval requirements** | Who must approve per governance |
| **Show approval history** | Timeline of all approval events |
| **Show readiness** | Whether content is ready for publication |
| **Show AI disclosure** | Whether AI assisted and how |
| **Enable filtering** | Observational refinement by status, platform, etc. |
| **Enable navigation** | Between content items and views |

### What This UX Does NOT Do

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Execute publishing** | Publishing is external |
| **Execute scheduling** | Scheduling is external |
| **Automate anything** | Automation is prohibited (M17-03) |
| **Approve content** | Approval is external |
| **Reject content** | Rejection is external |
| **Edit content** | Editing is external |
| **Create content** | Creation is external |
| **Delete content** | Deletion is external |
| **Respond to audiences** | Engagement is external |
| **Trigger workflows** | Workflow triggers are external |
| **Send notifications** | Notifications are external |

### Boundary Enforcement

If a feature request implies any of the following, it is **OUT OF SCOPE**:

- "Allow users to approve..."
- "Let approvers reject..."
- "Enable publishing..."
- "Add scheduling..."
- "Trigger when..."
- "Send a notification..."
- "Update the content..."
- "Post to platform..."
- "Automate the..."

---

## Governance Alignment

### M17-01: Social Content Governance

This UX aligns with M17-01 by:

| Governance Requirement | UX Implementation |
|------------------------|-------------------|
| **Who may create content** | Displayed in Metadata Panel (Owner field) |
| **Who may approve content** | Displayed in Approval Status Panel (Required Approvers) |
| **Content types** | Displayed in Content Planning View (Type column) |
| **Prohibited content** | Not enforced by UX; governance is external |
| **Approval requirements by type** | Displayed based on content category |

### M17-02: Social Activity Taxonomy

This UX consumes events from M17-02:

| Event Type | UX Display |
|------------|------------|
| `social.content.created` | Shown in Approval History Timeline |
| `social.content.approved` | Shown in Approval History Timeline |
| `social.content.scheduled` | Shown in Approval History Timeline (informational) |
| `social.content.published` | Shown in Approval History Timeline (informational) |

### M17-03: Social AI Guardrails

This UX enforces M17-03 visibility requirements:

| Guardrail Requirement | UX Implementation |
|----------------------|-------------------|
| **AI assistance disclosure** | AI Disclosure Panel in Content Detail View |
| **Human review confirmation** | Displayed in AI Disclosure Panel |
| **No AI autonomy** | No AI-triggered actions possible |
| **Tool attribution** | AI tool name displayed when applicable |

---

## Extension Points

Future extensions must maintain read-only semantics.

### Allowed Extensions

| Extension | Conditions |
|-----------|------------|
| **New content types** | Display only, no type-specific actions |
| **New platforms** | Display only, no platform-specific actions |
| **New approval states** | Read-only display in StatusPill |
| **New metadata fields** | Read-only display in MetadataPanel |
| **Search** | Read-only federated search |
| **Export** | Read-only data export (CSV, PDF) |
| **Additional AI disclosure fields** | Read-only display |

### Forbidden Extensions

| Extension | Why Forbidden |
|-----------|---------------|
| **Inline editing** | Violates read-only semantics |
| **Quick approve buttons** | Approval is external |
| **Bulk approve** | Approval is external |
| **Publish controls** | Publishing is external |
| **Schedule controls** | Scheduling is external |
| **Comment threads** | This UX doesn't write |
| **AI content generation** | Content creation is external |

### Guarded Extension: M26-02 Runtime

When Social Automation Runtime (M26-02) exists in the future:

1. **This UX remains observation-only** — No action buttons added here
2. **Separate operator UX required** — Actions would be in a distinct, governed interface
3. **Role-based access** — Action UX would require specific permissions
4. **Audit integration** — All actions would generate M17-02 events observable here

The existence of M26-02 does **not** change this specification. This UX observes; it does not act.

### Extension Process

Any extension to this UX must:

1. Maintain read-only semantics
2. Use M12 components exclusively
3. Follow existing layout patterns
4. Reference governance documents
5. Document in this specification
6. Pass UX review before implementation

---

## Appendix: Read-Only Banner Content

The read-only banner must appear at the top of every view:

### Content Planning View Banner

```
READ-ONLY — This view displays content status. Publishing and
approval actions occur through governed external processes.
```

### Approval Review View Banner

```
READ-ONLY — Approval decisions occur through governed external
processes. This view displays status only.
```

### Content Detail View Banner

```
READ-ONLY — This view displays content for review purposes.
Editing, approval, and publishing occur through governed
external processes.
```

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Activity Spine** | Central event bus and data source |
| **Approval** | Authorization to publish content (external process) |
| **Content** | Social media post, story, reel, or other content item |
| **Governance** | Rules defined in M17-01, M17-02, M17-03 |
| **Observational** | Read-only visibility without control |
| **Platform** | Social media platform (LinkedIn, Twitter, etc.) |
| **Read-Only** | No mutations possible |
| **Write-Safe** | Guaranteed inability to accidentally mutate |

---

## Appendix: Design System Reference

This UX uses M12 design tokens and components exclusively.

| Resource | Path |
|----------|------|
| Color Tokens | `/design/tokens/colors.ts` |
| Typography Tokens | `/design/tokens/typography.ts` |
| Spacing Tokens | `/design/tokens/spacing.ts` |
| Button Component | `/design/components/Button.tsx` |
| Card Component | `/design/components/Card.tsx` |
| Table Components | `/design/components/Table.tsx` |
| StatusPill Component | `/design/components/StatusPill.tsx` |
| ReadOnlyBanner Component | `/design/components/ReadOnlyBanner.tsx` |
| Timeline Pattern | `/design/patterns/Timeline.tsx` |
| MetadataPanel Pattern | `/design/patterns/MetadataPanel.tsx` |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-22 | UX Team | Initial specification (M18-01) |

**This specification is LOCKED.** Changes require formal UX review.

---

*This document is governance-controlled. It defines observation capabilities only. No execution, posting, scheduling, or automation is permitted by this specification.*
