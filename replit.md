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
│       ├── campaigns/      # Campaign pages
│       │   ├── new/        # Create campaign
│       │   └── [id]/       # Campaign detail
│       │       ├── edit/   # Campaign builder
│       │       ├── review/ # Approval workflow
│       │       ├── metrics/# Performance metrics
│       │       ├── runs/   # Run history
│       │       ├── variants/# Personalization variants
│       │       └── safety/ # Throughput & blocking
│       ├── components/     # Sales Engine components
│       │   ├── AICampaignGenerator.tsx
│       │   ├── ICPEditor.tsx
│       │   ├── PersonalizationEditor.tsx
│       │   └── ...
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

### Visual Design
- Dark theme (#0f0f0f background)
- Neon magenta accents (#e879f9)
- Clean, premium feel matching neonsignsdepot.com branding

### Routes
| Route | Feature |
|-------|---------|
| `/sales-engine` | Campaign Index (list all campaigns) |
| `/sales-engine/campaigns/new` | Campaign Builder (create DRAFT) |
| `/sales-engine/campaigns/:id` | Campaign Overview |
| `/sales-engine/campaigns/:id/edit` | Edit DRAFT (ICP, Personalization) |
| `/sales-engine/campaigns/:id/review` | Review & Approve (PENDING_REVIEW) |
| `/sales-engine/campaigns/:id/metrics` | Performance Metrics |
| `/sales-engine/campaigns/:id/runs` | Run History (read-only ledger) |
| `/sales-engine/campaigns/:id/variants` | Personalization Variants |
| `/sales-engine/campaigns/:id/safety` | Throughput & Blocking Reasons |

### Key Components
- **AICampaignGenerator**: Auto-generates ICP targeting and personalization
- **ICPEditor**: Tag-based editor for keywords, industries, roles, locations, pain points, value propositions
- **PersonalizationEditor**: Tone of voice, CTA, USP management
- **StatusBadge**: Campaign status display (DRAFT, PENDING_REVIEW, RUNNABLE, ARCHIVED)
- **BlockingReasons**: Surfaces M65 blocking codes verbatim

### ICP Structure
```typescript
interface ICP {
  keywords: string[];
  locations: Location[];  // country, state, city
  industries: string[];
  employeeSize: { min: number; max: number };
  roles: string[];
  painPoints: string[];
  valuePropositions: string[];
}
```

### Key Constraints
- Uses only M60 Campaign APIs (`/api/v1/campaigns/*`)
- **NO execution capability** (explicitly forbidden)
- Governance flags (canEdit, canSubmit, canApprove, isRunnable) from API
- No NSD Command Center integration (handled separately in M68)
- Actor attribution: submittedBy, approvedBy fields for audit trail

### Blocking Reason Codes
M65 reasons displayed verbatim:
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
- December 30, 2025: M67 Sales Engine UI Full Implementation
  - Created separate route pages: /edit, /review, /metrics, /runs, /variants, /safety
  - Implemented AICampaignGenerator, ICPEditor, PersonalizationEditor components
  - Full ICP structure with keywords, locations, industries, employee size, roles, pain points, value propositions
  - Dark theme with neon magenta accents
  - Actor attribution (submittedBy, approvedBy) for audit trail
  - All M65/throughput blocking reasons displayed verbatim
  - Updated mock APIs with full data
- December 30, 2025: Initial Replit environment setup
  - Configured Next.js to allow all dev origins for Replit proxy
  - Created mock bootstrap API for development
  - Set up deployment configuration
