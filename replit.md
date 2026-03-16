# M67 Sales Engine UI

## Overview
The M67 Sales Engine UI is a governed, read-only interface for campaign observability and approval within the M60 Campaign Management system. Its primary purpose is to provide situational awareness of campaign lifecycles, readiness, and outcomes by observing the M60 Campaign Management APIs. It supports campaign creation, initializing them in a `DRAFT` governance state. The project is built on a governance-first architecture, emphasizing data truthfulness, explicit handling of `UNKNOWN` states, and transparent, outcome-oriented execution. It also includes a Marketing Command Center for multi-screen analytics, providing live data insights based on Hormozi's Core 4 Growth Framework.

## User Preferences
I prefer detailed explanations.
Do not make changes to the folder `docs/`.
Do not remove governance lock comments.

## System Architecture
The Sales Engine UI is built with Next.js 14 (App Router) and TypeScript, running on Node.js 20 with npm, and integrates NSD Brand Tokens for its design system. The architecture is primarily read-only, with most API interactions acting as proxies to the M60 API, with a specific control-plane write operation for new campaign creation.

**UI/UX Design:**
- **Color Scheme**: Adheres to Neon Signs Depot brand colors (magenta, indigo, violet).
- **Campaign Creation Wizard**: Features a mandatory vertical left-hand navigation stepper and enforces required fields for data integrity.
- **Governance Components**: Includes `ReadOnlyBanner`, `CampaignStateBadge`, `ExecutionReadinessPanel`, `ConfidenceBadge`, `ProvenancePill`, and `LearningSignalsPanel` for clear communication of governance and data quality.
- **Execution Explainability**: Features components like `ExecutionConfidenceBadge`, `ExecutionTimeline`, and `ExecutionExplainabilityPanel` for transparent execution outcomes.
- **Marketing Dashboard UI**: Features 12 routed screens with a shared sub-navigation sidebar, global filters (date range, comparison mode, channel), and a collapsible sidebar (`MarketingNav`). It utilizes the Adminto Component Library for marketing-specific components.
- **Responsive Design**: Achieved using breakpoint constants and `useMediaQuery` hooks.
- **Dark Mode**: Implemented via `ThemeContext` with localStorage persistence.

**Technical Implementations:**
- **Framework & Language**: Next.js 14 (App Router), TypeScript, Node.js 20.
- **API Interactions**: Primarily read-only proxying to M60 API; `/api/campaign-create` is a write operation to persist new campaigns in a `draft` status.
- **Governance States**: UI-level states (`DRAFT`, `PENDING_REVIEW`, `APPROVED_READY`, `BLOCKED`, `EXECUTED_READ_ONLY`, `ARCHIVED`) reflect the campaign approval lifecycle.
- **Read-Only Mode**: Deployments can operate in a strict read-only mode, indicated by a global banner.
- **Execution Explainability**: Canonical Execution Narrative Mapper (ENM) provides truthful, event-driven execution storytelling with defined mapping rules for states like `IDLE`, `QUEUED`, `RUNNING`, `STALLED`, `COMPLETED`, `FAILED`.
- **Live Execution Observability**: `useExecutionPolling` hook for real-time updates and `resolveCanonicalRunState()` for state reconciliation.
- **Marketing Command Center Architecture**: Data from the Supabase `analytics` schema, with a `MarketingContext` providing period state, comparison mode, channel filter, and shared API data to child routes.
- **Marketing Data Sources**: Utilizes `raw_web_events`, `raw_search_console`, `raw_ga4_events`, `raw_google_ads`, `raw_qms_deals`, `metrics_page_engagement_daily`.
- **Analytics Integrations**: Includes GA4 Data API and Google Ads BigQuery for data synchronization, and QMS integration for Convex quote lifecycle events.
- **Database Connection**: Uses `SUPABASE_DATABASE_URL || DATABASE_URL` with SSL.
- **Chart Library**: Recharts with NSD brand color tokens, `ResponsiveContainer`, custom tooltips, and `ReferenceLine`.
- **SEO Revenue Attribution**: Implements path-based normalization for URLs to correctly attribute conversions.
- **Data Export**: Client-side CSV and PDF export on all marketing dashboard pages via `ExportMenu` and `PageExportBar` components, powered by `jspdf` + `jspdf-autotable`.

## External Dependencies
- **M60 Campaign Management APIs**: Primary source for campaign lifecycle, readiness, and outcome data.
- **ODS API**: Used for bootstrap and identity services.
- **Supabase**: Used for persistence of new `DRAFT` campaigns, campaign editing/duplication, and Marketing Dashboard analytics via its `analytics` schema.
- **Google BigQuery**: Read-only source for Google Ads data, accessed via `@google-cloud/bigquery` SDK.
- **Convex QMS**: Quote Management System, pushes lifecycle events to `POST /api/ingest/qms-deal`. Data stored in `analytics.raw_qms_deals`.
- **ODS SEO Cluster Engine**: Provides keyword clustering, opportunity detection, and recommendation management. Consumed via `/api/proxy/seo/*` proxy routes.

## Google Ads Deep Dive & Ahrefs Intelligence
The marketing dashboard now includes deep-dive views for Google Ads granular data and Ahrefs competitive intelligence, all sourced from Supabase `analytics` schema tables.

**Google Ads Deep Dive** (`/dashboard/marketing/google-ads`):
- Key Metrics summary (total spend, clicks, conversions, CPC, CPL, ROAS)
- Campaign Performance Trend chart (daily clicks/impressions/cost/conversions with metric toggle)
- Conversion Actions breakdown (pending `raw_google_ads_campaign_conversions` table migration)
- Keyword Performance sortable table with campaign filter (`raw_google_ads_keyword_daily`)
- Search Terms table aggregated by ad group (`raw_google_ads_search_term_daily` — search term text not yet in pipeline)

**Ahrefs Intelligence** (`/dashboard/marketing/ahrefs`):
- Keyword Gap table with competitor filter, KD badges, CPC, position (`raw_ahrefs_keyword_gap`)
- Backlink Gap table sorted by domain rating (`raw_ahrefs_backlink_gap`)
- Top Pages table showing competitor pages by traffic (`raw_ahrefs_top_pages`)

**API Routes:**
- `app/api/activity-spine/marketing/google-ads-detail/route.ts` — views: `summary`, `daily`, `keywords`, `search-terms`, `conversions`, `campaigns-list`
- `app/api/activity-spine/marketing/ahrefs/route.ts` — views: `keyword-gap`, `backlink-gap`, `top-pages`, `competitors`

**Data Sources (all JSONB payload columns):**
- `analytics.raw_google_ads_campaign_daily` (277 rows, campaign/day grain)
- `analytics.raw_google_ads_keyword_daily` (1,140 rows, keyword/day grain)
- `analytics.raw_google_ads_search_term_daily` (9,730 rows, search term/day grain)
- `analytics.raw_ahrefs_keyword_gap` (290 rows, keyword/competitor)
- `analytics.raw_ahrefs_backlink_gap` (60 rows, domain/competitor)
- `analytics.raw_ahrefs_top_pages` (350 rows, page/competitor)

**Notes:**
- Campaign names display as IDs (no name mapping available yet)
- Conversion action tables (`raw_google_ads_campaign_conversions`, `raw_google_ads_ad_group_conversions`) not yet created in Supabase
- Competitors tracked: vistaprint.com, etsy.com, amazon.com, neonmfg.com

## SEO Intelligence Module
The SEO Intelligence module (`/dashboard/seo`) provides a read-only decision surface for keyword cluster analysis and SEO recommendation approval. Data is sourced directly from the Supabase `analytics` schema via `lib/seo-db.ts`.

**Routes:**
- `/dashboard/seo` — SEO Overview with summary KPIs (clusters, opportunities, pending/approved counts) and top clusters table
- `/dashboard/seo/clusters` — Full clusters table with sortable columns; row click opens ClusterDetailDrawer showing member keywords
- `/dashboard/seo/opportunities` — Cluster opportunities with type badges (Optimize Page, New Page, Expand Content) and links to recommendations
- `/dashboard/seo/recommendations` — Recommendations table with status filter (All/Pending/Approved/Rejected); row click opens RecommendationPanel with Approve/Reject/Feedback actions
- `/dashboard/seo/outcomes` — Learning outcomes tracking position changes, CTR/traffic impact of executed recommendations

**Architecture:**
- **Layout**: `app/dashboard/seo/layout.tsx` with collapsible sub-navigation sidebar (same pattern as MarketingNav)
- **API Client**: `lib/seoApi.ts` — typed client functions for all SEO endpoints
- **Database Layer**: `lib/seo-db.ts` — server-side queries against Supabase `analytics` schema tables (`keyword_clusters`, `keyword_cluster_members`, `seo_recommendations`, `seo_recommendation_approvals`, `seo_learning_outcomes`)
- **API Routes**: `app/api/proxy/seo/{clusters,cluster-opportunities,recommendations,outcomes}/route.ts` — server-side routes querying Supabase directly via `lib/seo-db.ts`
- **Components**: `app/dashboard/seo/components/` — `ClusterDetailDrawer`, `RecommendationPanel`, `RecommendationFeedbackModal`
- **Permissions**: `dashboard:seo:view` (via DashboardGuard), `seo:read`, `seo:approve` (approval buttons gated by bootstrap permissions)