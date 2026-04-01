/**
 * Marketing Overview API Route
 *
 * GET /api/activity-spine/marketing/overview
 *
 * Accepts either:
 *   ?preset=last_7d|last_30d|last_90d|mtd|qtd|ytd
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD
 *   (default: last_30d)
 *
 * Optional: ?include_timeseries=true
 * Optional: ?comparison=prev_period|wow|mom (default: prev_period)
 *   - prev_period: compare against the immediately preceding period of equal duration
 *   - wow: compare against the same date range shifted back 7 days (week-over-week)
 *   - mom: compare against the same date range shifted back 1 month (month-over-month)
 * Legacy compat: ?period=7d|30d|90d still accepted.
 *
 * Thin handler — all SQL lives in services/marketingQueries.ts.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type {
  MarketingPreset,
  MarketingComparisonMode,
  MarketingPeriodBlock,
  MarketingOverviewResponse,
  MarketingMeta,
  MarketingKPIs,
  MarketingKPIComparisons,
  MarketingAnomalies,
  ActivitySpineResponse,
  Core4Summary,
} from '../../../../../types/activity-spine';
import { executeMarketingQueries } from '../../../../../services/marketingQueries';
import type { MarketingFilters } from '../../../../../services/marketingQueries';

// ============================================
// Connection pool
// ============================================

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 15,
      statement_timeout: 10000,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

// ============================================
// Date resolution
// ============================================

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 3 * 365;
const MS_PER_DAY = 86_400_000;

const VALID_PRESETS: MarketingPreset[] = [
  'last_7d', 'last_30d', 'last_90d', 'mtd', 'qtd', 'ytd',
];

const LEGACY_PERIOD_MAP: Record<string, MarketingPreset> = {
  '7d': 'last_7d',
  '30d': 'last_30d',
  '90d': 'last_90d',
};

function formatUTCDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function resolvePreset(preset: MarketingPreset): { start: string; end: string } {
  const now = new Date();
  const end = formatUTCDate(now);

  switch (preset) {
    case 'last_7d': {
      const s = new Date(now); s.setUTCDate(s.getUTCDate() - 6);
      return { start: formatUTCDate(s), end };
    }
    case 'last_30d': {
      const s = new Date(now); s.setUTCDate(s.getUTCDate() - 29);
      return { start: formatUTCDate(s), end };
    }
    case 'last_90d': {
      const s = new Date(now); s.setUTCDate(s.getUTCDate() - 89);
      return { start: formatUTCDate(s), end };
    }
    case 'mtd': {
      return { start: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`, end };
    }
    case 'qtd': {
      const qMonth = Math.floor(now.getUTCMonth() / 3) * 3 + 1;
      return { start: `${now.getUTCFullYear()}-${String(qMonth).padStart(2, '0')}-01`, end };
    }
    case 'ytd': {
      return { start: `${now.getUTCFullYear()}-01-01`, end };
    }
  }
}

const VALID_COMPARISON_MODES: MarketingComparisonMode[] = ['prev_period', 'wow', 'mom'];

function computeComparisonPeriod(
  start: string,
  end: string,
  mode: MarketingComparisonMode
): { prevStart: string; prevEnd: string } {
  const startDate = new Date(start + 'T00:00:00Z');
  const endDate = new Date(end + 'T00:00:00Z');

  switch (mode) {
    case 'wow': {
      const prevStart = new Date(startDate);
      prevStart.setUTCDate(prevStart.getUTCDate() - 7);
      const prevEnd = new Date(endDate);
      prevEnd.setUTCDate(prevEnd.getUTCDate() - 7);
      return {
        prevStart: formatUTCDate(prevStart),
        prevEnd: formatUTCDate(prevEnd),
      };
    }
    case 'mom': {
      const prevStart = new Date(startDate);
      prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);
      const prevEnd = new Date(endDate);
      prevEnd.setUTCMonth(prevEnd.getUTCMonth() - 1);
      return {
        prevStart: formatUTCDate(prevStart),
        prevEnd: formatUTCDate(prevEnd),
      };
    }
    case 'prev_period':
    default: {
      const durationMs = endDate.getTime() - startDate.getTime();
      const prevEndMs = startDate.getTime() - MS_PER_DAY;
      const prevStartMs = prevEndMs - durationMs;
      return {
        prevStart: formatUTCDate(new Date(prevStartMs)),
        prevEnd: formatUTCDate(new Date(prevEndMs)),
      };
    }
  }
}

interface DateRange { start: string; end: string }

function parseDateParams(searchParams: URLSearchParams): DateRange | { error: string } {
  const preset = searchParams.get('preset');
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const legacyPeriod = searchParams.get('period');

  const hasPreset = preset != null;
  const hasRange = start != null || end != null;
  const hasLegacy = legacyPeriod != null;

  if (hasPreset && hasRange) {
    return { error: 'Cannot provide both preset and start/end. Use one or the other.' };
  }
  if (hasPreset) {
    if (!VALID_PRESETS.includes(preset as MarketingPreset)) {
      return { error: `Invalid preset "${preset}". Must be one of: ${VALID_PRESETS.join(', ')}` };
    }
    return resolvePreset(preset as MarketingPreset);
  }
  if (hasRange) {
    if (!start || !end) return { error: 'Both start and end are required for explicit date range.' };
    if (!ISO_DATE_RE.test(start) || !ISO_DATE_RE.test(end)) return { error: 'Dates must be in YYYY-MM-DD format.' };
    if (start > end) return { error: 'start must not be after end.' };
    const diffDays = (new Date(end).getTime() - new Date(start).getTime()) / MS_PER_DAY;
    if (diffDays > MAX_RANGE_DAYS) return { error: `Date range exceeds maximum of ${MAX_RANGE_DAYS} days.` };
    return { start, end };
  }
  if (hasLegacy && legacyPeriod in LEGACY_PERIOD_MAP) return resolvePreset(LEGACY_PERIOD_MAP[legacyPeriod]);
  if (hasLegacy) return { error: `Invalid period "${legacyPeriod}". Must be one of: 7d, 30d, 90d` };

  return resolvePreset('last_30d');
}

const VALID_FILTER_KEYS: (keyof MarketingFilters)[] = ['channel', 'campaign', 'device', 'geo', 'landing_page'];

function parseFilters(searchParams: URLSearchParams): MarketingFilters | undefined {
  const filters: MarketingFilters = {};
  let hasAny = false;
  for (const key of VALID_FILTER_KEYS) {
    const val = searchParams.get(key);
    if (val != null && val.trim() !== '') {
      (filters as Record<string, string>)[key] = val.trim();
      hasAny = true;
    }
  }
  return hasAny ? filters : undefined;
}

// ============================================
// Empty defaults
// ============================================

const ZERO_COMP = { current: 0, previous: 0, delta_pct: 0 };

const EMPTY_KPIS: MarketingKPIs = {
  sessions: 0, page_views: 0, bounce_rate: 0, avg_time_on_page_seconds: 0,
  total_submissions: 0, total_pipeline_value_usd: 0,
  organic_clicks: 0, impressions: 0, avg_position: 0,
  revenue_per_session: 0, revenue_per_click: 0,
  submissions_per_session: 0, submissions_per_click: 0,
};

const EMPTY_COMPARISONS: MarketingKPIComparisons = {
  sessions: ZERO_COMP, page_views: ZERO_COMP,
  total_submissions: ZERO_COMP, total_pipeline_value_usd: ZERO_COMP,
  organic_clicks: ZERO_COMP, impressions: ZERO_COMP,
};

const EMPTY_ANOMALIES: MarketingAnomalies = {
  sessions_spike: false, submissions_spike: false, pipeline_spike: false,
};

const EMPTY_META: MarketingMeta = {
  query_execution_ms: 0,
  row_counts: { pages: 0, sources: 0 },
  data_freshness: { engagement_last_date: null, search_console_last_date: null, conversion_last_date: null },
};

// ============================================
// GET handler
// ============================================

export async function GET(request: NextRequest) {
  const parsed = parseDateParams(request.nextUrl.searchParams);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { start, end } = parsed;
  const comparisonParam = request.nextUrl.searchParams.get('comparison');
  let comparisonMode: MarketingComparisonMode = 'prev_period';
  if (comparisonParam) {
    if (!VALID_COMPARISON_MODES.includes(comparisonParam as MarketingComparisonMode)) {
      return NextResponse.json(
        { error: `Invalid comparison mode "${comparisonParam}". Must be one of: ${VALID_COMPARISON_MODES.join(', ')}` },
        { status: 400 }
      );
    }
    comparisonMode = comparisonParam as MarketingComparisonMode;
  }
  const { prevStart, prevEnd } = computeComparisonPeriod(start, end, comparisonMode);
  const includeTimeseries = request.nextUrl.searchParams.get('include_timeseries') === 'true';
  const periodBlock: MarketingPeriodBlock = {
    start,
    end,
    granularity: 'day',
    comparison_mode: comparisonMode,
    comparison_start: prevStart,
    comparison_end: prevEnd,
  };

  if (!isDatabaseConfigured()) {
    const body: ActivitySpineResponse<MarketingOverviewResponse> = {
      data: {
        period: periodBlock,
        generated_at: new Date().toISOString(),
        kpis: EMPTY_KPIS,
        comparisons: EMPTY_COMPARISONS,
        pages: [],
        sources: [],
        seo_queries: [],
        anomalies: EMPTY_ANOMALIES,
        meta: EMPTY_META,
        device_breakdown: [],
        country_breakdown: [],
        pipeline_categories: [],
        recent_conversions: [],
        seo_movers: [],
        funnel: [],
        pipeline_health: [],
        channel_performance: [],
        ga4_funnel: { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 },
        google_ads_overview: { spend: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 0, ctr: 0, roas: 0 },
        google_ads_campaigns: [],
        core4_summary: {
          warm_outreach: { current: { engine: 'warm_outreach', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, previous: { engine: 'warm_outreach', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, deltas: { sessions_pct: 0, clicks_pct: 0, quotes_pct: 0, pipeline_value_usd_pct: 0, spend_pct: 0, cac_pct: 0, roas_pct: 0, quote_rate_pct: 0 } },
          cold_outreach: { current: { engine: 'cold_outreach', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, previous: { engine: 'cold_outreach', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, deltas: { sessions_pct: 0, clicks_pct: 0, quotes_pct: 0, pipeline_value_usd_pct: 0, spend_pct: 0, cac_pct: 0, roas_pct: 0, quote_rate_pct: 0 } },
          post_free_content: { current: { engine: 'post_free_content', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, previous: { engine: 'post_free_content', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, deltas: { sessions_pct: 0, clicks_pct: 0, quotes_pct: 0, pipeline_value_usd_pct: 0, spend_pct: 0, cac_pct: 0, roas_pct: 0, quote_rate_pct: 0 } },
          run_paid_ads: { current: { engine: 'run_paid_ads', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, previous: { engine: 'run_paid_ads', sessions: 0, clicks: 0, quotes: 0, pipeline_value_usd: 0, spend: 0, cac: 0, roas: 0, quote_rate: 0 }, deltas: { sessions_pct: 0, clicks_pct: 0, quotes_pct: 0, pipeline_value_usd_pct: 0, spend_pct: 0, cac_pct: 0, roas_pct: 0, quote_rate_pct: 0 } },
        },
      },
      timestamp: new Date().toISOString(),
      orgId: 'unconfigured',
    };
    return NextResponse.json(body);
  }

  try {
    const db = getPool();
    const t0 = performance.now();

    const filters = parseFilters(request.nextUrl.searchParams);

    const result = await executeMarketingQueries(db, {
      startDate: start,
      endDate: end,
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
      includeTimeseries,
      filters,
    });

    const queryMs = Math.round(performance.now() - t0);

    const meta: MarketingMeta = {
      query_execution_ms: queryMs,
      row_counts: { pages: result.pages.length, sources: result.sources.length },
      data_freshness: result.data_freshness,
    };

    const overview: MarketingOverviewResponse = {
      period: periodBlock,
      generated_at: new Date().toISOString(),
      kpis: result.kpis,
      comparisons: result.comparisons,
      pages: result.pages,
      sources: result.sources,
      seo_queries: result.seo_queries,
      anomalies: result.anomalies,
      meta,
      device_breakdown: result.device_breakdown,
      country_breakdown: result.country_breakdown,
      pipeline_categories: result.pipeline_categories,
      recent_conversions: result.recent_conversions,
      seo_movers: result.seo_movers,
      funnel: result.funnel,
      pipeline_health: result.pipeline_health,
      channel_performance: result.channel_performance,
      ga4_funnel: result.ga4_funnel,
      google_ads_overview: result.google_ads_overview,
      google_ads_campaigns: result.google_ads_campaigns,
      core4_summary: result.core4_summary,
    };

    if (result.timeseries) {
      overview.timeseries = result.timeseries;
    }

    const body: ActivitySpineResponse<MarketingOverviewResponse> = {
      data: overview,
      timestamp: new Date().toISOString(),
      orgId: 'analytics',
    };

    return NextResponse.json(body);
  } catch (error) {
    console.error('[marketing/overview] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing overview' }, { status: 500 });
  }
}
