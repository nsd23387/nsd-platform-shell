# NSD Platform Shell

## Overview
Unified internal platform shell for the NSD Business Platform with read-only Activity Spine dashboards. This is a Next.js 14 application providing analytics dashboard views and the NSD Command Center.

## Tech Stack
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Package Manager**: npm

## Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── (command-center)/   # Command Center route group
│   │   └── command-center/ # Command Center pages
│   │       ├── layout.tsx  # Shared CC layout with header/nav
│   │       ├── page.tsx    # CC home with module cards
│   │       └── sales-engine/ # Sales Engine module (M67)
│   │           ├── page.tsx
│   │           └── campaigns/
│   ├── api/v1/campaigns/   # Mock Campaign API routes (M60)
│   ├── dashboard/          # Dashboard pages (executive, operations, design, media, sales)
│   ├── functions/v1/       # Mock API routes for development
│   └── sales-engine/       # DEPRECATED - Redirects to Command Center
├── components/             # React components
│   └── dashboard/          # Dashboard-specific components
├── contexts/               # React contexts (BootstrapContext)
├── design/                 # Design system
│   ├── components/         # Shared UI components (Icon.tsx)
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
- **NSD Command Center** (unified platform shell)
- **M67 Sales Engine UI** (campaign management module within Command Center)

## Mock APIs

### Bootstrap API
A mock API route at `/functions/v1/ods-api/me` provides bootstrap data for development, including:
- User identity and organization
- Roles and permissions
- Feature visibility flags (including `sales_engine`)
- Enabled modules list

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

## NSD Command Center

### Overview
The Command Center is a unified platform shell for managing NSD business operations. It provides a consistent navigation experience across all modules.

### Routes
| Route | Feature |
|-------|---------|
| `/command-center` | Command Center Home (module cards) |
| `/command-center/sales-engine` | Sales Engine (campaign list) |
| `/command-center/sales-engine/campaigns/new` | Create Campaign (5-step wizard) |
| `/command-center/sales-engine/campaigns/:id` | Campaign Overview |
| `/command-center/sales-engine/campaigns/:id/edit` | Edit DRAFT |
| `/command-center/sales-engine/campaigns/:id/review` | Review & Approve |
| `/command-center/sales-engine/campaigns/:id/metrics` | Performance Metrics |
| `/command-center/sales-engine/campaigns/:id/runs` | Run History |
| `/command-center/sales-engine/campaigns/:id/variants` | Personalization Variants |
| `/command-center/sales-engine/campaigns/:id/safety` | Throughput & Blocking |

### App Registry
Modules are registered via the Bootstrap API and displayed based on feature flags:
- `sales_engine` - Enables Sales Engine module

## M67 Sales Engine UI

### Visual Design
- Light theme matching NSD Command Center design system
- Soft white backgrounds: page (#fafafa), surface (#ffffff)
- Deep indigo text (#1e1e4a)
- Violet accents (#8b5cf6) for interactive elements
- Magenta CTAs (#ec4899) for primary actions
- Clean, professional feel for enterprise campaign management

### Typography
- **Headings**: Poppins (Google Font) - display font for titles, headers
- **Body/UI**: Inter (Google Font) - body text, form elements, buttons
- Font variables: `--font-display` (Poppins), `--font-body` (Inter)

### Icons
- Minimalist SVG icons via `design/components/Icon.tsx`
- 25+ icons: campaign, metrics, runs, variants, safety, AI, edit, review, target, message, etc.
- NO emojis - brand-aligned minimalist icons only

### Key Components
- **Icon**: Centralized SVG icon component with 25+ minimalist icons
- **WizardContext**: Multi-step wizard state management
- **WizardProgress**: Visual step indicator for campaign creation
- **AICampaignGenerator**: Auto-generates ICP targeting and personalization
- **ICPEditor**: Tag-based editor for keywords, industries, roles, locations, pain points, value propositions
- **PersonalizationEditor**: Tone of voice, CTA, USP management
- **StatusBadge**: Campaign status display (DRAFT, PENDING_REVIEW, RUNNABLE, ARCHIVED)
- **BlockingReasons**: Surfaces M65 blocking codes verbatim

### Multi-Step Campaign Wizard
5-step wizard for campaign creation:
1. **Basics** - Campaign name and description
2. **AI Assist** - AI-powered ICP and personalization generation
3. **ICP** - Ideal Customer Profile targeting configuration
4. **Personalization** - Tone, CTA, USP settings
5. **Review** - Final review before saving as DRAFT

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

## Deprecation: Legacy Sales Engine Routes

### Status: DEPRECATED
The standalone `/sales-engine/*` routes are deprecated and will be removed in a future release.

### Migration
All legacy routes now redirect to Command Center equivalents:
- `/sales-engine` → `/command-center/sales-engine`
- `/sales-engine/campaigns/new` → `/command-center/sales-engine/campaigns/new`
- `/sales-engine/campaigns/:id/*` → `/command-center/sales-engine/campaigns/:id/*`

### Deprecation Timeline
1. **Current**: All legacy routes redirect to Command Center
2. **Next Release**: Monitor telemetry for legacy route usage
3. **Future**: Remove redirect stubs when usage drops to zero

### Files to Remove (Post-Deprecation)
```
app/sales-engine/page.tsx (redirect stub)
app/sales-engine/campaigns/new/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/edit/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/review/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/metrics/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/runs/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/variants/page.tsx (redirect stub)
app/sales-engine/campaigns/[id]/safety/page.tsx (redirect stub)
```

Shared components in `app/sales-engine/components/`, `app/sales-engine/lib/`, and `app/sales-engine/types/` are still used by Command Center pages and should be retained.

## Recent Changes
- December 30, 2025: Sales Engine Migration to Command Center
  - Created NSD Command Center route group at `app/(command-center)/command-center/`
  - Migrated all Sales Engine pages to Command Center structure
  - Added Command Center home page with module cards
  - Integrated FeatureGuard for module visibility
  - Added redirect stubs for backwards compatibility
  - Updated bootstrap types with AppRegistryModule
  - Updated mock API with sales_engine feature flag
  - **DEPRECATED**: Legacy /sales-engine routes now redirect to Command Center
- December 30, 2025: M67 Premium UX & Brand Alignment
  - Integrated Poppins (headings) and Inter (body) fonts via next/font/google
  - Created Icon component with 25+ minimalist SVG icons
  - Replaced ALL emojis with brand-aligned icons across 10+ pages
  - Built multi-step campaign wizard with WizardContext, WizardProgress
  - 5 wizard steps: Basics → AI Assist → ICP → Personalization → Review
  - Enhanced UX with generous whitespace, improved spacing, premium feel
  - Updated edit page with tabbed navigation using icons
- December 30, 2025: M67 Sales Engine UI Light Theme Update
  - Converted entire UI from dark theme to light theme matching NSD Command Center
  - Applied design tokens: background.page (#fafafa), background.surface (#ffffff), text.primary (#1e1e4a)
  - Updated all pages: index, new, detail, edit, review, metrics, runs, variants, safety
  - Updated all components: StatusBadge, ICPEditor, PersonalizationEditor, AICampaignGenerator
  - Violet accents (#8b5cf6) for filters, tabs, badges
  - Magenta CTAs (#ec4899) for primary actions
- December 30, 2025: M67 Sales Engine UI Full Implementation
  - Created separate route pages: /edit, /review, /metrics, /runs, /variants, /safety
  - Implemented AICampaignGenerator, ICPEditor, PersonalizationEditor components
  - Full ICP structure with keywords, locations, industries, employee size, roles, pain points, value propositions
  - Actor attribution (submittedBy, approvedBy) for audit trail
  - All M65/throughput blocking reasons displayed verbatim
  - Updated mock APIs with full data
- December 30, 2025: Initial Replit environment setup
  - Configured Next.js to allow all dev origins for Replit proxy
  - Created mock bootstrap API for development
  - Set up deployment configuration
