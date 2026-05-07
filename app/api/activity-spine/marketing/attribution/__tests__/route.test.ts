// @vitest-environment node
/**
 * Marketing Attribution Route — Smoke Tests
 *
 * Verifies that the four views supported by
 * GET /api/activity-spine/marketing/attribution
 *
 *   - source-funnel
 *   - channel-revenue
 *   - google-ads-performance
 *   - google-ads-quality
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

describe('GET /api/activity-spine/marketing/attribution', () => {
  it('source-funnel: 200 with { data, meta } and route-derived fields', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        source_group: 'google_ads',
        submitted_quotes: '120',
        paid_quotes: '40',
        paid_conversion_rate: '33.3',
        paid_revenue_cents: '500000',
        avg_paid_value_cents: '12500',
        test_quotes: '5',
      }],
    });

    const res = await GET(req('/o?view=source-funnel'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(body.meta).toEqual({ view: 'source-funnel' });
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    const row = body.data[0];
    expect(row.source_group).toBe('google_ads');
    expect(row.submitted_quotes).toBe(120);
    expect(row.paid_quotes).toBe(40);
    expect(row.paid_revenue_usd).toBeCloseTo(5000, 2);
    // Sourced from metrics.source_to_paid_funnel.avg_paid_value_cents.
    expect(row.avg_paid_value_usd_approx).toBeCloseTo(125, 2);
  });

  it('source-funnel: avg_paid_value_usd_approx is 0 when avg_paid_value_cents is null', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        source_group: 'organic',
        submitted_quotes: '50',
        paid_quotes: '0',
        paid_conversion_rate: '0',
        paid_revenue_cents: '0',
        avg_paid_value_cents: null,
        test_quotes: '0',
      }],
    });
    const res = await GET(req('/o?view=source-funnel'));
    const body = await res.json();
    expect(body.data[0].avg_paid_value_usd_approx).toBe(0);
  });

  it('channel-revenue: 200 and derives paid_revenue_usd from cents', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        date: '2026-04-30',
        source_group: 'organic',
        submitted_quotes: '10',
        paid_quotes: '3',
        paid_conversion_rate: '30.0',
        paid_revenue_cents: '120000',
        quotes_with_origin_page: '8',
      }],
    });
    const res = await GET(req('/o?view=channel-revenue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.view).toBe('channel-revenue');
    expect(body.data[0].paid_revenue_usd).toBeCloseTo(1200, 2);
  });

  it('google-ads-performance: 200 and passes through join_confidence', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        report_date: '2026-04-30',
        utm_campaign: 'spring_sale',
        utm_content: null,
        google_campaign_id: '12345',
        google_campaign_name: 'Spring Sale',
        ad_clicks: '50',
        ad_impressions: '1000',
        ad_ctr_pct: '5.0',
        ad_cost_usd: '200.00',
        submitted_quotes: '4',
        paid_quotes: '1',
        paid_conversion_rate: '25.0',
        paid_revenue_cents: '50000',
        paid_revenue_usd: '500.00',
        estimated_roas_qms: '2.5',
        cost_per_quote_usd: '50.0',
        cost_per_paid_quote_usd: '200.0',
        quotes_with_gclid: '3',
        quotes_with_gbraid: '0',
        quotes_with_wbraid: '1',
        qms_join_path: 'utm_campaign',
        join_confidence: 'exact_campaign_id',
      }],
    });
    const res = await GET(req('/o?view=google-ads-performance'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.view).toBe('google-ads-performance');
    expect(body.data[0].join_confidence).toBe('exact_campaign_id');
    expect(body.data[0].estimated_roas_qms).toBeCloseTo(2.5, 2);
  });

  it('google-ads-quality: 200 with quality rollup', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        join_confidence: 'exact_campaign_id',
        date_count: '30',
        row_count: '12',
        total_submitted_quotes: '500',
        total_paid_quotes: '120',
        total_revenue_cents: '4500000',
        total_revenue_usd: '45000',
        total_spend_usd: '15000',
        pct_of_quotes: '60.0',
        pct_of_spend: '70.0',
      }],
    });
    const res = await GET(req('/o?view=google-ads-quality'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.view).toBe('google-ads-quality');
    expect(body.data[0].pct_of_quotes).toBeCloseTo(60.0, 2);
  });

  it('returns 400 for unknown view', async () => {
    const res = await GET(req('/o?view=unknown'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/unknown view/i);
    // Did not call the DB.
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 500 with generic Internal server error on DB failure (no leak)', async () => {
    mockQuery.mockRejectedValueOnce(new Error('FATAL: password authentication failed for user "secret"'));
    const res = await GET(req('/o?view=source-funnel'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/password authentication/i);
    expect(JSON.stringify(body)).not.toMatch(/secret/i);
  });

  it('is GET-only', async () => {
    const m = await import('../route');
    expect(m.GET).toBeDefined();
    expect((m as Record<string, unknown>).POST).toBeUndefined();
    expect((m as Record<string, unknown>).PUT).toBeUndefined();
    expect((m as Record<string, unknown>).DELETE).toBeUndefined();
    expect((m as Record<string, unknown>).PATCH).toBeUndefined();
  });

  describe('view=review-snapshot', () => {
    function snapshotPayload() {
      return {
        source_summary: {
          total_submitted_quotes: 100,
          total_paid_quotes: 30,
          paid_conversion_rate: 30,
          paid_revenue_cents: 4_500_000,
          test_quotes: 2,
          top_source_group_by_revenue: 'google_ads',
          top_source_group_by_paid_quotes: 'google_ads',
          lowest_performing_source_group_by_conversion: 'direct',
          direct_submitted_quotes: 30,
          google_ads_submitted_quotes: 50,
          organic_search_submitted_quotes: 15,
          sales_engine_outbound_submitted_quotes: 5,
        },
        channel_daily_summary: {
          window_start: '2026-04-30',
          window_end: '2026-05-07',
          total_paid_revenue_cents: 4_500_000,
          best_revenue_day: '2026-05-03',
          worst_revenue_day: '2026-05-01',
          revenue_by_source_group: [],
        },
        google_ads_summary: {
          google_ads_submitted_quotes: 50,
          google_ads_paid_quotes: 15,
          google_ads_paid_revenue_cents: 2_400_000,
          google_ads_spend_usd: 1500,
          google_ads_estimated_roas: 16,
          cost_per_quote_usd: 30,
          cost_per_paid_quote_usd: 100,
          highest_revenue_campaign: null,
          highest_spend_campaign: null,
          campaigns_with_spend_no_quotes: 1,
          campaigns_with_quotes_no_paid: 0,
          join_confidence_distribution: [],
          pct_exact_campaign_id_or_better: 75,
          pct_source_group_only: 10,
          attribution_precision_status: 'transitioning',
        },
        seo_summary: {
          seo_pages_with_quotes: 5,
          seo_pages_with_paid_quotes: 2,
          seo_paid_revenue_cents: 800_000,
          top_origin_page_by_revenue: null,
          top_origin_page_by_submitted_quotes: null,
          pages_with_clicks_no_quotes: [],
          pages_with_quotes_no_paid: [],
          top_cluster_by_revenue: null,
          top_cluster_by_quotes: null,
          clusters_with_clicks_no_quotes: [],
        },
        data_quality_warnings: [],
        human_review_items: [],
      };
    }

    it('200 with snapshot data, default window (no params)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ snapshot: snapshotPayload() }] });
      const res = await GET(req('/o?view=review-snapshot'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.meta.view).toBe('review-snapshot');
      expect(body.meta.window_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.meta.window_end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(body.meta.source).toBe('metrics.get_attribution_review_snapshot');
      expect(body.data.source_summary.total_submitted_quotes).toBe(100);
      // Pool was called with the function and a date pair.
      const [sql, params] = mockQuery.mock.calls[0] ?? [];
      expect(String(sql)).toContain('metrics.get_attribution_review_snapshot');
      expect(params).toHaveLength(2);
    });

    it('200 with explicit start_date and end_date', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ snapshot: snapshotPayload() }] });
      const res = await GET(req('/o?view=review-snapshot&start_date=2026-04-01&end_date=2026-04-15'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.meta.window_start).toBe('2026-04-01');
      expect(body.meta.window_end).toBe('2026-04-15');
      expect(mockQuery.mock.calls[0]?.[1]).toEqual(['2026-04-01', '2026-04-15']);
    });

    it('400 on bad start_date format (no DB call)', async () => {
      const res = await GET(req('/o?view=review-snapshot&start_date=2026/04/01'));
      expect(res.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('400 when start_date > end_date (no DB call)', async () => {
      const res = await GET(req('/o?view=review-snapshot&start_date=2026-05-10&end_date=2026-05-01'));
      expect(res.status).toBe(400);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('500 on DB failure with generic error (no leak)', async () => {
      mockQuery.mockRejectedValueOnce(new Error('connection refused on internal-host:5432'));
      const res = await GET(req('/o?view=review-snapshot'));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
      expect(JSON.stringify(body)).not.toMatch(/connection refused/i);
    });
  });
});
