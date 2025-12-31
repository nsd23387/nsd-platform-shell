# M67 Sales Engine UI v4

## Overview
Sales Engine UI v4 - A Sales Operator Command Interface for campaign lifecycle management. This standalone Next.js application provides situational awareness and human-controlled campaign governance using M60 Campaign Management APIs only.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm
- **Design System**: NSD Brand Tokens (Deep Indigo, Violet, Magenta)

## Environment Variables
```
NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL - M60 API base URL (staging)
NEXT_PUBLIC_ODS_API_URL - ODS API for bootstrap/identity
```

## Project Structure
```
├── app/
│   ├── api/v1/campaigns/       # M60 API proxy routes (passthrough only)
│   ├── sales-engine/
│   │   ├── home/               # Dashboard with KPI strip + Needs Attention
│   │   ├── campaigns/
│   │   │   ├── new/            # Campaign creation (wizard + AI generator)
│   │   │   └── [id]/           # Campaign detail with tabs
│   │   ├── components/
│   │   │   ├── ui/             # Shared NSD components
│   │   │   └── wizard/         # Campaign creation wizard
│   │   ├── lib/
│   │   │   ├── api.ts          # M60 API client
│   │   │   ├── design-tokens.ts # NSD brand tokens
│   │   │   └── statusLabels.ts # Status language mapping
│   │   └── types/              # TypeScript types
│   └── page.tsx                # Redirects to /sales-engine/home
├── design/components/          # Shared Icon component
└── ...
```

## v4 Routes
| Route | Feature |
|-------|---------|
| `/sales-engine/home` | Dashboard with KPI strip + Needs Attention queue |
| `/sales-engine` | Campaign table with filters + search + quick actions |
| `/sales-engine/campaigns/new` | Campaign form + AI generator |
| `/sales-engine/campaigns/:id` | Campaign detail with tabs |

### Campaign Detail Tabs
- **Setup** - View/edit campaign details (read-only if not DRAFT)
- **Review** - Submit to review with governance checklist (DRAFT only)
- **Approvals** - Approve/reject with confirmation (PENDING_REVIEW only)
- **Execution** - Start run with safety warnings (Approved & Ready only)
- **Monitoring** - Run history, metrics, snapshots (read-only)

## Status Language (v4 REQUIRED)
Backend Status → UI Label:
- `DRAFT` → Draft
- `PENDING_REVIEW` → In Review
- `RUNNABLE` → **Approved & Ready** (NEVER "Runnable")
- `RUNNING` → Running
- `COMPLETED` → Completed
- `FAILED` → Failed
- `ARCHIVED` → Archived

## NSD Brand Tokens
```typescript
Primary: #020F5A (Deep Indigo)
Secondary: #692BAA (Violet)
CTA: #CC368F (Magenta - sparingly)
Background: #FFFFFF
Surface: #F9FAFB
```

## Shared Components
- `PageHeader` - Page title with back link and actions
- `SectionCard` - Content section with title and icon
- `StatCard` - KPI display card
- `StatusChip` - Status badge with color coding
- `Button` - Primary, secondary, CTA, ghost variants
- `DataTable` - Tabular data display

## Key Constraints
- API routes proxy to M60 backend only (no business logic)
- No direct Supabase access, no service_role keys
- Bootstrap from ODS /api/v1/me endpoint
- UI must not parse JWT or infer permissions
- All dashboard data comes from governed read endpoints
- Human authority required for all state transitions

## UX Success Checklist
- [x] Home dashboard shows correct totals by status
- [x] Needs Attention queue routes to correct next action
- [x] Status language uses "Approved & Ready" (never Runnable)
- [x] Campaign table supports filtering by status + search by name
- [x] Draft can be created, saved, re-opened, edited
- [x] Review step explains what changes when submitting
- [x] Approval step requires explicit confirmation
- [x] Execution step requires confirmation and shows safety warnings
- [x] Monitoring is read-only and shows run history
- [x] Brand tokens match NSD website (whitespace, indigo/violet, magenta CTA)

## Recent Changes
- December 31, 2025: UI-Only Governance Enhancements
  - Improved visual hierarchy and spacing in MetricsDisplay, RunsDisplay
  - Enhanced UX copy for UNKNOWN states and disabled actions
  - Added detailed explanations for blocked and pending states
  - Improved empty state presentations in LearningSignalsPanel, RunsDisplay
  - Applied subtle brand-aligned polish to badges and pills
  - Updated tooltips for confidence and provenance indicators
  - Ensured consistent terminology across governance components
  - All changes are UI-only, no logic or API modifications

- December 31, 2025: Sales Engine UI v4
  - Removed mock APIs, added M60 backend proxy
  - Added environment configuration for API URLs
  - Global status rewrite: "Runnable" → "Approved & Ready"
  - Enhanced Home Dashboard with 6-stat KPI strip
  - Added Needs Attention queue with actionable CTAs
  - Campaign detail page with 5 tabs (Setup, Review, Approvals, Execution, Monitoring)
  - Applied NSD brand tokens throughout
  - Created shared UI component library
  - Campaign table with filters, search, quick actions
