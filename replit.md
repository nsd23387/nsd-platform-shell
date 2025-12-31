# M67 Sales Engine UI

## Overview
Sales Engine UI - A read-only Sales Operator Command Interface for campaign lifecycle observability and governance. This Next.js application provides situational awareness through governed M60 Campaign Management APIs. The UI follows a governance-first architecture where all state transitions are observed, not initiated.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Runtime**: Node.js 20
- **Package Manager**: npm
- **Design System**: NSD Brand Tokens

## Environment Variables
```
NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL - M60 API base URL (client-side)
SALES_ENGINE_API_BASE_URL - M60 API base URL (server-side proxy)
NEXT_PUBLIC_ODS_API_URL - ODS API for bootstrap/identity
```

## Project Structure
```
app/
├── api/v1/campaigns/           # M60 API proxy routes
│   ├── route.ts                # Campaign list
│   ├── attention/              # Needs attention queue
│   ├── notices/                # System notices
│   ├── readiness/              # Readiness status
│   ├── throughput/             # Capacity metrics
│   ├── runs/recent/            # Recent runs
│   └── [id]/                   # Campaign detail endpoints
│       ├── approve/
│       ├── submit/
│       ├── metrics/
│       ├── runs/
│       ├── variants/
│       └── throughput/
├── sales-engine/
│   ├── home/                   # Dashboard with KPIs + Needs Attention
│   ├── campaigns/
│   │   ├── new/                # Campaign creation wizard
│   │   └── [id]/               # Campaign detail view
│   ├── approvals/              # Approvals page
│   ├── execution/              # Execution observability
│   ├── monitoring/             # Run monitoring
│   ├── components/
│   │   ├── governance/         # Governance-specific components
│   │   │   ├── CampaignStateBadge.tsx
│   │   │   ├── ConfidenceBadge.tsx
│   │   │   ├── ExecutionReadinessPanel.tsx
│   │   │   ├── GovernanceActionsPanel.tsx
│   │   │   ├── LearningSignalsPanel.tsx
│   │   │   ├── ProvenancePill.tsx
│   │   │   └── ReadOnlyBanner.tsx
│   │   ├── ui/                 # Shared NSD UI components
│   │   │   ├── Button.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── SectionCard.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── StatusChip.tsx
│   │   └── wizard/             # Campaign creation wizard
│   │       ├── WizardContext.tsx
│   │       ├── WizardNavigation.tsx
│   │       ├── WizardProgress.tsx
│   │       └── steps/
│   ├── lib/
│   │   ├── api.ts              # M60 API client
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

## Routes
| Route | Purpose |
|-------|---------|
| `/sales-engine/home` | Dashboard with KPI strip + Needs Attention queue |
| `/sales-engine` | Campaign table with filters, search, quick actions |
| `/sales-engine/campaigns/new` | Campaign creation wizard |
| `/sales-engine/campaigns/:id` | Campaign detail with governance tabs |
| `/sales-engine/approvals` | Approvals workflow |
| `/sales-engine/execution` | Execution observability |
| `/sales-engine/monitoring` | Run monitoring |

## Governance Architecture

### Read-Only UI Principle
The UI is a **read-only observation layer**. It displays governance and approval stages, not execution controls.

- Allowed HTTP methods: GET, HEAD, OPTIONS only
- Enforcement: Runtime guard (`read-only-guard.ts`)
- All data originates from backend systems

### Governance States
| Backend Status | UI Label |
|----------------|----------|
| `DRAFT` | Draft |
| `PENDING_REVIEW` | In Review |
| `RUNNABLE` | **Approved & Ready** |
| `RUNNING` | Running |
| `COMPLETED` | Completed |
| `FAILED` | Failed |
| `ARCHIVED` | Archived |

### Readiness vs Governance State
These are orthogonal concepts:
- **Governance State**: Approval workflow stage (DRAFT → PENDING → APPROVED → EXECUTED)
- **Readiness Level**: System capability to execute (READY, NOT_READY, UNKNOWN)

A campaign can be APPROVED but NOT_READY (awaiting mailbox health).

## NSD Brand Tokens
```typescript
Primary: #020F5A (Deep Indigo)
Secondary: #692BAA (Violet)
CTA: #CC368F (Magenta - use sparingly)
Background: #FFFFFF
Surface: #F9FAFB
Border: #E5E7EB
```

## Governance Components
- `ReadOnlyBanner` - Read-only mode notification
- `ConfidenceBadge` - Data confidence indicator (HIGH, MEDIUM, LOW, UNKNOWN)
- `ProvenancePill` - Data source attribution
- `CampaignStateBadge` - Governance state display
- `ExecutionReadinessPanel` - Readiness status with blocking reasons
- `GovernanceActionsPanel` - Available governance actions
- `LearningSignalsPanel` - Campaign learning insights

## UI Components
- `PageHeader` - Page title with navigation and actions
- `SectionCard` - Content section container
- `StatCard` - KPI display card
- `StatusChip` - Status badge with color coding
- `Button` - Primary, secondary, CTA, ghost variants
- `DataTable` - Tabular data display

## Key Constraints
- API routes proxy to M60 backend only (no business logic in UI)
- No direct database access
- Bootstrap identity from ODS /api/v1/me endpoint
- UI must not parse JWT or infer permissions
- All dashboard data comes from governed read endpoints
- Human authority required for all state transitions
- Never display "Runnable" - always use "Approved & Ready"

## Recent Changes
- December 31, 2025: UI Governance Enhancements
  - Improved visual hierarchy and spacing across governance components
  - Enhanced UX copy for UNKNOWN states and disabled actions
  - Added tooltips for confidence and provenance indicators
  - Improved empty state presentations
  - Applied NSD brand polish to badges and status chips
  - Fixed undefined rate field guards in MetricsDisplay
