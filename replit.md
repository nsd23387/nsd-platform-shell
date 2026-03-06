# M67 Sales Engine UI

## Overview
The M67 Sales Engine UI is a governed, read-only interface for campaign observability and approval within the M60 Campaign Management system. Its primary goal is to provide situational awareness of campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. It supports campaign creation, initializing them in a `DRAFT` governance state. The project is built on a governance-first architecture, emphasizing data truthfulness, explicit handling of `UNKNOWN` states, and transparent, outcome-oriented execution. It also includes a Marketing Command Center for multi-screen analytics, providing live data insights based on Hormozi's Core 4 Growth Framework.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm, and integrates NSD Brand Tokens for its design system. The architecture is primarily read-only, with most API interactions acting as proxies to the M60 API.

**UI/UX Design:**
- **Color Scheme**: Adheres to Neon Signs Depot brand colors (magenta, indigo, violet).
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper.
- **Form Fields Governance**: Enforces required fields for data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for clear communication of governance and data quality.
- **Execution Explainability**: Features components like `ExecutionConfidenceBadge`, `ExecutionTimeline`, and `ExecutionExplainabilityPanel` for transparent execution outcomes.
- **Marketing Dashboard UI**: Features 12 routed screens with a shared sub-navigation sidebar, global filters (date range, comparison mode, channel), and a collapsible sidebar (`MarketingNav`).
- **Adminto Component Library**: Provides various marketing-specific components like `StatTile`, `EngineCard`, `OpportunityTable`, and `InsightsFeed`.
- **Responsive Design**: Utilizes breakpoint constants, `useMediaQuery` hooks, and a responsive `DashboardGrid`.
- **Dark Mode**: Implemented via `ThemeContext` with localStorage persistence.

**Technical Implementations:**
- **Framework & Language**: Next.js 14 (App Router), TypeScript, Node.js 20.
- **API Interactions**: Primarily read-only proxying to M60 API, with `/api/campaign-create` as a control-plane write operation to persist new campaigns in a `draft` status.
- **Governance States**: UI-level states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) reflect the campaign approval lifecycle.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, indicated by a global banner.
- **Execution Explainability**: Canonical Execution Narrative Mapper (ENM) provides truthful, event-driven execution storytelling with defined mapping rules for states like `IDLE`, `QUEUED`, `RUNNING`, `STALLED`, `COMPLETED`, `FAILED`.
- **Run State Reconciliation**: `resolveCanonicalRunState()` function provides a single source of truth for execution states.
- **Live Execution Observability**: `useExecutionPolling` hook for real-time updates.
- **Marketing Command Center Architecture**: Data from the Supabase `analytics` schema, with a `MarketingContext` providing period state, comparison mode, channel filter, and shared API data to child routes.
- **Marketing Data Sources**: `raw_web_events`, `raw_search_console`, `raw_ga4_events`, `raw_google_ads`, `raw_qms_deals`, `metrics_page_engagement_daily`.
- **Analytics Integrations**:
    - **GA4 Data API**: Synchronizes `page_engagement`, `GA4_events`, `device_country`, and `channel_sessions` via daily cron jobs or manual triggers.
    - **Google Ads BigQuery**: Ingests campaign performance and search terms data from BigQuery via daily cron jobs or manual triggers.
    - **QMS Integration**: Ingests Convex quote lifecycle events via webhook into `analytics.raw_qms_deals`. Provides pipeline summary, aging, close rate, deal velocity, status breakdown, and recent deals.
- **Database Connection**: Uses `SUPABASE_DATABASE_URL || DATABASE_URL` with SSL.
- **Chart Library**: Recharts with NSD brand color tokens, `ResponsiveContainer`, custom tooltips, and `ReferenceLine`.
- **SEO Revenue Attribution**: Implements path-based normalization for URLs to correctly attribute conversions across domains.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Used for persistence of new `DRAFT` campaigns, campaign editing/duplication, and Marketing Dashboard analytics via its `analytics` schema.
- **Google BigQuery**: Read-only source for Google Ads data, accessed via `@google-cloud/bigquery` SDK.
- **Convex QMS**: Quote Management System, pushes lifecycle events to `POST /api/ingest/qms-deal`.