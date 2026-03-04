// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock('pg', () => ({
  Pool: class MockPool {
    query = mockQuery;
    on = vi.fn();
  },
}));

vi.stubEnv('DATABASE_URL', 'postgres://test:test@localhost:5432/test');

import { POST } from '../route';
import { NextRequest } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/ingest/web-event'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_BASE = {
  event_type: 'conversion',
  page_url: 'https://quote.neonsignsdepot.com',
  visitor_id: 'v-123',
  session_id: 's-456',
  event_data: { preliminary_price: 214400, product_category: 'Logo/Image' },
};

beforeEach(() => { mockQuery.mockReset(); });

describe('POST /api/ingest/web-event', () => {
  describe('validation', () => {
    it('rejects empty body', async () => {
      const res = await POST(new NextRequest(new URL('http://localhost:3000/api/ingest/web-event'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/event_type/);
    });

    it('rejects missing page_url', async () => {
      const res = await POST(makeRequest({ ...VALID_BASE, page_url: undefined }));
      expect(res.status).toBe(400);
    });

    it('rejects missing visitor_id', async () => {
      const res = await POST(makeRequest({ ...VALID_BASE, visitor_id: '' }));
      expect(res.status).toBe(400);
    });

    it('rejects invalid occurred_at', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'abc' }] });
      const res = await POST(makeRequest({ ...VALID_BASE, occurred_at: 'not-a-date' }));
      expect(res.status).toBe(400);
    });
  });

  describe('landing page resolution', () => {
    it('populates landing_page from origin_page as normalized path', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        origin_page: '/custom-neon-signs/',
      }));

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.landing_page).toBe('/custom-neon-signs/');

      const insertCall = mockQuery.mock.calls[0];
      const eventDataArg = JSON.parse(insertCall[1][3]);
      expect(eventDataArg.landing_page).toBe('/custom-neon-signs/');
    });

    it('extracts path from origin_url full URL', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        origin_url: 'https://neonsignsdepot.com/custom-neon-signs/?ref=google',
      }));

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.landing_page).toBe('/custom-neon-signs/');
    });

    it('prioritizes origin_page over origin_url', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        origin_page: '/from-page/',
        origin_url: 'https://neonsignsdepot.com/from-url/',
      }));

      const json = await res.json();
      expect(json.landing_page).toBe('/from-page/');
    });

    it('uses landing_page field when origin_page is absent', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        landing_page: '/for-businesses/',
      }));

      const json = await res.json();
      expect(json.landing_page).toBe('/for-businesses/');
    });

    it('sets landing_page to null when no origin fields provided', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest(VALID_BASE));

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.landing_page).toBeNull();

      const insertCall = mockQuery.mock.calls[0];
      const eventDataArg = JSON.parse(insertCall[1][3]);
      expect(eventDataArg.landing_page).toBeUndefined();
    });

    it('normalizes origin_page that lacks trailing slash', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        origin_page: '/custom-neon-signs',
      }));

      const json = await res.json();
      expect(json.landing_page).toBe('/custom-neon-signs/');
    });

    it('preserves existing event_data fields alongside landing_page', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'test-uuid' }] });

      await POST(makeRequest({
        ...VALID_BASE,
        origin_page: '/products/',
        event_data: { preliminary_price: 100000, product_category: 'Text Only' },
      }));

      const insertCall = mockQuery.mock.calls[0];
      const eventDataArg = JSON.parse(insertCall[1][3]);
      expect(eventDataArg.landing_page).toBe('/products/');
      expect(eventDataArg.preliminary_price).toBe(100000);
      expect(eventDataArg.product_category).toBe('Text Only');
    });
  });

  describe('database write', () => {
    it('inserts into analytics.raw_web_events with correct fields', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'inserted-uuid' }] });

      const res = await POST(makeRequest({
        ...VALID_BASE,
        origin_page: '/custom-neon-signs/',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        referrer: 'https://google.com',
      }));

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBe('inserted-uuid');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, values] = mockQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO analytics.raw_web_events');
      expect(values[0]).toBe('conversion');
      expect(values[8]).toBe('v-123');
      expect(values[9]).toBe('s-456');
      expect(values[10]).toBe('https://quote.neonsignsdepot.com');
      expect(values[11]).toBe('192.168.1.1');
      expect(values[12]).toBe('Mozilla/5.0');
    });

    it('returns 500 on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('connection refused'));

      const res = await POST(makeRequest(VALID_BASE));
      expect(res.status).toBe(500);
    });
  });
});
