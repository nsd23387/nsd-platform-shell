/**
 * Marketing Overview API Route
 *
 * GET /api/activity-spine/marketing/overview?period=7d|30d|90d
 *
 * Aggregates read-only marketing metrics from canonical analytics views:
 *   analytics.metrics_page_engagement_daily
 *   analytics.metrics_search_console_page
 *   analytics.conversion_metrics_daily
 *   analytics.dashboard_pages
 *   analytics.dashboard_sources
 *
 * No raw table access. No writes. No caching.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type {
  MarketingPeriod,
  MarketingKPIs,
  MarketingPage,
  MarketingSource,
  MarketingOverviewResponse,
  ActivitySpineResponse,
} from '../../../../../types/activity-spine';

// ============================================
// Connection pool (same pattern as other routes)
// ============================================

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

// ============================================
// Period validation
// ============================================

const VALID_PERIODS: Record<string, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
};

function isValidPeriod(value: string): value is MarketingPeriod {
  return value in VALID_PERIODS;
}

// ============================================
// Default (empty) response
// ============================================

const EMPTY_KPIS: MarketingKPIs = {
  sessions: 0,
  page_views: 0,
  bounce_rate: 0,
  avg_time_on_page_seconds: 0,
  total_submissions: 0,
  total_pipeline_value_usd: 0,
  organic_clicks: 0,
  impressions: 0,
  avg_position: 0,
};

// ============================================
// SQL Queries
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
  WHERE metric_date >= NOW() - $1::interval
`;

const KPI_CONVERSION_SQL = `
  SELECT
    COALESCE(SUM(total_submissions), 0)        AS total_submissions,
    COALESCE(SUM(total_pipeline_value_usd), 0) AS total_pipeline_value_usd
  FROM analytics.conversion_metrics_daily
  WHERE conversion_date >= NOW() - $1::interval
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
    WHERE metric_date >= NOW() - $1::interval
    GROUP BY page_path
  ) e
  FULL OUTER JOIN analytics.metrics_search_console_page s
    ON e.page_path = s.page_url
  FULL OUTER JOIN analytics.dashboard_pages d
    ON COALESCE(e.page_path, s.page_url) = d.page_url
  ORDER BY COALESCE(e.sessions, 0) DESC
  LIMIT 100
`;

const SOURCES_SQL = `
  SELECT
    submission_source,
    COALESCE(submissions, 0)        AS submissions,
    COALESCE(pipeline_value_usd, 0) AS pipeline_value_usd
  FROM analytics.dashboard_sources
  ORDER BY COALESCE(pipeline_value_usd, 0) DESC
`;

// ============================================
// Helpers
// ============================================

function toNumber(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

// ============================================
// GET handler
// ============================================

export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get('period') || '30d';

  if (!isValidPeriod(periodParam)) {
    return NextResponse.json(
      { error: `Invalid period "${periodParam}". Must be one of: 7d, 30d, 90d` },
      { status: 400 }
    );
  }

  const period: MarketingPeriod = periodParam;
  const interval = VALID_PERIODS[period];

  if (!isDatabaseConfigured()) {
    const body: ActivitySpineResponse<MarketingOverviewResponse> = {
      data: {
        period,
        generated_at: new Date().toISOString(),
        kpis: EMPTY_KPIS,
        pages: [],
        sources: [],
      },
      timestamp: new Date().toISOString(),
      orgId: 'unconfigured',
    };
    return NextResponse.json(body);
  }

  try {
    const db = getPool();

    const [engagementRes, conversionRes, searchRes, pagesRes, sourcesRes] =
      await Promise.all([
        db.query(KPI_ENGAGEMENT_SQL, [interval]),
        db.query(KPI_CONVERSION_SQL, [interval]),
        db.query(KPI_SEARCH_SQL),
        db.query(PAGES_SQL, [interval]),
        db.query(SOURCES_SQL),
      ]);

    const eng = engagementRes.rows[0] ?? {};
    const conv = conversionRes.rows[0] ?? {};
    const sch = searchRes.rows[0] ?? {};

    const kpis: MarketingKPIs = {
      sessions: toNumber(eng.sessions),
      page_views: toNumber(eng.page_views),
      bounce_rate: toNumber(eng.bounce_rate),
      avg_time_on_page_seconds: toNumber(eng.avg_time_on_page_seconds),
      total_submissions: toNumber(conv.total_submissions),
      total_pipeline_value_usd: toNumber(conv.total_pipeline_value_usd),
      organic_clicks: toNumber(sch.organic_clicks),
      impressions: toNumber(sch.impressions),
      avg_position: toNumber(sch.avg_position),
    };

    const pages: MarketingPage[] = (pagesRes.rows ?? [])
      .filter((r: Record<string, unknown>) => r.page_url != null)
      .map((r: Record<string, unknown>) => ({
        page_url: String(r.page_url),
        sessions: toNumber(r.sessions),
        page_views: toNumber(r.page_views),
        bounce_rate: toNumber(r.bounce_rate),
        avg_time_on_page_seconds: toNumber(r.avg_time_on_page_seconds),
        clicks: toNumber(r.clicks),
        impressions: toNumber(r.impressions),
        ctr: toNumber(r.ctr),
        submissions: toNumber(r.submissions),
        pipeline_value_usd: toNumber(r.pipeline_value_usd),
      }));

    const sources: MarketingSource[] = (sourcesRes.rows ?? [])
      .filter((r: Record<string, unknown>) => r.submission_source != null)
      .map((r: Record<string, unknown>) => ({
        submission_source: String(r.submission_source),
        submissions: toNumber(r.submissions),
        pipeline_value_usd: toNumber(r.pipeline_value_usd),
      }));

    const overview: MarketingOverviewResponse = {
      period,
      generated_at: new Date().toISOString(),
      kpis,
      pages,
      sources,
    };

    const body: ActivitySpineResponse<MarketingOverviewResponse> = {
      data: overview,
      timestamp: new Date().toISOString(),
      orgId: 'analytics',
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('[marketing/overview] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing overview' },
      { status: 500 }
    );
  }
}
