# Campaign Management UI Export

This directory contains the campaign management UI components for integration into Sales Engine.

## Directory Structure

```
campaign-ui-export/
├── campaigns/                    # Campaign pages
│   ├── [id]/
│   │   ├── page.tsx             # Campaign detail page
│   │   └── edit/
│   │       └── page.tsx         # Edit campaign wizard
│   └── new/
│       └── page.tsx             # New campaign wizard
├── campaigns-list-page.tsx       # Campaign list page (rename to page.tsx)
├── components/
│   ├── campaign-details/         # Detail page components
│   │   ├── index.ts
│   │   ├── PrimaryCampaignStatusBanner.tsx
│   │   ├── DecisionSummaryPanel.tsx
│   │   ├── CampaignIntentScope.tsx
│   │   ├── ExecutionTimeline.tsx
│   │   ├── ResultsSection.tsx
│   │   └── CollapsibleLearningSignals.tsx
│   ├── wizard/                   # Campaign creation/edit wizard
│   │   ├── index.ts
│   │   ├── WizardNav.tsx
│   │   ├── WizardStep.tsx
│   │   ├── FormField.tsx
│   │   └── TagInput.tsx
│   ├── ui/                       # Shared UI components
│   │   ├── index.ts
│   │   ├── Button.tsx
│   │   ├── StatusChip.tsx
│   │   ├── DataTable.tsx
│   │   └── ...
│   ├── governance/               # Approval/governance components
│   └── observability/            # Execution observability components
├── hooks/
│   ├── index.ts
│   └── useExecutionState.ts      # Canonical execution state hook
├── types/
│   └── campaign.ts               # TypeScript type definitions
├── lib/
│   ├── api.ts                    # API client (NEEDS MODIFICATION)
│   ├── design-tokens.ts          # NSD design system tokens
│   ├── status-copy.ts            # Status labels and copy
│   ├── campaign-state.ts         # Campaign state utilities
│   └── time.ts                   # Time formatting utilities
└── design/                       # Design system components
    ├── components/
    │   ├── Icon.tsx
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   └── ...
    └── tokens/
        ├── colors.ts
        ├── spacing.ts
        └── typography.ts
```

## Integration Steps

### 1. Copy to Sales Engine
```bash
# From sales-engine repo root
cp -r /path/to/campaign-ui-export/* app/
```

### 2. Modify API Client (lib/api.ts)

The API client currently uses proxy routes. Update to call Sales Engine routes directly:

```typescript
// BEFORE (platform-shell - proxied)
const response = await fetch('/api/execute-campaign', {
  method: 'POST',
  body: JSON.stringify({ campaignId, runIntent }),
});

// AFTER (sales-engine - direct)
const response = await fetch(`/api/v1/campaigns/${campaignId}/start`, {
  method: 'POST',
  body: JSON.stringify({ runIntent }),
});
```

### 3. Remove Proxy Logic

In `lib/api.ts`, remove or simplify:
- `isApiDisabled` checks (Sales Engine always has API)
- Mock data fallbacks
- Proxy URL construction

### 4. Update Import Paths

Fix relative imports to match your new structure:
```typescript
// Update paths like:
import { Icon } from '../../../../../design/components/Icon';
// To:
import { Icon } from '@/design/components/Icon';
```

### 5. Required API Endpoints

Ensure Sales Engine has these endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/v1/campaigns | List campaigns |
| POST | /api/v1/campaigns | Create campaign |
| GET | /api/v1/campaigns/[id] | Get campaign detail |
| PUT | /api/v1/campaigns/[id] | Update campaign |
| POST | /api/v1/campaigns/[id]/submit | Submit for approval |
| POST | /api/v1/campaigns/[id]/approve | Approve campaign |
| POST | /api/v1/campaigns/[id]/start | Start/run campaign |
| POST | /api/v1/campaigns/[id]/revert-to-draft | Revert to draft |
| GET | /api/v1/campaigns/[id]/execution-state | Get execution state |

## Key Components

### DecisionSummaryPanel
The main action panel showing:
- Governance approval status
- Execution readiness
- Submit/Approve/Run buttons

### useExecutionState Hook
Canonical hook for execution state - connects to `/execution-state` endpoint.

### Design Tokens (lib/design-tokens.ts)
NSD brand colors, spacing, typography - use these for consistent styling.

## What's NOT Included

- API route handlers (`/api/*`) - Sales Engine has its own
- Middleware - Sales Engine handles auth
- Next.js config - Use Sales Engine's existing config
- Supabase client - Sales Engine has its own database layer

## Dependencies

Ensure these are in Sales Engine's package.json:
```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  }
}
```
