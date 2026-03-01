/**
 * Marketing Overview Route — Unit Tests
 *
 * Tests the GET handler for /api/activity-spine/marketing/overview.
 * Mocks the pg Pool to avoid database dependency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions so they're available inside vi.mock factory
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

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

const EMPTY_AGG_ROW = { rows: [{}] };
const EMPTY_ROWS = { rows: [] };

function stubAllQueriesEmpty() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('FULL OUTER JOIN') || sql.includes('dashboard_sources')) {
      return Promise.resolve(EMPTY_ROWS);
    }
    return Promise.resolve(EMPTY_AGG_ROW);
  });
}

function stubAllQueriesWithData() {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.includes('metrics_page_engagement_daily') && !sql.includes('FULL OUTER JOIN')) {
      return Promise.resolve({
        rows: [{
          sessions: '1200',
          page_views: '3400',
          bounce_rate: '0.45',
          avg_time_on_page_seconds: '62.5',
        }],
      });
    }
    if (sql.includes('conversion_metrics_daily')) {
      return Promise.resolve({
        rows: [{
          total_submissions: '85',
          total_pipeline_value_usd: '125000',
        }],
      });
    }
    if (sql.includes('metrics_search_console_page') && !sql.includes('FULL OUTER JOIN')) {
      return Promise.resolve({
        rows: [{
          organic_clicks: '4500',
          impressions: '98000',
          avg_position: '12.3',
        }],
      });
    }
    if (sql.includes('FULL OUTER JOIN')) {
      return Promise.resolve({
        rows: [{
          page_url: '/products',
          sessions: '800',
          page_views: '1200',
          bounce_rate: '0.35',
          avg_time_on_page_seconds: '45',
          clicks: '300',
          impressions: '5000',
          ctr: '0.06',
          submissions: '20',
          pipeline_value_usd: '30000',
        }],
      });
    }
    if (sql.includes('dashboard_sources')) {
      return Promise.resolve({
        rows: [
          { submission_source: 'organic', submissions: '50', pipeline_value_usd: '75000' },
          { submission_source: 'paid', submissions: '35', pipeline_value_usd: '50000' },
        ],
      });
    }
    return Promise.resolve(EMPTY_ROWS);
  });
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe('GET /api/activity-spine/marketing/overview', () => {
  it('returns 400 for an invalid period', async () => {
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview?period=999'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid period');
  });

  it('defaults to 30d when period is omitted', async () => {
    stubAllQueriesEmpty();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.period).toBe('30d');
  });

  it('accepts 7d period', async () => {
    stubAllQueriesEmpty();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview?period=7d'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.period).toBe('7d');
  });

  it('accepts 90d period', async () => {
    stubAllQueriesEmpty();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview?period=90d'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.period).toBe('90d');
  });

  it('returns zeros and empty arrays when queries return empty rows', async () => {
    stubAllQueriesEmpty();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview?period=30d'));
    expect(res.status).toBe(200);

    const body = await res.json();
    const { data } = body;

    expect(data.period).toBe('30d');
    expect(data.generated_at).toBeTruthy();
    expect(data.kpis.sessions).toBe(0);
    expect(data.kpis.page_views).toBe(0);
    expect(data.kpis.bounce_rate).toBe(0);
    expect(data.kpis.avg_time_on_page_seconds).toBe(0);
    expect(data.kpis.total_submissions).toBe(0);
    expect(data.kpis.total_pipeline_value_usd).toBe(0);
    expect(data.kpis.organic_clicks).toBe(0);
    expect(data.kpis.impressions).toBe(0);
    expect(data.kpis.avg_position).toBe(0);
    expect(data.pages).toEqual([]);
    expect(data.sources).toEqual([]);
  });

  it('returns the ActivitySpineResponse wrapper', async () => {
    stubAllQueriesEmpty();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview'));
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('orgId');
  });

  it('returns populated KPIs, pages, and sources when data exists', async () => {
    stubAllQueriesWithData();
    const res = await GET(makeRequest('/api/activity-spine/marketing/overview?period=30d'));
    expect(res.status).toBe(200);

    const { data } = await res.json();
    expect(data.kpis.sessions).toBe(1200);
    expect(data.kpis.page_views).toBe(3400);
    expect(data.kpis.organic_clicks).toBe(4500);
    expect(data.kpis.total_submissions).toBe(85);
    expect(data.kpis.total_pipeline_value_usd).toBe(125000);

    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].page_url).toBe('/products');
    expect(data.pages[0].sessions).toBe(800);

    expect(data.sources).toHaveLength(2);
    expect(data.sources[0].submission_source).toBe('organic');
    expect(data.sources[1].submission_source).toBe('paid');
  });

  it('passes correct interval to period-filtered queries', async () => {
    stubAllQueriesEmpty();
    await GET(makeRequest('/api/activity-spine/marketing/overview?period=7d'));

    const engagementCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' &&
        (c[0] as string).includes('metrics_page_engagement_daily') &&
        !(c[0] as string).includes('FULL OUTER')
    );
    expect(engagementCall).toBeTruthy();
    expect(engagementCall![1]).toEqual(['7 days']);

    const conversionCall = mockQuery.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'string' &&
        (c[0] as string).includes('conversion_metrics_daily')
    );
    expect(conversionCall).toBeTruthy();
    expect(conversionCall![1]).toEqual(['7 days']);
  });

  it('is GET-only (no POST/PUT/PATCH/DELETE exported)', async () => {
    const routeModule = await import('../route');
    expect(routeModule.GET).toBeDefined();
    expect((routeModule as Record<string, unknown>).POST).toBeUndefined();
    expect((routeModule as Record<string, unknown>).PUT).toBeUndefined();
    expect((routeModule as Record<string, unknown>).PATCH).toBeUndefined();
    expect((routeModule as Record<string, unknown>).DELETE).toBeUndefined();
  });
});
