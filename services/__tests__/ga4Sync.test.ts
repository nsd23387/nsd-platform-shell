// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google-analytics/data', () => {
  const mockRunReport = vi.fn();
  return {
    BetaAnalyticsDataClient: vi.fn().mockImplementation(() => ({
      runReport: mockRunReport,
    })),
    __mockRunReport: mockRunReport,
  };
});

vi.mock('../../lib/normalize-landing-page', () => ({
  normalizeToPath: vi.fn((path: string) => {
    let p = path;
    if (/^https?:\/\//i.test(p)) {
      try { p = new URL(p).pathname; } catch { p = p.replace(/^https?:\/\/[^/]*/i, '') || '/'; }
    }
    if (!p.startsWith('/')) p = '/' + p;
    p = p.split('?')[0];
    p = p.replace(/\/+$/, '') + '/';
    p = p.replace(/\/\/+/g, '/');
    return p;
  }),
}));

import { BetaAnalyticsDataClient } from '@google-analytics/data';
// @ts-expect-error - accessing mock internals
import { __mockRunReport } from '@google-analytics/data';
import {
  syncPageEngagement,
  syncGA4Events,
  syncDeviceCountry,
  createIngestionRun,
  completeIngestionRun,
} from '../ga4Sync';

function makeMockPool(queryResults: Record<string, unknown[]> = {}) {
  const queryLog: Array<{ text: string; values: unknown[] }> = [];
  const mockDbClient = {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      queryLog.push({ text, values: values ?? [] });
      return { rows: queryResults[text] ?? [] };
    }),
    release: vi.fn(),
  };
  const pool = {
    connect: vi.fn(async () => mockDbClient),
    query: vi.fn(async (text: string, values?: unknown[]) => {
      queryLog.push({ text, values: values ?? [] });
      if (text.includes('RETURNING id')) {
        return { rows: [{ id: 'test-run-id' }] };
      }
      return { rows: queryResults[text] ?? [] };
    }),
    end: vi.fn(),
  } as unknown as import('pg').Pool;
  return { pool, mockDbClient, queryLog };
}

function makeGA4Row(
  dims: string[],
  metrics: string[],
): { dimensionValues: { value: string }[]; metricValues: { value: string }[] } {
  return {
    dimensionValues: dims.map((v) => ({ value: v })),
    metricValues: metrics.map((v) => ({ value: v })),
  };
}

describe('GA4 Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
      client_email: 'test@test.iam.gserviceaccount.com',
      private_key: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n',
      project_id: 'test-project',
    });
    process.env.GA4_PROPERTY_ID = '123456789';
  });

  describe('syncPageEngagement', () => {
    it('should map GA4 response to metrics_page_engagement_daily correctly', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [
            makeGA4Row(
              ['/custom-neon-signs/', '20260301'],
              ['150', '320', '0.45', '125.5', '80'],
            ),
          ],
        },
      ]);

      const result = await syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient);

      expect(result.rows).toBe(1);
      expect(result.errors).toHaveLength(0);

      const insertCall = mockDbClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily'),
      );
      expect(insertCall).toBeDefined();
      const values = insertCall![1];
      expect(values[0]).toBe('2026-03-01');
      expect(values[1]).toBe('/custom-neon-signs/');
      expect(values[2]).toBe(150);
      expect(values[3]).toBe(320);
      expect(values[4]).toBe(0.45);
      expect(values[5]).toBe(125.5);
      expect(values[6]).toBeCloseTo(53.33, 1);
    });

    it('should normalize page paths', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [
            makeGA4Row(
              ['/custom-neon-signs?utm_source=google', '20260301'],
              ['10', '20', '0.5', '60', '5'],
            ),
          ],
        },
      ]);

      await syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient);

      const insertCall = mockDbClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily'),
      );
      expect(insertCall![1][1]).toBe('/custom-neon-signs/');
    });

    it('should handle empty GA4 response gracefully', async () => {
      const { pool } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const result = await syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient);

      expect(result.rows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle null rows in GA4 response', async () => {
      const { pool } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([{}]);

      const result = await syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient);

      expect(result.rows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should convert GA4 date format YYYYMMDD to YYYY-MM-DD', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [makeGA4Row(['/', '20260215'], ['1', '1', '0', '0', '0'])],
        },
      ]);

      await syncPageEngagement(pool, '2026-02-15', '2026-02-15', mockClient);

      const insertCall = mockDbClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily'),
      );
      expect(insertCall![1][0]).toBe('2026-02-15');
    });

    it('should calculate scroll depth as (scrolledUsers / sessions) * 100', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [makeGA4Row(['/', '20260301'], ['200', '400', '0.3', '90', '120'])],
        },
      ]);

      await syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient);

      const insertCall = mockDbClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('metrics_page_engagement_daily'),
      );
      expect(insertCall![1][6]).toBeCloseTo(60, 0);
    });
  });

  describe('syncGA4Events', () => {
    it('should map GA4 event response to raw_ga4_events correctly', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [
            makeGA4Row(
              ['purchase', '/checkout/', '20260301', 'desktop', 'United States'],
              ['3', '259.99'],
            ),
          ],
        },
      ]);

      const result = await syncGA4Events(pool, '2026-03-01', '2026-03-01', 'run-123', mockClient);

      expect(result.rows).toBe(1);
      expect(result.errors).toHaveLength(0);

      const insertCall = mockDbClient.query.mock.calls.find(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('raw_ga4_events') && (c[0] as string).includes('INSERT'),
      );
      expect(insertCall).toBeDefined();
      const values = insertCall![1];
      expect(values[0]).toBe('ga4-api');
      expect(values[1]).toBe('purchase');
      expect(values[2]).toBe('2026-03-01T00:00:00Z');
      const payload = JSON.parse(values[3]);
      expect(payload.page_path).toBe('/checkout/');
      expect(payload.device_category).toBe('desktop');
      expect(payload.country).toBe('United States');
      expect(payload.event_count).toBe(3);
      expect(payload.event_value).toBe(259.99);
      expect(values[4]).toBe('run-123');
    });

    it('should handle empty event response', async () => {
      const { pool } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const result = await syncGA4Events(pool, '2026-03-01', '2026-03-01', 'run-123', mockClient);

      expect(result.rows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should include inListFilter for actionable events', async () => {
      const { pool } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      await syncGA4Events(pool, '2026-03-01', '2026-03-01', 'run-123', mockClient);

      const reportCall = __mockRunReport.mock.calls[0][0];
      expect(reportCall.dimensionFilter.filter.fieldName).toBe('eventName');
      expect(reportCall.dimensionFilter.filter.inListFilter.values).toContain('purchase');
      expect(reportCall.dimensionFilter.filter.inListFilter.values).toContain('add_to_cart');
      expect(reportCall.dimensionFilter.filter.inListFilter.values).toContain('neon_form_submit');
    });
  });

  describe('syncDeviceCountry', () => {
    it('should map device/country response to raw_ga4_events with session_summary event_name', async () => {
      const { pool, mockDbClient } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([
        {
          rows: [
            makeGA4Row(['desktop', 'United States', '20260301'], ['500', '1200']),
            makeGA4Row(['mobile', 'Canada', '20260301'], ['200', '450']),
          ],
        },
      ]);

      const result = await syncDeviceCountry(pool, '2026-03-01', '2026-03-01', 'run-456', mockClient);

      expect(result.rows).toBe(2);
      expect(result.errors).toHaveLength(0);

      const insertCalls = mockDbClient.query.mock.calls.filter(
        (c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('raw_ga4_events') && (c[0] as string).includes('INSERT'),
      );
      expect(insertCalls).toHaveLength(2);

      const firstPayload = JSON.parse(insertCalls[0][1][3]);
      expect(firstPayload.device_category).toBe('desktop');
      expect(firstPayload.country).toBe('United States');
      expect(firstPayload.sessions).toBe(500);
      expect(firstPayload.page_views).toBe(1200);

      expect(insertCalls[0][1][1]).toBe('session_summary');
      expect(insertCalls[0][1][0]).toBe('ga4-api');
    });

    it('should handle empty device/country response', async () => {
      const { pool } = makeMockPool();
      const mockClient = new BetaAnalyticsDataClient();

      __mockRunReport.mockResolvedValueOnce([{ rows: [] }]);

      const result = await syncDeviceCountry(pool, '2026-03-01', '2026-03-01', 'run-456', mockClient);

      expect(result.rows).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createIngestionRun', () => {
    it('should insert a new ingestion run and return the ID', async () => {
      const { pool, queryLog } = makeMockPool();

      const runId = await createIngestionRun(pool, 'ga4-api', 'ga4-sync');

      expect(runId).toBe('test-run-id');
      const insertQuery = queryLog.find((q) => q.text.includes('ingestion_runs'));
      expect(insertQuery).toBeDefined();
      expect(insertQuery!.values).toContain('ga4-api');
      expect(insertQuery!.values).toContain('ga4-sync');
    });
  });

  describe('completeIngestionRun', () => {
    it('should update the ingestion run with completion data', async () => {
      const { pool, queryLog } = makeMockPool();

      await completeIngestionRun(pool, 'run-789', 'success', 100, 2, 1500);

      const updateQuery = queryLog.find((q) => q.text.includes('UPDATE'));
      expect(updateQuery).toBeDefined();
      expect(updateQuery!.values).toContain('success');
      expect(updateQuery!.values).toContain(100);
      expect(updateQuery!.values).toContain(2);
      expect(updateQuery!.values).toContain(1500);
      expect(updateQuery!.values).toContain('run-789');
    });

    it('should include error message when status is failed', async () => {
      const { pool, queryLog } = makeMockPool();

      await completeIngestionRun(pool, 'run-999', 'failed', 50, 10, 2000, 'Some error');

      const updateQuery = queryLog.find((q) => q.text.includes('UPDATE'));
      expect(updateQuery!.values).toContain('failed');
      expect(updateQuery!.values).toContain('Some error');
    });
  });

  describe('environment validation', () => {
    it('should throw if GOOGLE_APPLICATION_CREDENTIALS_JSON is not set', async () => {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
      const { pool } = makeMockPool();

      await expect(
        syncPageEngagement(pool, '2026-03-01', '2026-03-01'),
      ).rejects.toThrow('GOOGLE_APPLICATION_CREDENTIALS_JSON env var is not set');
    });

    it('should throw if GA4_PROPERTY_ID is not set', async () => {
      delete process.env.GA4_PROPERTY_ID;
      const { pool } = makeMockPool();

      const mockClient = new BetaAnalyticsDataClient();

      await expect(
        syncPageEngagement(pool, '2026-03-01', '2026-03-01', mockClient),
      ).rejects.toThrow('GA4_PROPERTY_ID env var is not set');
    });
  });
});
