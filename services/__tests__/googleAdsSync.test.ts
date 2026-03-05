import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@google-cloud/bigquery', () => {
  return {
    BigQuery: vi.fn().mockImplementation(() => ({
      query: vi.fn(),
    })),
  };
});

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockDbClient = {
  query: mockQuery,
  release: mockRelease,
};

const mockPool = {
  connect: vi.fn().mockResolvedValue(mockDbClient),
} as any;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify({
    project_id: 'test-project',
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n',
  });
  process.env.GOOGLE_ADS_BQ_PROJECT_ID = 'test-bq-project';
  process.env.GOOGLE_ADS_BQ_DATASET = 'google_ads_data';
  process.env.GOOGLE_ADS_BQ_CUSTOMER_ID = '1234567890';
});

describe('syncCampaignPerformance', () => {
  it('returns 0 rows when BigQuery returns empty result', async () => {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();
    (bqClient.query as any).mockResolvedValue([[]]);

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    const result = await syncCampaignPerformance(
      mockPool,
      '2025-01-01',
      '2025-01-31',
      'test-run-id',
      bqClient,
    );

    expect(result.rows).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('inserts rows with correct derived metrics', async () => {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();

    const mockRows = [
      {
        campaign_id: 'c1',
        campaign_name: 'Brand Campaign',
        segments_date: '2025-01-15',
        impressions: 1000,
        clicks: 50,
        cost_micros: 25000000,
        conversions: 5,
        conversion_value: 500,
      },
    ];
    (bqClient.query as any).mockResolvedValue([mockRows]);
    mockQuery.mockResolvedValue({ rows: [] });

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    const result = await syncCampaignPerformance(
      mockPool,
      '2025-01-01',
      '2025-01-31',
      'test-run-id',
      bqClient,
    );

    expect(result.rows).toBe(1);
    expect(result.errors).toHaveLength(0);

    expect(mockQuery).toHaveBeenCalledWith('BEGIN');
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');

    const insertCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO analytics.raw_google_ads'),
    );
    expect(insertCall).toBeDefined();

    const payload = JSON.parse(insertCall![1][3]);
    expect(payload.campaign_id).toBe('c1');
    expect(payload.campaign_name).toBe('Brand Campaign');
    expect(payload.cost).toBe(25);
    expect(payload.cpc).toBe(0.5);
    expect(payload.ctr).toBeCloseTo(0.05);
    expect(payload.roas).toBe(20);
  });

  it('rolls back on transaction error', async () => {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();

    (bqClient.query as any).mockResolvedValue([[{ campaign_id: 'c1', segments_date: '2025-01-15', impressions: 100, clicks: 10, cost_micros: 5000000, conversions: 1, conversion_value: 100 }]]);
    mockQuery.mockImplementation((sql: string) => {
      if (sql === 'BEGIN') return Promise.resolve();
      if (sql.includes('DELETE')) throw new Error('DB error');
      return Promise.resolve();
    });

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    await expect(
      syncCampaignPerformance(mockPool, '2025-01-01', '2025-01-31', 'test-run-id', bqClient),
    ).rejects.toThrow('DB error');

    expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(mockRelease).toHaveBeenCalled();
  });
});

describe('syncSearchTerms', () => {
  it('returns 0 rows when BigQuery returns empty result', async () => {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();
    (bqClient.query as any).mockResolvedValue([[]]);

    const { syncSearchTerms } = await import('../googleAdsSync');
    const result = await syncSearchTerms(
      mockPool,
      '2025-01-01',
      '2025-01-31',
      'test-run-id',
      bqClient,
    );

    expect(result.rows).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('inserts search term rows with correct payload', async () => {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();

    const mockRows = [
      {
        search_term: 'neon signs custom',
        campaign_name: 'Brand Campaign',
        segments_date: '2025-01-15',
        impressions: 200,
        clicks: 20,
        cost_micros: 10000000,
        conversions: 2,
        conversion_value: 200,
      },
    ];
    (bqClient.query as any).mockResolvedValue([mockRows]);
    mockQuery.mockResolvedValue({ rows: [] });

    const { syncSearchTerms } = await import('../googleAdsSync');
    const result = await syncSearchTerms(
      mockPool,
      '2025-01-01',
      '2025-01-31',
      'test-run-id',
      bqClient,
    );

    expect(result.rows).toBe(1);
    expect(result.errors).toHaveLength(0);

    const insertCall = mockQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('INSERT INTO analytics.raw_google_ads'),
    );
    expect(insertCall).toBeDefined();

    const payload = JSON.parse(insertCall![1][3]);
    expect(payload.search_term).toBe('neon signs custom');
    expect(payload.cost).toBe(10);
    expect(payload.cpc).toBe(0.5);
    expect(payload.ctr).toBeCloseTo(0.1);
  });
});

describe('env var validation', () => {
  it('throws when GOOGLE_ADS_BQ_PROJECT_ID is missing', async () => {
    delete process.env.GOOGLE_ADS_BQ_PROJECT_ID;
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();
    (bqClient.query as any).mockResolvedValue([[]]);

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    await expect(
      syncCampaignPerformance(mockPool, '2025-01-01', '2025-01-31', 'test-run-id', bqClient),
    ).rejects.toThrow('GOOGLE_ADS_BQ_PROJECT_ID');
  });

  it('throws when GOOGLE_ADS_BQ_DATASET is missing', async () => {
    delete process.env.GOOGLE_ADS_BQ_DATASET;
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();
    (bqClient.query as any).mockResolvedValue([[]]);

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    await expect(
      syncCampaignPerformance(mockPool, '2025-01-01', '2025-01-31', 'test-run-id', bqClient),
    ).rejects.toThrow('GOOGLE_ADS_BQ_DATASET');
  });

  it('throws when GOOGLE_ADS_BQ_CUSTOMER_ID is missing', async () => {
    delete process.env.GOOGLE_ADS_BQ_CUSTOMER_ID;
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bqClient = new BigQuery();
    (bqClient.query as any).mockResolvedValue([[]]);

    const { syncCampaignPerformance } = await import('../googleAdsSync');
    await expect(
      syncCampaignPerformance(mockPool, '2025-01-01', '2025-01-31', 'test-run-id', bqClient),
    ).rejects.toThrow('GOOGLE_ADS_BQ_CUSTOMER_ID');
  });
});
