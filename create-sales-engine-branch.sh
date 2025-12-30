#!/bin/bash

# Create orphan branch for Sales Engine UI only
git checkout --orphan sales-engine-ui-only

# Remove all files from staging
git rm -rf --cached .

# Add Sales Engine UI files
git add app/sales-engine/page.tsx
git add app/sales-engine/campaigns/new/page.tsx
git add "app/sales-engine/campaigns/[id]/page.tsx"
git add app/sales-engine/lib/api.ts
git add app/sales-engine/types/campaign.ts
git add app/sales-engine/components/index.ts
git add app/sales-engine/components/StatusBadge.tsx
git add app/sales-engine/components/BlockingReasons.tsx
git add app/sales-engine/components/CampaignCard.tsx
git add app/sales-engine/components/CampaignForm.tsx
git add app/sales-engine/components/GovernanceActions.tsx
git add app/sales-engine/components/ReadinessDisplay.tsx
git add app/sales-engine/components/MetricsDisplay.tsx
git add app/sales-engine/components/RunsDisplay.tsx
git add app/sales-engine/components/VariantsDisplay.tsx

# Add Mock API routes
git add app/api/v1/campaigns/route.ts
git add "app/api/v1/campaigns/[id]/route.ts"
git add "app/api/v1/campaigns/[id]/submit/route.ts"
git add "app/api/v1/campaigns/[id]/approve/route.ts"
git add "app/api/v1/campaigns/[id]/metrics/route.ts"
git add "app/api/v1/campaigns/[id]/metrics/history/route.ts"
git add "app/api/v1/campaigns/[id]/runs/route.ts"
git add "app/api/v1/campaigns/[id]/runs/latest/route.ts"
git add "app/api/v1/campaigns/[id]/variants/route.ts"
git add "app/api/v1/campaigns/[id]/throughput/route.ts"

# Add essential config files
git add app/layout.tsx
git add app/globals.css
git add app/providers.tsx
git add package.json
git add package-lock.json
git add tsconfig.json
git add next.config.js
git add replit.md

# Commit
git commit -m "M67 Sales Engine UI - standalone branch"

echo "Branch 'sales-engine-ui-only' created successfully!"
