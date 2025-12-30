# M67 Sales Engine UI

## Overview
Standalone Sales Engine UI for campaign lifecycle management (create, edit, submit, approve, monitor). This is a Next.js 14 application that operates independently using only M60 Campaign Management APIs with NO execution capability.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

## Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── api/v1/campaigns/   # M60 Campaign API routes
│   │   ├── [id]/           # Campaign-specific endpoints
│   │   ├── readiness/      # Dashboard readiness data
│   │   ├── throughput/     # System throughput snapshot
│   │   ├── notices/        # System notices
│   │   └── runs/recent/    # Recent run outcomes
│   ├── functions/v1/       # Mock API routes for development
│   ├── sales-engine/       # Sales Engine UI pages
│   │   ├── components/     # Sales Engine components
│   │   ├── lib/            # API client functions
│   │   ├── types/          # TypeScript types
│   │   └── campaigns/      # Campaign pages
│   └── page.tsx            # Redirects to /sales-engine
├── contexts/               # React contexts (BootstrapContext)
├── design/                 # Design system
│   ├── components/         # Shared UI components (Icon.tsx)
│   └── tokens/             # Design tokens (colors, spacing, typography)
└── hooks/                  # Custom React hooks
```

## Development

### Running the Dev Server
The development server runs on port 5000:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Build
```bash
npm run build
```

### Production
```bash
npm run start -- -p 5000 -H 0.0.0.0
```

## Key Features
- **Sales Engine Dashboard** - Campaign health, readiness blockers, throughput, recent runs, system notices
- **Campaign Lifecycle Management** - Create, edit, submit, approve, monitor campaigns
- **Read-only observability** - All data is read-only, no execution capability
- **M60 API compliance** - Uses only `/api/v1/campaigns/*` endpoints

## Sales Engine Dashboard
The dashboard appears above the campaign list on the homepage and provides:

### 1. Campaign Health Summary
- KPI cards showing Total, Draft, Pending Review, Runnable, Archived counts
- Click a card to filter the campaign list by status

### 2. Readiness & Safety Blockers
- Grouped counts by blocker reason
- M65 blocking codes displayed verbatim

### 3. Throughput Utilization Snapshot
- Daily capacity usage with progress bar
- Active campaigns count
- Blocked-by-throughput count

### 4. Recent Run Outcomes
- Latest runs with campaign name, status, leads attempted/sent/blocked
- Read-only table with links to campaign details

### 5. System Notices
- Informational banners for governance visibility
- No dismiss or action buttons

## M60 Campaign APIs
All APIs at `/api/v1/campaigns/*`:

### Campaign List & Management
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign (DRAFT)
- `GET /api/v1/campaigns/:id` - Get campaign detail
- `PATCH /api/v1/campaigns/:id` - Update campaign (DRAFT only)
- `POST /api/v1/campaigns/:id/submit` - Submit for review
- `POST /api/v1/campaigns/:id/approve` - Approve campaign

### Campaign Analytics
- `GET /api/v1/campaigns/:id/metrics` - Campaign metrics
- `GET /api/v1/campaigns/:id/metrics/history` - Metrics history
- `GET /api/v1/campaigns/:id/runs` - Run history
- `GET /api/v1/campaigns/:id/runs/latest` - Latest run
- `GET /api/v1/campaigns/:id/variants` - Personalization variants
- `GET /api/v1/campaigns/:id/throughput` - Throughput config

### Dashboard APIs
- `GET /api/v1/campaigns/readiness` - Aggregated readiness data
- `GET /api/v1/campaigns/throughput` - System throughput snapshot
- `GET /api/v1/campaigns/notices` - System notices
- `GET /api/v1/campaigns/runs/recent` - Recent run outcomes

## Routes
| Route | Feature |
|-------|---------|
| `/sales-engine` | Homepage with Dashboard + Campaign List |
| `/sales-engine/campaigns/new` | Create Campaign (5-step wizard) |
| `/sales-engine/campaigns/:id` | Campaign Overview |
| `/sales-engine/campaigns/:id/edit` | Edit DRAFT campaign |
| `/sales-engine/campaigns/:id/review` | Review & Approve |
| `/sales-engine/campaigns/:id/metrics` | Performance Metrics |
| `/sales-engine/campaigns/:id/runs` | Run History |
| `/sales-engine/campaigns/:id/variants` | Personalization Variants |
| `/sales-engine/campaigns/:id/safety` | Throughput & Blocking |

## Visual Design
- Light theme with soft white backgrounds
- Page background: #fafafa, Surface: #ffffff
- Deep indigo text: #1e1e4a
- Violet accents: #8b5cf6
- Magenta CTAs: #ec4899

### Typography
- **Headings**: Poppins (Google Font)
- **Body/UI**: Inter (Google Font)

### Icons
- Minimalist SVG icons via `design/components/Icon.tsx`
- 25+ icons including campaign, metrics, runs, variants, safety, AI, etc.
- NO emojis - brand-aligned minimalist icons only

## Key Components
- **SalesEngineDashboard**: Homepage dashboard with 5 panels
- **Icon**: Centralized SVG icon component
- **WizardContext/WizardProgress**: Multi-step campaign creation wizard
- **AICampaignGenerator**: AI-powered ICP and personalization generation
- **ICPEditor**: Tag-based ICP configuration
- **PersonalizationEditor**: Tone, CTA, USP management
- **StatusBadge**: Campaign status display

## M67 Constraints (CRITICAL)
- Uses only M60 Campaign APIs (`/api/v1/campaigns/*`)
- **NO execution capability** - explicitly forbidden
- All dashboard data is read-only
- No UI-side calculations - all values from API
- Governance flags (canEdit, canSubmit, canApprove, isRunnable) from API
- M65 blocking reasons displayed verbatim

## Blocking Reason Codes
M65 reasons:
- `MISSING_HUMAN_APPROVAL`
- `PERSISTENCE_ERRORS`
- `NO_LEADS_PERSISTED`
- `KILL_SWITCH_ENABLED`
- `SMARTLEAD_NOT_CONFIGURED`
- `INSUFFICIENT_CREDITS`

Throughput blocks:
- `DAILY_LIMIT_EXCEEDED`
- `HOURLY_LIMIT_EXCEEDED`
- `MAILBOX_LIMIT_EXCEEDED`
- `CONFIG_INACTIVE`
- `NO_CONFIG_FOUND`

## Recent Changes
- December 30, 2025: Added Sales Engine Dashboard
  - Created dashboard with 5 panels: Campaign Health, Readiness Blockers, Throughput Snapshot, Recent Runs, System Notices
  - Added M60-compliant API endpoints: /readiness, /throughput, /notices, /runs/recent
  - Dashboard integrated above campaign list on homepage
  - All data read-only, sourced from M60 APIs only
- December 30, 2025: Simplified to Standalone Sales Engine
  - Removed Command Center wrapper and dashboard pages
  - Sales Engine now operates as standalone app at /sales-engine
  - Root redirects to /sales-engine
  - M60/M67 compliance maintained
- December 30, 2025: M67 Sales Engine UI Full Implementation
  - Created all route pages: detail, edit, review, metrics, runs, variants, safety
  - Implemented AICampaignGenerator, ICPEditor, PersonalizationEditor
  - Full ICP structure with targeting configuration
  - Actor attribution for audit trail
  - M65/throughput blocking reasons displayed verbatim
