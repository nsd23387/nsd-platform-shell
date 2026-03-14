# NSD Marketing Command Center — Forensic Audit Report

**Date:** March 13, 2026
**Scope:** Full audit of data accuracy, actionability, gaps, and recommendations across all 12 marketing dashboard screens.
**Data Period:** Last 90 days (Dec 13, 2025 — Mar 13, 2026)

---

## EXECUTIVE SUMMARY

The Marketing Command Center has strong foundational architecture — 12 routed screens, global date filtering, CSV/PDF export, and governance-first design. However, **the dashboard is currently operating at roughly 40% of its potential actionability** due to critical data gaps, disconnected data sources, and metrics that either show zero or distort reality. The biggest issue is not the dashboard code — it is the data feeding it.

**Verdict: The dashboard structure is sound. The data pipeline is the bottleneck.**

---

## SECTION 1: DATA TRUTH ASSESSMENT

### What Is Real and Accurate

| Metric | Source | Status | Confidence |
|--------|--------|--------|------------|
| QMS Pipeline Value | raw_qms_deals | $47,721 active (83 total deals) | HIGH |
| QMS Close Rate | raw_qms_deals | 18.07% overall, 88.2% decision rate | HIGH |
| QMS Deal Velocity | raw_qms_deals | 7.5 days avg to close | HIGH |
| QMS Status Breakdown | raw_qms_deals | 60 Awaiting Response, 15 Won, 2 Lost | HIGH |
| Google Ads Spend | raw_google_ads (BigQuery) | $462.62 over 90 days | HIGH |
| Google Ads Clicks | raw_google_ads | 153 clicks, $3.02 CPC | HIGH |
| Google Ads Campaigns | raw_google_ads | 4 campaigns with per-campaign daily budgets | HIGH |
| GA4 Sessions | raw_ga4_events | 7,212 sessions, 2,811 channel-attributed | MEDIUM |
| GA4 Channel Mix | raw_ga4_events | Direct 74%, Paid 19%, Organic 3% | MEDIUM |
| GA4 Funnel | raw_ga4_events | 42 form_start, 53 form_submit, 3 purchase | MEDIUM |

### What Is Distorted or Misleading

| Metric | Issue | Impact |
|--------|-------|--------|
| **Click-to-Quote Rate: 37.0 organic** | Only 2 organic clicks from Search Console vs 74 quotes = 3700% conversion rate. This is mathematically absurd. | CRITICAL — metric is useless and misleading |
| **Click-to-Quote Rate: 4.6% paid** | 153 paid clicks vs 7 paid quotes. This is now realistic after attribution bridge deployment but was 0% until recently. | MEDIUM — improving but historically zero |
| **Blended CTQ: 53.5%** | 83 quotes / 155 total clicks = inflated because organic clicks (2) are dramatically undercounted | CRITICAL — not a real number |
| **Attribution: 76 "direct" vs 7 "google"** | 91.6% of deals show no attribution. Most "direct" deals are actually organic or paid but arrived before UTM tracking was deployed. | HIGH — historical data permanently unattributed |
| **Revenue Per Click: $8,763.50** | Calculated as total pipeline / organic clicks (2). Meaningless. | CRITICAL — remove or fix |
| **Submissions Per Click: 18** | 36 submissions / 2 organic clicks. Another artifact of the 2-click problem. | CRITICAL |
| **SEO Top Pages: 0** | No data returned for SEO top pages in the overview API | HIGH — SEO engine appears dead |
| **Core 4 Engine Comparison: All dashes** | The comparison table shows "—" for every engine across sessions, clicks, quotes, pipeline | HIGH — the most strategic view is empty |
| **Sessions Timeseries** | Shows "No data available" on multiple pages despite 7,212 sessions existing | MEDIUM — chart rendering issue |

### What Is Missing Entirely

| Gap | Why It Matters |
|-----|----------------|
| **Cost Per Quote (CPQ)** | The single most important paid marketing metric. Cannot be calculated because paid quotes were zero until the UTM bridge was deployed. Now showing 7 paid quotes. |
| **Cost Per Sale (CPS)** | Requires CPQ + close rate by channel. Blocked by same attribution gap. |
| **Quote-to-Sale Rate by Channel** | Only overall close rate exists (18.07%). Cannot break down by Google Ads vs Organic vs Direct. |
| **Click-to-Sale Rate** | The "most important number" per your metrics framework. Requires end-to-end attribution that just started flowing. |
| **ROAS from QMS data** | Google Ads reports $0 ROAS. The ROAS field from BigQuery only counts Google's own conversion tracking, not QMS revenue. True ROAS requires: QMS won revenue from paid deals / Google Ads spend. |
| **Pipeline Per Click** | Requires accurate click-to-quote rate (currently distorted) and avg quote value ($723). |
| **Keyword/Ad Group Performance** | BigQuery sync only pulls campaign-level data. No ad group, keyword, or search term data. |
| **Data Freshness Indicators** | The `data_freshness` field returns `undefined`. No way to know how stale each data source is. |
| **Search Console Daily Data** | `metrics_search_console_page` is a lifetime view with no date column. The daily table exists but isn't being used for the overview. |

---

## SECTION 2: PAGE-BY-PAGE AUDIT

### Executive Overview
- **KPI cards load** but some show skeleton placeholders that never resolve
- **Sessions by Channel** section heading visible but chart area shows loading animation
- **Core 4 engine cards** are missing entirely (empty array returned from API)
- **Pipeline Categories** working: Logo/Image (76 deals, $62.5K) and Text Only (36 deals, $24K)
- **Export** button present and functional

**Actionability: LOW** — You can see total sessions (7,212) and pipeline ($47.7K) but cannot make decisions because Core 4 engine comparison is empty and there are no trend lines.

### Core 4 Comparison
- **All four engines show dashes** for every column (Sessions, Clicks, Quotes, Quote Rate, Pipeline, Spend, CAC/CPA, ROAS)
- This is the most strategic page and it provides zero insight

**Actionability: ZERO** — This page should be the decision-making hub but delivers no data.

### Warm Outreach
- **QMS data loads correctly** — pipeline tiles, status breakdown, close rate all populated
- **Submissions Trend chart** shows "No data available"
- **Recent Deals table** works with real data
- **Source Attribution** shows only "direct" (until new UTM-attributed deals flow in)

**Actionability: MEDIUM** — You can see your quote pipeline health and follow-up needs. Close rate (18%) and velocity (7.5 days) are genuinely useful. But you cannot see the source of your leads.

### SEO (Post Free Content)
- **Page loads** but no Search Console daily trend data populating in charts
- **Organic clicks show 2** — this is critically undercounted

**Actionability: LOW** — The organic performance data is so thin (2 clicks) that no SEO decisions can be made from this dashboard.

### Run Paid Ads
- **Clicks Trend** shows "No data available"
- **Google Ads Campaign table** loads with 4 campaigns
- **Budget Pacing** chart would show data if timeseries clicks existed
- Campaign-level daily budgets are now populated ($75, $25, $35)

**Actionability: LOW-MEDIUM** — You can see campaign-level spend and clicks but cannot see trends, daily pacing, or cost per quote.

### SEO Command Center
- **Search Performance Trend** shows "No data available"
- **Query Opportunities** section exists but chart area is empty
- The alternating violet section background is visible

**Actionability: ZERO** — No data rendered.

### Google Ads War Room
- Campaign table loads but shows aggregate data only
- No ad group, keyword, or search term granularity
- "Future Data" gaps are explicitly labeled

**Actionability: LOW** — Shows the same data as the Run Paid Ads page in a different layout.

### Data Health
- **Pipeline Health tiles** loading (showing skeletons)
- Should show data source freshness, attribution coverage, ingestion status
- Data freshness field returns undefined from the API

**Actionability: LOW** — Cannot determine if data is stale or fresh.

### Experiments / Forecasting / Cold Outreach
- Placeholder/stub pages with minimal or no live data
- Forecasting has a calculator but no historical data to calibrate against

**Actionability: ZERO** — Not yet functional.

---

## SECTION 3: ROOT CAUSE ANALYSIS

### Why Is So Much Data Missing?

**1. Search Console Integration Is Barely Functional**
- Only 2 organic clicks recorded lifetime. For a business running Google Ads and a live website, this suggests the Search Console API integration is either (a) not syncing regularly, (b) syncing only a tiny subset of data, or (c) the API connection has lapsed.
- The `metrics_search_console_page` table has no date column, so even what data exists is undateable.
- The daily table (`metrics_search_console_page_daily`) exists in the schema but the overview queries don't use it.

**2. GA4 Session Data Doesn't Flow Into Charts**
- 7,212 sessions exist in the database but many chart sections show "No data available." This suggests the timeseries queries return data but the chart components fail to render (possibly the Recharts width/height = -1 error seen in console logs).

**3. Channel Attribution Was Broken Until Now**
- 91.6% of quotes showed as "direct" because no UTM parameters were being captured. The GTM attribution bridge was deployed today, so this will improve going forward but historical data remains unattributed.

**4. Core 4 Engine Data Requires Cross-Source Joins**
- The Core 4 Comparison table needs to join GA4 sessions + Search Console clicks + QMS quotes + Google Ads spend per engine. This cross-source aggregation appears to return empty because the data doesn't map cleanly to "engines" — the concept of "Warm Outreach" or "Cold Outreach" as separate channels doesn't exist in GA4's session data.

**5. Google Ads Timeseries Not Rendering**
- The raw_google_ads data has 153 clicks across 90 days, but the clicks timeseries shows "No data available." Possible that the timeseries query isn't extracting daily data correctly from the JSONB payload.

---

## SECTION 4: ACTIONABILITY SCORECARD

| Page | Data Quality | Can You Act On It? | Score |
|------|-------------|-------------------|-------|
| Executive Overview | Partial | See totals only, no trends | 3/10 |
| Core 4 Comparison | None | No | 0/10 |
| Warm Outreach | Good | Yes — follow-up prioritization, close rate monitoring | 7/10 |
| Cold Outreach | None | No | 0/10 |
| SEO | Minimal | No — 2 clicks is not real data | 1/10 |
| Run Paid Ads | Partial | Campaign spend/CPC only | 4/10 |
| SEO Command Center | None | No | 0/10 |
| Google Ads War Room | Partial | Same as Paid Ads, no deeper drill | 3/10 |
| Data Health | Loading | Cannot verify data quality | 2/10 |
| Experiments | Stub | No | 0/10 |
| Forecasting | Stub | No | 0/10 |
| Operator Hub | Not audited | N/A | N/A |

**Overall Dashboard Actionability: 20/120 (17%)**

---

## SECTION 5: RECOMMENDATIONS

### Priority 1 — Fix Data Pipeline (unlocks 60% of dashboard value)

**1A. Fix Search Console Sync**
- Audit the Google Search Console API connection. Verify the property is connected and syncing.
- Switch overview queries to use `metrics_search_console_page_daily` (which has `metric_date`) instead of the lifetime table.
- Target: 500+ organic clicks/month should be visible for a business running Google Ads.

**1B. Fix GA4 Timeseries Rendering**
- The Recharts "width(-1) height(-1)" console error indicates chart containers have zero dimensions. This is likely a CSS/layout issue where ResponsiveContainer renders before its parent has measurable width.
- Fix: Add `minWidth` and `minHeight` to chart containers, or ensure parent elements have explicit dimensions.

**1C. Verify Google Ads BigQuery Sync Frequency**
- Confirm the daily cron job is running (`POST /api/sync/google-ads`).
- Check if daily timeseries data is being stored correctly in the payload (the `date` field in each campaign_performance record).

**1D. Populate Data Freshness Indicators**
- The `data_freshness` field returns undefined. Implement freshness checks that show "Last synced: 2 hours ago" for each data source (GA4, Search Console, Google Ads, QMS).

### Priority 2 — Build the Funnel Metrics (unlocks the strategic value)

**2A. Per-Channel Click-to-Quote Rate**
- Now feasible with UTM attribution flowing. Build: Google Ads CQR = paid quotes / paid clicks; Organic CQR = organic quotes / SC clicks.
- Guard against distortion: if organic clicks < 50, show "Insufficient data" instead of a percentage.

**2B. Cost Per Quote (CPQ)**
- Formula: Google Ads Spend / Paid Quotes (from QMS with utm_source=google)
- Current: $462.62 / 7 = $66.09 per quote (if all 7 paid quotes are real)
- Display on Paid Ads page alongside CPC.

**2C. Cost Per Sale (CPS)**
- Formula: CPQ / per-channel close rate
- Requires at least 1 paid deal to reach "Quote Paid" status.

**2D. Pipeline Per Click**
- Formula: CQR * Avg Quote Value
- Current avg quote: $723. If CQR = 4.6%, Pipeline Per Click = $33.26.

### Priority 3 — Make Core 4 Comparison Work

**3A. Redefine Engine-to-Channel Mapping**
The Core 4 framework (Warm Outreach, Cold Outreach, SEO, Paid Ads) needs explicit mapping to data sources:

| Engine | Sessions Source | Clicks Source | Quotes Source | Spend Source |
|--------|---------------|--------------|---------------|-------------|
| Warm Outreach | GA4 `Direct` + `Referral` | N/A (no click concept) | QMS total pipeline | $0 |
| Cold Outreach | GA4 `Email` | N/A | Not tracked | Email tool cost (manual) |
| SEO | GA4 `Organic Search` | Search Console | QMS where no paid UTMs | $0 or manual SEO cost |
| Run Paid Ads | GA4 `Paid Search` + `Display` | Google Ads | QMS where utm_source=google | Google Ads spend |

Once this mapping is defined, the Core 4 table can be populated with real data.

### Priority 4 — Data Quality Guardrails

**4A. Add Minimum-Data Thresholds**
- If organic clicks < 50, show "Insufficient data" instead of a rate (prevents the 3700% CQR)
- If paid quotes < 5, show the raw count instead of a percentage

**4B. Attribution Coverage Indicator**
- Show "X% of quotes have channel attribution" prominently
- Current: 8.4% (7/83). Target: >80%.

**4C. Data Staleness Alerts**
- If any data source hasn't synced in >24 hours, show a warning banner
- If Search Console data is >7 days old, flag it

### Priority 5 — Remove or Fix Misleading Metrics

- **Remove "Revenue Per Click: $8,763.50"** — this number is meaningless with 2 organic clicks
- **Remove "Submissions Per Click: 18"** — same issue
- **Guard "Organic Click-to-Quote Rate"** — show "N/A" until organic clicks > 50
- **Fix blended CQR** — weight by click volume, not simple division

---

## SECTION 6: WHAT'S WORKING WELL

Despite the data gaps, several things deserve recognition:

1. **QMS pipeline data is excellent** — 83 deals, full lifecycle tracking, close rate, velocity, status breakdown. This is the most actionable data source.
2. **Google Ads campaign data is real** — 4 campaigns, per-campaign daily budgets, actual spend/CPC data from BigQuery.
3. **Architecture is production-ready** — 12 screens, global filters, export, governance, dark mode, responsive design.
4. **Attribution bridge is now deployed** — new quotes will carry UTM data, enabling per-channel metrics.
5. **Export system works** — CSV and PDF export on all key pages.
6. **Date filtering works** — QMS queries are fully parameterized.

---

## BOTTOM LINE

**The dashboard has the right screens and the right metrics defined. The problem is upstream data.** Fix the Search Console sync, resolve the chart rendering issues, and let UTM attribution accumulate for 2-4 weeks. At that point, the funnel metrics (CPQ, CPS, per-channel CQR) can be built with confidence, and the Core 4 Comparison table can become the strategic decision-making tool it was designed to be.

**Quick wins for immediate impact:**
1. Fix chart rendering (Recharts container sizing) — unlocks timeseries visibility across 5+ pages
2. Audit and fix Search Console API sync — unlocks organic performance data
3. Add data quality guardrails — prevents misleading metrics from being displayed
4. Wait 2-4 weeks for UTM attribution to accumulate — then build per-channel funnel metrics

**Estimated impact of completing Priority 1 + 2:** Dashboard actionability goes from 17% to approximately 65%.
