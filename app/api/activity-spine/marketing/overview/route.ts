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
 * Legacy compat: ?period=7d|30d|90d still accepted.
 *
 * Thin handler — all SQL lives in services/marketingQueries.ts.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import type {
  MarketingPreset,
  MarketingPeriodBlock,
  MarketingOverviewResponse,
  MarketingMeta,
  MarketingKPIs,
  MarketingKPIComparisons,
  MarketingAnomalies,
  ActivitySpineResponse,
} from '../../../../../types/activity-spine';
import { executeMarketingQueries } from '../../../../../services/marketingQueries';

// ============================================
// Connection pool
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

function computePreviousPeriod(start: string, end: string): { prevStart: string; prevEnd: string } {
  const startMs = new Date(start + 'T00:00:00Z').getTime();
  const endMs = new Date(end + 'T00:00:00Z').getTime();
  const durationMs = endMs - startMs;
  const prevEndMs = startMs - MS_PER_DAY;
  const prevStartMs = prevEndMs - durationMs;
  return {
    prevStart: formatUTCDate(new Date(prevStartMs)),
    prevEnd: formatUTCDate(new Date(prevEndMs)),
  };
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
  const { prevStart, prevEnd } = computePreviousPeriod(start, end);
  const includeTimeseries = request.nextUrl.searchParams.get('include_timeseries') === 'true';
  const periodBlock: MarketingPeriodBlock = { start, end, granularity: 'day' };

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
      },
      timestamp: new Date().toISOString(),
      orgId: 'unconfigured',
    };
    return NextResponse.json(body);
  }

  try {
    const db = getPool();
    const t0 = performance.now();

    const result = await executeMarketingQueries(db, {
      startDate: start,
      endDate: end,
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
      includeTimeseries,
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
