# Media Catalog UX Specification

> **Version:** 1.0  
> **Status:** Locked (M16-01)  
> **Design System:** M12 (Frozen)  
> **Parent Context:** Platform Shell (M13)

This document defines the UX contract for the Media Catalog UI.
The Media Catalog is a **read-only observational interface** that surfaces
media assets (images, mockups, renders, videos) for discovery, inspection,
and contextual understanding.

---

## Table of Contents

1. [Overview](#overview)
2. [Media Catalog vs Platform Shell](#media-catalog-vs-platform-shell)
3. [Media Object Model](#media-object-model)
4. [Media Catalog Surfaces](#media-catalog-surfaces)
   - [Media List View](#media-list-view)
   - [Media Detail View](#media-detail-view)
   - [Filtering & Search](#filtering--search)
5. [Component Reuse Mapping](#component-reuse-mapping)
6. [Read-Only Guarantees](#read-only-guarantees)
7. [Write-Safe Guarantees](#write-safe-guarantees)
8. [UX Boundaries](#ux-boundaries)
9. [Extension Points](#extension-points)

---

## Overview

### Purpose

The Media Catalog provides **observational visibility** into media assets produced
or used by NSD, enabling humans to:

| Capability | Description |
|------------|-------------|
| **Discover** | Find media assets across the organization |
| **Inspect** | View asset content and technical metadata |
| **Contextualize** | Understand asset origin, usage, and relationships |
| **Trace** | Review linked entities (orders, quotes, campaigns) |
| **Attribute** | Know which system or source produced the asset |

### Non-Purpose

The Media Catalog explicitly does NOT enable:

| Excluded Capability | Rationale |
|---------------------|-----------|
| Uploading | Asset ingestion is managed by external systems |
| Editing | Media assets are immutable records |
| Approvals | Approval workflows belong to upstream systems |
| Publishing | Publishing decisions are external |
| Deletion | Assets are append-only, deletion is external |
| Metadata editing | Catalog is observational, not operational |
| Bulk operations | No multi-select, no batch processing |

### Core Principles

1. **Observation over Control** — Every screen is read-only by design
2. **Immutability** — Media assets are append-only records
3. **Discoverability** — Easy to find and browse assets
4. **Context over Isolation** — Assets shown with their relationships
5. **Calm over Urgent** — Factual presentation, no alarming UI patterns

### Asset Ownership

The Media Catalog does NOT own:
- Approval status or approval workflows
- Usage authorization decisions
- Publishing or distribution decisions
- Version control or replacement logic
- Access permissions to original files

Assets originate from external systems:
- Design tools (mockup generation)
- Factory systems (production imagery)
- Agency partners (campaign assets)
- Customer submissions (reference materials)

---

## Media Catalog vs Platform Shell

The Media Catalog operates within the Platform Shell but serves a distinct purpose.

### Responsibility Matrix

| Aspect | Platform Shell | Media Catalog |
|--------|----------------|---------------|
| **Scope** | Cross-functional dashboards | Media-specific asset browsing |
| **Granularity** | Aggregate metrics | Individual asset inspection |
| **Navigation** | Dashboard selection | Asset discovery and drill-down |
| **Data Model** | Activity Spine summaries | Media asset records |
| **Primary User** | Executives, team leads | Design, media, operations teams |

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
│   └── ...
└── Media Catalog  ← THIS SPECIFICATION
    ├── Media List View
    └── Media Detail View
```

### Shared Elements

Media Catalog inherits from Platform Shell:
- Sidebar navigation structure
- Header component patterns
- Read-only mode indicator
- M12 design tokens (colors, typography, spacing)
- Card, Table, StatusPill components

### Distinct Elements

Media Catalog introduces (using M12 patterns only):
- Asset-centric list and grid views
- Thumbnail display patterns
- Asset preview behavior
- Linked entity relationships

---

## Media Object Model

The Media Catalog surfaces media assets as immutable records. This section
describes the descriptive model for UX purposes only — not implementation.

### Asset Types

| Type | Description | Examples |
|------|-------------|----------|
| **Image** | Static visual files | Product photos, logos, graphics |
| **Mockup** | Design renderings | Sign mockups, proofs, visualizations |
| **Render** | 3D or production renders | Factory previews, installation views |
| **Video** | Motion content | Installation videos, demos, animations |

### Core Attributes

Every media asset has these observable properties:

| Attribute | Description | Display Format |
|-----------|-------------|----------------|
| **Asset ID** | Canonical identifier | `MDA-12345` |
| **Type** | Asset classification | StatusPill (Image, Mockup, Render, Video) |
| **Source** | Origin system or channel | Text label |
| **Status** | Current asset state | StatusPill |
| **Created At** | Original creation timestamp | Absolute datetime |
| **File Format** | Technical format | Text (PNG, JPG, MP4, etc.) |
| **Dimensions** | Width × Height or Duration | Text |
| **File Size** | Storage size | Text (formatted KB/MB) |

### Asset Status Values

| Status | Description | Visual Treatment |
|--------|-------------|------------------|
| **Available** | Asset accessible for viewing | Neutral (gray) StatusPill |
| **Processing** | Asset being processed | Info (blue) StatusPill |
| **Archived** | Asset moved to archive | Muted StatusPill |
| **Unavailable** | Asset temporarily inaccessible | Warning (yellow) StatusPill |

Note: These are observational states only. The Catalog cannot change status.

### Linked Entities

Media assets may be linked to other entities. Relationships are read-only.

| Linked Entity | Description |
|---------------|-------------|
| **Quote** | Proposal where asset was created or referenced |
| **Order** | Order associated with this asset |
| **Mockup** | Parent mockup (for derived assets) |
| **Campaign** | Marketing campaign using this asset |
| **Product** | Product this asset represents |

---

## Media Catalog Surfaces

### Media List View

#### Purpose

Provide discovery and browsing capability across all media assets. Enable
navigation to individual asset details without implying selection or action
capability.

#### Layout Intent — Grid Mode

Default view for visual browsing:

```
┌─────────────────────────────────────────────────────────────┐
│ Media Catalog                                    [Filters ▾] │
│ Observational catalog of media assets                        │
├─────────────────────────────────────────────────────────────┤
│ [Grid] [List]                                                │
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │              │  │              │  │              │       │
│ │  [Thumbnail] │  │  [Thumbnail] │  │  [Thumbnail] │       │
│ │              │  │              │  │              │       │
│ ├──────────────┤  ├──────────────┤  ├──────────────┤       │
│ │ MDA-001      │  │ MDA-002      │  │ MDA-003      │       │
│ │ Image • PNG  │  │ Mockup • JPG │  │ Video • MP4  │       │
│ │ 2 days ago   │  │ 1 day ago    │  │ 3 hours ago  │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│ │              │  │              │  │              │       │
│ │  [Thumbnail] │  │  [Thumbnail] │  │  [Thumbnail] │       │
│ │   ...        │  │   ...        │  │   ...        │       │
│ └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│ Showing 1-24 of 156 assets               [← Prev] [Next →]  │
└─────────────────────────────────────────────────────────────┘
```

#### Layout Intent — List Mode

Alternative view for metadata-focused browsing:

```
┌─────────────────────────────────────────────────────────────┐
│ Media Catalog                                    [Filters ▾] │
│ Observational catalog of media assets                        │
├─────────────────────────────────────────────────────────────┤
│ [Grid] [List]                                                │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Thumb │ Asset ID │ Type   │ Status    │ Source │ Created │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ [img] │ MDA-001  │ Image  │ Available │ Design │ 2d ago  │ │
│ │ [img] │ MDA-002  │ Mockup │ Available │ Agency │ 1d ago  │ │
│ │ [img] │ MDA-003  │ Video  │ Processing│ Factory│ 3h ago  │ │
│ │ [img] │ MDA-004  │ Render │ Archived  │ Design │ 5d ago  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Showing 1-50 of 156 assets               [← Prev] [Next →]  │
└─────────────────────────────────────────────────────────────┘
```

#### Thumbnail Behavior

| Aspect | Specification |
|--------|---------------|
| **Size** | 200×150px (Grid), 48×36px (List) |
| **Fit** | Object-fit: cover, center-cropped |
| **Placeholder** | Gray background with type icon during load |
| **Error State** | Gray background with broken-image icon |
| **Video Indicator** | Play icon overlay (non-interactive) |
| **Aspect Ratio** | 4:3 container, content cropped to fit |

#### Grid Card Content

| Element | Description |
|---------|-------------|
| **Thumbnail** | Visual preview (cropped to container) |
| **Asset ID** | Canonical identifier, clickable |
| **Type + Format** | Combined label (e.g., "Image • PNG") |
| **Created** | Relative timestamp |

#### List Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| **Thumbnail** | Small preview image | No |
| **Asset ID** | Canonical identifier, clickable | Yes |
| **Type** | Asset classification | Yes |
| **Status** | StatusPill showing current state | Yes |
| **Source** | Origin system | Yes |
| **Created** | Relative timestamp | Yes |

#### Behaviors

| Behavior | Specification |
|----------|---------------|
| **Card/Row Click** | Navigates to Media Detail View |
| **Sorting** | Client-side only (list mode) |
| **Filtering** | Observational filters (see Filtering section) |
| **Pagination** | Server-side, standard page navigation |
| **Hover** | Subtle background change (M12 hover token) |
| **No Selection** | No checkboxes, no multi-select |
| **No Bulk Actions** | No action bar, no batch operations |
| **Layout Toggle** | Switch between Grid and List views |

#### Empty State

```
No media assets match the current filters.
Adjust filters or clear all to see assets.
```

Uses M12 empty state pattern: centered, muted text, no alarming colors.

#### Loading State

- Grid: Skeleton cards with pulsing placeholder
- List: Skeleton table rows with pulsing cells
- Maintains layout structure during load

---

### Media Detail View

#### Purpose

Provide comprehensive inspection of a single media asset. Surface all relevant
context, metadata, and linked entities without offering any mutation capability.

#### Layout Intent

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Media Catalog                                      │
│                                                              │
│ Asset MDA-12345                                              │
│ Image • PNG • Created 2024-01-15                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │                                                         │ │
│ │                    [ASSET PREVIEW]                      │ │
│ │                                                         │ │
│ │                  (image or video player)                │ │
│ │                                                         │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────┐  ┌────────────────────────────────┐ │
│ │ ASSET METADATA      │  │ LINKED ENTITIES                │ │
│ │                     │  │                                │ │
│ │ Status: Available   │  │ Order: ORD-789                 │ │
│ │ Type: Image         │  │   Standard Order • Production  │ │
│ │ Format: PNG         │  │                                │ │
│ │ Dimensions: 1920×1080│ │ Quote: QTE-456                 │ │
│ │ File Size: 2.4 MB   │  │   Acme Corp • Approved         │ │
│ │ Source: Design Tool │  │                                │ │
│ │ Created: Jan 15, 2024│ │ Campaign: —                    │ │
│ │ Created By: System  │  │                                │ │
│ └─────────────────────┘  └────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TECHNICAL DETAILS                                       │ │
│ │                                                         │ │
│ │ Color Space: sRGB                                       │ │
│ │ Resolution: 72 DPI                                      │ │
│ │ Bit Depth: 24-bit                                       │ │
│ │ Original Filename: sign_mockup_final_v3.png             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Sections

##### Asset Header

| Field | Description |
|-------|-------------|
| **Asset ID** | Canonical identifier (prominent, H1 style) |
| **Type** | Asset classification |
| **Format** | File format |
| **Created Date** | Original creation timestamp |

Uses M12 Card component with no variant (neutral header).

##### Asset Preview

Visual preview of the asset with type-specific behavior:

| Asset Type | Preview Behavior |
|------------|------------------|
| **Image** | Full-resolution display, constrained to viewport |
| **Mockup** | Same as Image |
| **Render** | Same as Image |
| **Video** | Video player with play/pause, seek, volume (read-only playback) |

| Element | Specification |
|---------|---------------|
| **Container** | Max-width 100%, max-height 60vh |
| **Fit** | Object-fit: contain (preserve aspect ratio) |
| **Background** | Neutral gray (#f5f5f5) behind preview |
| **Controls (Video)** | Native browser controls, read-only playback |
| **No Download Button** | Download is not a Catalog function |
| **No Zoom Controls** | Simple static preview only |
| **No Annotations** | No markup or comment tools |

##### Metadata Panel

Displays asset attributes using M12 MetadataPanel pattern.

| Group | Fields |
|-------|--------|
| **Core Info** | ID, Type, Status, Format |
| **Dimensions** | Width, Height (or Duration for video) |
| **File Info** | File Size, Original Filename |
| **Origin** | Source, Created Date, Created By |

All fields are read-only. No edit icons, no hover states implying editability.

##### Linked Entities Panel

Displays relationships to other entities.

| Element | Specification |
|---------|---------------|
| **Entity Type** | Label (Order, Quote, Campaign, etc.) |
| **Entity ID** | Clickable link to external system |
| **Context** | Brief descriptive text |
| **Empty State** | "No linked entities" |
| **Read-Only** | Links navigate out, no action buttons |

Linked entity clicks navigate to the appropriate system (e.g., OMS for orders).

##### Technical Details Panel

Additional technical metadata for advanced inspection.

| Field | Description |
|-------|-------------|
| **Color Space** | sRGB, Adobe RGB, etc. |
| **Resolution** | DPI for images |
| **Bit Depth** | Color depth |
| **Duration** | Length for video assets |
| **Codec** | Video codec information |
| **Original Filename** | Source filename |

Uses M12 MetadataPanel pattern (compact variant).

#### Read-Only Indicators

| Indicator | Location |
|-----------|----------|
| No edit buttons | Nowhere in detail view |
| No replace button | Asset replacement is external |
| No delete button | Asset deletion is external |
| No approval controls | Approvals are external |
| No download button | Download is not a Catalog function |

---

### Filtering & Search

#### Purpose

Enable observational refinement of the asset list. Filters narrow displayed
results without implying any action capability.

#### Filter Panel

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
│ Status                                                       │
│ ┌───────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐  │
│ │ Available │ │ Processing │ │ Archived │ │ Unavailable │  │
│ └───────────┘ └────────────┘ └──────────┘ └─────────────┘  │
│                                                              │
│ Source                                                       │
│ ┌────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐            │
│ │ Design │ │ Factory │ │ Agency  │ │ Customer │            │
│ └────────┘ └─────────┘ └─────────┘ └──────────┘            │
│                                                              │
│ Date Range                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Last 7 days │ Last 30 days │ Last 90 days │ Custom      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Filter Dimensions

| Filter | Type | Options |
|--------|------|---------|
| **Type** | Multi-select chips | Image, Mockup, Render, Video |
| **Status** | Multi-select chips | Available, Processing, Archived, Unavailable |
| **Source** | Multi-select chips | All origin channels |
| **Date Range** | Preset picker | 7d, 30d, 90d, Custom |

Filter UI uses M12 Button (ghost variant) and StatusPill components.

#### Filter Behavior

| Behavior | Specification |
|----------|---------------|
| **Selection** | Toggle chips on/off |
| **Multi-Select** | Multiple values per dimension |
| **Clear Individual** | Click selected chip to deselect |
| **Clear All** | Button to reset all filters |
| **URL Sync** | Filters reflected in URL (observational) |
| **No Saved Filters** | No filter persistence or naming |

#### Search Intent

> **Status:** Search defined here for intent only. Implementation in future milestone.

| Aspect | Intent |
|--------|--------|
| **Scope** | Asset ID, filename, linked entity references |
| **Mode** | Read-only — search surfaces data, does not modify |
| **Behavior** | Type-ahead with debounced queries |
| **Results** | Filtered list or direct navigation |

#### Search Boundaries

- Search does NOT trigger uploads or ingestion
- Search does NOT allow bulk selection
- Search does NOT support wildcard editing
- Search results are observational only

---

## Component Reuse Mapping

Media Catalog must exclusively reuse M12 design system components.

### Token Usage

| Catalog Element | M12 Token |
|-----------------|-----------|
| Page background | `background.page` |
| Card background | `background.surface` |
| Primary text | `text.primary` |
| Secondary text | `text.secondary` |
| Muted text | `text.muted` |
| Borders | `border.default` |
| Status indicators | `statusColors.*` |
| Thumbnail placeholder | `background.muted` |

### Component Mapping

| Catalog Surface | M12 Components Used |
|-----------------|---------------------|
| **Media List (Grid)** | Card, StatusPill, Button (ghost) |
| **Media List (List)** | Table, TableHeader, TableBody, TableRow, TableCell, StatusPill |
| **Asset Header** | Card |
| **Asset Preview** | Card (container only) |
| **Metadata Panel** | MetadataPanel |
| **Linked Entities** | MetadataPanel, clickable links |
| **Technical Details** | MetadataPanel (compact) |
| **Filters** | Button (ghost), StatusPill |
| **Pagination** | Button (secondary) |
| **Layout Toggle** | Button (ghost) |
| **Empty States** | Card with muted text |
| **Access Denied** | AccessDenied component |

### Pattern Mapping

| Catalog Pattern | M12 Pattern |
|-----------------|-------------|
| Asset detail layout | Two-column responsive grid |
| Metadata display | MetadataPanel pattern |
| Linked entity list | MetadataPanel with links |
| Thumbnail grid | Card grid pattern |

### Forbidden Components

Media Catalog must NOT use or create:
- Form inputs (text, select, checkbox, radio)
- File upload controls
- Modal dialogs for editing
- Inline edit controls
- Action buttons (Save, Upload, Approve, Delete, etc.)
- Confirmation dialogs for mutations
- Toast notifications for mutations
- Drag-and-drop zones

---

## Read-Only Guarantees

Media Catalog enforces read-only semantics at every layer.

### API Contract

| HTTP Method | Allowed | Purpose |
|-------------|---------|---------|
| **GET** | ✅ Yes | Fetch asset data, lists, metadata |
| **POST** | ❌ No | No creation or upload |
| **PUT** | ❌ No | No updates |
| **PATCH** | ❌ No | No partial updates |
| **DELETE** | ❌ No | No deletion |

### UI Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **No upload button** | Upload is not a Catalog function |
| **No delete button** | Deletion is managed externally |
| **No replace button** | Asset replacement is external |
| **No approve/reject** | Approval workflows are external |
| **No editable fields** | All data displayed as text, never in inputs |
| **No action buttons** | No Save, Submit, Approve, Publish |
| **No confirmation dialogs** | Nothing that implies mutation |
| **No optimistic updates** | UI never assumes backend mutation |
| **No selection for action** | Checkboxes are never present |
| **No download button** | Download is not a Catalog function |

### Visual Signaling

| Signal | Location |
|--------|----------|
| "Read-Only" indicator | Sidebar footer (inherited from Shell) |
| No edit icons | Nowhere in Catalog |
| No hover states implying edit | Metadata, panels, etc. |
| Cursor: default | No pointer cursor on non-navigational elements |

---

## Write-Safe Guarantees

Media Catalog is **write-safe by default**. A user cannot accidentally trigger mutations.

### Guarantee Matrix

| User Action | System Response |
|-------------|-----------------|
| Click on asset card/row | Navigate to detail (read-only) |
| Click on filter chip | Refine displayed data (client-side) |
| Click on sort column | Reorder displayed data (client-side) |
| Click on pagination | Fetch next page (GET only) |
| Click on linked entity | Navigate to external system (read-only) |
| Click on preview | No action (display only) |
| Click on metadata | No action (display only) |
| Right-click anywhere | No context menu actions |

### No Accidental Mutations

| Protection | Implementation |
|------------|----------------|
| **No double-click handlers** | Clicks never trigger mutations |
| **No keyboard shortcuts** | No Ctrl+S, no Enter to submit |
| **No drag-and-drop** | No upload or reordering capability |
| **No context menus** | Right-click does nothing special |
| **No form submission** | No forms exist |
| **No file input** | No file selection capability |
| **No paste handling** | Paste does not trigger upload |

---

## UX Boundaries

### What Media Catalog Does

| Capability | Description |
|------------|-------------|
| **Display assets** | Grid and list views with thumbnails |
| **Show previews** | Full asset preview in detail view |
| **Present metadata** | All asset attributes |
| **Show relationships** | Linked entities (orders, quotes, campaigns) |
| **Enable navigation** | Between assets and to external systems |
| **Support filtering** | Observational refinement |
| **Allow sorting** | Client-side column sorting |
| **Provide attribution** | Source system visibility |

### What Media Catalog Does NOT Do

| Excluded Capability | Rationale |
|---------------------|-----------|
| **Upload assets** | Ingestion is managed by external systems |
| **Delete assets** | Deletion is managed externally |
| **Replace assets** | Replacement is managed externally |
| **Edit metadata** | Catalog is observational |
| **Approve/reject assets** | Approval workflows are external |
| **Publish assets** | Publishing decisions are external |
| **Tag or categorize** | Classification is managed externally |
| **Download assets** | Download is not a Catalog function |
| **Bulk operations** | No multi-select, no batch |
| **Add comments** | Annotation is not a Catalog function |
| **Share assets** | Sharing is managed externally |
| **Set permissions** | Access control is external |
| **Trigger workflows** | No action buttons |
| **Send notifications** | Catalog reads, it doesn't write |

### Boundary Enforcement

If a feature request implies any of the following, it is OUT OF SCOPE:

- "Allow users to upload..."
- "Let staff delete..."
- "Enable approving..."
- "Trigger when..."
- "Replace the asset..."
- "Edit the metadata..."
- "Tag this asset..."
- "Download the file..."
- "Share with..."
- "Publish to..."

---

## Extension Points

Future extensions must maintain read-only semantics.

### Allowed Extensions

| Extension | Conditions |
|-----------|------------|
| **New asset types** | Display only, no type-specific actions |
| **New metadata fields** | Read-only display in MetadataPanel |
| **New source systems** | Informational display only |
| **New linked entity types** | Read-only navigation links |
| **Additional filters** | Observational refinement only |
| **Search** | Read-only, federated search |
| **Asset comparison** | Side-by-side read-only view |
| **Zoom/pan preview** | Read-only viewing enhancement |

### Forbidden Extensions

| Extension | Why Forbidden |
|-----------|---------------|
| **Upload UI** | Violates read-only semantics |
| **Delete buttons** | Violates read-only semantics |
| **Inline editing** | Violates read-only semantics |
| **Approval controls** | Catalog is not a control plane |
| **Publishing actions** | Publishing is external |
| **Tagging/categorization** | Classification is external |
| **Download buttons** | Download is not a Catalog function |
| **Comment threads** | Catalog doesn't write |
| **Share dialogs** | Sharing is external |
| **Crop/edit tools** | Media editing is external |

### Extension Process

Any extension to Media Catalog UX must:
1. Maintain read-only semantics
2. Use M12 components exclusively
3. Follow existing layout patterns
4. Document in this specification
5. Pass UX review before implementation

---

## Appendix: Glossary

| Term | Definition |
|------|------------|
| **Asset** | A media file (image, mockup, render, video) |
| **Canonical ID** | Authoritative identifier (MDA-xxxxx) |
| **Linked Entity** | Related business object (order, quote, campaign) |
| **Metadata** | Descriptive attributes of an asset |
| **Observational** | Read-only visibility without control |
| **Source** | Origin system that produced the asset |
| **Thumbnail** | Small preview image |
| **Write-Safe** | Guaranteed inability to accidentally mutate |

---

## Appendix: Design System Reference

Media Catalog uses M12 design tokens and components exclusively.

| Resource | Path |
|----------|------|
| Color Tokens | `/design/tokens/colors.ts` |
| Typography Tokens | `/design/tokens/typography.ts` |
| Spacing Tokens | `/design/tokens/spacing.ts` |
| Button Component | `/design/components/Button.tsx` |
| Card Component | `/design/components/Card.tsx` |
| Table Components | `/design/components/Table.tsx` |
| StatusPill Component | `/design/components/StatusPill.tsx` |
| MetadataPanel Pattern | `/design/patterns/MetadataPanel.tsx` |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024 | System | Initial specification (M16-01) |

**This specification is LOCKED.** Changes require formal UX review.
