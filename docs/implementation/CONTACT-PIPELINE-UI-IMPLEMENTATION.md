# Contact Pipeline UI Implementation Plan

**Status:** Ready for Implementation  
**Priority:** High  
**Estimated Files:** 8 new files, 3 modified files

---

## Executive Summary

This implementation adds a 4-state contact pipeline visualization to replace the current 2-state model. The new model provides visibility into why contacts are blocked and enables users to understand the path from sourced contacts to leads.

### Contact States (New Model)
| State | Description | Color |
|-------|-------------|-------|
| Pending | Sourced, awaiting scoring | Gray |
| Processing | Being scored/enriched | Blue |
| Ready | Ready for lead promotion | Green |
| Blocked | Terminal - cannot become leads | Red |

---

## Phase 1: API Routes (Backend)

### 1.1 Contact Stats Endpoint
**File:** `app/api/campaigns/[id]/contact-stats/route.ts`

```typescript
// GET /api/campaigns/:id/contact-stats
// Returns contact funnel statistics
```

### 1.2 Blocked Reasons Endpoint  
**File:** `app/api/campaigns/[id]/contact-stats/blocked-reasons/route.ts`

```typescript
// GET /api/campaigns/:id/contact-stats/blocked-reasons
// Returns breakdown of why contacts are blocked
```

---

## Phase 2: Components (Frontend)

### 2.1 ContactFunnelCard (MUST HAVE)
**File:** `app/sales-engine/components/observability/ContactFunnelCard.tsx`

**Purpose:** Primary contact pipeline visualization card

**Features:**
- 4-state funnel display
- Total contacts count
- Ready-for-promotion indicator
- Promote to Leads button (when applicable)
- 10-second polling refresh

### 2.2 ContactProgressBar (SHOULD HAVE)
**File:** `app/sales-engine/components/observability/ContactProgressBar.tsx`

**Purpose:** Compact horizontal progress bar showing contact distribution

**Features:**
- Segmented progress bar
- Tooltips on hover
- Percentage breakdown
- Legend display

### 2.3 BlockedContactsBreakdown (SHOULD HAVE)
**File:** `app/sales-engine/components/observability/BlockedContactsBreakdown.tsx`

**Purpose:** Expandable panel showing why contacts are blocked

**Features:**
- Collapsible/expandable UI
- Reason categories with counts
- Helpful descriptions per reason
- Lazy-loaded data (only fetches when expanded)

---

## Phase 3: Integration

### 3.1 Campaign Detail Page Updates
**File:** `app/sales-engine/campaigns/[id]/page.tsx`

- Add ContactFunnelCard to Overview tab
- Add ContactProgressBar above funnel
- Add BlockedContactsBreakdown below funnel
- Wire up promote button action

---

## Implementation Order

```
1. API Routes
   ├── contact-stats/route.ts
   └── contact-stats/blocked-reasons/route.ts
   
2. Components
   ├── ContactFunnelCard.tsx (MUST HAVE)
   ├── ContactProgressBar.tsx (SHOULD HAVE)
   └── BlockedContactsBreakdown.tsx (SHOULD HAVE)
   
3. Integration
   ├── Update observability/index.ts exports
   └── Update campaigns/[id]/page.tsx
   
4. Testing & Polish
   ├── Verify polling behavior
   ├── Test promote button states
   └── Validate blocked reasons display
```

---

## File-by-File Implementation

See individual files created in this PR.

---

## Migration Checklist

- [ ] Remove any 2-state contact model assumptions
- [ ] Update tooltips to explain 4-state pipeline
- [ ] Add ContactFunnelCard component
- [ ] Add ContactProgressBar component
- [ ] Add BlockedContactsBreakdown component
- [ ] Integrate components in Campaign Detail page
- [ ] Test polling/refresh behavior
- [ ] Verify Promote button enables/disables correctly

---

## API Contract

### GET /api/campaigns/:id/contact-stats
```json
{
  "total": 1153,
  "pending": 0,
  "processing": 0,
  "ready": 0,
  "blocked": 1153,
  "unavailable": 0,
  "leadsCreated": 0,
  "readyWithoutLead": 0
}
```

### GET /api/campaigns/:id/contact-stats/blocked-reasons
```json
{
  "total": 1153,
  "reasons": {
    "no_email": 1100,
    "invalid_email": 30,
    "low_fit_score": 20,
    "excluded_title": 3
  }
}
```
