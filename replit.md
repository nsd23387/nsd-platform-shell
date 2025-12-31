# M67 Sales Engine UI v3

## Overview
Sales Engine UI v3 - A Sales Operator Command Interface for campaign lifecycle management. This standalone Next.js application provides situational awareness and human-controlled campaign governance using M60 Campaign Management APIs only.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

## Project Structure
```
├── app/
│   ├── api/v1/campaigns/       # M60 Campaign API routes
│   ├── sales-engine/           # Sales Engine UI pages
│   │   ├── home/               # Dashboard (situational awareness)
│   │   ├── campaigns/          # Campaign management
│   │   │   ├── new/            # Campaign creation wizard
│   │   │   └── [id]/           # Campaign details
│   │   ├── approvals/          # Human approval workflow
│   │   ├── execution/          # Execution visibility (read-only)
│   │   ├── monitoring/         # Metrics & run history
│   │   ├── components/         # UI components
│   │   │   └── wizard/         # Campaign creation wizard
│   │   ├── lib/                # API client & utilities
│   │   └── types/              # TypeScript types
│   └── page.tsx                # Redirects to /sales-engine/home
├── design/                     # Design system
│   └── components/             # Shared UI components (Icon.tsx)
└── ...
```

## Development

### Running the Dev Server
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

## v3 Routes
| Route | Feature |
|-------|---------|
| `/sales-engine/home` | Dashboard - situational awareness, metrics overview |
| `/sales-engine` | Campaign list with filters |
| `/sales-engine/campaigns/new` | Create Campaign (5-step wizard with AI assist) |
| `/sales-engine/campaigns/:id` | Campaign Overview |
| `/sales-engine/approvals` | Human approval workflow with responsibility confirmation |
| `/sales-engine/execution` | Execution visibility (read-only, no execution capability) |
| `/sales-engine/monitoring` | Metrics grouped by Yield, Efficiency, Quality, Safety |

## Key Features

### Home Dashboard (NEW in v3)
- Aggregate campaign metrics by status
- Attention required panel (pending approvals)
- Today's throughput with capacity visualization
- Recent activity timeline

### Status Language (v3 REQUIRED)
Backend Status → UI Label:
- `DRAFT` → Draft
- `PENDING_REVIEW` → Pending Review
- `RUNNABLE` → **Approved & Ready** (never "Runnable")
- `ARCHIVED` → Archived

### Campaign Creation Wizard
5-step wizard with AI Draft Generator:
1. **Basics** - Campaign name and description
2. **AI Assist** - AI-powered ICP and personalization generation with rationale
3. **ICP** - Ideal Customer Profile targeting configuration
4. **Personalization** - Tone, CTA, USP settings
5. **Review** - Final review before saving as DRAFT

### Approval UX (Human Authority)
- Responsibility confirmation modal
- Campaign summary snapshot with ICP hash
- Governance disclosure language
- Explicit checkbox confirmation required

### Execution (Safety First)
- Read-only visibility into approved campaigns
- Safety gates display (daily limits, used today, remaining)
- NO execution capability in UI (managed by backend)

### Monitoring
Metrics grouped into:
- **Yield** - Leads attempted, sent, success rate
- **Efficiency** - Utilization, active campaigns
- **Quality** - Completed, partial, failed runs
- **Safety** - Blocked by throughput, active blockers

## Visual Design
- Clean, modern, confident design
- High whitespace, minimal borders
- Purposeful color usage (state/action only)
- **Headings**: Poppins font
- **Body/UI**: Inter font
- Minimalist SVG icons (no emojis)

## Key Constraints
- Uses only M60 Campaign APIs (`/api/v1/campaigns/*`)
- **NO execution capability** - explicitly forbidden
- All dashboard data is read-only
- Governance flags (canEdit, canSubmit, canApprove, isRunnable) from API
- M65 blocking reasons displayed verbatim
- UI teaches the system as it's used

## Recent Changes
- December 31, 2025: Sales Engine UI v3
  - Added Home Dashboard for situational awareness
  - Global status rewrite: "Runnable" → "Approved & Ready"
  - Enhanced AI Campaign Draft Generator with rationale
  - Approval modal with responsibility confirmation
  - Execution page with safety gates (read-only)
  - Monitoring page with grouped metrics
  - Brand-aligned visual refinements
