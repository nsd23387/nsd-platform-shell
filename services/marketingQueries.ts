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
};

export function canonicalSource(raw: string | null | undefined): string {
  if (raw == null) return 'other';
  return SOURCE_TAXONOMY[raw.toLowerCase().trim()] ?? 'other';
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

const PAGES_SQL = `
  SELECT
    COALESCE(e.page_path, s.page_url, d.page_url) AS page_url,
    COALESCE(e.sessions, 0)                        AS sessions,
    COALESCE(e.page_views, 0)                      AS page_views,
    COALESCE(e.bounce_rate, 0)                     AS bounce_rate,
    COALESCE(e.avg_time_on_page_seconds, 0)        AS avg_time_on_page_seconds,
    COALESCE(s.clicks, 0)                          AS clicks,
    COALESCE(s.impressions, 0)                     AS impressions,
    COALESCE(s.ctr, 0)                             AS ctr,
    COALESCE(d.submissions, 0)                     AS submissions,
    COALESCE(d.pipeline_value_usd, 0)              AS pipeline_value_usd
  FROM (
    SELECT
      page_path,
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
    GROUP BY page_path
  ) e
  FULL OUTER JOIN analytics.metrics_search_console_page s
    ON e.page_path = s.page_url
  FULL OUTER JOIN analytics.dashboard_pages d
    ON COALESCE(e.page_path, s.page_url) = d.page_url
  ORDER BY COALESCE(e.sessions, 0) DESC
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
// T003: Device & Country breakdown from raw_search_console payload
// ============================================

const DEVICE_BREAKDOWN_SQL = `
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

const COUNTRY_BREAKDOWN_SQL = `
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

export interface MarketingQueryOptions {
  startDate: string;
  endDate: string;
  prevStartDate: string;
  prevEndDate: string;
  includeTimeseries: boolean;
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
}

export async function executeMarketingQueries(
  db: Pool,
  opts: MarketingQueryOptions
): Promise<MarketingQueryResult> {
  const curParams = [opts.startDate, opts.endDate];
  const prevParams = [opts.prevStartDate, opts.prevEndDate];

  const queries: Promise<{ rows: Row[] }>[] = [
    /* 0  */ db.query(KPI_ENGAGEMENT_SQL, curParams),
    /* 1  */ db.query(KPI_CONVERSION_SQL, curParams),
    /* 2  */ db.query(KPI_SEARCH_SQL),
    /* 3  */ db.query(PAGES_SQL, curParams),
    /* 4  */ db.query(SOURCES_SQL),
    /* 5  */ db.query(FRESHNESS_SQL),
    /* 6  */ db.query(KPI_ENGAGEMENT_SQL, prevParams),
    /* 7  */ db.query(KPI_CONVERSION_SQL, prevParams),
    /* 8  */ db.query(SEO_QUERIES_SQL),
    /* 9  */ db.query(ANOMALY_SESSIONS_SQL, curParams),
    /* 10 */ db.query(ANOMALY_SUBMISSIONS_SQL, curParams),
    /* 11 */ db.query(ANOMALY_PIPELINE_SQL, curParams),
    /* 12 */ db.query(KPI_FUNNEL_FALLBACK_SQL, curParams),
    /* 13 */ db.query(KPI_FUNNEL_FALLBACK_SQL, prevParams),
    /* 14 */ db.query(DEVICE_BREAKDOWN_SQL, curParams),
    /* 15 */ db.query(COUNTRY_BREAKDOWN_SQL, curParams),
    /* 16 */ db.query(PIPELINE_CATEGORY_SQL),
    /* 17 */ db.query(RECENT_CONVERSIONS_SQL),
    /* 18 */ db.query(SEO_MOVERS_SQL, curParams),
    /* 19 */ db.query(FUNNEL_SQL),
    /* 20 */ db.query(PIPELINE_HEALTH_SQL),
  ];

  if (opts.includeTimeseries) {
    queries.push(
      /* 21 */ db.query(TIMESERIES_SESSIONS_SQL, curParams),
      /* 22 */ db.query(TIMESERIES_SUBMISSIONS_SQL, curParams),
      /* 23 */ db.query(TIMESERIES_PIPELINE_SQL, curParams),
      /* 24 */ db.query(TIMESERIES_IMPRESSIONS_SQL, curParams),
      /* 25 */ db.query(TIMESERIES_CLICKS_SQL, curParams),
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

  // T003: Device & Country
  const device_breakdown: MarketingDeviceBreakdown[] = (results[14].rows ?? [])
    .filter((r: Row) => r.device != null)
    .map((r: Row) => ({
      device: String(r.device),
      impressions: nonNegative(toNumber(r.impressions)),
      clicks: nonNegative(toNumber(r.clicks)),
      ctr: clamp(toNumber(r.ctr), 0, 1),
    }));

  const country_breakdown: MarketingCountryBreakdown[] = (results[15].rows ?? [])
    .filter((r: Row) => r.country != null)
    .map((r: Row) => ({
      country: String(r.country),
      impressions: nonNegative(toNumber(r.impressions)),
      clicks: nonNegative(toNumber(r.clicks)),
      ctr: clamp(toNumber(r.ctr), 0, 1),
    }));

  // T004: Pipeline categories
  const pipeline_categories: MarketingPipelineCategory[] = (results[16].rows ?? [])
    .filter((r: Row) => r.product_category != null)
    .map((r: Row) => ({
      product_category: String(r.product_category),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  // T005: Recent conversions
  const recent_conversions: MarketingConversionEvent[] = (results[17].rows ?? [])
    .map((r: Row) => ({
      created_at: String(r.created_at ?? ''),
      product_category: String(r.product_category ?? 'Unknown'),
      preliminary_price_usd: nonNegative(toNumber(r.preliminary_price_usd)),
      submission_source: String(r.submission_source ?? 'Unknown'),
    }));

  // T006: SEO movers
  const seo_movers: MarketingSEOQueryMover[] = (results[18].rows ?? [])
    .filter((r: Row) => r.query != null)
    .map((r: Row) => ({
      query: String(r.query),
      impressions_first_half: nonNegative(toNumber(r.impressions_first_half)),
      impressions_second_half: nonNegative(toNumber(r.impressions_second_half)),
      delta_pct: toNumber(r.delta_pct),
      direction: String(r.direction) as 'rising' | 'falling',
    }));

  // T007: Funnel
  const funnel: MarketingFunnelStep[] = (results[19].rows ?? [])
    .map((r: Row) => ({
      date: String(r.date ?? ''),
      page_views: nonNegative(toNumber(r.page_views)),
      submissions: nonNegative(toNumber(r.submissions)),
      conversion_rate: clamp(toNumber(r.conversion_rate), 0, 1),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  // T008: Pipeline health
  const pipeline_health: MarketingPipelineHealth[] = (results[20].rows ?? [])
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

  // Timeseries
  let timeseries: MarketingTimeseries | undefined;
  if (opts.includeTimeseries && results.length > 21) {
    timeseries = {
      sessions: mapTimeseries(results[21].rows),
      submissions: mapTimeseries(results[22].rows),
      pipeline_value_usd: mapTimeseries(results[23].rows),
      impressions: mapTimeseries(results[24].rows),
      clicks: mapTimeseries(results[25].rows),
    };
  }

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
  };
}
