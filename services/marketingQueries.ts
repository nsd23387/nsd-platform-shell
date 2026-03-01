/**
 * Marketing Analytics Query Service
 *
 * All SQL for /marketing/overview lives here.
 * Queries canonical analytics views only — no raw tables.
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
// Row helpers
// ============================================

type Row = Record<string, unknown>;

function buildKPIs(eng: Row, conv: Row, sch: Row): MarketingKPIs {
  const sessions = nonNegative(toNumber(eng.sessions));
  const pageViews = nonNegative(toNumber(eng.page_views));
  const bounceRate = clamp(toNumber(eng.bounce_rate), 0, 1);
  const avgTime = nonNegative(toNumber(eng.avg_time_on_page_seconds));
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
}

export async function executeMarketingQueries(
  db: Pool,
  opts: MarketingQueryOptions
): Promise<MarketingQueryResult> {
  const curParams = [opts.startDate, opts.endDate];
  const prevParams = [opts.prevStartDate, opts.prevEndDate];

  // Build parallel query batch.
  // KPI_SEARCH_SQL has no date params (lifetime view) so it is called
  // once and reused for both current and previous period KPI builds.
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
  ];

  if (opts.includeTimeseries) {
    queries.push(
      /* 12 */ db.query(TIMESERIES_SESSIONS_SQL, curParams),
      /* 13 */ db.query(TIMESERIES_SUBMISSIONS_SQL, curParams),
      /* 14 */ db.query(TIMESERIES_PIPELINE_SQL, curParams),
    );
  }

  const results = await Promise.all(queries);

  // KPI_SEARCH_SQL result (lifetime, no date filter) — shared between periods
  const searchRow = results[2].rows[0] ?? {};

  // Current-period KPIs
  const kpis = buildKPIs(
    results[0].rows[0] ?? {},
    results[1].rows[0] ?? {},
    searchRow,
  );

  // Previous-period KPIs for comparisons
  const prevKpis = buildKPIs(
    results[6].rows[0] ?? {},
    results[7].rows[0] ?? {},
    searchRow,
  );

  const comparisons: MarketingKPIComparisons = {
    sessions: buildComparison(kpis.sessions, prevKpis.sessions),
    page_views: buildComparison(kpis.page_views, prevKpis.page_views),
    total_submissions: buildComparison(kpis.total_submissions, prevKpis.total_submissions),
    total_pipeline_value_usd: buildComparison(kpis.total_pipeline_value_usd, prevKpis.total_pipeline_value_usd),
    organic_clicks: buildComparison(kpis.organic_clicks, prevKpis.organic_clicks),
    impressions: buildComparison(kpis.impressions, prevKpis.impressions),
  };

  // Pages
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

  // Sources with canonical taxonomy
  const sources: MarketingSource[] = (results[4].rows ?? [])
    .filter((r: Row) => r.submission_source != null)
    .map((r: Row) => ({
      submission_source: String(r.submission_source),
      canonical_source: canonicalSource(String(r.submission_source)),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  // Freshness
  const fresh = results[5].rows[0] ?? {};
  const data_freshness: MarketingDataFreshness = {
    engagement_last_date: (fresh.engagement_last_date as string) ?? null,
    search_console_last_date: (fresh.search_console_last_date as string) ?? null,
    conversion_last_date: (fresh.conversion_last_date as string) ?? null,
  };

  // SEO queries (index 8 after dedup)
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

  // Anomalies (indices 9-11 after dedup)
  const anomalies: MarketingAnomalies = {
    sessions_spike: detectSpike(results[9].rows[0] ?? {}),
    submissions_spike: detectSpike(results[10].rows[0] ?? {}),
    pipeline_spike: detectSpike(results[11].rows[0] ?? {}),
  };

  // Timeseries (indices 12-14, conditional)
  let timeseries: MarketingTimeseries | undefined;
  if (opts.includeTimeseries && results.length > 12) {
    timeseries = {
      sessions: mapTimeseries(results[12].rows),
      submissions: mapTimeseries(results[13].rows),
      pipeline_value_usd: mapTimeseries(results[14].rows),
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
  };
}
