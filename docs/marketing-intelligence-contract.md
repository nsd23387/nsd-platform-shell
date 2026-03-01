# Marketing Intelligence Contract

Canonical specification for the Marketing Intelligence layer in the NSD Unified Platform.

This document defines metric definitions, aggregation rules, score formulas, attribution caveats, and interpretation standards. It serves as the single reference for preventing metric drift and UI/backend divergence.

**Document ID:** MKT-INT-CONTRACT-001
**Scope:** `GET /api/activity-spine/marketing/overview` and `/dashboard/marketing`
**Status:** Active

---

## 1. Executive Overview

The Marketing Dashboard is a read-only analytics surface. It does not create, update, or delete any data. All metrics originate from the Activity Spine service, which queries canonical analytics views in the `analytics` schema of the NSD ODS (Operational Data Store).

### Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| **Backend** (`services/marketingQueries.ts`) | Aggregation, period filtering, weighted averages, null coercion, anomaly detection. All SQL is deterministic and regression-tested. |
| **UI** (`app/dashboard/marketing/`) | Formatting, presentation, toggle state, URL-driven period selection. The UI does not recompute backend metrics. |
| **Composite metrics** (`MarketingPerformanceScore`) | UI-derived but deterministic. Computed from backend-provided KPIs and comparisons using documented formulas. Not persisted. |

The backend is period-safe: all date-filtered queries use `WHERE metric_date BETWEEN $1 AND $2` with parameterized UTC dates. Timeseries and comparison logic are validated against SQL ground truth via unit tests. The UI renders exactly what the backend returns, applying only display formatting (currency, percentage, duration).

---

## 2. Period Logic Contract

### 2.1 URL Parameters

The endpoint accepts three mutually exclusive period modes plus two independent toggles:

| Parameter | Values | Behavior |
|-----------|--------|----------|
| `preset` | `last_7d`, `last_30d`, `last_90d`, `mtd`, `qtd`, `ytd` | Resolved server-side to a `start`/`end` date pair relative to `NOW()` in UTC. |
| `start` + `end` | `YYYY-MM-DD` each | Explicit date range. Both required. Maximum span: 1095 days (3 years). |
| `period` (legacy) | `7d`, `30d`, `90d` | Mapped to preset equivalents: `7d` -> `last_7d`, `30d` -> `last_30d`, `90d` -> `last_90d`. |
| `include_timeseries` | `true` or absent | When `true`, response includes daily timeseries arrays. Does not affect base KPIs. |
| `compare` | `false` or absent | UI-only rendering toggle. The backend always computes previous-period comparisons regardless of this parameter. The toggle controls whether delta badges are displayed in the UI. It is never sent to the backend. |

### 2.2 Precedence Rules

1. If `start` and `end` are both present, they take precedence. `preset` and `period` are ignored.
2. If `preset` is present (without `start`/`end`), it is used.
3. If `period` (legacy) is present, it is mapped to the corresponding preset.
4. If none are provided, the default is `preset=last_30d`.
5. If both `preset` and `start`/`end` are provided, the endpoint returns HTTP 400.
6. The `compare` parameter is never sent to the backend. It is a UI-only rendering flag.

### 2.3 Period Determinism

- All date boundaries are **inclusive** (`BETWEEN $1 AND $2`).
- The previous-period window is computed as the same-duration window immediately preceding the current start date, with no overlap.
- Previous-period `end` = current `start` minus 1 day. Previous-period `start` = previous `end` minus duration.
- No lifetime aggregation leaks into period-filtered metrics.
- The UI does not perform date arithmetic beyond URL parsing and serialization.

---

## 3. KPI Definitions

All KPIs are aggregated server-side. The UI formats and displays them. No metric is recomputed in the browser.

### 3.1 Pipeline Value

- **Source view:** `analytics.conversion_metrics_daily`
- **Aggregation:** `COALESCE(SUM(total_pipeline_value_usd), 0)`
- **Null behavior:** `COALESCE` to 0 in SQL; `nonNegative(toNumber(...))` in service layer.

### 3.2 Submissions

- **Source view:** `analytics.conversion_metrics_daily`
- **Aggregation:** `COALESCE(SUM(total_submissions), 0)`
- **Null behavior:** Same as above.

### 3.3 Sessions

- **Source view:** `analytics.metrics_page_engagement_daily`
- **Aggregation:** `COALESCE(SUM(sessions), 0)`
- **Null behavior:** Same as above.

### 3.4 Page Views

- **Source view:** `analytics.metrics_page_engagement_daily`
- **Aggregation:** `COALESCE(SUM(page_views), 0)`

### 3.5 Bounce Rate

- **Source view:** `analytics.metrics_page_engagement_daily`
- **Aggregation:** Weighted average: `SUM(bounce_rate * sessions) / SUM(sessions)`
- **Guard:** If `SUM(sessions) = 0`, returns 0.
- **Drift protection:** Clamped to `[0, 1]` in the service layer via `clamp(toNumber(...), 0, 1)`.

### 3.6 Average Time on Page

- **Source view:** `analytics.metrics_page_engagement_daily`
- **Aggregation:** Weighted average: `SUM(avg_time_on_page_seconds * sessions) / SUM(sessions)`
- **Guard:** If `SUM(sessions) = 0`, returns 0.
- **Drift protection:** `nonNegative(toNumber(...))`.

### 3.7 Organic Clicks

- **Source view:** `analytics.metrics_search_console_page_daily`
- **Aggregation:** `COALESCE(SUM(clicks), 0)`
- **Period filtering:** `WHERE metric_date BETWEEN $1 AND $2`

### 3.8 Impressions

- **Source view:** `analytics.metrics_search_console_page_daily`
- **Aggregation:** `COALESCE(SUM(impressions), 0)`
- **Period filtering:** `WHERE metric_date BETWEEN $1 AND $2`

### 3.9 CTR (Click-Through Rate)

- **Derivation:** `clicks / impressions`
- **Guard:** If `impressions = 0`, returns 0.
- **Calculated in:** SQL via `CASE WHEN` guard and in UI via `safeDivide`.

### 3.10 Average Position

- **Aggregation:** Weighted average: `SUM(avg_position * impressions) / SUM(impressions)`
- **Guard:** If `impressions = 0`, returns 0.
- **Drift protection:** `nonNegative(toNumber(...))`.

### 3.11 Efficiency Metrics

These are derived from the KPIs above. Computed server-side via `safeDivide` with precision 4.

| Metric | Formula | Zero guard |
|--------|---------|-----------|
| `revenue_per_session` | `pipeline_value_usd / sessions` | `sessions = 0` -> 0 |
| `revenue_per_click` | `pipeline_value_usd / organic_clicks` | `clicks = 0` -> 0 |
| `submissions_per_session` | `total_submissions / sessions` | `sessions = 0` -> 0 |
| `submissions_per_click` | `total_submissions / organic_clicks` | `clicks = 0` -> 0 |

---

## 4. Delta (Comparison) Contract

### 4.1 Delta Calculation

The backend unconditionally computes a previous-period value for each of the following KPIs on every request:

`sessions`, `page_views`, `total_submissions`, `total_pipeline_value_usd`, `organic_clicks`, `impressions`

The `comparisons` block is always present in the response. There is no server-side flag to suppress it.

For each KPI:

```
delta_pct = safeDivide(current - previous, previous)
```

- If `previous = 0`, `delta_pct = 0`.
- If `previous` is null, it is treated as 0 via `toNumber`.
- Result is rounded to 4 decimal places.

### 4.2 UI Delta Rendering

The UI renders delta badges only when the Compare toggle is enabled (`compare` URL parameter is not `false`). The toggle is purely a rendering concern. The backend always returns comparison data regardless of the toggle state. Delta values are passed through `safeNumber` before display. If `delta_pct` is null or NaN, the badge renders `0.0%`.

---

## 5. Marketing Performance Score

### 5.1 Purpose

A composite executive health indicator on a 0--100 scale. Computed entirely in the UI from backend-provided KPIs and comparisons. Not persisted. Not sent to any API.

### 5.2 Components

| Component | Base Weight | Source | Normalization |
|-----------|------------|--------|--------------|
| Revenue Growth | 0.4 | `comparisons.total_pipeline_value_usd.delta_pct` | `normalizeDelta` |
| Traffic Growth | 0.3 | `comparisons.sessions.delta_pct` | `normalizeDelta` |
| Conversion Efficiency | 0.2 | `total_submissions / sessions` | `normalizeRate` |
| SEO CTR | 0.1 | `organic_clicks / impressions` | `normalizeRate` |

### 5.3 Availability Rules

A component is included in the score only when sufficient data exists to produce a meaningful signal. Inclusion is based on data availability, not merely on non-zero values.

- **Revenue Growth:** Included if `total_pipeline_value_usd > 0` OR the comparison object provides a non-null `delta_pct` value (indicating the backend observed pipeline data in at least one period).
- **Traffic Growth:** Included if `sessions > 0` OR the comparison object provides a non-null `delta_pct` value (indicating the backend observed session data in at least one period).
- **Conversion Efficiency:** Included if `sessions > 0` (a conversion rate requires a non-zero denominator).
- **SEO CTR:** Included if `impressions > 0` (CTR requires a non-zero denominator).

### 5.4 Weight Renormalization

When one or more components are excluded:

```
totalWeight = sum of baseWeights of active components
effectiveWeight(component) = component.baseWeight / totalWeight
score = sum(effectiveWeight * normalizedValue) for each active component
```

This ensures the score always uses the full 0--100 range regardless of which components are available.

### 5.5 Normalization Functions

**`normalizeDelta(delta)`**

```
Input:  delta as decimal (e.g., 0.2 = +20%)
Output: 0–100

if delta is null/undefined/NaN → return 50 (neutral)
if delta <= -1             → return 0
if delta >= +1             → return 100
else                       → return 50 + (delta * 50)
```

**`normalizeRate(rate)`**

```
Input:  rate as decimal (e.g., 0.05 = 5%)
Output: 0–100

clamp rate to [0, 1]
return rate * 100
```

### 5.6 Neutral Case

If no components are available (all data is zero/absent), the score defaults to **50**.

### 5.7 Score Color Bands

| Range | Color | Interpretation |
|-------|-------|---------------|
| 80--100 | Green | Strong performance |
| 60--79 | Violet | Healthy |
| 40--59 | Amber | Moderate / needs attention |
| 0--39 | Red | Underperforming |

---

## 6. SEO Revenue Intelligence Contract

### 6.1 Attribution Basis

Revenue attribution is performed at the page level for the selected period. For each page, `clicks`, `submissions`, and `pipeline_value_usd` are joined from the existing `pages` response block.

This does **not** represent pure organic revenue attribution. Revenue may include conversions from mixed traffic sources (organic, paid, direct) that landed on the same page. The UI displays an explicit caveat:

> Revenue attribution reflects page-level pipeline for the selected period and may include mixed traffic sources.

### 6.2 Calculations

| Metric | Formula | Zero guard |
|--------|---------|-----------|
| `revenue_per_click` | `pipeline_value_usd / clicks` | `clicks = 0` -> 0 |
| `submission_rate` | `submissions / clicks` | `clicks = 0` -> 0 |

### 6.3 Volatility Threshold

```
VOLATILITY_THRESHOLD = 5
```

When `clicks < 5`:
- `revenue_per_click` displays as "---" (em-dash) in the UI.
- `submission_rate` displays as "---" (em-dash) in the UI.
- The underlying numeric values are preserved for sorting.
- Sorting remains by `pipeline_value_usd DESC`.

This prevents distortion from small sample sizes where a single conversion on 1 click would show a 100% submission rate.

### 6.4 Display

The panel shows the top 10 pages by `pipeline_value_usd` descending. If the top page has `pipeline_value_usd > 0`, a highlight card is rendered showing the page path and dollar value.

---

## 7. Timeseries Contract

Timeseries data is returned only when `include_timeseries=true` is passed.

### 7.1 Structure

Three daily series are returned:

| Series | Source view | Value column |
|--------|-----------|-------------|
| `sessions` | `metrics_page_engagement_daily` | `SUM(sessions)` |
| `submissions` | `conversion_metrics_daily` | `SUM(total_submissions)` |
| `pipeline_value_usd` | `conversion_metrics_daily` | `SUM(total_pipeline_value_usd)` |

### 7.2 Gap Filling

SQL uses `generate_series($1::date, $2::date, '1 day'::interval)` to produce a complete date range. A `LEFT JOIN` against the aggregated daily values ensures every day in the range has an entry. Missing days are filled with 0 via `COALESCE`.

### 7.3 Invariants

- One row per calendar day within the selected range.
- No duplicate dates.
- Sorted ascending by date.
- All values are non-negative (coerced via `nonNegative(toNumber(...))`).
- The timeseries toggle does not affect base KPI values or comparison logic.

---

## 8. Anomaly Detection

### 8.1 Ownership

Anomaly detection is backend-owned. The UI renders the `anomalies` object from the response without any recalculation.

### 8.2 Method

For each of `sessions`, `submissions`, and `pipeline_value_usd`:

1. Compute daily values over the current period.
2. Calculate `mean` and `stddev` (population) from daily values.
3. Identify the latest day's value.
4. Flag as spike if all conditions are met:
   - `n >= 7` (at least 7 data points)
   - `stddev > 0` (not flat data)
   - `latest_value > mean + 2 * stddev`

### 8.3 Interpretation

A spike indicates a statistical deviation, not a guaranteed issue. It is a signal for investigation, not a diagnostic conclusion. If fewer than 7 days of data are available, all anomaly flags are `false`.

---

## 9. Known Limitations

The following limitations are structural and documented for transparency:

1. **Lifetime views without date filtering.** `metrics_search_console_query`, `dashboard_pages`, and `dashboard_sources` have no date column. Metrics sourced exclusively from these views (SEO query-level data, page-level submissions/pipeline, source breakdowns) are lifetime aggregates, not period-filtered. Note: KPI-level organic clicks and impressions are sourced from `metrics_search_console_page_daily`, which is period-filtered.

2. **Page-level attribution is not organic-only.** Revenue attributed to a page includes all traffic sources that converted on that page, not only organic visitors.

3. **Query-level revenue attribution is not implemented.** The SEO Query Intelligence table shows query metrics from search console and page-level pipeline from a LEFT JOIN, but there is no direct query-to-conversion mapping.

4. **Ads ingestion is not integrated.** Paid media spend and ROAS are not part of the current data model.

5. **Performance Score is heuristic.** It is a composite index for executive overview purposes. It is not a predictive model, and its weights are fixed (with dynamic renormalization for missing components).

---

## 10. Governance Guarantees

| Guarantee | Implementation |
|-----------|---------------|
| No lifetime leakage in period-filtered views | SQL uses `BETWEEN $1 AND $2`; views without date columns are documented in SQL as lifetime. |
| Deterministic aggregation | All SQL is parameterized. No `NOW()` in period-filtered queries (dates resolved in route handler). Weighted averages use `CASE WHEN` guards. |
| Regression-tested | 102 unit tests cover period parsing, KPI aggregation, empty states, NaN/Infinity guards, anomaly math, comparison alignment, and GET-only enforcement. |
| UI does not mutate data | No POST/PUT/PATCH/DELETE methods exist. The endpoint exports only `GET`. The dashboard is read-only. |
| All numeric outputs are coerced | Backend: `toNumber`, `safeDivide`, `clamp`, `nonNegative`. UI: `safeNumber`, `safeDivideUI`. No NaN, undefined, or Infinity in the response or DOM. |

---

## 11. Future Expansion Notes

The following capabilities are anticipated but not yet implemented:

- **Query-level revenue modeling.** Mapping individual search queries to downstream conversions, enabling per-query ROAS calculation.
- **Multi-touch attribution.** Replacing page-level last-touch attribution with a multi-touch model that distributes credit across the user journey.
- **Google Ads ingestion.** Importing ad spend, cost-per-click, and ROAS from Google Ads into the analytics schema for blended organic/paid reporting.
- **Forecasting layer.** Time-series forecasting based on historical trends to project future sessions, submissions, and pipeline value.
- **Weekly/monthly rollup granularity.** The `granularity` field in the period block is reserved for future use. Currently fixed to `"day"`.

---

## 12. Data Freshness Expectations

### 12.1 Update Cadence by Source

| Source View | Expected Refresh Frequency | Typical Lag |
|---|---|---|
| `analytics.metrics_page_engagement_daily` | Daily | Less than 24 hours. Page engagement data from the previous calendar day is typically available by the following morning (UTC). |
| `analytics.conversion_metrics_daily` | Daily | Less than 24 hours. Conversion events are ingested on a daily cadence. Near-real-time for submissions that flow through the platform's own form infrastructure. |
| `analytics.metrics_search_console_page_daily` | Daily | 24--48 hours. Google Search Console data is subject to Google's processing pipeline, which typically finalizes data 24--48 hours after the reporting date. Preliminary data may appear earlier but is subject to revision. |
| `analytics.dashboard_pages` | Materialized / periodic | Refresh cadence depends on the ODS materialization schedule. Not guaranteed to reflect same-day activity. |
| `analytics.dashboard_sources` | Materialized / periodic | Same as `dashboard_pages`. |

### 12.2 Freshness Metadata

The endpoint response includes a `meta.data_freshness` block with the latest available date per source:

```
{
  "engagement_last_date": "2026-02-28",
  "search_console_last_date": "2026-02-27",
  "conversion_last_date": "2026-02-28"
}
```

A null value indicates that the corresponding view contains no data.

### 12.3 Design Intent

The Marketing Dashboard is designed for **daily and strategic decision-making**. It is not designed for sub-minute operational monitoring. Users should expect that search console metrics reflect activity from 1--2 days prior, and that conversion metrics reflect the previous complete calendar day. Period selections ending on the current date may show incomplete data for the in-progress day.

---

*This document is maintained alongside the codebase. Changes to metric definitions, score formulas, or aggregation logic must be reflected here.*
