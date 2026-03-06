# M67 Sales Engine UI

## Overview
The Sales Engine UI is a governed, read-only interface designed for campaign observability and approval within the M60 Campaign Management system. Its core purpose is to provide situational awareness regarding campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. While primarily read-only, it allows for campaign creation, initializing them in a `DRAFT` governance state. The project emphasizes a governance-first architecture, focusing on data truthfulness, explicit handling of `UNKNOWN` states, and transparent, outcome-oriented execution.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm. It integrates NSD Brand Tokens for its design system. The architecture is fundamentally read-only, with all API interactions, except for campaign creation, acting as read-only proxies to the M60 API.

**UI/UX Design:**
- **Color Scheme**: Adheres to Neon Signs Depot brand colors (magenta, indigo, violet).
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper.
- **Form Fields Governance**: Enforces required fields for data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for clear communication of governance and data quality.
- **Execution Explainability**: Features `ExecutionConfidenceBadge`, `ExecutionTimeline`, `NextStepCard`, `ExecutionTooltip`, and `ExecutionExplainabilityPanel` for transparent execution outcomes.

**Technical Implementations:**
- **Environment Variables**: Uses `NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL`, `SALES_ENGINE_API_BASE_URL`, and `NEXT_PUBLIC_ODS_API_URL`.
- **Governance States**: UI-level governance states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) reflect the human approval lifecycle.
- **Campaign Creation API (`/api/campaign-create`)**: This is a control-plane write operation that persists new campaigns in a `draft` status to Supabase.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, disabling all modifications, indicated by a global banner.
- **Execution Explainability**: Replaces ambiguous execution indicators with clear, outcome-oriented states.
- **Run State Reconciliation**: A centralized `resolveCanonicalRunState()` function provides a single source of truth for execution states.
- **Run Staleness & Active Run Resolution**: A `resolveActiveRun.ts` utility handles run selection logic, including staleness thresholds.
- **Live Execution Observability**: Utilizes a `useExecutionPolling` hook for live updates during active execution.
- **UI Hardening for Future Execution Stages**: Uses `CANONICAL_STAGE_CONFIG` for all execution stages, ensuring components are stage-agnostic and handle unknown stages gracefully.
- **ENM Governance Lock**: The Execution Narrative Mapper (ENM) is the sole interpreter of execution state, ensuring all execution-aware UI components consume `ExecutionNarrative` output only.
- **Canonical Execution Narrative Mapper (ENM) Implementation**: Provides truthful, event-driven execution storytelling with canonical mapping rules for states like `IDLE`, `QUEUED`, `RUNNING`, `STALLED`, `COMPLETED`, `FAILED`.

**Marketing Command Center (`/dashboard/marketing/*`):**
- **Purpose**: Multi-screen analytics command center organized around Hormozi's Core 4 Growth Framework, powered by live data from the Supabase `analytics` schema.
- **Data Sources**: `raw_web_events`, `raw_search_console`, `raw_ga4_events`, `raw_google_ads`, `raw_qms_deals`, `metrics_page_engagement_daily`.
- **Architecture**: 12 routed screens with shared marketing sub-navigation sidebar and global filters bar (date range, comparison mode, channel filter).
- **Navigation Structure**:
  - OVERVIEW: Executive Overview (`/dashboard/marketing`), Operator Hub (`/dashboard/marketing/operator`), Core 4 Comparison (`/dashboard/marketing/core4`)
  - CORE 4 ENGINES: Warm Outreach (`/warm-outreach`), Cold Outreach (`/cold-outreach`), Post Free Content (`/content`), Run Paid Ads (`/paid-ads`)
  - DEEP DIVES: SEO Command Center (`/seo`), Google Ads War Room (`/google-ads`)
  - SYSTEM: Data Health (`/data-health`), Experiments (`/experiments`), Forecasting (`/forecasting`)
- **Shared Layout**: `app/dashboard/marketing/layout.tsx` provides `MarketingContext` with period state, comparison mode, channel filter, computed query params, and shared API data (`data/loading/error/refetch`) to all child routes. Single `useMarketingDashboard` call at layout level; sub-screens consume context.
- **Collapsible Sidebar**: `MarketingNav` supports `collapsed`/`onToggleCollapse` props; auto-collapses below 1024px; persists to localStorage (`marketing-nav-collapsed`). Collapsed = 48px, icons only with tooltip titles.
- **Adminto Component Library**: `app/dashboard/marketing/components/adminto/` provides `StatTile`, `EngineCard`, `OpportunityTable`, `InsightsFeed`, `ForecastCalculator`, `ExperimentLog`, `PacingChart`, `DrilldownBreadcrumb`.
- **Core 4 Engine Aggregation**: Backend computes per-engine metrics (Warm=QMS `raw_qms_deals` with date-filtered current/previous comparison, Post Free Content=organic/SEO, Run Paid Ads=Google Ads, Cold Outreach=placeholder).
- **Global Filters**: Channel, campaign, device, geo, landing page filters supported via parameterized SQL.
- **Comparison Modes**: Previous period (default), WoW (week-over-week), MoM (month-over-month).
- **Experiments**: CRUD via localStorage (no DB migration required).
- **Forecasting**: Client-side what-if calculator with editable inputs and computed outputs.
- **Database Connection**: Uses `SUPABASE_DATABASE_URL || DATABASE_URL` with SSL.
- **Chart Library**: Uses Recharts with NSD brand color tokens (`chartColors` = indigo/violet/magenta spectrum), `ResponsiveContainer`, custom tooltips, and `ReferenceLine` for target reference lines.
- **Marketing Targets Config**: `app/dashboard/marketing/lib/marketingTargets.ts` defines monthly targets (sessions=10k, submissions=150, pipeline=$50k, impressions=200k, clicks=5k) with `getTargetForMetric()` helper and `GOOGLE_ADS_TARGETS` for ROAS/budget/CPC/CTR.
- **Engine Colors**: `app/dashboard/marketing/lib/engineColors.ts` defines per-engine NSD accent colors (Warm=magenta[500], Cold=indigo[600], Content=violet[500], Paid=magenta[700]).
- **Executive Overview Enhancements**: KPI sparklines (inline timeseries trend lines), Core 4 EngineCards (clickable, with real data and NSD accent colors), auto-generated performance narrative block, Marketing Performance Score gauge.
- **Engine Sub-Screen Trends**: SEO (clicks+impressions dual chart), Content (sessions), Warm Outreach (submissions), Paid Ads (clicks + budget pacing bar chart) — all with target reference lines.
- **SEO Opportunity Tags**: `MarketingSeoIntelligencePanel` computes inline tags: "Snippet Fix", "Ranking Push", "Content Expansion", "Publish Fast" with NSD brand badge colors.
- **DrilldownBreadcrumbs**: All sub-screens include `DrilldownBreadcrumb` at the top of the page for spatial awareness.
- **Comparison Period Label**: `GlobalFilters` displays "vs previous period" / "vs last week" / "vs last month" next to comparison mode selector.
- **DB Pool Tuning**: `max: 15` connections, `statement_timeout: '10s'` on the marketing overview pool.
- **Responsive Design**: Utilizes breakpoint constants, animation keyframe definitions, `useMediaQuery` hooks, and a responsive `DashboardGrid`.
- **DataTable**: A shared, theme-aware data table component with pagination and column sorting.
- **Dark Mode**: Implemented via `ThemeContext`, persisting preferences to localStorage, and using `data-theme` attribute on `<html>`. All dashboard components use `useThemeColors()` for theme compatibility.
- **SEO Revenue Attribution (Cross-Domain Fix)**: Implements path-based normalization for URLs across all PAGES_SQL CTEs and in the `POST /api/ingest/web-event` endpoint to correctly attribute conversions.
- **GA4 Data API Integration**: Populates `analytics.metrics_page_engagement_daily` and `analytics.raw_ga4_events` via `services/ga4Sync.ts`.
  - **Sync Functions**: `syncPageEngagement()`, `syncGA4Events()`, `syncDeviceCountry()`, `syncChannelSessions()`.
  - **Channel Sync**: `syncChannelSessions()` pulls `sessionDefaultChannelGroup` from GA4, storing as `channel_session_summary` events in `raw_ga4_events` with payload: `{channel, sessions, page_views, conversions, revenue}`.
  - **Triggers**: Manual `POST /api/sync/ga4` and daily Vercel Cron `GET /api/cron/ga4-sync`. Both are write operations.
- **Google Ads BigQuery Integration**: Ingests Google Ads data from BigQuery Data Transfer Service into `analytics.raw_google_ads` via `services/googleAdsSync.ts`.
  - **Sync Functions**: `syncCampaignPerformance()` (from `ads_CampaignBasicStats_<customer_id>` JOIN `ads_Campaign_<customer_id>`), `syncSearchTerms()` (probes multiple table names gracefully).
  - **Env Vars**: `GOOGLE_ADS_BQ_PROJECT_ID`, `GOOGLE_ADS_BQ_DATASET`, `GOOGLE_ADS_BQ_CUSTOMER_ID` (plus shared `GOOGLE_APPLICATION_CREDENTIALS_JSON`).
  - **Triggers**: Manual `POST /api/sync/google-ads` (SYNC_SECRET, last 30 days) and daily Vercel Cron `GET /api/cron/google-ads-sync` (CRON_SECRET, last 3 days, 7 AM UTC).
  - **Event Names**: `campaign_performance`, `search_term_performance` in `raw_google_ads` with `source_system = 'google-ads-bq'`.
- **Query Index Map**: engagement=0, conversion=1, search=2, pages=3, sources=4, freshness=5, prev_eng=6, prev_conv=7, seo_queries=8, anomaly_sessions=9, anomaly_subs=10, anomaly_pipeline(QMS)=11, funnel_fallback=12, prev_funnel_fallback=13, GA4_device=14, GA4_country=15, SC_device=16, SC_country=17, pipeline_categories(QMS)=18, recent_conversions(QMS)=19, seo_movers=20, funnel=21, pipeline_health=22, channel_performance=23, ga4_funnel=24, google_ads_overview=25, google_ads_campaigns=26, warm_outreach_cur(QMS)=27, warm_sessions_cur=28, warm_sessions_prev=29, content_search=30, content_sessions_cur=31, content_sessions_prev=32, content_conv_cur=33, content_conv_prev=34, paid_ads_cur=35, paid_ads_prev=36, paid_sessions_cur=37, paid_sessions_prev=38, warm_outreach_prev(QMS)=39, qms_kpi_cur=40, qms_kpi_prev=41, timeseries=42-46.
- **QMS (Quote Management System) Integration**: Ingests Convex quote lifecycle events into `analytics.raw_qms_deals` via webhook.
  - **Table**: `analytics.raw_qms_deals` — snapshot table (one row per quote, upserted on each lifecycle event).
  - **Ingest Endpoint**: `POST /api/ingest/qms-deal` — receives lifecycle events from Convex, authenticated via `SYNC_SECRET` Bearer token. Auto-creates table on first use.
  - **Analytics Endpoint**: `GET /api/activity-spine/marketing/qms` — returns pipeline summary, aging buckets, close rate, deal velocity, status breakdown, recent deals, attribution, and discount usage.
  - **Key Columns**: `convex_quote_id` (unique), `quote_number`, `quote_activity` (lifecycle stage), `total_price_cents`, `customer_name/email/company`, `sign_text/type`, UTM/attribution fields, `deposit_paid_at`, `quote_paid_at`, `followup_*`, `discount_*`, `production_*`, `shipping_*`.
  - **Lifecycle Stages**: Quote Submitted, Awaiting Response, Quote Approved, Awaiting Deposit, Deposit Paid, Pending Management Review, Admin Review Changes Requested, Mockups In Review, Revisions Requested, Revisions Adjusted, Design Approved, Quote Paid, Not Interested.
  - **Warm Outreach Screen**: `app/dashboard/marketing/warm-outreach/page.tsx` displays live QMS data (pipeline, aging, close rate, velocity, status breakdown, source attribution, discount usage, recent deals table) with graceful fallback to empty state cards when QMS data is unavailable.
  - **Overview Integration**: The marketing overview API (`services/marketingQueries.ts`) now sources 5 key metrics from `raw_qms_deals` instead of proxy web-event tables: (1) Warm Outreach Core 4 engine card (quotes + pipeline, date-filtered for current/previous), (2) KPI Pipeline Value (QMS total over web-event fallback), (3) Pipeline Categories (by `sign_type` instead of `product_category`), (4) Recent Conversions (QMS deals with `quote_number`, `customer_name`, `status`), (5) Pipeline Timeseries (daily `created_at` from QMS). Anomaly detection for pipeline also uses QMS.
  - **Types**: `QMSAnalytics`, `QMSPipelineSummary`, `QMSAgingBuckets`, `QMSCloseRate`, `QMSVelocity`, `QMSStatusBreakdown`, `QMSRecentDeal`, `QMSAttribution`, `QMSDiscountUsage` in `types/activity-spine.ts`.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Utilized for persistence of new `DRAFT` campaigns, campaign editing/duplication, and Marketing Dashboard analytics via its `analytics` schema.
- **Google BigQuery**: Used as a read-only source for Google Ads data (auto-exported from Google Ads). Accessed via `@google-cloud/bigquery` SDK with the shared service account.
- **Convex QMS**: Quote Management System running on Convex. Pushes lifecycle events to `POST /api/ingest/qms-deal` for analytics. Data stored in `analytics.raw_qms_deals`.