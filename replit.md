# M67 Sales Engine UI

## Overview
Sales Engine UI is a **governed, read-only campaign observability and approval interface**.
It provides situational awareness into campaign lifecycle, readiness, and outcomes using
governed M60 Campaign Management APIs.

This UI **never initiates execution, approval, or submission**.
All state transitions and execution occur in backend systems and are **observed, not controlled**, here.

The design follows a governance-first architecture:
- Truth over completeness
- Explicit UNKNOWN states
- No implied autonomy
- No UI-initiated mutations

---

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js 20
- **Package Manager**: npm
- **Design System**: NSD Brand Tokens

---

## Environment Variables
```
NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL - M60 API base URL (client-side)
SALES_ENGINE_API_BASE_URL - M60 API base URL (server-side proxy)
NEXT_PUBLIC_ODS_API_URL - ODS API for bootstrap/identity
```

---

## Project Structure
```
app/
├── api/v1/campaigns/           # M60 API proxy routes (READ-ONLY)
│   ├── route.ts                # Campaign list
│   ├── attention/              # Needs attention queue
│   ├── notices/                # System notices
│   ├── readiness/              # Readiness status
│   ├── throughput/             # Capacity metrics
│   ├── runs/recent/            # Recent runs
│   └── [id]/                   # Campaign detail endpoints
│       ├── metrics/
│       ├── runs/
│       ├── variants/
│       └── throughput/
├── sales-engine/
│   ├── home/                   # Dashboard with KPIs + Needs Attention
│   ├── campaigns/
│   │   ├── new/                # Campaign creation wizard
│   │   └── [id]/               # Campaign detail view (observability)
│   ├── approvals/              # Pending approvals observability
│   ├── runs/                   # Run observability (read-only)
│   ├── monitoring/             # Performance metrics observability
│   ├── components/
│   │   ├── governance/         # Governance-specific components
│   │   └── ui/                 # Shared NSD UI components
│   ├── lib/
│   │   ├── api.ts              # M60 API client (GET only)
│   │   ├── campaign-state.ts   # Governance state mapping
│   │   ├── design-tokens.ts    # NSD brand tokens
│   │   ├── read-only-guard.ts  # Read-only enforcement
│   │   └── statusLabels.ts     # Status language mapping
│   └── types/
│       └── campaign.ts         # TypeScript types
└── page.tsx                    # Redirects to /sales-engine/home

docs/
└── UI_GOVERNANCE.md            # Governance architecture documentation
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/sales-engine/home` | Dashboard with KPI strip + Needs Attention queue |
| `/sales-engine` | Campaign table with filters, search |
| `/sales-engine/campaigns/new` | Campaign creation wizard |
| `/sales-engine/campaigns/:id` | Campaign detail with observability tabs |
| `/sales-engine/approvals` | Pending approvals observability |
| `/sales-engine/runs` | Run observability (approved campaigns) |
| `/sales-engine/monitoring` | Performance metrics observability |

---

## Governance Architecture

### Read-Only UI Principle
This UI is a **read-only observation layer**. It does not initiate, control, or mutate any backend state.

- **Allowed HTTP methods:** GET, HEAD, OPTIONS only
- **Forbidden methods:** POST, PUT, PATCH, DELETE to canonical entities
- **Enforcement:** Runtime guard (`read-only-guard.ts`)
- All data originates from backend systems
- This UI **never initiates execution or approval**

### UI-Level Governance States
The UI displays these governance states (NOT runtime execution states):

| Governance State | Meaning |
|------------------|---------|
| `DRAFT` | Campaign is being authored |
| `PENDING_REVIEW` | Submitted for governance review |
| `APPROVED_READY` | Approved by governance team (display as "Approved & Ready") |
| `BLOCKED` | Cannot proceed due to governance or readiness issues |
| `EXECUTED_READ_ONLY` | Has been executed, now observability only |
| `ARCHIVED` | Campaign archived |

### Backend Runtime States (Observed Only)
The following states appear **only in run history rows**, never as campaign governance state:
- `RUNNING` - Active execution in progress
- `COMPLETED` - Run finished successfully
- `FAILED` - Run failed
- `PARTIAL` - Run partially completed

These are backend runtime states that the UI observes but does not control.

### Readiness vs Governance State
These are **orthogonal concepts**:
- **Governance State**: Approval workflow stage (DRAFT → PENDING → APPROVED → EXECUTED)
- **Readiness Level**: System capability to execute (READY, NOT_READY, UNKNOWN)

A campaign can be APPROVED but NOT_READY (awaiting mailbox health).
The UI **never infers readiness from governance state**.

---

## API Proxy Clarification
All API proxy routes under `app/api/v1/campaigns/`:
- Are **read-only reflections** of backend state
- Do **not** initiate approval, submission, or execution
- Exist only to normalize response shape and handle authentication
- Proxy GET requests to M60 backend only

---

## NSD Brand Tokens
```typescript
Primary: #020F5A (Deep Indigo)
Secondary: #692BAA (Violet)
CTA: #CC368F (Magenta - use sparingly)
Background: #FFFFFF
Surface: #F9FAFB
Border: #E5E7EB
```

---

## Governance Components
- `ReadOnlyBanner` - Read-only mode notification
- `ConfidenceBadge` - Data confidence indicator (HIGH, MEDIUM, LOW, UNKNOWN)
- `ProvenancePill` - Data source attribution
- `CampaignStateBadge` - Governance state display
- `ExecutionReadinessPanel` - Readiness status with blocking reasons
- `GovernanceActionsPanel` - Available governance actions (observability only)
- `LearningSignalsPanel` - Campaign learning insights

## UI Components
- `NavBar` - Shared navigation bar across all Sales Engine pages
- `PageHeader` - Page title with navigation and actions
- `SectionCard` - Content section container
- `StatCard` - KPI display card
- `StatusChip` - Status badge with color coding
- `Button` - Primary, secondary, CTA, ghost variants
- `DataTable` - Tabular data display

---

## Key Constraints
- API routes proxy to M60 backend only (no business logic in UI)
- No direct database access
- Bootstrap identity from ODS /api/v1/me endpoint
- UI must not parse JWT or infer permissions
- All dashboard data comes from governed read endpoints
- Human authority required for all state transitions
- Never display "Runnable" - always use "Approved & Ready"
- **This UI never initiates execution, approval, or submission**

---

## Recent Changes
- December 31, 2025: Documentation & Naming Correction
  - Renamed /execution route to /runs for observational terminology
  - Updated replit.md to governance-first architecture alignment
  - Clarified UI-level governance states vs backend runtime states
  - Added explicit read-only observability language throughout
  - Removed execution semantics from navigation and page titles
