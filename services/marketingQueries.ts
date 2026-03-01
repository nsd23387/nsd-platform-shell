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
  MarketingPage,
  MarketingSource,
  MarketingDataFreshness,
} from '../types/activity-spine';

// ============================================
// SQL — KPI aggregation
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
  WHERE conversion_date BETWEEN $1 AND $2
`;

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
    (SELECT MAX(metric_date)::text     FROM analytics.metrics_search_console_page)   AS search_console_last_date,
    (SELECT MAX(conversion_date)::text FROM analytics.conversion_metrics_daily)      AS conversion_last_date
`;

// ============================================
// Query execution
// ============================================

export interface MarketingQueryResult {
  kpis: MarketingKPIs;
  pages: MarketingPage[];
  sources: MarketingSource[];
  data_freshness: MarketingDataFreshness;
}

export async function executeMarketingQueries(
  db: Pool,
  startDate: string,
  endDate: string
): Promise<MarketingQueryResult> {
  const dateParams = [startDate, endDate];

  const [engagementRes, conversionRes, searchRes, pagesRes, sourcesRes, freshnessRes] =
    await Promise.all([
      db.query(KPI_ENGAGEMENT_SQL, dateParams),
      db.query(KPI_CONVERSION_SQL, dateParams),
      db.query(KPI_SEARCH_SQL),
      db.query(PAGES_SQL, dateParams),
      db.query(SOURCES_SQL),
      db.query(FRESHNESS_SQL),
    ]);

  const eng = engagementRes.rows[0] ?? {};
  const conv = conversionRes.rows[0] ?? {};
  const sch = searchRes.rows[0] ?? {};
  const fresh = freshnessRes.rows[0] ?? {};

  const sessions = nonNegative(toNumber(eng.sessions));
  const pageViews = nonNegative(toNumber(eng.page_views));
  const bounceRate = clamp(toNumber(eng.bounce_rate), 0, 1);
  const avgTime = nonNegative(toNumber(eng.avg_time_on_page_seconds));
  const submissions = nonNegative(toNumber(conv.total_submissions));
  const pipeline = nonNegative(toNumber(conv.total_pipeline_value_usd));
  const clicks = nonNegative(toNumber(sch.organic_clicks));
  const impressions = nonNegative(toNumber(sch.impressions));
  const avgPosition = nonNegative(toNumber(sch.avg_position));

  const kpis: MarketingKPIs = {
    sessions,
    page_views: pageViews,
    bounce_rate: bounceRate,
    avg_time_on_page_seconds: avgTime,
    total_submissions: submissions,
    total_pipeline_value_usd: pipeline,
    organic_clicks: clicks,
    impressions,
    avg_position: avgPosition,
    revenue_per_session: safeDivide(pipeline, sessions),
    revenue_per_click: safeDivide(pipeline, clicks),
    submissions_per_session: safeDivide(submissions, sessions),
    submissions_per_click: safeDivide(submissions, clicks),
  };

  const pages: MarketingPage[] = (pagesRes.rows ?? [])
    .filter((r: Record<string, unknown>) => r.page_url != null)
    .map((r: Record<string, unknown>) => ({
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

  const sources: MarketingSource[] = (sourcesRes.rows ?? [])
    .filter((r: Record<string, unknown>) => r.submission_source != null)
    .map((r: Record<string, unknown>) => ({
      submission_source: String(r.submission_source),
      submissions: nonNegative(toNumber(r.submissions)),
      pipeline_value_usd: nonNegative(toNumber(r.pipeline_value_usd)),
    }));

  const data_freshness: MarketingDataFreshness = {
    engagement_last_date: fresh.engagement_last_date ?? null,
    search_console_last_date: fresh.search_console_last_date ?? null,
    conversion_last_date: fresh.conversion_last_date ?? null,
  };

  return { kpis, pages, sources, data_freshness };
}
