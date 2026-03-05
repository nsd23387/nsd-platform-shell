/**
 * Marketing Analytics Query Service
 *
 * All SQL for /marketing/overview lives here.
 * Queries canonical analytics views only — no raw tables (except for device/country from raw_search_console).
 * All date filtering uses BETWEEN $1 AND $2 (UTC dates).
 */

import type { Pool } from 'pg';
import { toNumber, safeDivide, clamp, nonNegative } from '../lib/aggregation';
import type {
  MarketingKPIs,
  MarketingKPIComparison,
  MarketingKPIComparisons,
  MarketingPage,
  MarketingSource,
  MarketingSEOQuery,
  MarketingTimeseriesPoint,
  MarketingTimeseries,
  MarketingAnomalies,
  MarketingDataFreshness,
  MarketingDeviceBreakdown,
  MarketingCountryBreakdown,
  MarketingPipelineCategory,
  MarketingConversionEvent,
  MarketingSEOQueryMover,
  MarketingFunnelStep,
  MarketingPipelineHealth,
  MarketingChannelPerformance,
  MarketingGA4Funnel,
  MarketingGoogleAdsOverview,
  MarketingGoogleAdsCampaign,
  Core4EngineMetrics,
  Core4EngineComparison,
  Core4Summary,
  Core4Engine,
} from '../types/activity-spine';

// ============================================
// Phase E — Source taxonomy
// ============================================

const SOURCE_TAXONOMY: Record<string, string> = {
  google: 'organic',
  bing: 'organic',
  duckduckgo: 'organic',
  yahoo: 'organic',
  facebook: 'paid',
  instagram: 'paid',
  linkedin: 'paid',
  twitter: 'paid',
  tiktok: 'paid',
  direct: 'direct',
  email: 'email',
  newsletter: 'email',
  referral: 'referral',
  'quote.neonsignsdepot.com': 'Quote Form',
  'neonsignsdepot.com': 'Website',
  'www.neonsignsdepot.com': 'Website',
};

export function canonicalSource(raw: string | null | undefined): string {
  if (raw == null) return 'other';
  let normalized = raw.toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/\/.*$/, '');
  normalized = normalized.replace(/^www\./, '');
  return SOURCE_TAXONOMY[normalized] ?? 'other';
}

// ============================================
// SQL — KPI engagement
// ============================================

const KPI_ENGAGEMENT_SQL = `
  SELECT
    COALESCE(SUM(sessions), 0)    AS sessions,
    COALESCE(SUM(page_views), 0)  AS page_views,
    CASE WHEN SUM(sessions) > 0
      THEN SUM(bounce_rate * sessions) / SUM(sessions)
      ELSE 0 END                  AS bounce_rate,
    CASE WHEN SUM(sessions) > 0
      THEN SUM(avg_time_on_page_seconds * sessions) / SUM(sessions)
      ELSE 0 END                  AS avg_time_on_page_seconds
  FROM analytics.metrics_page_engagement_daily
  WHERE metric_date BETWEEN $1 AND $2
`;

// T001: Fallback for page views when engagement table is empty
const KPI_FUNNEL_FALLBACK_SQL = `
  SELECT
    COALESCE(SUM(page_views), 0)  AS page_views,
    COALESCE(SUM(submissions), 0) AS submissions
  FROM analytics.dashboard_funnel_daily
  WHERE event_date BETWEEN $1 AND $2
`;

const KPI_CONVERSION_SQL = `
  SELECT
    COALESCE(SUM(total_submissions), 0)        AS total_submissions,
    COALESCE(SUM(total_pipeline_value_usd), 0) AS total_pipeline_value_usd
  FROM analytics.conversion_metrics_daily
  WHERE metric_date BETWEEN $1 AND $2
`;

/**
 * LIFETIME VIEW — metrics_search_console_page has no date column.
 * This query returns lifetime totals, not period-filtered values.
 * Comparisons for organic_clicks/impressions will show delta_pct=0
 * because both current and previous periods see identical data.
 */
const KPI_SEARCH_SQL = `
  SELECT
    COALESCE(SUM(clicks), 0)      AS organic_clicks,
    COALESCE(SUM(impressions), 0) AS impressions,
    CASE WHEN SUM(impressions) > 0
      THEN SUM(avg_position * impressions) / SUM(impressions)
      ELSE 0 END                  AS avg_position
  FROM analytics.metrics_search_console_page
`;

// ============================================
// SQL — Page-level join
// ============================================

/**
 * PAGES_SQL — Path-Based Attribution
 *
 * All CTEs normalize to a canonical PATH (domain stripped, query params
 * stripped, trailing slash enforced). This ensures:
 *
 * 1. Search Console data (neonsignsdepot.com) joins correctly with
 *    conversion events fired on quote.neonsignsdepot.com.
 * 2. Conversions are attributed to the originating SEO landing page
 *    via COALESCE(event_data->>'landing_page', path-from-page_url).
 *    When the ingestion endpoint populates landing_page (as a path),
 *    revenue credits the originating page, not the quote subdomain.
 * 3. The conv_attributed CTE replaces the old dashboard_norm CTE
 *    (which read from analytics.dashboard_pages VIEW grouped by
 *    literal page_url, collapsing all revenue under the quote domain).
 */
const PAGES_SQL = `
  WITH engagement AS (
    SELECT
      RTRIM(split_part(
        CASE WHEN page_path ~ '^https?://'
          THEN regexp_replace(page_path, '^https?://[^/]*', '')
          ELSE page_path END,
        '?', 1), '/') || '/' AS canon_path,
      SUM(sessions)    AS sessions,
      SUM(page_views)  AS page_views,
      CASE WHEN SUM(sessions) > 0
        THEN SUM(bounce_rate * sessions) / SUM(sessions)
        ELSE 0 END    AS bounce_rate,
      CASE WHEN SUM(sessions) > 0
        THEN SUM(avg_time_on_page_seconds * sessions) / SUM(sessions)
        ELSE 0 END    AS avg_time_on_page_seconds
    FROM analytics.metrics_page_engagement_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY 1
  ),
  web_page_views AS (
    SELECT
      RTRIM(split_part(
        regexp_replace(page_url, '^https?://[^/]*', ''),
        '?', 1), '/') || '/' AS canon_path,
      COUNT(*) AS page_views
    FROM analytics.raw_web_events
    WHERE event_type = 'page_view'
      AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')
    GROUP BY 1
  ),
  search_console_norm AS (
    SELECT
      RTRIM(split_part(
        regexp_replace(page_url, '^https?://[^/]*', ''),
        '?', 1), '/') || '/' AS canon_path,
      SUM(clicks::int)       AS clicks,
      SUM(impressions::int)  AS impressions,
      CASE WHEN SUM(impressions::int) > 0
        THEN SUM(clicks::int)::numeric / SUM(impressions::int)
        ELSE 0 END           AS ctr
    FROM analytics.metrics_search_console_page
    GROUP BY 1
  ),
  conv_attributed AS (
    SELECT
      RTRIM(split_part(
        COALESCE(
          NULLIF(event_data->>'landing_page', ''),
          regexp_replace(page_url, '^https?://[^/]*', '')
        ),
        '?', 1), '/') || '/' AS canon_path,
      COUNT(*)  AS submissions,
      COALESCE(SUM((event_data->>'preliminary_price')::numeric) / 100.0, 0)
                AS pipeline_value_usd
    FROM analytics.raw_web_events
    WHERE event_type = 'conversion'
    GROUP BY 1
  )
  SELECT
    COALESCE(e.canon_path, s.canon_path, c.canon_path, w.canon_path) AS page_url,
    COALESCE(e.sessions, 0)                          AS sessions,
    COALESCE(e.page_views, w.page_views, 0)          AS page_views,
    COALESCE(e.bounce_rate, 0)                       AS bounce_rate,
    COALESCE(e.avg_time_on_page_seconds, 0)          AS avg_time_on_page_seconds,
    COALESCE(s.clicks, 0)                            AS clicks,
    COALESCE(s.impressions, 0)                       AS impressions,
    COALESCE(s.ctr, 0)                               AS ctr,
    COALESCE(c.submissions, 0)                       AS submissions,
    COALESCE(c.pipeline_value_usd, 0)                AS pipeline_value_usd
  FROM engagement e
  FULL OUTER JOIN search_console_norm s
    ON e.canon_path = s.canon_path
  FULL OUTER JOIN conv_attributed c
    ON COALESCE(e.canon_path, s.canon_path) = c.canon_path
  LEFT JOIN web_page_views w
    ON COALESCE(e.canon_path, s.canon_path, c.canon_path) = w.canon_path
  ORDER BY
    COALESCE(c.pipeline_value_usd, 0)
    + COALESCE(s.clicks, 0) * 10
    + COALESCE(s.impressions, 0) * 0.01
    + COALESCE(e.page_views, w.page_views, 0)
    + COALESCE(e.sessions, 0) * 5
    DESC
  LIMIT 100
`;

// ============================================
// SQL — Sources
// ============================================

/**
 * LIFETIME VIEW — dashboard_sources has no date column.
 * Returns lifetime submission/pipeline totals by source.
 */
const SOURCES_SQL = `
  SELECT
    submission_source,
    COALESCE(submissions, 0)        AS submissions,
    COALESCE(pipeline_value_usd, 0) AS pipeline_value_usd
  FROM analytics.dashboard_sources
  ORDER BY COALESCE(pipeline_value_usd, 0) DESC
`;

// ============================================
// SQL — Data freshness
// ============================================

const FRESHNESS_SQL = `
  SELECT
    (SELECT MAX(metric_date)::text     FROM analytics.metrics_page_engagement_daily) AS engagement_last_date,
    (SELECT MAX(metric_date)::text     FROM analytics.metrics_search_console_page_daily) AS search_console_last_date,
    (SELECT MAX(metric_date)::text FROM analytics.conversion_metrics_daily)      AS conversion_last_date
`;

// ============================================
// SQL — Phase B: SEO query intelligence
// ============================================

/**
 * LIFETIME VIEW — metrics_search_console_query has no date column.
 * dashboard_pages also has no date column.
 * Returns lifetime totals per query.
 */
const SEO_QUERIES_SQL = `
  SELECT
    q.query,
    COALESCE(SUM(q.clicks), 0)       AS clicks,
    COALESCE(SUM(q.impressions), 0)  AS impressions,
    CASE WHEN SUM(q.impressions) > 0
      THEN SUM(q.clicks)::float / SUM(q.impressions)
      ELSE 0 END                     AS ctr,
    CASE WHEN SUM(q.impressions) > 0
      THEN SUM(q.avg_position * q.impressions) / SUM(q.impressions)
      ELSE 0 END                     AS avg_position,
    0                                AS submissions,
    0                                AS pipeline_value_usd
  FROM analytics.metrics_search_console_query q
  GROUP BY q.query
  ORDER BY SUM(q.clicks) DESC
  LIMIT 50
`;

// ============================================
// SQL — Phase C: Timeseries
// ============================================

const TIMESERIES_SESSIONS_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
  ),
  daily AS (
    SELECT metric_date, SUM(sessions) AS val
    FROM analytics.metrics_page_engagement_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.metric_date
  ORDER BY dr.d ASC
`;

const TIMESERIES_SUBMISSIONS_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
  ),
  daily AS (
    SELECT metric_date, SUM(total_submissions) AS val
    FROM analytics.conversion_metrics_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.metric_date
  ORDER BY dr.d ASC
`;

const TIMESERIES_PIPELINE_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
  ),
  daily AS (
    SELECT metric_date, SUM(total_pipeline_value_usd) AS val
    FROM analytics.conversion_metrics_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.metric_date
  ORDER BY dr.d ASC
`;

// T002: SEO timeseries from metrics_search_console_daily (column is "date" not "metric_date")
const TIMESERIES_IMPRESSIONS_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
  ),
  daily AS (
    SELECT date AS metric_date, impressions AS val
    FROM analytics.metrics_search_console_daily
    WHERE date BETWEEN $1 AND $2
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.metric_date
  ORDER BY dr.d ASC
`;

const TIMESERIES_CLICKS_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
  ),
  daily AS (
    SELECT date AS metric_date, clicks AS val
    FROM analytics.metrics_search_console_daily
    WHERE date BETWEEN $1 AND $2
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.metric_date
  ORDER BY dr.d ASC
`;

// ============================================
// SQL — Phase D: Anomaly detection stats
// ============================================

const ANOMALY_SESSIONS_SQL = `
  WITH daily AS (
    SELECT metric_date, SUM(sessions) AS val
    FROM analytics.metrics_page_engagement_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT
    COUNT(*)::int AS n,
    COALESCE(AVG(val), 0) AS mean,
    COALESCE(STDDEV_POP(val), 0) AS stddev,
    COALESCE((SELECT val FROM daily ORDER BY metric_date DESC LIMIT 1), 0) AS latest_val
  FROM daily
`;

const ANOMALY_SUBMISSIONS_SQL = `
  WITH daily AS (
    SELECT metric_date, SUM(total_submissions) AS val
    FROM analytics.conversion_metrics_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT
    COUNT(*)::int AS n,
    COALESCE(AVG(val), 0) AS mean,
    COALESCE(STDDEV_POP(val), 0) AS stddev,
    COALESCE((SELECT val FROM daily ORDER BY metric_date DESC LIMIT 1), 0) AS latest_val
  FROM daily
`;

const ANOMALY_PIPELINE_SQL = `
  WITH daily AS (
    SELECT metric_date, SUM(total_pipeline_value_usd) AS val
    FROM analytics.conversion_metrics_daily
    WHERE metric_date BETWEEN $1 AND $2
    GROUP BY metric_date
  )
  SELECT
    COUNT(*)::int AS n,
    COALESCE(AVG(val), 0) AS mean,
    COALESCE(STDDEV_POP(val), 0) AS stddev,
    COALESCE((SELECT val FROM daily ORDER BY metric_date DESC LIMIT 1), 0) AS latest_val
  FROM daily
`;

// ============================================
// T003: Device & Country breakdown
// Prefers GA4 session_summary data when available (more accurate sessions/pageviews).
// Falls back to Search Console data (impressions/clicks) when GA4 is empty.
// ============================================

const DEVICE_BREAKDOWN_GA4_SQL = `
  SELECT
    INITCAP(payload->>'device_category') AS device,
    SUM((payload->>'sessions')::int) AS sessions,
    SUM((payload->>'page_views')::int) AS page_views
  FROM analytics.raw_ga4_events
  WHERE event_name = 'session_summary'
    AND source_system = 'ga4-api'
    AND occurred_at::date BETWEEN $1 AND $2
  GROUP BY payload->>'device_category'
  ORDER BY sessions DESC
`;

const DEVICE_BREAKDOWN_SC_SQL = `
  SELECT
    payload->>'device' AS device,
    SUM((payload->>'impressions')::int) AS impressions,
    SUM((payload->>'clicks')::int) AS clicks,
    CASE WHEN SUM((payload->>'impressions')::int) > 0
      THEN SUM((payload->>'clicks')::float) / SUM((payload->>'impressions')::int)
      ELSE 0 END AS ctr
  FROM analytics.raw_search_console
  WHERE payload->>'date' IS NOT NULL
    AND (payload->>'date')::date BETWEEN $1 AND $2
  GROUP BY device
  ORDER BY impressions DESC
`;

const COUNTRY_BREAKDOWN_GA4_SQL = `
  SELECT
    UPPER(payload->>'country') AS country,
    SUM((payload->>'sessions')::int) AS sessions,
    SUM((payload->>'page_views')::int) AS page_views
  FROM analytics.raw_ga4_events
  WHERE event_name = 'session_summary'
    AND source_system = 'ga4-api'
    AND occurred_at::date BETWEEN $1 AND $2
  GROUP BY payload->>'country'
  ORDER BY sessions DESC
  LIMIT 10
`;

const COUNTRY_BREAKDOWN_SC_SQL = `
  SELECT
    UPPER(payload->>'country') AS country,
    SUM((payload->>'impressions')::int) AS impressions,
    SUM((payload->>'clicks')::int) AS clicks,
    CASE WHEN SUM((payload->>'impressions')::int) > 0
      THEN SUM((payload->>'clicks')::float) / SUM((payload->>'impressions')::int)
      ELSE 0 END AS ctr
  FROM analytics.raw_search_console
  WHERE payload->>'date' IS NOT NULL
    AND (payload->>'date')::date BETWEEN $1 AND $2
  GROUP BY country
  ORDER BY impressions DESC
  LIMIT 10
`;

// ============================================
// T004: Pipeline by product category
// ============================================

const PIPELINE_CATEGORY_SQL = `
  SELECT
    product_category,
    COALESCE(submissions, 0) AS submissions,
    COALESCE(pipeline_value_usd, 0) AS pipeline_value_usd
  FROM analytics.pipeline_by_category
  ORDER BY pipeline_value_usd DESC
`;

// ============================================
// T005: Recent conversion events
// ============================================

const RECENT_CONVERSIONS_SQL = `
  SELECT
    created_at,
    COALESCE(product_category, 'Unknown') AS product_category,
    COALESCE(preliminary_price_usd, 0) AS preliminary_price_usd,
    COALESCE(submission_source, 'Unknown') AS submission_source
  FROM analytics.conversion_events
  ORDER BY created_at DESC
  LIMIT 20
`;

// ============================================
// T006: SEO query movers (rising/falling)
// ============================================

const SEO_MOVERS_SQL = `
  WITH date_bounds AS (
    SELECT
      GREATEST(MIN(metric_date), $1::date) AS min_date,
      LEAST(MAX(metric_date), $2::date) AS max_date
    FROM analytics.metrics_search_console_query_daily
    WHERE metric_date BETWEEN $1 AND $2
  ),
  midpoint AS (
    SELECT min_date + ((max_date - min_date) / 2) AS mid
    FROM date_bounds
  ),
  first_half AS (
    SELECT query, SUM(impressions) AS impressions
    FROM analytics.metrics_search_console_query_daily d, midpoint m
    WHERE d.metric_date BETWEEN $1 AND m.mid
    GROUP BY query
  ),
  second_half AS (
    SELECT query, SUM(impressions) AS impressions
    FROM analytics.metrics_search_console_query_daily d, midpoint m
    WHERE d.metric_date > m.mid AND d.metric_date <= $2
    GROUP BY query
  ),
  combined AS (
    SELECT
      COALESCE(f.query, s.query) AS query,
      COALESCE(f.impressions, 0) AS impressions_first_half,
      COALESCE(s.impressions, 0) AS impressions_second_half,
      CASE WHEN COALESCE(f.impressions, 0) > 0
        THEN (COALESCE(s.impressions, 0) - f.impressions)::float / f.impressions
        ELSE CASE WHEN COALESCE(s.impressions, 0) > 0 THEN 1.0 ELSE 0 END
      END AS delta_pct
    FROM first_half f
    FULL OUTER JOIN second_half s ON f.query = s.query
  )
  (
    SELECT query, impressions_first_half, impressions_second_half, delta_pct, 'rising' AS direction
    FROM combined
    WHERE delta_pct > 0 AND (impressions_first_half + impressions_second_half) >= 5
    ORDER BY delta_pct DESC
    LIMIT 5
  )
  UNION ALL
  (
    SELECT query, impressions_first_half, impressions_second_half, delta_pct, 'falling' AS direction
    FROM combined
    WHERE delta_pct < 0 AND (impressions_first_half + impressions_second_half) >= 5
    ORDER BY delta_pct ASC
    LIMIT 5
  )
`;

// ============================================
// T007: Funnel from dashboard_funnel_daily
// ============================================

const FUNNEL_SQL = `
  SELECT
    event_date::text AS date,
    COALESCE(page_views, 0) AS page_views,
    COALESCE(submissions, 0) AS submissions,
    COALESCE(conversion_rate, 0) AS conversion_rate,
    COALESCE(pipeline_value_usd, 0) AS pipeline_value_usd
  FROM analytics.dashboard_funnel_daily
  ORDER BY event_date DESC
  LIMIT 30
`;

// ============================================
// T008: Pipeline health from ingestion_runs
// ============================================

const PIPELINE_HEALTH_SQL = `
  WITH sources AS (
    SELECT DISTINCT source FROM analytics.ingestion_runs WHERE source IS NOT NULL
  ),
  last_success AS (
    SELECT source, MAX(completed_at) AS last_success
    FROM analytics.ingestion_runs
    WHERE status = 'completed'
    GROUP BY source
  ),
  recent_stats AS (
    SELECT
      source,
      COUNT(*) FILTER (WHERE status = 'failed') AS failures,
      COUNT(*) AS total
    FROM analytics.ingestion_runs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY source
  )
  SELECT
    s.source,
    ls.last_success::text AS last_success,
    CASE WHEN COALESCE(rs.total, 0) > 0
      THEN rs.failures::float / rs.total
      ELSE 0 END AS failure_rate_24h
  FROM sources s
  LEFT JOIN last_success ls ON s.source = ls.source
  LEFT JOIN recent_stats rs ON s.source = rs.source
  WHERE s.source NOT LIKE 'debug_%'
  ORDER BY s.source
`;

// ============================================
// T009: Channel performance from GA4 channel_session_summary
// ============================================

const CHANNEL_PERFORMANCE_SQL = `
  SELECT
    payload->>'channel' AS channel,
    SUM((payload->>'sessions')::int) AS sessions,
    SUM((payload->>'page_views')::int) AS page_views,
    SUM((payload->>'conversions')::int) AS conversions,
    SUM((payload->>'revenue')::numeric) AS revenue
  FROM analytics.raw_ga4_events
  WHERE event_name = 'channel_session_summary'
    AND source_system = 'ga4-api'
    AND occurred_at::date BETWEEN $1 AND $2
  GROUP BY payload->>'channel'
  ORDER BY SUM((payload->>'sessions')::int) DESC
`;

// ============================================
// T010: GA4 funnel aggregation from raw_ga4_events
// ============================================

const GA4_FUNNEL_SQL = `
  SELECT
    event_name,
    SUM((payload->>'event_count')::int) AS event_count
  FROM analytics.raw_ga4_events
  WHERE source_system = 'ga4-api'
    AND event_name IN ('view_item', 'add_to_cart', 'begin_checkout', 'purchase', 'form_start', 'neon_form_submit', 'contact_form_submit', 'wholesale_quote_form_submit', 'become_a_partner_form_submit', 'channel_letter_quote_form_submit')
    AND occurred_at::date BETWEEN $1 AND $2
  GROUP BY event_name
`;

// ============================================
// T011: Google Ads overview from raw_google_ads
// ============================================

const GOOGLE_ADS_OVERVIEW_SQL = `
  SELECT
    COALESCE(SUM((payload->>'cost')::numeric), 0) AS spend,
    COALESCE(SUM((payload->>'impressions')::int), 0) AS impressions,
    COALESCE(SUM((payload->>'clicks')::int), 0) AS clicks,
    COALESCE(SUM((payload->>'conversions')::numeric), 0) AS conversions,
    CASE WHEN COALESCE(SUM((payload->>'clicks')::int), 0) > 0
      THEN COALESCE(SUM((payload->>'cost')::numeric), 0) / SUM((payload->>'clicks')::int)
      ELSE 0 END AS cpc,
    CASE WHEN COALESCE(SUM((payload->>'impressions')::int), 0) > 0
      THEN COALESCE(SUM((payload->>'clicks')::int), 0)::numeric / SUM((payload->>'impressions')::int)
      ELSE 0 END AS ctr,
    CASE WHEN COALESCE(SUM((payload->>'cost')::numeric), 0) > 0
      THEN COALESCE(SUM((payload->>'conversion_value')::numeric), 0) / SUM((payload->>'cost')::numeric)
      ELSE 0 END AS roas
  FROM analytics.raw_google_ads
  WHERE source_system = 'google-ads-bq'
    AND event_name = 'campaign_performance'
    AND occurred_at::date BETWEEN $1 AND $2
`;

// ============================================
// T012: Google Ads campaigns from raw_google_ads
// ============================================

const GOOGLE_ADS_CAMPAIGNS_SQL = `
  SELECT
    payload->>'campaign_name' AS campaign_name,
    payload->>'campaign_id' AS campaign_id,
    SUM((payload->>'cost')::numeric) AS spend,
    SUM((payload->>'impressions')::int) AS impressions,
    SUM((payload->>'clicks')::int) AS clicks,
    SUM((payload->>'conversions')::numeric) AS conversions,
    CASE WHEN SUM((payload->>'clicks')::int) > 0
      THEN SUM((payload->>'cost')::numeric) / SUM((payload->>'clicks')::int)
      ELSE 0 END AS cpc,
    CASE WHEN SUM((payload->>'impressions')::int) > 0
      THEN SUM((payload->>'clicks')::int)::numeric / SUM((payload->>'impressions')::int)
      ELSE 0 END AS ctr,
    CASE WHEN SUM((payload->>'cost')::numeric) > 0
      THEN SUM((payload->>'conversion_value')::numeric) / SUM((payload->>'cost')::numeric)
      ELSE 0 END AS roas
  FROM analytics.raw_google_ads
  WHERE source_system = 'google-ads-bq'
    AND event_name = 'campaign_performance'
    AND occurred_at::date BETWEEN $1 AND $2
  GROUP BY payload->>'campaign_name', payload->>'campaign_id'
  ORDER BY SUM((payload->>'cost')::numeric) DESC
`;

// ============================================
// T015: Core 4 Engine Aggregate Queries
// ============================================

const WARM_OUTREACH_SQL = `
  SELECT
    COALESCE(SUM(
      CASE WHEN submission_source IN ('direct', 'email', 'newsletter', 'quote.neonsignsdepot.com')
        THEN submissions ELSE 0 END
    ), 0) AS quotes,
    COALESCE(SUM(
      CASE WHEN submission_source IN ('direct', 'email', 'newsletter', 'quote.neonsignsdepot.com')
        THEN pipeline_value_usd ELSE 0 END
    ), 0) AS pipeline_value_usd
  FROM analytics.dashboard_sources
`;

const WARM_OUTREACH_SESSIONS_SQL = `
  SELECT
    COALESCE(SUM((payload->>'sessions')::int), 0) AS sessions
  FROM analytics.raw_ga4_events
  WHERE event_name = 'channel_session_summary'
    AND source_system = 'ga4-api'
    AND payload->>'channel' IN ('Direct', 'Email', 'Referral')
    AND occurred_at::date BETWEEN $1 AND $2
`;

const POST_FREE_CONTENT_SQL = `
  SELECT
    COALESCE(SUM(clicks), 0) AS clicks,
    COALESCE(SUM(impressions), 0) AS impressions
  FROM analytics.metrics_search_console_page
`;

const POST_FREE_CONTENT_SESSIONS_SQL = `
  SELECT
    COALESCE(SUM((payload->>'sessions')::int), 0) AS sessions,
    COALESCE(SUM((payload->>'conversions')::int), 0) AS conversions,
    COALESCE(SUM((payload->>'revenue')::numeric), 0) AS revenue
  FROM analytics.raw_ga4_events
  WHERE event_name = 'channel_session_summary'
    AND source_system = 'ga4-api'
    AND payload->>'channel' IN ('Organic Search', 'Organic Social', 'Organic Video')
    AND occurred_at::date BETWEEN $1 AND $2
`;

const POST_FREE_CONTENT_CONVERSIONS_SQL = `
  SELECT
    COUNT(*) AS quotes,
    COALESCE(SUM((event_data->>'preliminary_price')::numeric) / 100.0, 0) AS pipeline_value_usd
  FROM analytics.raw_web_events
  WHERE event_type = 'conversion'
    AND (
      source IN ('google', 'bing', 'duckduckgo', 'yahoo')
      OR source IS NULL
    )
    AND occurred_at >= $1::date AND occurred_at < ($2::date + INTERVAL '1 day')
`;

const RUN_PAID_ADS_SQL = `
  SELECT
    COALESCE(SUM((payload->>'cost')::numeric), 0) AS spend,
    COALESCE(SUM((payload->>'impressions')::int), 0) AS impressions,
    COALESCE(SUM((payload->>'clicks')::int), 0) AS clicks,
    COALESCE(SUM((payload->>'conversions')::numeric), 0) AS conversions,
    COALESCE(SUM((payload->>'conversion_value')::numeric), 0) AS pipeline_value_usd
  FROM analytics.raw_google_ads
  WHERE source_system = 'google-ads-bq'
    AND event_name = 'campaign_performance'
    AND occurred_at::date BETWEEN $1 AND $2
`;

const RUN_PAID_ADS_SESSIONS_SQL = `
  SELECT
    COALESCE(SUM((payload->>'sessions')::int), 0) AS sessions
  FROM analytics.raw_ga4_events
  WHERE event_name = 'channel_session_summary'
    AND source_system = 'ga4-api'
    AND payload->>'channel' IN ('Paid Search', 'Paid Social', 'Paid Video', 'Display')
    AND occurred_at::date BETWEEN $1 AND $2
`;

// ============================================
// Row helpers
// ============================================

type Row = Record<string, unknown>;

function buildKPIs(eng: Row, conv: Row, sch: Row, funnelFallback?: Row): MarketingKPIs {
  let sessions = nonNegative(toNumber(eng.sessions));
  let pageViews = nonNegative(toNumber(eng.page_views));
  const bounceRate = clamp(toNumber(eng.bounce_rate), 0, 1);
  const avgTime = nonNegative(toNumber(eng.avg_time_on_page_seconds));

  // T001: If engagement table is empty, fall back to dashboard_funnel_daily
  if (sessions === 0 && pageViews === 0 && funnelFallback) {
    pageViews = nonNegative(toNumber(funnelFallback.page_views));
    sessions = pageViews; // approximate: 1 session per page view when no session data
  }

  const submissions = nonNegative(toNumber(conv.total_submissions));
  const pipeline = nonNegative(toNumber(conv.total_pipeline_value_usd));
  const clicks = nonNegative(toNumber(sch.organic_clicks));
  const impressionsVal = nonNegative(toNumber(sch.impressions));
  const avgPosition = nonNegative(toNumber(sch.avg_position));

  return {
    sessions,
    page_views: pageViews,
    bounce_rate: bounceRate,
    avg_time_on_page_seconds: avgTime,
    total_submissions: submissions,
    total_pipeline_value_usd: pipeline,
    organic_clicks: clicks,
    impressions: impressionsVal,
    avg_position: avgPosition,
    revenue_per_session: safeDivide(pipeline, sessions),
    revenue_per_click: safeDivide(pipeline, clicks),
    submissions_per_session: safeDivide(submissions, sessions),
    submissions_per_click: safeDivide(submissions, clicks),
  };
}

function buildComparison(current: number, previous: number): MarketingKPIComparison {
  return {
    current,
    previous,
    delta_pct: safeDivide(current - previous, previous),
  };
}

function buildCore4EngineMetrics(engine: Core4Engine, data: { sessions: number; clicks: number; quotes: number; pipeline_value_usd: number; spend: number }): Core4EngineMetrics {
  return {
    engine,
    sessions: data.sessions,
    clicks: data.clicks,
    quotes: data.quotes,
    pipeline_value_usd: data.pipeline_value_usd,
    spend: data.spend,
    cac: safeDivide(data.spend, data.quotes),
    roas: safeDivide(data.pipeline_value_usd, data.spend),
    quote_rate: safeDivide(data.quotes, data.sessions),
  };
}

function buildCore4Comparison(current: Core4EngineMetrics, previous: Core4EngineMetrics): Core4EngineComparison {
  return {
    current,
    previous,
    deltas: {
      sessions_pct: safeDivide(current.sessions - previous.sessions, previous.sessions),
      clicks_pct: safeDivide(current.clicks - previous.clicks, previous.clicks),
      quotes_pct: safeDivide(current.quotes - previous.quotes, previous.quotes),
      pipeline_value_usd_pct: safeDivide(current.pipeline_value_usd - previous.pipeline_value_usd, previous.pipeline_value_usd),
      spend_pct: safeDivide(current.spend - previous.spend, previous.spend),
      cac_pct: safeDivide(current.cac - previous.cac, previous.cac),
      roas_pct: safeDivide(current.roas - previous.roas, previous.roas),
      quote_rate_pct: safeDivide(current.quote_rate - previous.quote_rate, previous.quote_rate),
    },
  };
}

function zeroCore4Metrics(engine: Core4Engine): Core4EngineMetrics {
  return { engine, sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 };
}

function detectSpike(row: Row): boolean {
  const n = toNumber(row.n);
  const mean = toNumber(row.mean);
  const stddev = toNumber(row.stddev);
  const latest = toNumber(row.latest_val);
  if (n < 7 || stddev <= 0) return false;
  return latest > mean + 2 * stddev;
}

function mapTimeseries(rows: Row[]): MarketingTimeseriesPoint[] {
  return (rows ?? []).map((r) => ({
    date: String(r.date ?? ''),
    value: nonNegative(toNumber(r.value)),
  }));
}

// ============================================
// Public interface
// ============================================

export interface MarketingFilters {
  channel?: string;
  campaign?: string;
  device?: string;
  geo?: string;
  landing_page?: string;
}

export interface MarketingQueryOptions {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  includeTimeseries: boolean;
  filters?: MarketingFilters;
}

interface FilterFragment {
  clause: string;
  params: string[];
}

function buildFilterFragment(
  filters: MarketingFilters | undefined,
  tableType: 'engagement' | 'conversion_daily' | 'web_events' | 'ga4' | 'search_console' | 'google_ads',
  paramOffset: number,
): FilterFragment {
  if (!filters) return { clause: '', params: [] };
  const clauses: string[] = [];
  const params: string[] = [];
  let idx = paramOffset;

  if (filters.landing_page) {
    switch (tableType) {
      case 'engagement':
        idx++;
        clauses.push(`page_path ILIKE $${idx}`);
        params.push(`%${filters.landing_page}%`);
        break;
      case 'web_events':
        idx++;
        clauses.push(`page_url ILIKE $${idx}`);
        params.push(`%${filters.landing_page}%`);
        break;
    }
  }

  if (filters.channel) {
    if (tableType === 'ga4') {
      idx++;
      clauses.push(`payload->>'channel' ILIKE $${idx}`);
      params.push(`%${filters.channel}%`);
    }
  }

  if (filters.campaign) {
    if (tableType === 'google_ads') {
      idx++;
      clauses.push(`payload->>'campaign_name' ILIKE $${idx}`);
      params.push(`%${filters.campaign}%`);
    }
  }

  if (filters.device) {
    switch (tableType) {
      case 'ga4':
        idx++;
        clauses.push(`payload->>'device_category' ILIKE $${idx}`);
        params.push(`%${filters.device}%`);
        break;
      case 'search_console':
        idx++;
        clauses.push(`payload->>'device' ILIKE $${idx}`);
        params.push(`%${filters.device}%`);
        break;
    }
  }

  if (filters.geo) {
    switch (tableType) {
      case 'ga4':
        idx++;
        clauses.push(`payload->>'country' ILIKE $${idx}`);
        params.push(`%${filters.geo}%`);
        break;
      case 'search_console':
        idx++;
        clauses.push(`payload->>'country' ILIKE $${idx}`);
        params.push(`%${filters.geo}%`);
        break;
    }
  }

  return {
    clause: clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '',
    params,
  };
}

function appendFilter(sql: string, fragment: FilterFragment): string {
  if (!fragment.clause) return sql;
  const lastWhereIdx = sql.lastIndexOf('WHERE');
  if (lastWhereIdx === -1) return sql;
  const insertionKeywords = ['GROUP BY', 'ORDER BY', 'LIMIT', 'UNION'];
  let insertPos = sql.length;
  for (const kw of insertionKeywords) {
    const kwIdx = sql.indexOf(kw, lastWhereIdx);
    if (kwIdx !== -1 && kwIdx < insertPos) {
      insertPos = kwIdx;
    }
  }
  return sql.slice(0, insertPos) + fragment.clause + '\n  ' + sql.slice(insertPos);
}

export interface MarketingQueryResult {
  kpis: MarketingKPIs;
  comparisons: MarketingKPIComparisons;
  pages: MarketingPage[];
  sources: MarketingSource[];
  seo_queries: MarketingSEOQuery[];
  timeseries?: MarketingTimeseries;
  anomalies: MarketingAnomalies;
  data_freshness: MarketingDataFreshness;
  device_breakdown: MarketingDeviceBreakdown[];
  country_breakdown: MarketingCountryBreakdown[];
  pipeline_categories: MarketingPipelineCategory[];
  recent_conversions: MarketingConversionEvent[];
  seo_movers: MarketingSEOQueryMover[];
  funnel: MarketingFunnelStep[];
  pipeline_health: MarketingPipelineHealth[];
  channel_performance: MarketingChannelPerformance[];
  ga4_funnel: MarketingGA4Funnel;
  google_ads_overview: MarketingGoogleAdsOverview;
  google_ads_campaigns: MarketingGoogleAdsCampaign[];
  core4_summary: Core4Summary;
}

export async function executeMarketingQueries(
  db: Pool,
  opts: MarketingQueryOptions
): Promise<MarketingQueryResult> {
  const filters = opts.filters;
  const hasFilters = filters != null && Object.values(filters).some(Boolean);

  const engFilter = buildFilterFragment(filters, 'engagement', 2);
  const convFilter = buildFilterFragment(filters, 'conversion_daily', 2);
  const ga4Filter = buildFilterFragment(filters, 'ga4', 2);
  const scFilter = buildFilterFragment(filters, 'search_console', 2);
  const adsFilter = buildFilterFragment(filters, 'google_ads', 2);
  const webFilter = buildFilterFragment(filters, 'web_events', 2);

  const curParams = [opts.startDate, opts.endDate];
  const prevParams = [opts.prevStartDate, opts.prevEndDate];

  const curEngP = [...curParams, ...engFilter.params];
  const prevEngP = [...prevParams, ...engFilter.params];
  const curConvP = [...curParams, ...convFilter.params];
  const prevConvP = [...prevParams, ...convFilter.params];
  const curGa4P = [...curParams, ...ga4Filter.params];
  const prevGa4P = [...prevParams, ...ga4Filter.params];
  const curScP = [...curParams, ...scFilter.params];
  const curAdsP = [...curParams, ...adsFilter.params];
  const prevAdsP = [...prevParams, ...adsFilter.params];
  const curWebP = [...curParams, ...webFilter.params];
  const prevWebP = [...prevParams, ...webFilter.params];

  const fEngSql = hasFilters ? appendFilter(KPI_ENGAGEMENT_SQL, engFilter) : KPI_ENGAGEMENT_SQL;
  const fConvSql = hasFilters ? appendFilter(KPI_CONVERSION_SQL, convFilter) : KPI_CONVERSION_SQL;
  const fFunnelFbSql = hasFilters ? appendFilter(KPI_FUNNEL_FALLBACK_SQL, engFilter) : KPI_FUNNEL_FALLBACK_SQL;
  const fAnomSessSql = hasFilters ? appendFilter(ANOMALY_SESSIONS_SQL, engFilter) : ANOMALY_SESSIONS_SQL;
  const fAnomSubSql = hasFilters ? appendFilter(ANOMALY_SUBMISSIONS_SQL, convFilter) : ANOMALY_SUBMISSIONS_SQL;
  const fAnomPipeSql = hasFilters ? appendFilter(ANOMALY_PIPELINE_SQL, convFilter) : ANOMALY_PIPELINE_SQL;
  const fDevGa4Sql = hasFilters ? appendFilter(DEVICE_BREAKDOWN_GA4_SQL, ga4Filter) : DEVICE_BREAKDOWN_GA4_SQL;
  const fCntGa4Sql = hasFilters ? appendFilter(COUNTRY_BREAKDOWN_GA4_SQL, ga4Filter) : COUNTRY_BREAKDOWN_GA4_SQL;
  const fDevScSql = hasFilters ? appendFilter(DEVICE_BREAKDOWN_SC_SQL, scFilter) : DEVICE_BREAKDOWN_SC_SQL;
  const fCntScSql = hasFilters ? appendFilter(COUNTRY_BREAKDOWN_SC_SQL, scFilter) : COUNTRY_BREAKDOWN_SC_SQL;
  const fChanPerfSql = hasFilters ? appendFilter(CHANNEL_PERFORMANCE_SQL, ga4Filter) : CHANNEL_PERFORMANCE_SQL;
  const fGa4FunnelSql = hasFilters ? appendFilter(GA4_FUNNEL_SQL, ga4Filter) : GA4_FUNNEL_SQL;
  const fAdsOverSql = hasFilters ? appendFilter(GOOGLE_ADS_OVERVIEW_SQL, adsFilter) : GOOGLE_ADS_OVERVIEW_SQL;
  const fAdsCampSql = hasFilters ? appendFilter(GOOGLE_ADS_CAMPAIGNS_SQL, adsFilter) : GOOGLE_ADS_CAMPAIGNS_SQL;
  const fWarmSessSql = hasFilters ? appendFilter(WARM_OUTREACH_SESSIONS_SQL, ga4Filter) : WARM_OUTREACH_SESSIONS_SQL;
  const fPfcSessSql = hasFilters ? appendFilter(POST_FREE_CONTENT_SESSIONS_SQL, ga4Filter) : POST_FREE_CONTENT_SESSIONS_SQL;
  const fPfcConvSql = hasFilters ? appendFilter(POST_FREE_CONTENT_CONVERSIONS_SQL, webFilter) : POST_FREE_CONTENT_CONVERSIONS_SQL;
  const fPaidAdsSql = hasFilters ? appendFilter(RUN_PAID_ADS_SQL, adsFilter) : RUN_PAID_ADS_SQL;
  const fPaidSessSql = hasFilters ? appendFilter(RUN_PAID_ADS_SESSIONS_SQL, ga4Filter) : RUN_PAID_ADS_SESSIONS_SQL;
  const fTsSessSql = hasFilters ? appendFilter(TIMESERIES_SESSIONS_SQL, engFilter) : TIMESERIES_SESSIONS_SQL;
  const fTsSubSql = hasFilters ? appendFilter(TIMESERIES_SUBMISSIONS_SQL, convFilter) : TIMESERIES_SUBMISSIONS_SQL;
  const fTsPipeSql = hasFilters ? appendFilter(TIMESERIES_PIPELINE_SQL, convFilter) : TIMESERIES_PIPELINE_SQL;

  const queries: Promise<{ rows: Row[] }>[] = [
    /* 0  */ db.query(fEngSql, curEngP),
    /* 1  */ db.query(fConvSql, curConvP),
    /* 2  */ db.query(KPI_SEARCH_SQL),
    /* 3  */ db.query(PAGES_SQL, curParams),
    /* 4  */ db.query(SOURCES_SQL),
    /* 5  */ db.query(FRESHNESS_SQL),
    /* 6  */ db.query(fEngSql, prevEngP),
    /* 7  */ db.query(fConvSql, prevConvP),
    /* 8  */ db.query(SEO_QUERIES_SQL),
    /* 9  */ db.query(fAnomSessSql, curEngP),
    /* 10 */ db.query(fAnomSubSql, curConvP),
    /* 11 */ db.query(fAnomPipeSql, curConvP),
    /* 12 */ db.query(fFunnelFbSql, curEngP),
    /* 13 */ db.query(fFunnelFbSql, prevEngP),
    /* 14 */ db.query(fDevGa4Sql, curGa4P),
    /* 15 */ db.query(fCntGa4Sql, curGa4P),
    /* 16 */ db.query(fDevScSql, curScP),
    /* 17 */ db.query(fCntScSql, curScP),
    /* 18 */ db.query(PIPELINE_CATEGORY_SQL),
    /* 19 */ db.query(RECENT_CONVERSIONS_SQL),
    /* 20 */ db.query(SEO_MOVERS_SQL, curParams),
    /* 21 */ db.query(FUNNEL_SQL),
    /* 22 */ db.query(PIPELINE_HEALTH_SQL),
    /* 23 */ db.query(fChanPerfSql, curGa4P),
    /* 24 */ db.query(fGa4FunnelSql, curGa4P),
    /* 25 */ db.query(fAdsOverSql, curAdsP),
    /* 26 */ db.query(fAdsCampSql, curAdsP),
    /* 27 */ db.query(WARM_OUTREACH_SQL),
    /* 28 */ db.query(fWarmSessSql, curGa4P),
    /* 29 */ db.query(fWarmSessSql, prevGa4P),
    /* 30 */ db.query(POST_FREE_CONTENT_SQL),
    /* 31 */ db.query(fPfcSessSql, curGa4P),
    /* 32 */ db.query(fPfcSessSql, prevGa4P),
    /* 33 */ db.query(fPfcConvSql, curWebP),
    /* 34 */ db.query(fPfcConvSql, prevWebP),
    /* 35 */ db.query(fPaidAdsSql, curAdsP),
    /* 36 */ db.query(fPaidAdsSql, prevAdsP),
    /* 37 */ db.query(fPaidSessSql, curGa4P),
    /* 38 */ db.query(fPaidSessSql, prevGa4P),
  ];

  if (opts.includeTimeseries) {
    queries.push(
      /* 39 */ db.query(fTsSessSql, curEngP),
      /* 40 */ db.query(fTsSubSql, curConvP),
      /* 41 */ db.query(fTsPipeSql, curConvP),
      /* 42 */ db.query(TIMESERIES_IMPRESSIONS_SQL, curParams),
      /* 43 */ db.query(TIMESERIES_CLICKS_SQL, curParams),
    );
  }

  const results = await Promise.all(queries);

  const searchRow = results[2].rows[0] ?? {};
  const funnelFallback = results[12].rows[0] ?? {};
  const prevFunnelFallback = results[13].rows[0] ?? {};

  const kpis = buildKPIs(
    results[0].rows[0] ?? {},
    results[1].rows[0] ?? {},
    searchRow,
    funnelFallback,
  );

  const prevKpis = buildKPIs(
    results[6].rows[0] ?? {},
    results[7].rows[0] ?? {},
    searchRow,
    prevFunnelFallback,
  );

  const comparisons: MarketingKPIComparisons = {
    sessions: buildComparison(kpis.sessions, prevKpis.sessions),
    page_views: buildComparison(kpis.page_views, prevKpis.page_views),
    total_submissions: buildComparison(kpis.total_submissions, prevKpis.total_submissions),
    total_pipeline_value_usd: buildComparison(kpis.total_pipeline_value_usd, prevKpis.total_pipeline_value_usd),
    organic_clicks: buildComparison(kpis.organic_clicks, prevKpis.organic_clicks),
    impressions: buildComparison(kpis.impressions, prevKpis.impressions),
  };

  const pages: MarketingPage[] = (results[3].rows ?? [])
    .filter((r: Row) => r.page_url != null)
    .map((r: Row) => ({
      page_url: String(r.page_url),
      sessions: nonNegative(toNumber(r.sessions)),
      page_views: nonNegative(toNumber(r.page_views)),
      bounce_rate: clamp(toNumber(r.bounce_rate), 0, 1),
      avg_time_on_page_seconds: nonNegative(toNumber(r.avg_time_on_page_seconds)),
      clicks: nonNegative(toNumber(r.clicks)),
      impressions: nonNegative(toNumber(r.impressions)),
      ctr: clamp(toNumber(r.ctr), 0, 1),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  const sources: MarketingSource[] = (results[4].rows ?? [])
    .filter((r: Row) => r.submission_source != null)
    .map((r: Row) => ({
      submission_source: String(r.submission_source),
      canonical_source: canonicalSource(String(r.submission_source)),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  const fresh = results[5].rows[0] ?? {};
  const data_freshness: MarketingDataFreshness = {
    engagement_last_date: (fresh.engagement_last_date as string) ?? null,
    search_console_last_date: (fresh.search_console_last_date as string) ?? null,
    conversion_last_date: (fresh.conversion_last_date as string) ?? null,
  };

  const seo_queries: MarketingSEOQuery[] = (results[8].rows ?? [])
    .filter((r: Row) => r.query != null)
    .map((r: Row) => {
      const clicks = nonNegative(toNumber(r.clicks));
      const pv = nonNegative(toNumber(r.pipeline_value_usd));
      return {
        query: String(r.query),
        clicks,
        impressions: nonNegative(toNumber(r.impressions)),
        ctr: clamp(toNumber(r.ctr), 0, 1),
        avg_position: nonNegative(toNumber(r.avg_position)),
        submissions: nonNegative(toNumber(r.submissions)),
        pipeline_value_usd: pv,
        revenue_per_click: safeDivide(pv, clicks),
      };
    });

  const anomalies: MarketingAnomalies = {
    sessions_spike: detectSpike(results[9].rows[0] ?? {}),
    submissions_spike: detectSpike(results[10].rows[0] ?? {}),
    pipeline_spike: detectSpike(results[11].rows[0] ?? {}),
  };

  // T003: Device & Country — prefer GA4 data (sessions/page_views), fall back to Search Console (impressions/clicks)
  const ga4DeviceRows = results[14].rows ?? [];
  const scDeviceRows = results[16].rows ?? [];
  const useGA4Device = ga4DeviceRows.length > 0;

  const device_breakdown: MarketingDeviceBreakdown[] = useGA4Device
    ? ga4DeviceRows
        .filter((r: Row) => r.device != null)
        .map((r: Row) => ({
          device: String(r.device),
          sessions: nonNegative(toNumber(r.sessions)),
          page_views: nonNegative(toNumber(r.page_views)),
          impressions: 0,
          clicks: 0,
          ctr: 0,
          source: 'ga4' as const,
        }))
    : scDeviceRows
        .filter((r: Row) => r.device != null)
        .map((r: Row) => ({
          device: String(r.device),
          sessions: 0,
          page_views: 0,
          impressions: nonNegative(toNumber(r.impressions)),
          clicks: nonNegative(toNumber(r.clicks)),
          ctr: clamp(toNumber(r.ctr), 0, 1),
          source: 'search_console' as const,
        }));

  const ga4CountryRows = results[15].rows ?? [];
  const scCountryRows = results[17].rows ?? [];
  const useGA4Country = ga4CountryRows.length > 0;

  const country_breakdown: MarketingCountryBreakdown[] = useGA4Country
    ? ga4CountryRows
        .filter((r: Row) => r.country != null)
        .map((r: Row) => ({
          country: String(r.country),
          sessions: nonNegative(toNumber(r.sessions)),
          page_views: nonNegative(toNumber(r.page_views)),
          impressions: 0,
          clicks: 0,
          ctr: 0,
          source: 'ga4' as const,
        }))
    : scCountryRows
        .filter((r: Row) => r.country != null)
        .map((r: Row) => ({
          country: String(r.country),
          sessions: 0,
          page_views: 0,
          impressions: nonNegative(toNumber(r.impressions)),
          clicks: nonNegative(toNumber(r.clicks)),
          ctr: clamp(toNumber(r.ctr), 0, 1),
          source: 'search_console' as const,
        }));

  // T004: Pipeline categories (index shifted +2 due to GA4 fallback queries)
  const pipeline_categories: MarketingPipelineCategory[] = (results[18].rows ?? [])
    .filter((r: Row) => r.product_category != null)
    .map((r: Row) => ({
      product_category: String(r.product_category),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  // T005: Recent conversions
  const recent_conversions: MarketingConversionEvent[] = (results[19].rows ?? [])
    .map((r: Row) => ({
      created_at: String(r.created_at ?? ''),
      product_category: String(r.product_category ?? 'Unknown'),
      preliminary_price_usd: nonNegative(toNumber(r.preliminary_price_usd)),
      submission_source: String(r.submission_source ?? 'Unknown'),
    }));

  // T006: SEO movers
  const seo_movers: MarketingSEOQueryMover[] = (results[20].rows ?? [])
    .filter((r: Row) => r.query != null)
    .map((r: Row) => ({
      query: String(r.query),
      impressions_first_half: nonNegative(toNumber(r.impressions_first_half)),
      impressions_second_half: nonNegative(toNumber(r.impressions_second_half)),
      delta_pct: toNumber(r.delta_pct),
      direction: String(r.direction) as 'rising' | 'falling',
    }));

  // T007: Funnel
  const funnel: MarketingFunnelStep[] = (results[21].rows ?? [])
    .map((r: Row) => ({
      date: String(r.date ?? ''),
      page_views: nonNegative(toNumber(r.page_views)),
      submissions: nonNegative(toNumber(r.submissions)),
      conversion_rate: clamp(toNumber(r.conversion_rate), 0, 1),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  // T008: Pipeline health (index shifted +2 due to GA4 fallback queries)
  const pipeline_health: MarketingPipelineHealth[] = (results[22].rows ?? [])
    .map((r: Row) => {
      const lastSuccess = r.last_success ? String(r.last_success) : null;
      const failureRate = clamp(toNumber(r.failure_rate_24h), 0, 1);
      let status: 'healthy' | 'warning' | 'stale' = 'healthy';
      if (!lastSuccess) {
        status = 'stale';
      } else {
        const parsed = new Date(lastSuccess).getTime();
        if (isNaN(parsed)) {
          status = 'stale';
        } else {
          const hoursSince = (Date.now() - parsed) / (1000 * 60 * 60);
          if (hoursSince > 24) status = 'stale';
          else if (failureRate > 0.3) status = 'warning';
        }
      }
      return {
        source: String(r.source ?? 'unknown'),
        last_success: lastSuccess,
        failure_rate_24h: failureRate,
        status,
      };
    });

  // T009: Channel performance
  const channel_performance: MarketingChannelPerformance[] = (results[23].rows ?? [])
    .filter((r: Row) => r.channel != null)
    .map((r: Row) => ({
      channel: String(r.channel),
      sessions: nonNegative(toNumber(r.sessions)),
      page_views: nonNegative(toNumber(r.page_views)),
      conversions: nonNegative(toNumber(r.conversions)),
      revenue: nonNegative(toNumber(r.revenue)),
    }));

  // T010: GA4 funnel
  const ga4FunnelRows = results[24].rows ?? [];
  const funnelMap: Record<string, number> = {};
  for (const r of ga4FunnelRows) {
    funnelMap[String(r.event_name)] = nonNegative(toNumber(r.event_count));
  }
  const FORM_SUBMIT_EVENTS = [
    'neon_form_submit', 'contact_form_submit',
    'wholesale_quote_form_submit', 'become_a_partner_form_submit',
    'channel_letter_quote_form_submit',
  ];
  const formSubmitTotal = FORM_SUBMIT_EVENTS.reduce((s, e) => s + (funnelMap[e] ?? 0), 0);
  const ga4_funnel: MarketingGA4Funnel = {
    view_item: funnelMap['view_item'] ?? 0,
    add_to_cart: funnelMap['add_to_cart'] ?? 0,
    begin_checkout: funnelMap['begin_checkout'] ?? 0,
    purchase: funnelMap['purchase'] ?? 0,
    form_start: funnelMap['form_start'] ?? 0,
    form_submit: formSubmitTotal,
  };

  // T011/T012: Google Ads overview + campaigns
  const adsOverviewRow = results[25].rows[0] ?? {};
  const google_ads_overview: MarketingGoogleAdsOverview = {
    spend: nonNegative(toNumber(adsOverviewRow.spend)),
    impressions: nonNegative(toNumber(adsOverviewRow.impressions)),
    clicks: nonNegative(toNumber(adsOverviewRow.clicks)),
    conversions: nonNegative(toNumber(adsOverviewRow.conversions)),
    cpc: nonNegative(toNumber(adsOverviewRow.cpc)),
    ctr: clamp(toNumber(adsOverviewRow.ctr), 0, 1),
    roas: nonNegative(toNumber(adsOverviewRow.roas)),
  };

  const google_ads_campaigns: MarketingGoogleAdsCampaign[] = (results[26].rows ?? [])
    .filter((r: Row) => r.campaign_name != null)
    .map((r: Row) => ({
      campaign_name: String(r.campaign_name),
      campaign_id: String(r.campaign_id ?? ''),
      spend: nonNegative(toNumber(r.spend)),
      impressions: nonNegative(toNumber(r.impressions)),
      clicks: nonNegative(toNumber(r.clicks)),
      conversions: nonNegative(toNumber(r.conversions)),
      cpc: nonNegative(toNumber(r.cpc)),
      ctr: clamp(toNumber(r.ctr), 0, 1),
      roas: nonNegative(toNumber(r.roas)),
    }));

  // Timeseries (indices shifted due to Core 4 queries)
  let timeseries: MarketingTimeseries | undefined;
  if (opts.includeTimeseries && results.length > 39) {
    timeseries = {
      sessions: mapTimeseries(results[39].rows),
      submissions: mapTimeseries(results[40].rows),
      pipeline_value_usd: mapTimeseries(results[41].rows),
      impressions: mapTimeseries(results[42].rows),
      clicks: mapTimeseries(results[43].rows),
    };
  }

  // T015: Core 4 engine aggregation
  // Note: WARM_OUTREACH_SQL queries dashboard_sources (lifetime view, no date column).
  // Quotes/pipeline are identical for current and previous — deltas will be 0%.
  // Sessions ARE date-filtered via GA4 channel_session_summary (indices 28/29).
  const warmRow = results[27].rows[0] ?? {};
  const warmSessionsCur = results[28].rows[0] ?? {};
  const warmSessionsPrev = results[29].rows[0] ?? {};
  const warmCurrent = buildCore4EngineMetrics('warm_outreach', {
    sessions: nonNegative(toNumber(warmSessionsCur.sessions)),
    clicks: 0,
    quotes: nonNegative(toNumber(warmRow.quotes)),
    pipeline_value_usd: nonNegative(toNumber(warmRow.pipeline_value_usd)),
    spend: 0,
  });
  const warmPrevious = buildCore4EngineMetrics('warm_outreach', {
    sessions: nonNegative(toNumber(warmSessionsPrev.sessions)),
    clicks: 0,
    quotes: nonNegative(toNumber(warmRow.quotes)),
    pipeline_value_usd: nonNegative(toNumber(warmRow.pipeline_value_usd)),
    spend: 0,
  });

  // Note: POST_FREE_CONTENT_SQL queries metrics_search_console_page (lifetime view, no date column).
  // Clicks/impressions are identical for current and previous — deltas will be 0%.
  // Sessions and conversions ARE date-filtered (indices 31-34).
  const contentSearchRow = results[30].rows[0] ?? {};
  const contentSessionsCur = results[31].rows[0] ?? {};
  const contentSessionsPrev = results[32].rows[0] ?? {};
  const contentConvCur = results[33].rows[0] ?? {};
  const contentConvPrev = results[34].rows[0] ?? {};
  const contentCurrent = buildCore4EngineMetrics('post_free_content', {
    sessions: nonNegative(toNumber(contentSessionsCur.sessions)),
    clicks: nonNegative(toNumber(contentSearchRow.clicks)),
    quotes: nonNegative(toNumber(contentConvCur.quotes)),
    pipeline_value_usd: nonNegative(toNumber(contentConvCur.pipeline_value_usd)),
    spend: 0,
  });
  const contentPrevious = buildCore4EngineMetrics('post_free_content', {
    sessions: nonNegative(toNumber(contentSessionsPrev.sessions)),
    clicks: nonNegative(toNumber(contentSearchRow.clicks)),
    quotes: nonNegative(toNumber(contentConvPrev.quotes)),
    pipeline_value_usd: nonNegative(toNumber(contentConvPrev.pipeline_value_usd)),
    spend: 0,
  });

  const paidAdsCurRow = results[35].rows[0] ?? {};
  const paidAdsPrevRow = results[36].rows[0] ?? {};
  const paidAdsSessionsCur = results[37].rows[0] ?? {};
  const paidAdsSessionsPrev = results[38].rows[0] ?? {};
  const paidAdsCurrent = buildCore4EngineMetrics('run_paid_ads', {
    sessions: nonNegative(toNumber(paidAdsSessionsCur.sessions)),
    clicks: nonNegative(toNumber(paidAdsCurRow.clicks)),
    quotes: nonNegative(toNumber(paidAdsCurRow.conversions)),
    pipeline_value_usd: nonNegative(toNumber(paidAdsCurRow.pipeline_value_usd)),
    spend: nonNegative(toNumber(paidAdsCurRow.spend)),
  });
  const paidAdsPrevious = buildCore4EngineMetrics('run_paid_ads', {
    sessions: nonNegative(toNumber(paidAdsSessionsPrev.sessions)),
    clicks: nonNegative(toNumber(paidAdsPrevRow.clicks)),
    quotes: nonNegative(toNumber(paidAdsPrevRow.conversions)),
    pipeline_value_usd: nonNegative(toNumber(paidAdsPrevRow.pipeline_value_usd)),
    spend: nonNegative(toNumber(paidAdsPrevRow.spend)),
  });

  const coldCurrent = zeroCore4Metrics('cold_outreach');
  const coldPrevious = zeroCore4Metrics('cold_outreach');

  const core4_summary: Core4Summary = {
    warm_outreach: buildCore4Comparison(warmCurrent, warmPrevious),
    cold_outreach: buildCore4Comparison(coldCurrent, coldPrevious),
    post_free_content: buildCore4Comparison(contentCurrent, contentPrevious),
    run_paid_ads: buildCore4Comparison(paidAdsCurrent, paidAdsPrevious),
  };

  return {
    kpis,
    comparisons,
    pages,
    sources,
    seo_queries,
    timeseries,
    anomalies,
    data_freshness,
    device_breakdown,
    country_breakdown,
    pipeline_categories,
    recent_conversions,
    seo_movers,
    funnel,
    pipeline_health,
    channel_performance,
    ga4_funnel,
    google_ads_overview,
    google_ads_campaigns,
    core4_summary,
  };
}
