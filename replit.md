# M67 Sales Engine UI

## Overview
The M67 Sales Engine UI is a governed, read-only interface for campaign observability and approval within the M60 Campaign Management system. It provides situational awareness of campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. The UI supports campaign creation, initializing them in a `DRAFT` governance state. It emphasizes a governance-first architecture, data truthfulness, explicit handling of `UNKNOWN` states, and transparent, outcome-oriented execution. The project also includes a Marketing Command Center for multi-screen analytics, providing live data insights based on Hormozi's Core 4 Growth Framework.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20. The architecture is primarily read-only, with most API interactions acting as proxies to the M60 API, with a specific control-plane write operation for new campaign creation.

**UI/UX Design:**
- **Color Scheme**: Adheres to Neon Signs Depot brand colors (magenta, indigo, violet) using NSD Brand Tokens.
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper and enforces required fields.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel`.
- **Execution Explainability**: Features components like `ExecutionConfidenceBadge`, `ExecutionTimeline`, and `ExecutionExplainabilityPanel` for transparent execution outcomes.
- **Marketing Dashboard UI**: Features 12 routed screens with shared sub-navigation, global filters (date range, comparison mode, channel), and a collapsible sidebar (`MarketingNav`). It utilizes the Adminto Component Library for marketing-specific components.
- **Responsive Design**: Achieved using breakpoint constants and `useMediaQuery` hooks.
- **Dark Mode**: Implemented via `ThemeContext` with localStorage persistence.

**Technical Implementations:**
- **Framework & Language**: Next.js 14 (App Router), TypeScript, Node.js 20.
- **API Interactions**: Primarily read-only proxying to M60 API; `/api/campaign-create` is a write operation.
- **Governance States**: UI-level states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) reflect the campaign approval lifecycle.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, indicated by a global banner.
- **Execution Explainability**: Canonical Execution Narrative Mapper (ENM) provides event-driven execution storytelling with defined mapping rules for states.
- **Live Execution Observability**: `useExecutionPolling` hook for real-time updates and `resolveCanonicalRunState()` for state reconciliation.
- **Marketing Command Center Architecture**: Data from the Supabase `analytics` schema, with a `MarketingContext` providing period state, comparison mode, channel filter, and shared API data.
- **Marketing Data Sources**: Utilizes `raw_web_events`, `raw_search_console`, `raw_ga4_events`, `raw_google_ads`, `raw_qms_deals`, `metrics_page_engagement_daily`.
- **Analytics Integrations**: Includes GA4 Data API and Google Ads BigQuery for data synchronization, and QMS integration for Convex quote lifecycle events.
- **Database Connection**: Uses `SUPABASE_DATABASE_URL || DATABASE_URL` with SSL.
- **Chart Library**: Recharts with NSD brand color tokens, `ResponsiveContainer`, custom tooltips, and `ReferenceLine`.
- **SEO Revenue Attribution**: Implements path-based normalization for URLs.
- **Data Export**: Client-side CSV and PDF export on all marketing dashboard pages via `ExportMenu` and `PageExportBar` components, powered by `jspdf` + `jspdf-autotable`.
- **SEO Command Center**: Provides a read-only decision surface for keyword cluster analysis, page performance, competitive intelligence, content pipeline management, internal linking, and SEO recommendation approval. Engine-backed approval path writes to `analytics.seo_execution_queue`. Phase-1 recommendations default to `analytics.seo_phase1_opportunity` (44 rows) with strategic intents (`create_page`, `strengthen_page`, `improve_ctr`, `add_internal_links`), measurement plans (KPIs, baseline/measurement windows, success thresholds), and a suppressed view from `analytics.seo_phase1_suppressed`. The broader engine queue is gated behind `NEXT_PUBLIC_SEO_ALL_REMEDIES=true`.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Used for persistence of new `DRAFT` campaigns, campaign editing/duplication, and Marketing Dashboard analytics via its `analytics` schema.
- **Google BigQuery**: Read-only source for Google Ads data, accessed via `@google-cloud/bigquery` SDK.
- **Convex QMS**: Quote Management System, pushes lifecycle events to `POST /api/ingest/qms-deal`.
- **ODS SEO Cluster Engine**: Provides keyword clustering, opportunity detection, and recommendation management. Consumed via `/api/proxy/seo/*` proxy routes.
