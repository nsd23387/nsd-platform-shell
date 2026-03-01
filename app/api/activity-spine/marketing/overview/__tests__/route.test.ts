/**
 * Marketing Overview Route — Unit Tests
 *
 * Covers: preset & explicit date parsing, legacy period compat,
 * metadata, efficiency metrics, KPI drift protection, GET-only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// pg mock
// ============================================

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('pg', () => ({
  Pool: class MockPool {
    query = mockQuery;
    on = vi.fn();
  },
}));

vi.stubEnv('DATABASE_URL', 'postgres://test:test@localhost:5432/test');

import { GET } from '../route';
import { NextRequest } from 'next/server';

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

// ============================================
// Stub helpers
// ============================================

function stubEmpty() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources')) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('MAX(')) {
      return Promise.resolve({ rows: [{}] });
    }
    return Promise.resolve({ rows: [{}] });
  });
}

function stubWithData() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('MAX(')) {
      return Promise.resolve({ rows: [{ engagement_last_date: '2026-02-28', search_console_last_date: '2026-02-27', conversion_last_date: '2026-02-28' }] });
    }
    if (sql.includes('FULL OUTER JOIN')) {
      return Promise.resolve({ rows: [{ page_url: '/products', sessions: '800', page_views: '1200', bounce_rate: '0.35', avg_time_on_page_seconds: '45', clicks: '300', impressions: '5000', ctr: '0.06', submissions: '20', pipeline_value_usd: '30000' }] });
    }
    if (sql.includes('metrics_page_engagement_daily')) {
      return Promise.resolve({ rows: [{ sessions: '1200', page_views: '3400', bounce_rate: '0.45', avg_time_on_page_seconds: '62.5' }] });
    }
    if (sql.includes('conversion_metrics_daily')) {
      return Promise.resolve({ rows: [{ total_submissions: '85', total_pipeline_value_usd: '125000' }] });
    }
    if (sql.includes('metrics_search_console_page')) {
      return Promise.resolve({ rows: [{ organic_clicks: '4500', impressions: '98000', avg_position: '12.3' }] });
    }
    if (sql.includes('dashboard_sources')) {
      return Promise.resolve({ rows: [{ submission_source: 'organic', submissions: '50', pipeline_value_usd: '75000' }, { submission_source: 'paid', submissions: '35', pipeline_value_usd: '50000' }] });
    }
    return Promise.resolve({ rows: [] });
  });
}

function stubNegativeAndNaN() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('metrics_page_engagement_daily') && !sql.includes('FULL OUTER')) {
      return Promise.resolve({ rows: [{ sessions: '-5', page_views: 'NaN', bounce_rate: '1.5', avg_time_on_page_seconds: '-10' }] });
    }
    if (sql.includes('conversion_metrics_daily')) {
      return Promise.resolve({ rows: [{ total_submissions: 'Infinity', total_pipeline_value_usd: null }] });
    }
    if (sql.includes('metrics_search_console_page') && !sql.includes('FULL OUTER')) {
      return Promise.resolve({ rows: [{ organic_clicks: '-1', impressions: undefined, avg_position: '-3' }] });
    }
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources')) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes('MAX(')) {
      return Promise.resolve({ rows: [{}] });
    }
    return Promise.resolve({ rows: [{}] });
  });
}

beforeEach(() => {
  mockQuery.mockReset();
});

// ============================================
// Tests
// ============================================

describe('GET /api/activity-spine/marketing/overview', () => {

  // --- Legacy compat (existing tests adapted) ---

  it('returns 400 for an invalid period', async () => {
    const res = await GET(makeRequest('/marketing/overview?period=999'));
    expect(res.status).toBe(400);
  });

  it('defaults to last_30d when nothing provided', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.period.granularity).toBe('day');
    expect(data.period.start).toBeTruthy();
    expect(data.period.end).toBeTruthy();
  });

  it('accepts legacy period=7d', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?period=7d'));
    expect(res.status).toBe(200);
  });

  it('accepts legacy period=90d', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?period=90d'));
    expect(res.status).toBe(200);
  });

  it('returns zeros and empty arrays when queries return empty rows', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?preset=last_30d'));
    const { data } = await res.json();
    expect(data.kpis.sessions).toBe(0);
    expect(data.kpis.page_views).toBe(0);
    expect(data.kpis.bounce_rate).toBe(0);
    expect(data.kpis.total_submissions).toBe(0);
    expect(data.kpis.organic_clicks).toBe(0);
    expect(data.kpis.revenue_per_session).toBe(0);
    expect(data.kpis.revenue_per_click).toBe(0);
    expect(data.kpis.submissions_per_session).toBe(0);
    expect(data.kpis.submissions_per_click).toBe(0);
    expect(data.pages).toEqual([]);
    expect(data.sources).toEqual([]);
  });

  it('returns the ActivitySpineResponse wrapper', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview'));
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('orgId');
  });

  it('returns populated KPIs, pages, and sources', async () => {
    stubWithData();
    const res = await GET(makeRequest('/marketing/overview?preset=last_30d'));
    const { data } = await res.json();
    expect(data.kpis.sessions).toBe(1200);
    expect(data.kpis.total_submissions).toBe(85);
    expect(data.kpis.total_pipeline_value_usd).toBe(125000);
    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].page_url).toBe('/products');
    expect(data.sources).toHaveLength(2);
  });

  it('is GET-only', async () => {
    const mod = await import('../route');
    expect(mod.GET).toBeDefined();
    expect((mod as Record<string, unknown>).POST).toBeUndefined();
    expect((mod as Record<string, unknown>).PUT).toBeUndefined();
    expect((mod as Record<string, unknown>).PATCH).toBeUndefined();
    expect((mod as Record<string, unknown>).DELETE).toBeUndefined();
  });

  // --- Upgrade 1: Time abstraction ---

  it('accepts preset=last_7d', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?preset=last_7d'));
    expect(res.status).toBe(200);
  });

  it('accepts preset=mtd', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?preset=mtd'));
    expect(res.status).toBe(200);
  });

  it('accepts preset=qtd', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?preset=qtd'));
    expect(res.status).toBe(200);
  });

  it('accepts preset=ytd', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?preset=ytd'));
    expect(res.status).toBe(200);
  });

  it('rejects invalid preset', async () => {
    const res = await GET(makeRequest('/marketing/overview?preset=garbage'));
    expect(res.status).toBe(400);
  });

  it('accepts explicit start/end date range', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?start=2026-01-01&end=2026-01-31'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.period.start).toBe('2026-01-01');
    expect(data.period.end).toBe('2026-01-31');
  });

  it('rejects start > end', async () => {
    const res = await GET(makeRequest('/marketing/overview?start=2026-02-01&end=2026-01-01'));
    expect(res.status).toBe(400);
  });

  it('rejects when both preset and start/end provided', async () => {
    const res = await GET(makeRequest('/marketing/overview?preset=last_7d&start=2026-01-01&end=2026-01-31'));
    expect(res.status).toBe(400);
  });

  it('rejects date range exceeding 3 years', async () => {
    const res = await GET(makeRequest('/marketing/overview?start=2020-01-01&end=2026-01-01'));
    expect(res.status).toBe(400);
  });

  it('rejects malformed date strings', async () => {
    const res = await GET(makeRequest('/marketing/overview?start=not-a-date&end=2026-01-01'));
    expect(res.status).toBe(400);
  });

  it('returns period block with start, end, granularity', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview?start=2026-01-01&end=2026-01-31'));
    const { data } = await res.json();
    expect(data.period).toEqual({ start: '2026-01-01', end: '2026-01-31', granularity: 'day' });
  });

  // --- Upgrade 2: Metadata ---

  it('returns meta block with query_execution_ms', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview'));
    const { data } = await res.json();
    expect(data.meta).toBeDefined();
    expect(typeof data.meta.query_execution_ms).toBe('number');
    expect(data.meta.query_execution_ms).toBeGreaterThanOrEqual(0);
  });

  it('returns meta.row_counts', async () => {
    stubWithData();
    const res = await GET(makeRequest('/marketing/overview?preset=last_30d'));
    const { data } = await res.json();
    expect(data.meta.row_counts.pages).toBe(1);
    expect(data.meta.row_counts.sources).toBe(2);
  });

  it('returns data_freshness dates', async () => {
    stubWithData();
    const res = await GET(makeRequest('/marketing/overview?preset=last_30d'));
    const { data } = await res.json();
    expect(data.meta.data_freshness.engagement_last_date).toBe('2026-02-28');
    expect(data.meta.data_freshness.search_console_last_date).toBe('2026-02-27');
    expect(data.meta.data_freshness.conversion_last_date).toBe('2026-02-28');
  });

  it('returns null freshness dates when data is empty', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview'));
    const { data } = await res.json();
    expect(data.meta.data_freshness.engagement_last_date).toBeNull();
    expect(data.meta.data_freshness.search_console_last_date).toBeNull();
    expect(data.meta.data_freshness.conversion_last_date).toBeNull();
  });

  // --- Upgrade 3: Revenue efficiency metrics ---

  it('computes efficiency metrics correctly', async () => {
    stubWithData();
    const res = await GET(makeRequest('/marketing/overview?preset=last_30d'));
    const { data } = await res.json();
    expect(data.kpis.revenue_per_session).toBeCloseTo(125000 / 1200, 3);
    expect(data.kpis.revenue_per_click).toBeCloseTo(125000 / 4500, 3);
    expect(data.kpis.submissions_per_session).toBeCloseTo(85 / 1200, 3);
    expect(data.kpis.submissions_per_click).toBeCloseTo(85 / 4500, 3);
  });

  it('returns 0 efficiency metrics on zero denominator', async () => {
    stubEmpty();
    const res = await GET(makeRequest('/marketing/overview'));
    const { data } = await res.json();
    expect(data.kpis.revenue_per_session).toBe(0);
    expect(data.kpis.revenue_per_click).toBe(0);
    expect(data.kpis.submissions_per_session).toBe(0);
    expect(data.kpis.submissions_per_click).toBe(0);
  });

  // --- Upgrade 5: KPI drift protection ---

  it('clamps negative sessions and NaN values to 0', async () => {
    stubNegativeAndNaN();
    const res = await GET(makeRequest('/marketing/overview'));
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data.kpis.sessions).toBe(0);
    expect(data.kpis.page_views).toBe(0);
    expect(data.kpis.organic_clicks).toBe(0);
    expect(data.kpis.avg_time_on_page_seconds).toBe(0);
    expect(data.kpis.avg_position).toBe(0);
    expect(data.kpis.total_submissions).toBe(0);
    expect(data.kpis.total_pipeline_value_usd).toBe(0);
  });

  it('clamps bounce_rate to [0, 1]', async () => {
    stubNegativeAndNaN();
    const res = await GET(makeRequest('/marketing/overview'));
    const { data } = await res.json();
    expect(data.kpis.bounce_rate).toBeLessThanOrEqual(1);
    expect(data.kpis.bounce_rate).toBeGreaterThanOrEqual(0);
  });

  it('produces no NaN in any KPI field', async () => {
    stubNegativeAndNaN();
    const res = await GET(makeRequest('/marketing/overview'));
    const { data } = await res.json();
    for (const [, v] of Object.entries(data.kpis)) {
      expect(Number.isNaN(v)).toBe(false);
    }
  });

  // --- Passes BETWEEN dates to SQL ---

  it('passes start/end dates to period-filtered queries', async () => {
    stubEmpty();
    await GET(makeRequest('/marketing/overview?start=2026-02-01&end=2026-02-28'));

    const engCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily') && !(c[0] as string).includes('FULL OUTER')
    );
    expect(engCall).toBeTruthy();
    expect(engCall![1]).toEqual(['2026-02-01', '2026-02-28']);
  });
});

// ============================================
// Aggregation utilities
// ============================================

import { toNumber, safeDivide, weightedAverage, clamp, nonNegative } from '../../../../../../lib/aggregation';

describe('lib/aggregation', () => {
  describe('toNumber', () => {
    it('converts string numbers', () => expect(toNumber('42')).toBe(42));
    it('returns 0 for null', () => expect(toNumber(null)).toBe(0));
    it('returns 0 for undefined', () => expect(toNumber(undefined)).toBe(0));
    it('returns 0 for NaN', () => expect(toNumber(NaN)).toBe(0));
    it('returns 0 for Infinity', () => expect(toNumber(Infinity)).toBe(0));
    it('returns 0 for non-numeric string', () => expect(toNumber('abc')).toBe(0));
    it('handles large numbers', () => expect(toNumber('999999999999')).toBe(999999999999));
  });

  describe('safeDivide', () => {
    it('divides normally', () => expect(safeDivide(10, 3)).toBeCloseTo(3.3333, 3));
    it('returns 0 for zero denominator', () => expect(safeDivide(10, 0)).toBe(0));
    it('returns 0 for NaN numerator', () => expect(safeDivide(NaN, 5)).toBe(0));
    it('returns 0 for Infinity denominator', () => expect(safeDivide(10, Infinity)).toBe(0));
    it('respects precision parameter', () => expect(safeDivide(1, 3, 2)).toBe(0.33));
  });

  describe('weightedAverage', () => {
    it('computes correctly', () => expect(weightedAverage(100, 50)).toBe(2));
    it('returns 0 for zero weight', () => expect(weightedAverage(100, 0)).toBe(0));
  });

  describe('clamp', () => {
    it('clamps below min', () => expect(clamp(-5, 0, 1)).toBe(0));
    it('clamps above max', () => expect(clamp(1.5, 0, 1)).toBe(1));
    it('passes through valid', () => expect(clamp(0.5, 0, 1)).toBe(0.5));
    it('handles NaN as 0', () => expect(clamp(NaN, 0, 1)).toBe(0));
  });

  describe('nonNegative', () => {
    it('passes positive', () => expect(nonNegative(5)).toBe(5));
    it('clamps negative to 0', () => expect(nonNegative(-5)).toBe(0));
    it('handles NaN', () => expect(nonNegative(NaN)).toBe(0));
  });
});
