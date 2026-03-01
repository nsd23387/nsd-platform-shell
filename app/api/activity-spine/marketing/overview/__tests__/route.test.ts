/**
 * Marketing Overview Route — Unit Tests
 *
 * Covers Phases A-E + all previous upgrade tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('pg', () => ({
  Pool: class MockPool { query = mockQuery; on = vi.fn(); },
}));

vi.stubEnv('DATABASE_URL', 'postgres://test:test@localhost:5432/test');

import { GET } from '../route';
import { NextRequest } from 'next/server';

function req(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

// ============================================
// Stub helpers
// ============================================

function stubEmpty() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources') || sql.includes('generate_series') || sql.includes('metrics_search_console_query')) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('MAX(')) return Promise.resolve({ rows: [{}] });
    if (sql.includes('STDDEV')) return Promise.resolve({ rows: [{ n: 0, mean: 0, stddev: 0, latest_val: 0 }] });
    return Promise.resolve({ rows: [{}] });
  });
}

function stubWithData() {
  mockQuery.mockImplementation((sql: string, params?: unknown[]) => {
    if (sql.includes('MAX(')) return Promise.resolve({ rows: [{ engagement_last_date: '2026-02-28', search_console_last_date: '2026-02-27', conversion_last_date: '2026-02-28' }] });
    if (sql.includes('generate_series') && sql.includes('sessions')) return Promise.resolve({ rows: [{ date: '2026-02-28', value: '100' }, { date: '2026-02-27', value: '90' }] });
    if (sql.includes('generate_series') && sql.includes('total_submissions')) return Promise.resolve({ rows: [{ date: '2026-02-28', value: '5' }] });
    if (sql.includes('generate_series') && sql.includes('total_pipeline_value_usd')) return Promise.resolve({ rows: [{ date: '2026-02-28', value: '1000' }] });
    if (sql.includes('STDDEV') && sql.includes('sessions')) return Promise.resolve({ rows: [{ n: 30, mean: 100, stddev: 10, latest_val: 130 }] });
    if (sql.includes('STDDEV') && sql.includes('total_submissions')) return Promise.resolve({ rows: [{ n: 30, mean: 5, stddev: 1, latest_val: 6 }] });
    if (sql.includes('STDDEV') && sql.includes('total_pipeline_value_usd')) return Promise.resolve({ rows: [{ n: 30, mean: 1000, stddev: 100, latest_val: 1100 }] });
    if (sql.includes('metrics_search_console_query')) return Promise.resolve({ rows: [{ query: 'neon signs', clicks: '200', impressions: '5000', ctr: '0.04', avg_position: '5.2', submissions: '3', pipeline_value_usd: '4500' }] });
    if (sql.includes('FULL OUTER JOIN')) return Promise.resolve({ rows: [{ page_url: '/products', sessions: '800', page_views: '1200', bounce_rate: '0.35', avg_time_on_page_seconds: '45', clicks: '300', impressions: '5000', ctr: '0.06', submissions: '20', pipeline_value_usd: '30000' }] });
    if (sql.includes('dashboard_sources')) return Promise.resolve({ rows: [{ submission_source: 'Google', submissions: '50', pipeline_value_usd: '75000' }, { submission_source: 'direct', submissions: '35', pipeline_value_usd: '50000' }] });

    // KPI queries — differentiate current vs previous by params
    const isCurrentPeriod = Array.isArray(params) && typeof params[0] === 'string' && params[0] >= '2026-02';

    if (sql.includes('metrics_page_engagement_daily')) {
      return Promise.resolve({ rows: [{ sessions: isCurrentPeriod ? '1200' : '1000', page_views: isCurrentPeriod ? '3400' : '3000', bounce_rate: '0.45', avg_time_on_page_seconds: '62.5' }] });
    }
    if (sql.includes('conversion_metrics_daily')) {
      return Promise.resolve({ rows: [{ total_submissions: isCurrentPeriod ? '85' : '70', total_pipeline_value_usd: isCurrentPeriod ? '125000' : '100000' }] });
    }
    if (sql.includes('metrics_search_console_page')) {
      return Promise.resolve({ rows: [{ organic_clicks: isCurrentPeriod ? '4500' : '4000', impressions: isCurrentPeriod ? '98000' : '90000', avg_position: '12.3' }] });
    }
    return Promise.resolve({ rows: [] });
  });
}

function stubAnomalySpike() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('STDDEV') && sql.includes('sessions')) return Promise.resolve({ rows: [{ n: 10, mean: 100, stddev: 10, latest_val: 250 }] });
    if (sql.includes('STDDEV') && sql.includes('total_submissions')) return Promise.resolve({ rows: [{ n: 10, mean: 5, stddev: 1, latest_val: 20 }] });
    if (sql.includes('STDDEV') && sql.includes('total_pipeline_value_usd')) return Promise.resolve({ rows: [{ n: 10, mean: 1000, stddev: 100, latest_val: 5000 }] });
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources') || sql.includes('metrics_search_console_query')) return Promise.resolve({ rows: [] });
    if (sql.includes('MAX(')) return Promise.resolve({ rows: [{}] });
    return Promise.resolve({ rows: [{}] });
  });
}

function stubNegativeAndNaN() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('metrics_page_engagement_daily') && !sql.includes('FULL OUTER') && !sql.includes('STDDEV') && !sql.includes('generate_series')) return Promise.resolve({ rows: [{ sessions: '-5', page_views: 'NaN', bounce_rate: '1.5', avg_time_on_page_seconds: '-10' }] });
    if (sql.includes('conversion_metrics_daily') && !sql.includes('STDDEV') && !sql.includes('generate_series')) return Promise.resolve({ rows: [{ total_submissions: 'Infinity', total_pipeline_value_usd: null }] });
    if (sql.includes('metrics_search_console_page') && !sql.includes('FULL OUTER') && !sql.includes('STDDEV')) return Promise.resolve({ rows: [{ organic_clicks: '-1', impressions: undefined, avg_position: '-3' }] });
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources') || sql.includes('metrics_search_console_query') || sql.includes('generate_series')) return Promise.resolve({ rows: [] });
    if (sql.includes('MAX(')) return Promise.resolve({ rows: [{}] });
    if (sql.includes('STDDEV')) return Promise.resolve({ rows: [{ n: 0, mean: 0, stddev: 0, latest_val: 0 }] });
    return Promise.resolve({ rows: [{}] });
  });
}

beforeEach(() => { mockQuery.mockReset(); });

// ============================================
// Existing tests (backward compatibility)
// ============================================

describe('backward compatibility', () => {
  it('returns 400 for invalid period', async () => {
    expect((await GET(req('/o?period=999'))).status).toBe(400);
  });

  it('defaults to last_30d', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.period.granularity).toBe('day');
    expect(data.period.start).toBeTruthy();
  });

  it('accepts legacy period=7d', async () => {
    stubEmpty();
    expect((await GET(req('/o?period=7d'))).status).toBe(200);
  });

  it('accepts legacy period=90d', async () => {
    stubEmpty();
    expect((await GET(req('/o?period=90d'))).status).toBe(200);
  });

  it('returns zeros and empty arrays when empty', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o?preset=last_30d'))).json();
    expect(data.kpis.sessions).toBe(0);
    expect(data.kpis.revenue_per_session).toBe(0);
    expect(data.pages).toEqual([]);
    expect(data.sources).toEqual([]);
  });

  it('returns ActivitySpineResponse wrapper', async () => {
    stubEmpty();
    const body = await (await GET(req('/o'))).json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('orgId');
  });

  it('returns populated KPIs, pages, sources', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.kpis.sessions).toBe(1200);
    expect(data.kpis.total_submissions).toBe(85);
    expect(data.pages).toHaveLength(1);
    expect(data.sources).toHaveLength(2);
  });

  it('is GET-only', async () => {
    const m = await import('../route');
    expect(m.GET).toBeDefined();
    expect((m as Record<string, unknown>).POST).toBeUndefined();
    expect((m as Record<string, unknown>).DELETE).toBeUndefined();
  });

  it('accepts presets (last_7d, mtd, qtd, ytd)', async () => {
    stubEmpty();
    for (const p of ['last_7d', 'mtd', 'qtd', 'ytd']) {
      expect((await GET(req(`/o?preset=${p}`))).status).toBe(200);
    }
  });

  it('rejects invalid preset', async () => {
    expect((await GET(req('/o?preset=garbage'))).status).toBe(400);
  });

  it('accepts explicit date range', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o?start=2026-01-01&end=2026-01-31'))).json();
    expect(data.period).toEqual({ start: '2026-01-01', end: '2026-01-31', granularity: 'day' });
  });

  it('rejects start > end', async () => {
    expect((await GET(req('/o?start=2026-02-01&end=2026-01-01'))).status).toBe(400);
  });

  it('rejects both preset and start/end', async () => {
    expect((await GET(req('/o?preset=last_7d&start=2026-01-01&end=2026-01-31'))).status).toBe(400);
  });

  it('rejects >3 year range', async () => {
    expect((await GET(req('/o?start=2020-01-01&end=2026-01-01'))).status).toBe(400);
  });

  it('rejects malformed dates', async () => {
    expect((await GET(req('/o?start=bad&end=2026-01-01'))).status).toBe(400);
  });

  it('has meta with query_execution_ms', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(typeof data.meta.query_execution_ms).toBe('number');
  });

  it('has meta.row_counts', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.meta.row_counts.pages).toBe(1);
    expect(data.meta.row_counts.sources).toBe(2);
  });

  it('has data_freshness', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.meta.data_freshness.engagement_last_date).toBe('2026-02-28');
  });

  it('efficiency metrics correct', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.kpis.revenue_per_session).toBeCloseTo(125000 / 1200, 3);
  });

  it('efficiency metrics 0 on zero denominator', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.kpis.revenue_per_session).toBe(0);
  });

  it('clamps negatives/NaN', async () => {
    stubNegativeAndNaN();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.kpis.sessions).toBe(0);
    expect(data.kpis.page_views).toBe(0);
    expect(data.kpis.bounce_rate).toBeLessThanOrEqual(1);
    expect(data.kpis.bounce_rate).toBeGreaterThanOrEqual(0);
  });

  it('no NaN in any KPI', async () => {
    stubNegativeAndNaN();
    const { data } = await (await GET(req('/o'))).json();
    for (const v of Object.values(data.kpis)) { expect(Number.isNaN(v)).toBe(false); }
  });

  it('passes BETWEEN dates to SQL', async () => {
    stubEmpty();
    await GET(req('/o?start=2026-02-01&end=2026-02-28'));
    const call = mockQuery.mock.calls.find((c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily') && !(c[0] as string).includes('FULL OUTER') && !(c[0] as string).includes('STDDEV') && !(c[0] as string).includes('generate_series'));
    expect(call).toBeTruthy();
    expect(call![1]).toEqual(['2026-02-01', '2026-02-28']);
  });
});

// ============================================
// Phase A — Previous-period comparison
// ============================================

describe('Phase A: comparisons', () => {
  it('returns comparisons object with all required keys', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.comparisons).toBeDefined();
    for (const k of ['sessions', 'page_views', 'total_submissions', 'total_pipeline_value_usd', 'organic_clicks', 'impressions']) {
      expect(data.comparisons[k]).toHaveProperty('current');
      expect(data.comparisons[k]).toHaveProperty('previous');
      expect(data.comparisons[k]).toHaveProperty('delta_pct');
    }
  });

  it('computes delta_pct correctly', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.comparisons.sessions.current).toBe(1200);
    expect(data.comparisons.sessions.previous).toBe(1000);
    expect(data.comparisons.sessions.delta_pct).toBeCloseTo(0.2, 3);
  });

  it('previous period aligns correctly for 30-day range', async () => {
    stubEmpty();
    await GET(req('/o?start=2026-02-01&end=2026-02-28'));
    const prevCalls = mockQuery.mock.calls.filter(
      (c: unknown[]) => Array.isArray(c[1]) && (c[1] as string[])[0] === '2026-01-04'
    );
    expect(prevCalls.length).toBeGreaterThan(0);
  });

  it('returns 0 delta_pct when previous is 0', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.comparisons.sessions.delta_pct).toBe(0);
  });
});

// ============================================
// Phase B — SEO query intelligence
// ============================================

describe('Phase B: seo_queries', () => {
  it('returns seo_queries array', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(Array.isArray(data.seo_queries)).toBe(true);
  });

  it('returns populated seo_queries with revenue_per_click', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.seo_queries).toHaveLength(1);
    const q = data.seo_queries[0];
    expect(q.query).toBe('neon signs');
    expect(q.clicks).toBe(200);
    expect(q.revenue_per_click).toBeCloseTo(4500 / 200, 3);
  });

  it('defaults missing seo values to 0', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.seo_queries).toEqual([]);
  });
});

// ============================================
// Phase C — Timeseries
// ============================================

describe('Phase C: timeseries', () => {
  it('omits timeseries when include_timeseries is not set', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.timeseries).toBeUndefined();
  });

  it('returns timeseries when include_timeseries=true', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28&include_timeseries=true'))).json();
    expect(data.timeseries).toBeDefined();
    expect(Array.isArray(data.timeseries.sessions)).toBe(true);
    expect(Array.isArray(data.timeseries.submissions)).toBe(true);
    expect(Array.isArray(data.timeseries.pipeline_value_usd)).toBe(true);
  });

  it('timeseries points have date and value', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28&include_timeseries=true'))).json();
    expect(data.timeseries.sessions[0]).toHaveProperty('date');
    expect(data.timeseries.sessions[0]).toHaveProperty('value');
    expect(typeof data.timeseries.sessions[0].value).toBe('number');
  });
});

// ============================================
// Phase D — Anomaly detection
// ============================================

describe('Phase D: anomalies', () => {
  it('returns anomalies object', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.anomalies).toBeDefined();
    expect(typeof data.anomalies.sessions_spike).toBe('boolean');
    expect(typeof data.anomalies.submissions_spike).toBe('boolean');
    expect(typeof data.anomalies.pipeline_spike).toBe('boolean');
  });

  it('all false when insufficient data (<7 days)', async () => {
    stubEmpty();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.anomalies.sessions_spike).toBe(false);
    expect(data.anomalies.submissions_spike).toBe(false);
    expect(data.anomalies.pipeline_spike).toBe(false);
  });

  it('detects spike when latest > mean + 2*stddev', async () => {
    stubAnomalySpike();
    const { data } = await (await GET(req('/o'))).json();
    expect(data.anomalies.sessions_spike).toBe(true);
    expect(data.anomalies.submissions_spike).toBe(true);
    expect(data.anomalies.pipeline_spike).toBe(true);
  });

  it('no spike when latest is within 2 stddev', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('STDDEV') && sql.includes('sessions')) return Promise.resolve({ rows: [{ n: 10, mean: 100, stddev: 10, latest_val: 115 }] });
      if (sql.includes('STDDEV')) return Promise.resolve({ rows: [{ n: 10, mean: 50, stddev: 5, latest_val: 55 }] });
      if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources') || sql.includes('metrics_search_console_query')) return Promise.resolve({ rows: [] });
      if (sql.includes('MAX(')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [{}] });
    });
    const { data } = await (await GET(req('/o'))).json();
    expect(data.anomalies.sessions_spike).toBe(false);
    expect(data.anomalies.submissions_spike).toBe(false);
    expect(data.anomalies.pipeline_spike).toBe(false);
  });
});

// ============================================
// Phase E — Source taxonomy
// ============================================

describe('Phase E: source taxonomy', () => {
  it('adds canonical_source to each source', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.sources[0].canonical_source).toBe('organic');
    expect(data.sources[1].canonical_source).toBe('direct');
  });

  it('preserves original submission_source', async () => {
    stubWithData();
    const { data } = await (await GET(req('/o?start=2026-02-01&end=2026-02-28'))).json();
    expect(data.sources[0].submission_source).toBe('Google');
  });

  it('maps unknown source to other', async () => {
    mockQuery.mockImplementation((sql: string) => {
      if (sql.includes('dashboard_sources')) return Promise.resolve({ rows: [{ submission_source: 'random_site', submissions: '1', pipeline_value_usd: '100' }] });
      if (sql.includes('FULL OUTER JOIN') || sql.includes('metrics_search_console_query') || sql.includes('generate_series')) return Promise.resolve({ rows: [] });
      if (sql.includes('MAX(')) return Promise.resolve({ rows: [{}] });
      if (sql.includes('STDDEV')) return Promise.resolve({ rows: [{ n: 0, mean: 0, stddev: 0, latest_val: 0 }] });
      return Promise.resolve({ rows: [{}] });
    });
    const { data } = await (await GET(req('/o'))).json();
    expect(data.sources[0].canonical_source).toBe('other');
  });
});

// ============================================
// Aggregation utilities
// ============================================

import { toNumber, safeDivide, weightedAverage, clamp, nonNegative } from '../../../../../../lib/aggregation';
import { canonicalSource } from '../../../../../../services/marketingQueries';

describe('lib/aggregation', () => {
  describe('toNumber', () => {
    it('converts string', () => expect(toNumber('42')).toBe(42));
    it('0 for null', () => expect(toNumber(null)).toBe(0));
    it('0 for undefined', () => expect(toNumber(undefined)).toBe(0));
    it('0 for NaN', () => expect(toNumber(NaN)).toBe(0));
    it('0 for Infinity', () => expect(toNumber(Infinity)).toBe(0));
    it('0 for non-numeric', () => expect(toNumber('abc')).toBe(0));
    it('large numbers', () => expect(toNumber('999999999999')).toBe(999999999999));
  });
  describe('safeDivide', () => {
    it('divides', () => expect(safeDivide(10, 3)).toBeCloseTo(3.3333, 3));
    it('0 for zero denom', () => expect(safeDivide(10, 0)).toBe(0));
    it('0 for NaN num', () => expect(safeDivide(NaN, 5)).toBe(0));
    it('0 for Inf denom', () => expect(safeDivide(10, Infinity)).toBe(0));
    it('precision', () => expect(safeDivide(1, 3, 2)).toBe(0.33));
  });
  describe('weightedAverage', () => {
    it('computes', () => expect(weightedAverage(100, 50)).toBe(2));
    it('0 for 0 weight', () => expect(weightedAverage(100, 0)).toBe(0));
  });
  describe('clamp', () => {
    it('below', () => expect(clamp(-5, 0, 1)).toBe(0));
    it('above', () => expect(clamp(1.5, 0, 1)).toBe(1));
    it('valid', () => expect(clamp(0.5, 0, 1)).toBe(0.5));
    it('NaN', () => expect(clamp(NaN, 0, 1)).toBe(0));
  });
  describe('nonNegative', () => {
    it('positive', () => expect(nonNegative(5)).toBe(5));
    it('neg to 0', () => expect(nonNegative(-5)).toBe(0));
    it('NaN', () => expect(nonNegative(NaN)).toBe(0));
  });
});

describe('canonicalSource', () => {
  it('maps google → organic', () => expect(canonicalSource('google')).toBe('organic'));
  it('maps Google → organic (case insensitive)', () => expect(canonicalSource('Google')).toBe('organic'));
  it('maps facebook → paid', () => expect(canonicalSource('facebook')).toBe('paid'));
  it('maps direct → direct', () => expect(canonicalSource('direct')).toBe('direct'));
  it('maps email → email', () => expect(canonicalSource('email')).toBe('email'));
  it('maps unknown → other', () => expect(canonicalSource('random')).toBe('other'));
});
