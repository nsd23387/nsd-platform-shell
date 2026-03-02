# M67 Sales Engine UI

## Overview
The Sales Engine UI is a governed, read-only interface for campaign observability and approval. Its primary goal is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. The UI focuses on displaying information and explicitly avoids initiating execution, approval, sourcing, or governance transitions. The only exception is campaign creation, where campaigns are initialized in a `DRAFT` governance state. The project emphasizes a governance-first architecture, ensuring truthfulness, explicit handling of `UNKNOWN` states, and providing clear, outcome-oriented execution transparency to users.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm. It utilizes NSD Brand Tokens for its design system.

The architecture enforces a read-only principle, prioritizing observation over control. All API interactions, except for the `campaign-create` endpoint, are read-only proxies to the M60 API.

**UI/UX Design:**
- **Color Scheme**: Adheres strictly to Neon Signs Depot brand colors (magenta, indigo, violet), avoiding yellow, green, or red.
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper for visibility and independent navigation.
- **Form Fields Governance**: Strictly defines required fields and forbids others to maintain data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for visual communication of governance and data quality.
- **Execution Explainability Components**: Features `ExecutionConfidenceBadge`, `ExecutionTimeline`, `NextStepCard`, `ExecutionTooltip`, and `ExecutionExplainabilityPanel` for outcome-oriented execution transparency.

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL` (client-side), `SALES_ENGINE_API_BASE_URL` (server-side proxy), and `NEXT_PUBLIC_ODS_API_URL`.
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) represent the human approval lifecycle, distinct from backend runtime states.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write operation that persists a new campaign in a `draft` status to Supabase.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, disabling all API calls and modifications, indicated by a global banner.
- **Execution Explainability**: Replaces ambiguous execution indicators with clear, outcome-oriented states, mapping backend conditions to UI meanings without inference.
- **Run State Reconciliation**: A centralized `resolveCanonicalRunState()` function provides a single source of truth for execution states.
- **Run Staleness & Active Run Resolution**: A `resolveActiveRun.ts` utility handles run selection logic, considering staleness thresholds to prevent "Running" status for stalled executions.
- **Live Execution Observability**: Utilizes a `useExecutionPolling` hook for live updates during active execution, stopping automatically on terminal states.
- **UI Hardening for Future Execution Stages**: Uses `CANONICAL_STAGE_CONFIG` for all execution stages, ensuring components are stage-agnostic and handle unknown stages gracefully for extensibility.
- **ENM Governance Lock**: The Execution Narrative Mapper (ENM) is the sole interpreter of execution state. All execution-aware UI components must consume `ExecutionNarrative` output only.
- **Canonical Execution Narrative Mapper (ENM) Implementation**: Implements truthful, event-driven execution storytelling with canonical mapping rules for states like `IDLE`, `QUEUED`, `RUNNING`, `STALLED`, `COMPLETED`, `FAILED`.

## Marketing Dashboard
The Marketing Dashboard (`/dashboard/marketing`) is a comprehensive analytics view powered by live data from the Supabase `analytics` schema. It renders 8 panel categories:

**Data Sources:**
- `raw_web_events` (page views, conversions) — active
- `raw_search_console` (SEO queries, pages, device/country) — active, 7-day window
- `raw_ga4_events`, `raw_google_ads`, `raw_clarity_sessions` — empty (pipelines not connected)
- `metrics_page_engagement_daily` — empty; dashboard falls back to `dashboard_funnel_daily` for page view counts

**Panels:**
1. **KPI Overview** — Pipeline Value, Submissions, Organic Clicks, Impressions, Sessions, Page Views (with funnel fallback)
2. **Conversion Funnel** — Page Views → Submissions → Pipeline Value with daily breakdown
3. **Sources** — Pipeline and submissions by canonical source
4. **Pipeline by Category** — Product type breakdown (from `pipeline_by_category` view)
5. **Recent Conversions** — Chronological feed of quote submissions (from `conversion_events`)
6. **Audience** — Device breakdown (Desktop/Mobile/Tablet) and Top Countries (from `raw_search_console` payload)
7. **SEO Intelligence** — Top queries with Rising/Falling movers detection (from `metrics_search_console_query_daily`)
8. **Data Pipeline Health** — Ingestion status per source (from `ingestion_runs`)
9. **Timeseries** — Sessions, Submissions, Pipeline, Impressions, Clicks (toggle-enabled)

**Database Connection:** Uses `SUPABASE_DATABASE_URL || DATABASE_URL` with always-on SSL (`rejectUnauthorized: false`). All queries are date-range filtered via `$1/$2` params.

**Chart Library (Recharts):**
- `components/dashboard/charts/` — Shared chart wrappers: `AreaLineChart`, `DonutChart`, `BarChart`, `Sparkline`
- All charts use NSD brand color tokens, `ResponsiveContainer`, custom tooltips
- Timeseries panel uses `AreaLineChart` (replaced hand-rolled SVG)
- Audience panel uses `DonutChart` for device breakdown
- Sources + Pipeline Category panels use `BarChart` + `DonutChart`

**Responsive & Animation System:**
- `design/tokens/breakpoints.ts` — Breakpoint constants (sm: 640, md: 768, lg: 1024, xl: 1280)
- `design/tokens/animations.ts` — Keyframe definitions (shimmer, fadeIn, pulse, growWidth, countUp)
- `hooks/useMediaQuery.ts` — `useMediaQuery` + `useBreakpoint` hooks
- `components/dashboard/DashboardGrid.tsx` — Supports responsive column objects `{sm, md, lg}`
- `components/dashboard/SkeletonCard.tsx` — Per-panel shimmer skeleton loading

**Key Files:**
- `services/marketingQueries.ts` — All SQL queries and data mapping
- `app/api/activity-spine/marketing/overview/route.ts` — API route handler
- `app/dashboard/marketing/page.tsx` — Page orchestrator (max-width container, per-panel loading)
- `app/dashboard/marketing/components/` — All panel components (modernized with charts, animations, responsive grids)
- `types/activity-spine.ts` — Type definitions

## Testing
- **Test runner**: vitest 3.x with vite 5.x (pinned for Node.js 18 CJS compatibility)
- **Test environment**: `node` (API route tests don't need jsdom)
- **Test files**:
  - `app/api/activity-spine/marketing/overview/__tests__/route.test.ts` — 104 tests covering T001-T008 marketing panel improvements
  - `app/sales-engine/lib/__tests__/read-only-guard.test.ts` — 29 tests for read-only guard
- **Run tests**: `npx vitest run`
- **Note**: vitest uses `// @vitest-environment node` directive in API test files; vitest.config.ts defaults to `environment: 'node'`

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns via the `/api/campaign-create` endpoint, campaign editing/duplication, and Marketing Dashboard analytics (via `analytics` schema).