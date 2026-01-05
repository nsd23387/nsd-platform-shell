# M67 Sales Engine UI

## Overview
Sales Engine UI is a **governed, read-only campaign observability and approval interface**.
It provides situational awareness into campaign lifecycle, readiness, and outcomes using
governed M60 Campaign Management APIs.

This UI **never initiates execution, approval, sourcing, or governance transitions**.
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

## UX Governance Constraints

### Campaign Creation Stepper (M67-14)

**MANDATORY**: Campaign creation MUST use vertical left-hand navigation.

**FORBIDDEN**: Horizontal steppers are explicitly forbidden in CampaignCreate.

This constraint exists because:
1. Users must always see completed and remaining steps
2. Steps must be visible without scrolling
3. Navigation must be scroll-independent from form content
4. The vertical layout provides better UX for multi-step forms

The vertical navigation is implemented in:
- `app/sales-engine/components/wizard/WizardNav.tsx` (component)
- `app/sales-engine/campaigns/new/page.tsx` (layout integration)

Both files contain governance lock comments that must not be removed.

### Campaign Creation Fields (M67-14)

**REQUIRED FIELDS** (validation will fail if missing or empty):
- `name` — Campaign name
- `keywords[]` — Non-empty array of keywords
- `geographies[]` — Non-empty array of geographies

**FORBIDDEN FIELDS** (must NOT appear anywhere in CampaignCreate):
- ❌ `max_organizations` / `maxOrganizations`
- ❌ `target_organizations` / `targetOrganizations`
- ❌ `source_type` / `sourceType`
- ❌ `technologies`
- ❌ `minimum_signals` / `minimumSignals`
- ❌ `target_contacts` / `targetContacts`
- ❌ `target_replies` / `targetReplies`

**ALLOWED TARGET FIELDS** (benchmarks only — do not affect execution):
- `target_leads`
- `target_emails`
- `target_reply_rate`

**ORGANIZATION SOURCING**:
- Read-only display only
- Derived automatically from ICP
- No inputs, toggles, selectors, counts, or limits

---

## M67-14 CampaignCreate API

### Endpoint
```
POST /api/campaign-create
```

### Database Persistence

**This is a control-plane write, not execution.**

The API route:
1. Runs in Node.js runtime (not Edge)
2. Uses `SUPABASE_SERVICE_ROLE_KEY` for authenticated writes
3. Inserts exactly one row into `core.campaigns`
4. Sets `status = 'draft'` (always)

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)

**Database Columns Written:**
- `id` — UUID (auto-generated)
- `name` — Campaign name
- `status` — Always 'draft'
- `keywords` — JSONB array
- `target_locations` — JSONB array (from geographies)
- `description`, `industries`, `job_titles`, `seniority_levels` — Optional
- `target_leads`, `target_emails`, `target_reply_rate` — Benchmarks only

**Governance Constraints:**
- ❌ No writes to `activity.events`
- ❌ No writes to leads, orgs, contacts
- ❌ No execution, approval, sourcing, or readiness logic
- ❌ No activity events emitted

### Allowed Behavior
- Creates campaign in `governance_state = DRAFT`
- Persists to `core.campaigns` in Supabase
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

## Deploying to Vercel (M67.9-01)

### Overview

This milestone (M67.9-01) enables Vercel hosting for the Sales Engine UI in **read-only mode**.
This is a hosting-only deployment. No runtime, no execution, no backend wiring.

### Required Environment Variables

Set these in your Vercel project settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_MODE` | `disabled` | **REQUIRED.** Disables all API calls, returns mock data. |
| `NEXT_PUBLIC_READ_ONLY` | `true` | **REQUIRED.** Enables read-only mode, disables execution buttons. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://placeholder.supabase.co` | Placeholder for build (not used). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `placeholder` | Placeholder for build (not used). |

### Important Notes

⚠️ **This deployment is READ-ONLY.**

- No API connections are active
- No data modifications are possible  
- No campaign execution can occur
- All "Start", "Run", "Reset", and "Execute" buttons are disabled
- A global banner indicates read-only mode

⚠️ **Runtime wiring occurs in M68, not here.**

This milestone only enables UI preview. Backend integration, execution capabilities,
and real API connections will be enabled in Milestone M68.

### Security

Access control is handled via **Vercel Password Protection** during M67.9-01.
No application-level authentication is implemented.
The code does not assume a logged-in user.

### Hard Constraints

The following are strictly enforced:

- ❌ No writes, mutations, or pipeline execution
- ❌ No Supabase, Smartlead, Apollo, Make, or backend service connections
- ❌ No secrets or real API keys
- ❌ No M68 functionality enabled
- ✅ All network calls disabled when API mode is disabled
- ✅ UI clearly communicates read-only state

---

## Recent Changes
- January 5, 2026: M67-14 CampaignCreate Persistence Fix
  - Added Supabase server client with service role key
  - API route now writes to core.campaigns with status = 'draft'
  - Campaigns list reads from Supabase
  - Added Node.js runtime directive to API routes
  - No mock responses when Supabase is configured
- January 5, 2026: M67-14 CampaignCreate UI Submission (Field Governance)
  - REMOVED forbidden fields: technologies, sourceType, maxOrganizations, minimumSignals, targetOrganizations, targetContacts, targetReplies
  - REQUIRED: name, keywords[] (non-empty), geographies[] (non-empty)
  - ALLOWED targets: target_leads, target_emails, target_reply_rate (benchmarks only)
  - Organization Sourcing changed to read-only display ("Derived automatically from ICP")
  - Lead Qualification step removed entirely
  - Updated type definitions and validation
- January 5, 2026: M67-14 Vertical Stepper Regression Fix
  - Replaced horizontal stepper with vertical left-hand navigation
  - Updated WizardNav component to render vertically with sticky positioning
  - Changed page layout to two-column (nav left, content right)
  - Added governance lock comments to prevent future regression
  - Updated UX governance documentation
- December 31, 2025: M67.9-01 Vercel Hosting Setup
  - Added centralized config module (config/appConfig.ts)
  - Implemented API short-circuit when NEXT_PUBLIC_API_MODE=disabled
  - Created VercelReadOnlyBanner component for global read-only indication
  - Updated all execution buttons to respect read-only mode
  - Added environment variable documentation
  - No authentication - access controlled via Vercel Password Protection
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
