# NSD Platform Shell

## Overview
Unified internal platform shell for the NSD Business Platform with read-only Activity Spine dashboards. This is a Next.js 14 application providing analytics dashboard views.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

## Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── api/v1/campaigns/   # Mock Campaign API routes (M60)
│   ├── dashboard/          # Dashboard pages (executive, operations, design, media, sales)
│   ├── functions/v1/       # Mock API routes for development
│   └── sales-engine/       # M67 Sales Engine UI (standalone)
│       ├── campaigns/      # Campaign pages (list, detail, new)
│       ├── components/     # Sales Engine components
│       ├── lib/            # API client
│       └── types/          # Campaign types
├── components/             # React components
│   └── dashboard/          # Dashboard-specific components
├── contexts/               # React contexts (BootstrapContext)
├── design/                 # Design system
│   ├── components/         # Shared UI components
│   ├── patterns/           # UI patterns
│   └── tokens/             # Design tokens (colors, spacing, typography)
├── hooks/                  # Custom React hooks
├── lib/                    # SDK and utilities
├── types/                  # TypeScript type definitions
└── docs/                   # Documentation
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
- Read-only analytics dashboards
- Bootstrap context for user/permissions
- Activity Spine integration (mocked for development)
- Design system with tokens
- **M67 Sales Engine UI** (standalone campaign management)

## Mock APIs

### Bootstrap API
A mock API route at `/functions/v1/ods-api/me` provides bootstrap data for development.

### Campaign API (M60)
Mock campaign management APIs at `/api/v1/campaigns/*`:
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign (DRAFT)
- `GET /api/v1/campaigns/:id` - Get campaign detail with governance flags
- `PATCH /api/v1/campaigns/:id` - Update campaign (DRAFT only)
- `POST /api/v1/campaigns/:id/submit` - Submit for review
- `POST /api/v1/campaigns/:id/approve` - Approve campaign
- `GET /api/v1/campaigns/:id/metrics` - Campaign metrics
- `GET /api/v1/campaigns/:id/metrics/history` - Metrics history
- `GET /api/v1/campaigns/:id/runs` - Run history
- `GET /api/v1/campaigns/:id/runs/latest` - Latest run
- `GET /api/v1/campaigns/:id/variants` - Personalization variants
- `GET /api/v1/campaigns/:id/throughput` - Throughput config

## M67 Sales Engine UI
Standalone campaign management UI accessible at `/sales-engine`. Features:
- **M67-02**: Campaign Setup (create/edit DRAFT campaigns)
- **M67-03**: Campaign Approval (submit/approve workflow)
- **M67-04**: Execution Readiness (display only, NO execution)
- **M67-05**: Monitoring (metrics, runs, throughput - read-only)

Key constraints:
- Uses only M60 Campaign APIs (`/api/v1/campaigns/*`)
- NO execution capability (explicitly forbidden)
- Governance flags (canEdit, canSubmit, canApprove, isRunnable) from API
- No NSD Command Center integration (handled separately in M68)

## Recent Changes
- December 30, 2025: M67 Sales Engine UI Implementation
  - Created standalone Sales Engine UI at `/sales-engine`
  - Implemented M67-02 through M67-05 features
  - Created mock Campaign APIs for development
  - No execution capability (by design)
- December 30, 2025: Initial Replit environment setup
  - Configured Next.js to allow all dev origins for Replit proxy
  - Created mock bootstrap API for development
  - Set up deployment configuration
