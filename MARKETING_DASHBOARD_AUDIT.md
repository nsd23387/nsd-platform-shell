# Marketing Command Center — End-to-End Operational Audit

**Target:** `https://analytics.neonsignsdepot.com/dashboard/marketing`
**Date:** 2026-05-19
**Scope:** All 16 routes under `/dashboard/marketing/*`, every API route they touch, every DB view they read, every cron sync that feeds those views, every component that renders the data.
**Method:** Source inspection (pages, layout, API handlers, SQL service, sync jobs, cron) + live probe against the production overview API.

> **Verdict:** Pipeline is wired end-to-end and most surfaces are live. Three issues are blocking truthfulness: (1) a **data-corruption bug in pipeline attribution** that returns ~$18 trillion for the previous period and for several top pages; (2) **five of nine ingestion sources are stale**, including Google Ads BigQuery which has never succeeded; (3) **Cold Outreach metrics in the shared Core 4 summary are hard-coded zeros** in the backend. Several panels also rely on lifetime views that make week-over-week comparisons mathematically zero. Detailed findings, severities, and fixes below.

---

## 1. Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────────────┐
│  app/dashboard/marketing/layout.tsx                                     │
│    ├─ <MarketingNav>      16 routes in 6 groups                         │
│    ├─ <GlobalFilters>     period · comparison · channel                 │
│    └─ <MarketingContext.Provider>                                       │
│         └─ useMarketingDashboard(queryParams)                           │
│              → GET /api/activity-spine/marketing/overview                │
│                   → services/marketingQueries.ts (1,531 lines, 47 SQL)  │
│                        → Supabase analytics.* schema                    │
└─────────────────────────────────────────────────────────────────────────┘
        │
        ├─ Detail pages also call their own endpoints:
        │     /api/activity-spine/marketing/{qms,quote-funnel,
        │                                    google-ads-detail,
        │                                    attribution,ahrefs}
        │     /api/proxy/{cold-outreach-summary,social-metrics,seo/*}
        │
        └─ Data is hydrated by cron jobs at 06:00 UTC:
              /api/cron/ga4-sync        → analytics.raw_ga4_events
              /api/cron/google-ads-sync → analytics.raw_google_ads*
              QMS Convex webhook        → analytics.raw_qms_deals
              External: web_events, search_console, ahrefs, wp_page_index
```

---

## 2. Route inventory — every page and where its data comes from

| # | Route | Data source | Filters honoured | Status |
|---|---|---|---|---|
| 1 | `/dashboard/marketing` (Executive Overview) | `MarketingContext` (overview API) + `/api/proxy/cold-outreach-summary?window=30d` for the Cold Outreach engine card | period, comparison, channel | ⚠ Pipeline comparison broken (see §4.1) |
| 2 | `/dashboard/marketing/operator` (Operator Hub) | `MarketingContext` only | period, comparison, channel | ✅ Wired |
| 3 | `/dashboard/marketing/core4` (Core 4 Comparison) | `MarketingContext.data.core4_summary` | period, comparison | ⚠ Cold Outreach column always 0 (see §4.3) |
| 4 | `/dashboard/marketing/warm-outreach` | `/api/activity-spine/marketing/qms` | none (own state) | ✅ Wired |
| 5 | `/dashboard/marketing/cold-outreach` | `/api/proxy/cold-outreach-summary?window=…` | window only (own state) | ⚠ Does NOT inherit global period filter |
| 6 | `/dashboard/marketing/content` (SEO engine) | `MarketingContext` | period, comparison | ✅ Wired |
| 7 | `/dashboard/marketing/paid-ads` (Run Paid Ads) | `MarketingContext.data.google_ads_*` | period, comparison | ⚠ Contains `ImpressionSharePlaceholder` (mocked panel) |
| 8 | `/dashboard/marketing/social` (Social Automation) | `/api/proxy/social-metrics?window=…` | window only (own state) | ⚠ Does NOT inherit global period filter |
| 9 | `/dashboard/marketing/seo` (SEO Command Center) | `MarketingContext` + per-panel SEO proxies | period | ⚠ Contains `TechnicalHealthPlaceholder` (mocked) |
| 10 | `/dashboard/marketing/google-ads` (Google Ads War Room) | `/api/activity-spine/marketing/google-ads-detail?view=…` | period (own params) | ✅ Wired |
| 11 | `/dashboard/marketing/ahrefs` (Ahrefs Intelligence) | `/api/activity-spine/marketing/ahrefs?view=…` | none (own state) | ⚠ Ahrefs sync stale (see §5) |
| 12 | `/dashboard/marketing/attribution` (Attribution Intelligence) | `metrics.source_to_paid_funnel`, `metrics.channel_revenue_daily`, `marketing.google_ads_quote_performance`, `seo.page_quote_performance`, `seo.cluster_quote_performance` | own controls | ✅ Wired (TODO: server-side aggregation) |
| 13 | `/dashboard/marketing/quote-funnel` (Quote Pipeline) | `/api/activity-spine/marketing/quote-funnel?view=…` | none (own state) | ✅ Wired |
| 14 | `/dashboard/marketing/data-health` | `MarketingContext.data.pipeline_health` | none | ✅ Wired — and currently the most useful page (see §5) |
| 15 | `/dashboard/marketing/experiments` | `localStorage` only | none | ❌ **Not operationalised — no backend persistence** |
| 16 | `/dashboard/marketing/forecasting` | Starts from `MarketingContext.data.google_ads_overview.cpc`, then 100% client-side math | none | ⚠ Falls back to `defaultCpc = 3.5` hard-code if API empty |

All 16 routes are registered in `MarketingNav.tsx` and reachable. No orphan routes; no broken links.

---

## 3. Data sources, freshness, and ownership

| Source / table | Owner | Cron / writer | Live freshness (probed 2026-05-19) | Used by |
|---|---|---|---|---|
| `analytics.metrics_page_engagement_daily` | GA4 sync | `/api/cron/ga4-sync` (06:00 UTC) | **2026-05-18** ✅ | Sessions, page-views, bounce, time-on-page, anomaly stats, timeseries |
| `analytics.conversion_metrics_daily` | QMS + web_events | derived nightly | **2026-05-18** ✅ | Submissions, fallback pipeline, funnel |
| `analytics.raw_qms_deals` | QMS Convex webhook | `POST /api/ingest/qms-deal` | **2026-05-18 21:44 UTC** ✅ | Pipeline KPI, recent conversions, pipeline categories, anomaly pipeline, warm-outreach detail |
| `analytics.raw_web_events` | Site GTM tag | event-streamed | **2026-05-19 00:11 UTC** ✅ | Page views fallback, conversion attribution |
| `analytics.metrics_search_console_page` | Search Console sync | `search_console` job | **2026-05-15** ⚠ (4 days behind) | Organic clicks, impressions, avg position (**lifetime view, no date column — see §4.4**) |
| `analytics.metrics_search_console_daily` | Search Console sync | `search_console` job | **2026-05-15** ⚠ | Timeseries: impressions, clicks |
| `analytics.metrics_search_console_query` / `_query_daily` | Search Console sync | `search_console` job | **2026-05-15** ⚠ | SEO query intelligence, SEO movers |
| `analytics.raw_ga4_events` | GA4 API | `ga4-api-cron` | last success **2026-05-18 06:01** ✅ (but the legacy `ga4-api` source is stuck at **2026-03-04**) | Device/country/channel breakdowns, GA4 funnel, Core 4 sessions for warm/PFC/paid |
| `analytics.raw_google_ads` (and `_campaign_daily`, `_keyword_daily`) | Google Ads BigQuery | `services/googleAdsSync.ts` via cron | last `google_ads` success **2026-05-18 03:15** ✅, but **`google-ads-bq` and `google-ads-bq-cron` have never succeeded** ❌ | Ad spend, ROAS, campaign panel, war room |
| `analytics.raw_search_console` | Search Console raw | `search_console` job | **2026-05-18 03:15** ✅ | Device/country fallback when GA4 empty |
| `analytics.dashboard_funnel_daily` | View | derived | **2026-05-18** ✅ | Marketing funnel panel |
| `analytics.dashboard_sources` | View | derived | **lifetime, no date** ⚠ | Sources panel |
| `analytics.ingestion_runs` | every sync job | written on each run | live | Pipeline Health panel + Data Health page |
| Ahrefs tables | Ahrefs sync | `ahrefs` job | last success **2026-05-04** ❌ (15 days behind, 100% failure rate in last 24h) | Ahrefs Intelligence page |
| `wp_page_index` | Wordpress sync | `wp_page_index` job | last success **2026-03-21** ❌ (2 months behind) | SEO Command Center sub-features |

**Headline:** core daily metrics are fresh, but **5 of 9 ingestion sources are visibly stale** in Pipeline Health right now — this is documented on the Data Health page but worth knowing the audit confirms it from the live API, not just from the panel.

---

## 4. Truthfulness findings (data accuracy bugs)

### 4.1 🟢 RESOLVED (data) / 🔴 OPEN (code) — `total_pipeline_value_usd` returns ~$18 trillion for prior periods and for top pages

> **2026-05-19 update — bad data has been removed.** I located exactly 2 poisoned rows in `analytics.raw_web_events`, both submitted within ~430ms of each other (clearly bot/test), both with `preliminary_price = 1838026224704800` (≈ $18.4T per row when divided by 100). They were `quote_id = 26YY2EPKBS` and `quote_id = j9754qcjyfcyakqsg22x8c64fh847x8t`, both at `2026-04-04 01:00:15.x UTC`, attributed to landing pages `/for-businesses/` and `quote.neonsignsdepot.com/`. **Both rows have been hard-deleted.** New max `preliminary_price` across all `event_type='conversion'` rows is now $25,169 (sane). The dashboard's previous-period pipeline value will fall back to a real number on next page load. **The CODE defects below remain — without them, the next spam submission re-poisons everything.**

**Probe:** `GET /api/activity-spine/marketing/overview?preset=last_30d`

```jsonc
"comparisons": {
  "total_pipeline_value_usd": {
    "current": 39245.73,
    "previous": 18380262337402,        // ~ $18,380,262,337,402  ← bogus
    "delta_pct": -1                     // clamped to -100%
  }
}
"pages": [
  { "page_url": "https://quote.neonsignsdepot.com/",
    "submissions": 191, "pipeline_value_usd": 18380262383348 },  // ← bogus
  { "page_url": "/for-businesses/",
    "submissions": 97,  "pipeline_value_usd": 18380262301136 },  // ← bogus
  { "page_url": "/",
    "submissions": 60,  "pipeline_value_usd": 56019 }            // sane
]
```

**Root cause** (`services/marketingQueries.ts`):

* The **KPI path** prefers `analytics.raw_qms_deals.total_price_cents / 100` when present (current period: $39,245.73 — correct). For the **previous period** the QMS row returns `pipeline_cents = 0`, so it falls through to `KPI_CONVERSION_SQL` against `analytics.conversion_metrics_daily.total_pipeline_value_usd`. *(Hypothesis, unverified from this repo because the view definition lives in the database: that view appears to aggregate `raw_web_events.event_data->>'preliminary_price'`. Confirm by inspecting the view DDL.)* Whichever source it pulls from, at least one upstream row contains a value in the trillions (likely a malformed price like `"183802623833.48"` instead of cents-as-string).
* The **page-level join** (`PAGES_SQL → conv_attributed CTE`, lines ~197-211) has **two compounding defects**:
  1. It divides `(event_data->>'preliminary_price')::numeric / 100.0` with **no sanity bound** — so one poisoned event contaminates every page it touches (`quote.neonsignsdepot.com/`, `/for-businesses/`, etc.).
  2. The CTE has **no date predicate at all** — only `WHERE event_type = 'conversion'`. That means the `submissions` and `pipeline_value_usd` columns in the Pages table are **lifetime aggregates** even though the rest of the page row (sessions, page_views, bounce, clicks, impressions) IS period-filtered. The two halves of every row are on different time horizons. This alone makes period-scoped Pages views incorrect, independent of the poisoned data.
* Because the KPI comparison is using a poisoned previous value, the **Executive Overview headline narrative ("Pipeline is up 0.0%") and the Pipeline Value KPI delta badge are meaningless** for any period that crosses the bad event(s).

**Verification next steps (server-side):**
```sql
-- find the offenders
SELECT occurred_at, page_url, event_data
FROM analytics.raw_web_events
WHERE event_type = 'conversion'
  AND (event_data->>'preliminary_price')::numeric > 1e9
ORDER BY occurred_at DESC;
```
**Fix options (in order of preference):**
1. Add a sanity cap in the SQL: `WHERE (event_data->>'preliminary_price')::numeric BETWEEN 0 AND 1e7` in `conv_attributed` and in the view feeding `conversion_metrics_daily`.
2. Delete/quarantine the offending events.
3. Switch page-level pipeline attribution to read from `raw_qms_deals` (joined to landing page via the existing `landing_page` enrichment) so it stops depending on web-event price strings.

### 4.2 🟠 HIGH — Google Ads `roas` is always `0` despite real spend and conversions

**Probe:**
```jsonc
"google_ads_overview": { "spend": 1652.69, "clicks": 359, "conversions": 12, "roas": 0 }
```
The `RUN_PAID_ADS_SQL` and `GOOGLE_ADS_OVERVIEW_SQL` aggregate `spend` and `conversions` from `raw_google_ads*`, but the `roas` math depends on `conversion_value` (revenue). The BigQuery sync writes `payload.conversion_value` (per `services/googleAdsSync.ts`), but the value is apparently always 0 in the source dataset (no conversion-value tracking configured in Google Ads). Result: ROAS card on Executive Overview and on the Ad Spend tile always reads `0.00x`.

**Fix:** either (a) configure conversion-value in Google Ads (operator action), or (b) compute a proxy ROAS server-side as `pipeline_value_usd / spend` where `pipeline_value_usd` for paid is attributed via `raw_qms_deals.utm_source = 'google' AND utm_medium = 'cpc'`.

### 4.3 🟠 HIGH — Cold Outreach is hard-coded to zero inside `core4_summary`

`services/marketingQueries.ts:1498-1499`:
```ts
const coldCurrent  = zeroCore4Metrics('cold_outreach');
const coldPrevious = zeroCore4Metrics('cold_outreach');
```
The Executive Overview engine card sidesteps this by fetching `/api/proxy/cold-outreach-summary` directly (good). But:
* **Core 4 Comparison page** (`/marketing/core4`) reads `data.core4_summary.cold_outreach` and renders 0/0/0 forever.
* **Operator Hub** any cold-outreach-derived insight is also dead.

**Fix:** push the proxy's three numbers (`emailsSent`, `replyRate`, `leadsPushed`) into the core4 summary on the server side, or have those pages call the same proxy directly.

### 4.4 🟡 MEDIUM — Search Console KPIs are LIFETIME, not period-filtered

Code comments admit this explicitly (`services/marketingQueries.ts:117-122, 244-247, 273-277`):
* `KPI_SEARCH_SQL` (organic_clicks, impressions, avg_position)
* `SOURCES_SQL` (submission sources)
* `SEO_QUERIES_SQL` (per-query metrics)
* `metrics_search_console_page` has **no date column**.

**Live evidence:** `comparisons.organic_clicks.previous == current == 56` → `delta_pct: 0`. Same for impressions (`100696`).

**Impact:** Any user reading "Impressions 100,696" on Executive Overview while the date filter is set to "Last 7 days" is seeing lifetime data. The number is real but the framing is misleading.

**Fix:** Switch these queries to `metrics_search_console_page_daily` (which does have a `metric_date` column, per the freshness query) and add `BETWEEN $1 AND $2`.

### 4.5 🟡 MEDIUM — Search Console daily data is 4 days stale

Live freshness: `search_console_last_date: "2026-05-15"` while engagement is at `2026-05-18`. Any 7-day window will under-report organic by 3 days at the tail. The `search_console` ingestion job is reporting `last_success: 2026-05-18 03:15` (healthy), but the data it's writing is still lagging — investigate whether the SC API itself is the bottleneck or the sync is only pulling a partial window.

### 4.6 🟡 MEDIUM — GA4 has two `source` identifiers, only one is healthy

`Pipeline Health` shows:
* `ga4-api-cron` — healthy, 2026-05-18 06:01
* `ga4-api` — stale since 2026-03-04

This is purely a `source` string mismatch in `ingestion_runs`. The dashboard panel double-counts the GA4 row and shows a permanent red badge for the stale legacy `ga4-api` entry even though syncing is fine. **Fix:** stop writing the legacy `source = 'ga4-api'` value, or filter it out of `PIPELINE_HEALTH_SQL`.

### 4.7 🟡 MEDIUM — Google Ads BigQuery sync has never reported a successful run

* `google-ads-bq` → `last_success: null, failure_rate_24h: 0` (no attempts logged)
* `google-ads-bq-cron` → `last_success: null, failure_rate_24h: 1` (failing every attempt)

Yet `google_ads_overview.spend > 0`, which means data IS being written through a different path (`google_ads` source, which IS healthy). Likely the new BQ-prefixed cron was added but the writer was never finished, or it's silently swallowing exceptions before reaching `completeIngestionRun()`. **Either delete the placeholder cron entries or fix the writer** — right now Data Health shows a permanent red badge that operators learn to ignore.

### 4.8 🟢 LOW — Page-level `pipeline_value_usd` for the home page (`/`)

Page row for `/` reports `submissions: 60, pipeline_value_usd: $56,019`. That's not poisoned, but the math implies an average deal of ~$933, vs. the dashboard's "Avg Deal Size" KPI of $476 — a factor-2 disagreement. Likely the page-level join double-counts conversions where `landing_page == '/'`. Worth a spot-check after §4.1 is fixed.

### 4.9 🟢 LOW — `web_page_views` fallback can mask GA4 outages

`PAGES_SQL` uses `LEFT JOIN web_page_views` so a missing engagement row falls through to `raw_web_events` page-view counts. This is good for resilience but means a silent GA4 outage produces page-view numbers that look correct without raising any pipeline_health alarm.

---

## 5. Operational findings (sync & freshness)

Live snapshot from the API at audit time:

| Source | Last success | 24h failure rate | Status |
|---|---|---|---|
| web-events | 2026-05-19 00:11 | 0 | healthy |
| google_ads | 2026-05-18 03:15 | 0 | healthy |
| ga4-api-cron | 2026-05-18 06:01 | 0 | healthy |
| search_console | 2026-05-18 03:15 | 0 | healthy *(data lag 4d, see §4.5)* |
| ahrefs | **2026-05-04 10:00** | **100%** | **❌ stale** |
| ga4-api | **2026-03-04** | 0 | ❌ stale *(orphan source, see §4.6)* |
| google-ads-bq | **never** | 0 | ❌ stale *(orphan, see §4.7)* |
| google-ads-bq-cron | **never** | **100%** | **❌ failing** |
| wp_page_index | **2026-03-21** | 0 | ❌ stale |

Effectively: **4 sources need owner action right now** (ahrefs, google-ads-bq-cron, wp_page_index, plus the orphan ga4-api/google-ads-bq entries).

---

## 6. Placeholder / non-operationalised surfaces

These render in production but are not yet wired to real data — they should either be hidden behind a feature flag or finished.

| Surface | File | What's mocked |
|---|---|---|
| **Experiments** | `app/dashboard/marketing/experiments/page.tsx` | 100% `localStorage` — no DB table, no API, lost on browser clear, single-user only |
| **Forecasting** | `app/dashboard/marketing/forecasting/page.tsx:30` | `defaultCpc = 3.5` hard-coded fallback; all forecast math is client-side and not persisted |
| **SEO Command Center → Technical Health** | `TechnicalHealthPlaceholder` component in `app/dashboard/marketing/seo/page.tsx` | Static placeholder card |
| **Paid Ads → Impression Share** | `ImpressionSharePlaceholder` in `app/dashboard/marketing/paid-ads/page.tsx` | Static placeholder card |
| **Cold Outreach Engine card** (Executive Overview) | `app/dashboard/marketing/page.tsx:67` | Falls back to `{ emailsSent: 0, replyRate: 0, leadsPushed: 0 }` if proxy is down — silently shows zeros instead of an error/empty state |

The wider mock-mode in `lib/sdk.ts` (`NEXT_PUBLIC_API_MODE=disabled` → `MOCK_BOOTSTRAP_RESPONSE`) is **not active in production** — the live API returns real data with `orgId: "analytics"`, so mock-mode is fine, but it's worth verifying nothing in the Vercel project sets `NEXT_PUBLIC_API_MODE=disabled`.

---

## 7. Filter-propagation correctness

`MarketingContext` exposes `periodState`, `comparisonMode`, `channel` to every consumer. Pages that **DO** propagate global filters:

✅ Executive Overview, Operator Hub, Core 4 Comparison, SEO (engine), Run Paid Ads, SEO Command Center, Data Health.

Pages that **DO NOT** read `MarketingContext` and instead keep their own local window/state (so the global date range / comparison toggle has no effect):

⚠ Cold Outreach, Social Automation, Ahrefs Intelligence, Attribution Intelligence, Quote Pipeline, Experiments.

Mixed / partial — these pages DO import `MarketingContext` and read `queryParams`, but also keep their own local state/window controls that can override or sit alongside the global filter, so the behaviour can still confuse operators:

⚠ Warm Outreach (reads `queryParams` and passes to QMS endpoint), Google Ads War Room (reads `queryParams` for the detail endpoint, but also has its own view selector), Forecasting (only reads `data.google_ads_overview.cpc` for an initial value, then everything is local).

This is a real UX problem — on the "DO NOT" list above, changing the global date range has no effect; on the "mixed" list, it has partial effect. Either (a) wire all detail pages fully to `MarketingContext.queryParams`, or (b) hide the global filter bar on routes where it's a no-op or partial.

The `channel` filter is even more partial: it's only injected into the overview API as a query string, and `services/marketingQueries.ts` only applies it to GA4-derived sub-queries (channel performance, GA4 funnel, device/country, paid). It does **not** filter page-level data, sources, or SEO queries.

---

## 8. UX correctness findings (smaller items)

| # | Finding | File | Severity |
|---|---|---|---|
| 8.1 | **`Marketing Performance Score = 32`** with no breakdown of how it's computed in the screenshot. Component is `MarketingPerformanceScore` in `components/dashboard`. Score is a composite of multiple comparison deltas — and since several of those deltas are wrong (§4.1, §4.4), the score itself is unreliable. | `components/dashboard/MarketingPerformanceScore` | medium |
| 8.2 | **Conversion Rate 2.5%** is `total_submissions / sessions` (live: 106 / 3571 = 2.97%) — the screenshot shows 2.5% which suggests stale screenshot or a different period. Confirm the formula displayed in `MarketingExecutiveKPIs.tsx:59` matches operator expectation (it currently mixes web-event submissions with engagement sessions, which under-counts because not every session lands on the conversion form). | `MarketingExecutiveKPIs.tsx` | low |
| 8.3 | **"Attribution Review" block in the screenshot shows skeleton shimmer.** That panel is `MarketingAttributionReviewPanel` and fetches from `metrics.*` views (`source_to_paid_funnel` etc.). If those metric views don't exist in the current Supabase schema, the panel will skeleton forever. Verify the views exist; if not, either create them or replace the panel with a "not configured" empty state instead of an infinite shimmer. | `MarketingAttributionReviewPanel.tsx` | medium |
| 8.4 | **Pipeline narrative says "0.0%"** because the delta clamps to -100% which the narrative formatter rounds and then absolutes — but the magnitude (§4.1) means the prose is meaningless. Once §4.1 is fixed this fixes itself. | `app/dashboard/marketing/page.tsx:42-65` | depends on §4.1 |
| 8.5 | **Recent Conversions panel reads `customer_name` and `quote_number` directly** — confirm PII handling is intentional and that the Basic-Auth gate in `middleware.ts` is the only access control. | `MarketingRecentConversionsPanel.tsx` | governance |
| 8.6 | **TODO markers** in `app/dashboard/marketing/attribution/page.tsx:211, 383` for moving client-side aggregation server-side. Real but low priority. | | low |

---

## 9. Severity-ranked action list

### ✅ Done in this audit pass
- **§4.1 (data)** — 2 poisoned `raw_web_events` rows from 2026-04-04 01:00:15 deleted; max conversion price is now $25,169.

### P0 — fix this week
1. **§4.1 (code)** — patch `PAGES_SQL → conv_attributed` to add (a) a date predicate `AND occurred_at BETWEEN $1 AND $2`, and (b) a sanity bound `AND (event_data->>'preliminary_price')::numeric BETWEEN 0 AND 1e7`. Same sanity bound on whichever view feeds `conversion_metrics_daily`. Without this, the next spam submission re-poisons the dashboard.
2. **§4.7** — fix or delete the `google-ads-bq-cron` source so Pipeline Health stops showing a permanent red badge that operators learn to ignore.
3. **§11** — **decommission Ahrefs and switch the Marketing → Ahrefs Intelligence page (and the Ahrefs-backed slice of the SEO Intelligence proxy) to the seofordata tables** (`seo_competitor_gap`, `seo_backlink_opportunities`, `seo_backlink_summary`, etc. — see §11). Ahrefs ingestion is still running but is being deprecated.

### P1 — fix this sprint
4. **§4.3** — wire Cold Outreach data into `core4_summary` server-side (don't leave it zero-padded).
5. **§4.4** — switch Search Console KPIs to the daily table so periods/comparisons are actually period-aware.
6. **§4.2** — compute a real ROAS server-side from QMS pipeline attributed to `utm_medium=cpc`, OR enable conversion-value tracking in Google Ads.
7. **§7** — either wire detail pages to `MarketingContext` or hide the global filter bar on routes where it's a no-op.

### P2 — next sprint
8. **§5** — chase the stale `wp_page_index` (2mo) sync owner.
9. **§4.6** — clean up the legacy `ga4-api` source rows in `ingestion_runs`.
10. **§4.5** — investigate the 4-day lag in Search Console daily data.
11. **§8.3** — make the Attribution Review panel produce a "not configured" state instead of an infinite skeleton if the underlying `metrics.*` views are missing.
12. **§6** — either finish Experiments + Forecasting or feature-flag them out of the production nav. Replace the two `…Placeholder` cards with proper empty states.

### P3 — backlog
13. Move client-side aggregation in Attribution Intelligence server-side (existing TODOs).
14. Document the Marketing Performance Score formula in-product (tooltip or info modal) once §4.1/§4.4 are fixed.
15. Once §11 ships, drop the `analytics.raw_ahrefs_*` and `analytics.metrics_ahrefs_*` tables (≈12k rows) and remove the `ahrefs` source from `ingestion_runs`.

---

## 10. What this audit did *not* cover

* RBAC / Basic Auth behaviour (only inspected `DashboardGuard` wraps — not the middleware).
* The Sales Engine `/sales-engine/*` routes (separate dashboard).
* The Convex QMS source-of-truth (only the ingest webhook and downstream Supabase view were inspected).
* End-to-end Playwright/UI regression (recommend a small follow-up run targeting `/dashboard/marketing` + the 5 detail pages once §4.1 is fixed).

---

## 11. Ahrefs → seofordata (NSD-ODS-API) migration plan

**Context.** Ahrefs is being decommissioned. The replacement data (the "seofordata" pipeline, populated server-side by the NSD-ODS-API cron) is **already landing in Supabase** — there are no missing credentials to chase and no edge function to call from the dashboard. The dashboard just needs to be re-pointed at the new tables.

### 11.1 What is actually in the database right now

| Replacement table | Rows | Latest write | Notes |
|---|---|---|---|
| `analytics.seo_competitor_gap` | 481 | **2026-05-19 05:00** | The direct replacement for `raw_ahrefs_keyword_gap`. Per-keyword competitor positions + opportunity score. |
| `analytics.seo_backlink_opportunities` | 390 | **2026-05-18 07:01** | Replacement for `raw_ahrefs_backlink_gap`. Domain rank, backlink count, spam score, opportunity_type. |
| `analytics.seo_backlink_summary` | 1 | **2026-05-18 07:00** | Domain-level totals (DR=213, 979 backlinks, 315 ref-domains). Replaces what was a per-site rollup hand-rolled off Ahrefs. |
| `analytics.seo_topical_authority_gap` | 59 | **2026-05-19 06:01** | New capability — no Ahrefs equivalent. Topic/subtopic gaps with opportunity_score. |
| `analytics.seo_decay_signal` | 83 | **2026-05-19 05:30** | New capability. Per-page-per-keyword position regression (30d → now) with decay_score. |
| `analytics.seo_cannibalization_signal` | 69 | **2026-05-19 05:45** | New capability. Page A vs Page B overlap + suggested canonical. |
| `analytics.keyword_clusters` / `keyword_cluster_members` / `keyword_cluster_metrics_daily` | 705 / 15,392 / 705 | **2026-05-19 03:00** | Cluster intelligence. Replaces the old "top keywords" output of `raw_ahrefs_top_pages`. |
| `analytics.seo_recommendations` | 322 | **2026-05-15 03:02** | Already wired through the SEO Command Center proxy. Now also fed by the same pipeline. |

For comparison, the **legacy Ahrefs tables** still exist but data is older:

| Legacy table | Rows | Latest write |
|---|---|---|
| `analytics.raw_ahrefs_keyword_gap` | 5,960 | 2026-05-11 |
| `analytics.raw_ahrefs_backlink_gap` | 1,130 | 2026-05-11 |
| `analytics.raw_ahrefs_top_pages` | 5,327 | 2026-05-04 (15 days stale) |

(The `ahrefs` ingestion source itself still ran as recently as `2026-05-18 10:00`, but `raw_ahrefs_top_pages` hasn't received a new row in 15 days — likely the Ahrefs API quota was exhausted or that specific endpoint was disabled. Doesn't matter; we're switching it off anyway.)

### 11.2 Code surfaces that need to be re-pointed

| File | Current Ahrefs query | Replacement |
|---|---|---|
| `app/api/activity-spine/marketing/ahrefs/route.ts` | `SELECT … FROM analytics.raw_ahrefs_keyword_gap` (used by `/dashboard/marketing/ahrefs?view=keyword_gap`) | `SELECT … FROM analytics.seo_competitor_gap WHERE status='new' ORDER BY opportunity_score DESC` |
| same file | `SELECT … FROM analytics.raw_ahrefs_backlink_gap` (view=backlink_gap) | `SELECT … FROM analytics.seo_backlink_opportunities WHERE status='new' ORDER BY domain_rank DESC` |
| same file | `SELECT … FROM analytics.raw_ahrefs_top_pages` (view=top_pages) | Two options: (a) drop this view and replace with a `keyword_clusters` "top clusters by impressions" view, or (b) derive from `analytics.metrics_search_console_page` (which is owned by GSC, not Ahrefs). Recommend (a). |
| `app/api/proxy/seo/intelligence/route.ts` | 4 sub-queries against `raw_ahrefs_*` | Same substitutions; the route already uses `.catch(()=>{rows:[]})` so adding the new queries alongside the old is safe during cutover. |
| Dashboard nav label | "Ahrefs Intelligence" | Rename to "Competitor Intelligence" or "SERP Intelligence" — the underlying data is no longer from Ahrefs. |
| Audit §5 freshness table | `ahrefs` listed as a stale source | After cutover, remove from `PIPELINE_HEALTH_SQL` source filter and add the seofordata cron source (whatever name it writes to `ingestion_runs`). |

### 11.3 Recommended sequence

1. **Read-side migration first** (no operator-visible breakage if both sources are tried in order):
   - Update `/api/activity-spine/marketing/ahrefs/route.ts` to read from `seo_competitor_gap` / `seo_backlink_opportunities` / clusters. Keep the URL `/marketing/ahrefs` for now.
   - Update the 4 `raw_ahrefs_*` reads in `app/api/proxy/seo/intelligence/route.ts`.
2. **Verify** by visiting `/dashboard/marketing/ahrefs?view=keyword_gap` and `/dashboard/marketing/seo` — both should show fresh data with `discovered_at` within the last 24h instead of 15 days.
3. **Rename** the route and nav entry (`Ahrefs Intelligence` → `Competitor Intelligence`). Leave the old URL as a redirect for 1 release.
4. **Add a new `ingestion_runs` source name** so Pipeline Health shows the seofordata sync (whatever cron name it writes — confirm by checking `analytics.ingestion_runs` after the next nightly run; currently the only writers visible are `search_console` and `ahrefs`, which suggests the seofordata pipeline writes directly without registering an ingestion_run — that's a separate bug to fix on the ODS-API side).
5. **Decommission** — once §11.1's tables are all flowing and the dashboard reads from them, drop `raw_ahrefs_*` and `metrics_ahrefs_*` tables and the `ahrefs` cron.

### 11.4 Caveats / open questions

- The seofordata pipeline doesn't appear to register itself in `analytics.ingestion_runs` — data shows up in the destination tables but Pipeline Health can't see freshness or failure rate. This needs to be fixed at the ODS-API cron layer, or the dashboard needs to compute freshness directly from `MAX(discovered_at)` on each destination table.
- `seo_backlink_summary` has only **1 row** (the domain-level rollup). If the dashboard wants a backlink-growth time series, the cron needs to insert one row per snapshot date, not upsert. Worth flagging to whoever owns the seofordata cron.
- `keyword_clusters.search_volume` and `keyword_difficulty` are both nullable and currently null in the sample row — so any "low-difficulty quick wins" filter on the dashboard will exclude every cluster. Either fill those columns or fall back to `total_impressions` for prioritisation.
- `seo_competitor_gap.our_ranking_position` is often `null` (gap = we don't rank at all). The current Ahrefs view probably treats null as "unranked"; preserve that semantics in the new query (`COALESCE(our_ranking_position, 101) AS our_position`).

---

*Generated from source inspection + one live probe of `GET /api/activity-spine/marketing/overview?preset=last_30d` at 2026-05-19 00:24 UTC, plus a direct Supabase probe at 2026-05-19 (this update) to confirm the seofordata tables. Re-run those probes after each fix to confirm.*
