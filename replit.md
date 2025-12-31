# M67 Sales Engine UI

## Overview
Sales Engine UI is a **governed, read-only campaign observability and approval interface**.
It provides situational awareness into campaign lifecycle, readiness, and outcomes using
governed M60 Campaign Management APIs.

This UI **never initiates execution, approval, or submission**.
All state transitions and execution occur in backend systems and are **observed, not controlled**, here.

**M67-14 Exception**: Campaign creation (POST /campaign-create) is allowed.
Campaigns are created in `governance_state = DRAFT` with `source_eligible = false`.
No execution or sourcing occurs from this flow.

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
NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL  # M60 API base URL (client-side, read-only)
SALES_ENGINE_API_BASE_URL              # M60 API base URL (server-side, read-only proxy)
NEXT_PUBLIC_ODS_API_URL                # ODS API for bootstrap/identity
```

---

## Project Structure
```
app/
├── api/
│   ├── campaign-create/        # M67-14: Campaign creation (WRITE exception)
│   │   └── route.ts            # POST handler - creates DRAFT campaigns
│   └── v1/campaigns/           # Read-only M60 API proxies (observational only)
│       ├── route.ts            # Campaign list
│       ├── attention/          # Needs-attention queue (derived from backend state)
│       ├── notices/            # System notices
│       ├── readiness/          # Readiness status (observed)
│       ├── throughput/         # Capacity metrics (observed)
│       ├── runs/               # Run history (observed)
│       └── [id]/               # Campaign detail (read-only)
│           ├── metrics/
│           ├── runs/
│           └── throughput/
├── sales-engine/
│   ├── home/                   # Dashboard with KPIs + Needs Attention
│   ├── campaigns/
│   │   ├── new/                # Campaign configuration (draft only)
│   │   └── [id]/               # Campaign detail (governance + observability)
│   ├── approvals/              # Approval status & history (observed)
│   ├── runs/                   # Execution observability (read-only)
│   ├── monitoring/             # Metrics & run monitoring (read-only)
│   ├── components/
│   │   ├── governance/         # Governance & trust indicators
│   │   ├── ui/                 # Shared NSD UI components
│   │   └── wizard/             # Campaign creation wizard (draft-only)
│   ├── lib/
│   │   ├── api.ts              # Read-only M60 API client
│   │   ├── campaign-state.ts   # Governance state mapping (UI-level)
│   │   ├── design-tokens.ts    # NSD brand tokens
│   │   ├── read-only-guard.ts  # Read-only enforcement
│   │   └── statusLabels.ts     # Status language mapping
│   └── types/
│       └── campaign.ts
└── page.tsx                    # Redirect to /sales-engine/home

docs/
└── UI_GOVERNANCE.md            # Governance & architectural boundaries
```

---

## Routes
| Route | Purpose |
|-------|---------|
| `/sales-engine/home` | KPI dashboard + needs-attention overview |
| `/sales-engine` | Campaign list with filters and search |
| `/sales-engine/campaigns/new` | Draft campaign configuration |
| `/sales-engine/campaigns/:id` | Campaign governance & observability |
| `/sales-engine/approvals` | Approval history and status |
| `/sales-engine/runs` | Execution run history (observed) |
| `/sales-engine/monitoring` | Metrics & throughput monitoring |

---

## Governance Architecture

### Read-Only UI Principle
The UI is a **read-only observation layer**.

- Allowed HTTP methods: GET, HEAD, OPTIONS
- Enforcement: runtime guard (`read-only-guard.ts`)
- No UI-initiated mutations
- No execution, scheduling, or automation logic

---

### Governance States (UI-Level)
These represent **approval and governance lifecycle only**.

| UI Governance State | Description |
|---------------------|-------------|
| `DRAFT` | Configuration in progress |
| `PENDING_REVIEW` | Submitted for review |
| `APPROVED_READY` | Approved, awaiting backend execution |
| `BLOCKED` | Cannot proceed due to governance or readiness issues |
| `EXECUTED_READ_ONLY` | Execution completed and observed |
| `ARCHIVED` | No longer active |

> Backend runtime states such as RUNNING, FAILED, or COMPLETED
> appear **only in run history records**, not as campaign governance state.

---

### Readiness vs Governance State
These are **orthogonal concepts**.

- **Governance State**: human approval lifecycle
- **Readiness Level**: system capability to execute (READY / NOT_READY / UNKNOWN)

A campaign may be APPROVED but NOT_READY (for example, mailbox health issues).

---

## NSD Brand Tokens
```ts
Primary:    #020F5A  // Deep Indigo
Secondary:  #692BAA  // Violet
CTA:        #CC368F  // Magenta (use sparingly)
Background: #FFFFFF
Surface:    #F9FAFB
Border:     #E5E7EB
```

---

## Governance Components
- `ReadOnlyBanner` – Read-only mode indicator
- `CampaignStateBadge` – Governance state display
- `ExecutionReadinessPanel` – Readiness status and blocking reasons
- `ConfidenceBadge` – Data confidence classification
- `ProvenancePill` – Data origin attribution
- `LearningSignalsPanel` – Insight-only learning signals

---

## Key Constraints
- UI is read-only and governed
- Backend systems own all execution and mutations
- No JWT parsing or permission inference in UI
- No optimistic state transitions
- UNKNOWN is an intentional and valid state
- Never display the term "Runnable" in the UI

---

## M67-14 CampaignCreate API

### Endpoint
```
POST /api/campaign-create
```

### Allowed Behavior
- Creates campaign in `governance_state = DRAFT`
- Persists immutable ICP snapshot
- No execution or sourcing occurs

### Success Response Shape
```json
{
  "success": true,
  "data": {
    "campaign": {
      "id": "uuid",
      "governance_state": "DRAFT",
      "source_eligible": false
    },
    "icp_snapshot": {
      "id": "uuid",
      "campaign_id": "uuid"
    }
  },
  "meta": {
    "semantics": {
      "governance_state": "DRAFT",
      "source_eligible": false,
      "targets_gating": false
    }
  }
}
```

### UI Consumption Rules
- Display campaign.id, governance_state, source_eligible
- DO NOT infer readiness, progress, or next steps
- DO NOT trigger any follow-on calls
- Targets are benchmarks only — do not affect campaign execution

---

## Recent Changes
- December 31, 2025: M67-14 CampaignCreate Implementation
  - Added POST /api/campaign-create endpoint
  - Created multi-step campaign creation wizard
  - Implemented form validation with error binding
  - Added success confirmation with governance semantics
  - Updated read-only guard with M67-14 exception
- December 31, 2025: UI Governance Enhancements
  - Improved visual hierarchy and spacing
  - Enhanced UX copy for UNKNOWN and disabled states
  - Added tooltips for confidence and provenance
  - Improved empty state presentations
  - Applied NSD brand polish
  - Fixed MetricsDisplay guard conditions
