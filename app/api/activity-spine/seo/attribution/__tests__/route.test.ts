// @vitest-environment node
/**
 * SEO Attribution Route — Smoke Tests
 *
 * Verifies that the two views supported by
 * GET /api/activity-spine/seo/attribution
 *
 *   - page-performance
 *   - cluster-performance
 *
 * dispatch happy paths (200 with { data, meta }), reject unknown views (400),
 * and return a generic 500 without leaking DB error detail.
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

beforeEach(() => { mockQuery.mockReset(); });

describe('GET /api/activity-spine/seo/attribution', () => {
  it('page-performance: 200 with { data, meta } and derives paid_revenue_usd', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        canonical_page_url: 'https://neonsignsdepot.com/products/custom',
        raw_page_url: 'https://neonsignsdepot.com/products/custom?utm=foo',
        page_title: 'Custom Neon Signs',
        page_type: 'product',
        topic_cluster: 'custom_neon',
        search_console_clicks: '1500',
        search_console_impressions: '40000',
        avg_position: '4.5',
        submitted_quotes: '20',
        paid_quotes: '6',
        paid_revenue_cents: '300000',
      }],
    });

    const res = await GET(req('/o?view=page-performance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toEqual({ view: 'page-performance' });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].canonical_page_url).toBe('https://neonsignsdepot.com/products/custom');
    expect(body.data[0].paid_revenue_usd).toBeCloseTo(3000, 2);
    expect(body.data[0].avg_position).toBeCloseTo(4.5, 2);
  });

  it('page-performance: defaults limit/page when not provided', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const res = await GET(req('/o?view=page-performance'));
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const callArgs = mockQuery.mock.calls[0]?.[1] as unknown[];
    // [limit, offset]
    expect(callArgs).toEqual([200, 0]);
  });

  it('page-performance: clamps limit to 1000', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    await GET(req('/o?view=page-performance&limit=10000'));
    const callArgs = mockQuery.mock.calls[0]?.[1] as unknown[];
    expect(callArgs?.[0]).toBe(1000);
  });

  it('cluster-performance: 200 and exposes top_revenue_page', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        topic_cluster: 'custom_neon',
        mapped_pages: '4',
        search_console_clicks: '5000',
        search_console_impressions: '120000',
        avg_position: '5.1',
        submitted_quotes: '60',
        paid_quotes: '20',
        paid_revenue_cents: '900000',
        top_revenue_page: 'https://neonsignsdepot.com/products/custom',
        top_quote_page: 'https://neonsignsdepot.com/products/custom-text',
      }],
    });
    const res = await GET(req('/o?view=cluster-performance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.view).toBe('cluster-performance');
    expect(body.data[0].top_revenue_page).toBe('https://neonsignsdepot.com/products/custom');
    expect(body.data[0].paid_revenue_usd).toBeCloseTo(9000, 2);
  });

  it('returns 400 for unknown view', async () => {
    const res = await GET(req('/o?view=bogus'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown view/i);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 500 with generic Internal server error on DB failure (no leak)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused on internal-host:5432'));
    const res = await GET(req('/o?view=page-performance'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/connection refused/i);
    expect(JSON.stringify(body)).not.toMatch(/internal-host/i);
  });

  it('is GET-only', async () => {
    const m = await import('../route');
    expect(m.GET).toBeDefined();
    expect((m as Record<string, unknown>).POST).toBeUndefined();
    expect((m as Record<string, unknown>).PUT).toBeUndefined();
    expect((m as Record<string, unknown>).DELETE).toBeUndefined();
    expect((m as Record<string, unknown>).PATCH).toBeUndefined();
  });
});
