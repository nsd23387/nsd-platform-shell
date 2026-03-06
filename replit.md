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
- **Data Export**: Client-side CSV and PDF export on all marketing dashboard pages via `ExportMenu` and `PageExportBar` components, powered by `jspdf` + `jspdf-autotable`. Each page builds exportable sections (KPIs, tables) from its current data. PDF uses NSD magenta brand headers.

**Marketing Command Center (`/dashboard/marketing/*`):**
- **Purpose**: Multi-screen analytics command center organized around Hormozi's Core 4 Growth Framework, powered by live data from the Supabase `analytics` schema.
- **Data Sources**: `raw_web_events`, `raw_search_console`, `raw_ga4_events`, `raw_google_ads`, `raw_qms_deals`, `metrics_page_engagement_daily`.
- **Architecture**: 12 routed screens with shared marketing sub-navigation sidebar and global filters bar (date range, comparison mode, channel filter).
- **Navigation Structure**:
  - OVERVIEW: Executive Overview (`/dashboard/marketing`), Operator Hub (`/dashboard/marketing/operator`), Core 4 Comparison (`/dashboard/marketing/core4`)
  - CORE 4 ENGINES: Warm Outreach (`/warm-outreach`), Cold Outreach (`/cold-outreach`), SEO (`/content`), Run Paid Ads (`/paid-ads`)
  - DEEP DIVES: SEO Command Center (`/seo`), Google Ads War Room (`/google-ads`)
  - SYSTEM: Data Health (`/data-health`), Experiments (`/experiments`), Forecasting (`/forecasting`)
- **Shared Layout**: `app/dashboard/marketing/layout.tsx` provides `MarketingContext` with period state, comparison mode, channel filter, computed query params, and shared API data (`data/loading/error/refetch`) to all child routes. Single `useMarketingDashboard` call at layout level; sub-screens consume context.
- **Collapsible Sidebar**: `MarketingNav` supports `collapsed`/`onToggleCollapse` props; auto-collapses below 1024px; persists to localStorage (`marketing-nav-collapsed`). Collapsed = 48px, icons only with tooltip titles.
- **Adminto Component Library**: `app/dashboard/marketing/components/adminto/` provides `StatTile`, `EngineCard`, `OpportunityTable`, `InsightsFeed`, `ForecastCalculator`, `ExperimentLog`, `PacingChart`, `DrilldownBreadcrumb`.
- **Core 4 Engine Aggregation**: Backend computes per-engine metrics (Warm=QMS `raw_qms_deals` with date-filtered current/previous comparison, SEO=organic/Search Console, Run Paid Ads=Google Ads, Cold Outreach=placeholder).
- **Global Filters**: Channel, campaign, device, geo, landing page filters supported via parameterized SQL.
- **Comparison Modes**: Previous period (default), WoW (week-over-week), MoM (month-over-month).
- **Experiments**: CRUD via localStorage (no DB migration required).
- **Forecasting**: Client-side what-if calculator with editable inputs and computed outputs.
- **Export**: Every page has a `PageExportBar` component with CSV and PDF download buttons. Export data is constructed per-page via `useMemo` from the page's current data context.

**Google Ads BigQuery Integration:**
- **Source**: Google Ads auto-export to BigQuery. Tables: `ads_CampaignBasicStats_6999519966`, `ads_Campaign_6999519966` in the `nsd-analytics-engine` GCP project, `google_ads_raw` dataset.
- **SDK**: `@google-cloud/bigquery` with service account credentials in `GOOGLE_APPLICATION_CREDENTIALS_JSON` env var.
- **Sync Service**: `services/googleAdsSync.ts` — syncs campaign performance and search term performance into `analytics.raw_google_ads`.
- **Triggers**: Manual `POST /api/sync/google-ads` (SYNC_SECRET, last 30 days) and daily Vercel Cron `GET /api/cron/google-ads-sync` (CRON_SECRET, last 3 days, 7 AM UTC).
- **Event Names**: `campaign_performance`, `search_term_performance` in `raw_google_ads` with `source_system = 'google-ads-bq'`.
- **Query Index Map**: engagement=0, conversion=1, search=2, pages=3, sources=4, freshness=5, prev_eng=6, prev_conv=7, seo_queries=8, anomaly_sessions=9, anomaly_subs=10, anomaly_pipeline(QMS)=11, funnel_fallback=12, prev_funnel_fallback=13, GA4_device=14, GA4_country=15, SC_device=16, SC_country=17, pipeline_categories(QMS)=18, recent_conversions(QMS)=19, seo_movers=20, funnel=21, pipeline_health=22, channel_performance=23, ga4_funnel=24, google_ads_overview=25, google_ads_campaigns=26, warm_outreach_cur(QMS)=27, warm_sessions_cur=28, warm_sessions_prev=29, content_search=30, content_sessions_cur=31, content_sessions_prev=32, content_conv_cur=33, content_conv_prev=34, paid_ads_cur=35, paid_ads_prev=36, paid_sessions_cur=37, paid_sessions_prev=38, warm_outreach_prev(QMS)=39, qms_kpi_cur=40, qms_kpi_prev=41, timeseries=42-46.
- **QMS (Quote Management System) Integration**: Ingests Convex quote lifecycle events into `analytics.raw_qms_deals` via webhook.
  - **Table**: `analytics.raw_qms_deals` — snapshot table (one row per quote, upserted on each lifecycle event).
  - **Ingest Endpoint**: `POST /api/ingest/qms-deal` — receives lifecycle events from Convex, authenticated via `SYNC_SECRET` Bearer token. Auto-creates table on first use.
  - **Analytics Endpoint**: `GET /api/activity-spine/marketing/qms` — returns pipeline summary, aging buckets, close rate (won/total), deal velocity, status breakdown, recent deals, attribution, discount usage, click-to-quote rate (organic/paid/blended), and 90-day timeseries (pipeline, quotes, won_revenue).
  - **Key Columns**: `convex_quote_id` (unique), `quote_number`, `quote_activity` (lifecycle stage), `total_price_cents`, `customer_name/email/company`, `sign_text/type`, UTM/attribution fields, `deposit_paid_at`, `quote_paid_at`, `followup_*`, `discount_*`, `production_*`, `shipping_*`.
  - **Lifecycle Stages**: Quote Submitted, Awaiting Response, Quote Approved, Awaiting Deposit, Deposit Paid, Pending Management Review, Admin Review Changes Requested, Mockups In Review, Revisions Requested, Revisions Adjusted, Design Approved, Quote Paid, Not Interested.
  - **Warm Outreach Screen**: `app/dashboard/marketing/warm-outreach/page.tsx` displays live QMS data (pipeline, aging, close rate, velocity, status breakdown, source attribution, discount usage, recent deals table) with graceful fallback to empty state cards when QMS data is unavailable.
  - **Overview Integration**: The marketing overview API (`services/marketingQueries.ts`) now sources 5 key metrics from `raw_qms_deals` instead of proxy web-event tables: (1) Warm Outreach Core 4 engine card (quotes + pipeline, date-filtered for current/previous), (2) KPI Pipeline Value (QMS total over web-event fallback), (3) Pipeline Categories (by `sign_type` instead of `product_category`), (4) Recent Conversions (QMS deals with `quote_number`, `customer_name`, `status`), (5) Pipeline Timeseries (daily `created_at` from QMS). Anomaly detection for pipeline also uses QMS.
  - **Click-to-Quote Rate**: Computes organic (Search Console clicks / organic quotes), paid (Google Ads clicks / paid quotes), and blended rates over 90 days. Organic clicks are lifetime totals from `metrics_search_console_page` (no date column). Paid quote attribution requires `utm_source=google` + `utm_medium=cpc` on QMS deals.
  - **Close Rate Formula**: `won/total` (all quotes) as primary rate; `won/(won+lost)` as secondary "decision rate" for decided quotes only.
  - **Types**: `QMSAnalytics`, `QMSPipelineSummary`, `QMSAgingBuckets`, `QMSCloseRate`, `QMSClickToQuote`, `QMSTimeseries`, `QMSTimeseriesPoint`, `QMSVelocity`, `QMSStatusBreakdown`, `QMSRecentDeal`, `QMSAttribution`, `QMSDiscountUsage` in `types/activity-spine.ts`.

**Export System:**
- **Utilities**: `lib/exportUtils.ts` provides `exportCSV()` and `exportPDF()` functions.
- **Components**: `ExportMenu` (dropdown with CSV/PDF options), `PageExportBar` (page-level export bar), `DashboardSection` (accepts optional `exportConfig` prop for section-level export).
- **Dependencies**: `jspdf`, `jspdf-autotable` for client-side PDF generation. CSV is pure JS.
- **Pattern**: Each marketing page builds `exportSections: ExportSection[]` via `useMemo`, covering all data visible on the page (KPI summaries, data tables). The `PageExportBar` is rendered in the page header.
- **PDF Formatting**: Landscape A4, NSD magenta headers, striped table rows with pink alternating rows, page footers with title and page numbers.
- **Pages with Export**: Executive Overview, Operator Hub, Core 4 Comparison, Warm Outreach, SEO (Content), Run Paid Ads, SEO Command Center, Google Ads War Room, Data Health.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Used for persistence of new `DRAFT` campaigns, campaign editing/duplication, and Marketing Dashboard analytics via its `analytics` schema.
- **Google BigQuery**: Read-only source for Google Ads data, accessed via `@google-cloud/bigquery` SDK.
- **Convex QMS**: Quote Management System, pushes lifecycle events to `POST /api/ingest/qms-deal`. Data stored in `analytics.raw_qms_deals`.
