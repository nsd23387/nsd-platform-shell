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
├── app/
│   ├── api/v1/campaigns/       # M60 Campaign API routes
│   │   ├── [id]/               # Campaign-specific endpoints
│   │   ├── readiness/          # Dashboard readiness data
│   │   ├── throughput/         # System throughput snapshot
│   │   ├── notices/            # System notices
│   │   └── runs/recent/        # Recent run outcomes
│   ├── functions/v1/           # Mock API routes for development
│   ├── sales-engine/           # Sales Engine UI pages
│   │   ├── components/         # Sales Engine components
│   │   │   └── wizard/         # Campaign creation wizard
│   │   ├── lib/                # API client functions
│   │   ├── types/              # TypeScript types
│   │   └── campaigns/          # Campaign pages
│   └── page.tsx                # Redirects to /sales-engine
├── contexts/                   # React contexts (BootstrapContext)
├── design/                     # Design system
│   └── components/             # Shared UI components (Icon.tsx)
├── hooks/                      # Custom React hooks
├── lib/                        # SDK and utilities
└── types/                      # TypeScript type definitions
```

## Development

### Running the Dev Server
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Build
```bash
npm run build
```

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

## Key Features

### Homepage Dashboard
- **Campaign Health** - KPI cards (Total, Draft, Pending Review, Runnable, Archived)
- **Readiness Blockers** - Grouped counts by blocker reason
- **Throughput Snapshot** - Daily capacity with progress bar
- **Recent Run Outcomes** - Latest execution results
- **System Notices** - Info banners for governance visibility

### Campaign Creation Wizard
5-step wizard for campaign creation:
1. **Basics** - Campaign name and description
2. **AI Assist** - AI-powered ICP and personalization generation
3. **ICP** - Ideal Customer Profile targeting configuration
4. **Personalization** - Tone, CTA, USP settings
5. **Review** - Final review before saving as DRAFT

## Visual Design
- Light theme with soft white backgrounds (#fafafa, #ffffff)
- Deep indigo text (#1e1e4a)
- Violet accents (#8b5cf6)
- Magenta CTAs (#ec4899)
- **Headings**: Poppins font
- **Body/UI**: Inter font
- Minimalist SVG icons (no emojis)

## M60 Campaign APIs
All APIs at `/api/v1/campaigns/*`:
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign (DRAFT)
- `GET /api/v1/campaigns/:id` - Get campaign detail
- `PATCH /api/v1/campaigns/:id` - Update campaign (DRAFT only)
- `POST /api/v1/campaigns/:id/submit` - Submit for review
- `POST /api/v1/campaigns/:id/approve` - Approve campaign
- `GET /api/v1/campaigns/readiness` - Aggregated readiness data
- `GET /api/v1/campaigns/throughput` - System throughput
- `GET /api/v1/campaigns/notices` - System notices
- `GET /api/v1/campaigns/runs/recent` - Recent run outcomes

## Key Constraints
- Uses only M60 Campaign APIs (`/api/v1/campaigns/*`)
- **NO execution capability** - explicitly forbidden
- All dashboard data is read-only
- Governance flags (canEdit, canSubmit, canApprove, isRunnable) from API
- M65 blocking reasons displayed verbatim

## Recent Changes
- December 31, 2025: Simplified to pure Sales Engine UI
  - Removed NSD Platform Shell dashboard
  - Removed legacy docs and components
  - Standalone app at /sales-engine
- December 31, 2025: Restored wizard and dashboard
  - Recreated 5-step campaign wizard with progress indicator
  - Restored homepage dashboard with 5 panels
  - Added API endpoints for dashboard data
