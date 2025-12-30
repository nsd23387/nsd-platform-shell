#!/bin/bash

# Create orphan branch for M67 Sales Engine UI - clean version
# This creates a fresh branch with only current Sales Engine files

set -e

BRANCH_NAME="sales-engine-ui-v2"

echo "Creating clean branch: $BRANCH_NAME"

# Create orphan branch (no history)
git checkout --orphan $BRANCH_NAME

# Remove all files from staging
git rm -rf --cached .

# === APP FILES ===

# Root app files
git add app/layout.tsx
git add app/globals.css
git add app/page.tsx
git add app/providers.tsx

# Sales Engine UI pages
git add app/sales-engine/page.tsx
git add app/sales-engine/campaigns/new/page.tsx
git add "app/sales-engine/campaigns/[id]/page.tsx"
git add "app/sales-engine/campaigns/[id]/edit/page.tsx"
git add "app/sales-engine/campaigns/[id]/metrics/page.tsx"
git add "app/sales-engine/campaigns/[id]/review/page.tsx"
git add "app/sales-engine/campaigns/[id]/runs/page.tsx"
git add "app/sales-engine/campaigns/[id]/safety/page.tsx"
git add "app/sales-engine/campaigns/[id]/variants/page.tsx"

# Sales Engine components
git add app/sales-engine/components/index.ts
git add app/sales-engine/components/AICampaignGenerator.tsx
git add app/sales-engine/components/BlockingReasons.tsx
git add app/sales-engine/components/CampaignCard.tsx
git add app/sales-engine/components/CampaignForm.tsx
git add app/sales-engine/components/GovernanceActions.tsx
git add app/sales-engine/components/ICPEditor.tsx
git add app/sales-engine/components/MetricsDisplay.tsx
git add app/sales-engine/components/PersonalizationEditor.tsx
git add app/sales-engine/components/ReadinessDisplay.tsx
git add app/sales-engine/components/RunsDisplay.tsx
git add app/sales-engine/components/SalesEngineDashboard.tsx
git add app/sales-engine/components/StatusBadge.tsx
git add app/sales-engine/components/VariantsDisplay.tsx

# Wizard components
git add app/sales-engine/components/wizard/index.ts
git add app/sales-engine/components/wizard/WizardContext.tsx
git add app/sales-engine/components/wizard/WizardNavigation.tsx
git add app/sales-engine/components/wizard/WizardProgress.tsx
git add app/sales-engine/components/wizard/steps/StepAI.tsx
git add app/sales-engine/components/wizard/steps/StepBasics.tsx
git add app/sales-engine/components/wizard/steps/StepICP.tsx
git add app/sales-engine/components/wizard/steps/StepPersonalization.tsx
git add app/sales-engine/components/wizard/steps/StepReview.tsx

# Sales Engine lib and types
git add app/sales-engine/lib/api.ts
git add app/sales-engine/types/campaign.ts

# === M60 Campaign API Routes ===
git add app/api/v1/campaigns/route.ts
git add app/api/v1/campaigns/readiness/route.ts
git add app/api/v1/campaigns/throughput/route.ts
git add app/api/v1/campaigns/notices/route.ts
git add app/api/v1/campaigns/runs/recent/route.ts
git add "app/api/v1/campaigns/[id]/route.ts"
git add "app/api/v1/campaigns/[id]/submit/route.ts"
git add "app/api/v1/campaigns/[id]/approve/route.ts"
git add "app/api/v1/campaigns/[id]/metrics/route.ts"
git add "app/api/v1/campaigns/[id]/metrics/history/route.ts"
git add "app/api/v1/campaigns/[id]/runs/route.ts"
git add "app/api/v1/campaigns/[id]/runs/latest/route.ts"
git add "app/api/v1/campaigns/[id]/variants/route.ts"
git add "app/api/v1/campaigns/[id]/throughput/route.ts"

# Mock Bootstrap API
git add app/functions/v1/ods-api/me/route.ts

# === SHARED MODULES ===

# Contexts
git add contexts/index.ts
git add contexts/BootstrapContext.tsx

# Design system
git add design/index.ts
git add design/README.md
git add design/components/index.ts
git add design/components/Icon.tsx
git add design/components/Button.tsx
git add design/components/Card.tsx
git add design/components/ReadOnlyBanner.tsx
git add design/components/StatusPill.tsx
git add design/components/Table.tsx
git add design/tokens/index.ts
git add design/tokens/colors.ts
git add design/tokens/spacing.ts
git add design/tokens/typography.ts
git add design/patterns/index.ts
git add design/patterns/ExceptionPanel.tsx
git add design/patterns/MetadataPanel.tsx
git add design/patterns/Timeline.tsx
git add design/brand/index.ts
git add design/brand/usage-rules.md
git add design/brand/anti-patterns.md

# Hooks
git add hooks/index.ts
git add hooks/useActivitySpine.ts
git add hooks/useRBAC.tsx

# Lib
git add lib/index.ts
git add lib/sdk.ts

# Types
git add types/index.ts
git add types/bootstrap.ts
git add types/activity-spine.ts

# === CONFIG FILES ===
git add package.json
git add package-lock.json
git add tsconfig.json
git add next.config.js
git add next-env.d.ts
git add replit.md

# === COMMIT ===
git commit -m "M67 Sales Engine UI - standalone branch

Clean implementation of Sales Engine for campaign lifecycle management.
- Dashboard with 5 panels: Health, Blockers, Throughput, Runs, Notices
- Campaign CRUD: create, edit, submit, approve
- M60 API compliance: all endpoints under /api/v1/campaigns/*
- Design system with light theme, Poppins/Inter fonts
- No execution capability - read-only observability only"

echo ""
echo "Branch '$BRANCH_NAME' created successfully!"
echo "To push: git push origin $BRANCH_NAME"
