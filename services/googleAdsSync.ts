/**
 * Google Ads Sync Service (via BigQuery)
 *
 * Reads Google Ads data from BigQuery (auto-exported from Google Ads)
 * and writes it to Supabase analytics.raw_google_ads.
 *
 * GOVERNANCE: This module performs WRITE operations to:
 *   - analytics.raw_google_ads (delete+insert per date range)
 *   - analytics.ingestion_runs (via shared createIngestionRun/completeIngestionRun)
 *
 * Auth: Reuses GOOGLE_APPLICATION_CREDENTIALS_JSON (same service account as GA4)
 *        plus GOOGLE_ADS_BQ_PROJECT_ID and GOOGLE_ADS_BQ_DATASET.
 *
 * BigQuery table naming:
 *   Google Ads auto-export creates tables like:
 *     p_CampaignStats_<customer_id>
 *     p_AdGroupStats_<customer_id>
 *     p_SearchQueryStats_<customer_id>
 *   Or in some configurations:
 *     ads_CampaignStats_<customer_id>
 *   The GOOGLE_ADS_BQ_CUSTOMER_ID env var identifies which table suffix to use.
 */

import { BigQuery } from '@google-cloud/bigquery';
import type { Pool } from 'pg';

export interface SyncResult {
  rows: number;
  errors: string[];
}

function getBigQueryClient(): BigQuery {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON env var is not set');
  }
  const credentials = JSON.parse(credentialsJson);
  return new BigQuery({
    projectId: credentials.project_id,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });
}

function getBQConfig(): { projectId: string; dataset: string; customerId: string } {
  const projectId = process.env.GOOGLE_ADS_BQ_PROJECT_ID;
  if (!projectId) {
    throw new Error('GOOGLE_ADS_BQ_PROJECT_ID env var is not set');
  }
  const dataset = process.env.GOOGLE_ADS_BQ_DATASET;
  if (!dataset) {
    throw new Error('GOOGLE_ADS_BQ_DATASET env var is not set');
  }
  const customerId = process.env.GOOGLE_ADS_BQ_CUSTOMER_ID;
  if (!customerId) {
    throw new Error('GOOGLE_ADS_BQ_CUSTOMER_ID env var is not set');
  }
  return { projectId, dataset, customerId };
}

/**
 * Sync campaign-level performance from BigQuery into raw_google_ads.
 *
 * Reads from p_CampaignStats_<customer_id> table, which Google Ads
 * auto-exports daily to BigQuery.
 *
 * Columns expected from BigQuery:
 *   campaign_id, campaign_name, segments_date, metrics_impressions,
 *   metrics_clicks, metrics_cost_micros, metrics_conversions,
 *   metrics_conversions_value
 */
export async function syncCampaignPerformance(
  pool: Pool,
  startDate: string,
  endDate: string,
  ingestionRunId: string,
  bqClientOverride?: BigQuery,
): Promise<SyncResult> {
  const bq = bqClientOverride ?? getBigQueryClient();
  const { projectId, dataset, customerId } = getBQConfig();

  const tableName = `${projectId}.${dataset}.p_CampaignStats_${customerId}`;

  const query = `
    SELECT
      campaign_id,
      campaign_name,
      segments_date,
      IFNULL(metrics_impressions, 0) AS impressions,
      IFNULL(metrics_clicks, 0) AS clicks,
      IFNULL(metrics_cost_micros, 0) AS cost_micros,
      IFNULL(metrics_conversions, 0) AS conversions,
      IFNULL(metrics_conversions_value, 0) AS conversion_value
    FROM \`${tableName}\`
    WHERE segments_date BETWEEN @startDate AND @endDate
    ORDER BY segments_date, campaign_name
  `;

  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
    location: 'US',
  });

  if (!rows || rows.length === 0) {
    return { rows: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    await dbClient.query(
      `DELETE FROM analytics.raw_google_ads
       WHERE source_system = 'google-ads-bq'
         AND event_name = 'campaign_performance'
         AND occurred_at::date BETWEEN $1::date AND $2::date`,
      [startDate, endDate],
    );

    const INSERT_SQL = `
      INSERT INTO analytics.raw_google_ads
        (source_system, event_name, occurred_at, payload, ingestion_run_id)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const row of rows) {
      const costMicros = Number(row.cost_micros ?? 0);
      const cost = costMicros / 1_000_000;
      const clicks = Number(row.clicks ?? 0);
      const impressions = Number(row.impressions ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const conversionValue = Number(row.conversion_value ?? 0);

      const cpc = clicks > 0 ? cost / clicks : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const roas = cost > 0 ? conversionValue / cost : 0;

      const dateStr = String(row.segments_date ?? '');
      const occurredAt = `${dateStr}T00:00:00Z`;

      const payload = {
        campaign_id: String(row.campaign_id ?? ''),
        campaign_name: String(row.campaign_name ?? ''),
        impressions,
        clicks,
        cost_micros: costMicros,
        cost,
        conversions,
        conversion_value: conversionValue,
        cpc,
        ctr,
        roas,
        date: dateStr,
      };

      await dbClient.query(INSERT_SQL, [
        'google-ads-bq',
        'campaign_performance',
        occurredAt,
        JSON.stringify(payload),
        ingestionRunId,
      ]);
      inserted++;
    }

    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }

  return { rows: inserted, errors };
}

/**
 * Sync search term performance from BigQuery into raw_google_ads.
 *
 * Reads from p_SearchQueryStats_<customer_id> table.
 */
export async function syncSearchTerms(
  pool: Pool,
  startDate: string,
  endDate: string,
  ingestionRunId: string,
  bqClientOverride?: BigQuery,
): Promise<SyncResult> {
  const bq = bqClientOverride ?? getBigQueryClient();
  const { projectId, dataset, customerId } = getBQConfig();

  const tableName = `${projectId}.${dataset}.p_SearchQueryStats_${customerId}`;

  const query = `
    SELECT
      search_term,
      campaign_name,
      segments_date,
      IFNULL(metrics_impressions, 0) AS impressions,
      IFNULL(metrics_clicks, 0) AS clicks,
      IFNULL(metrics_cost_micros, 0) AS cost_micros,
      IFNULL(metrics_conversions, 0) AS conversions,
      IFNULL(metrics_conversions_value, 0) AS conversion_value
    FROM \`${tableName}\`
    WHERE segments_date BETWEEN @startDate AND @endDate
    ORDER BY segments_date, metrics_impressions DESC
  `;

  const [rows] = await bq.query({
    query,
    params: { startDate, endDate },
    location: 'US',
  });

  if (!rows || rows.length === 0) {
    return { rows: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    await dbClient.query(
      `DELETE FROM analytics.raw_google_ads
       WHERE source_system = 'google-ads-bq'
         AND event_name = 'search_term_performance'
         AND occurred_at::date BETWEEN $1::date AND $2::date`,
      [startDate, endDate],
    );

    const INSERT_SQL = `
      INSERT INTO analytics.raw_google_ads
        (source_system, event_name, occurred_at, payload, ingestion_run_id)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const row of rows) {
      const costMicros = Number(row.cost_micros ?? 0);
      const cost = costMicros / 1_000_000;
      const clicks = Number(row.clicks ?? 0);
      const impressions = Number(row.impressions ?? 0);
      const conversions = Number(row.conversions ?? 0);
      const conversionValue = Number(row.conversion_value ?? 0);

      const cpc = clicks > 0 ? cost / clicks : 0;
      const ctr = impressions > 0 ? clicks / impressions : 0;

      const dateStr = String(row.segments_date ?? '');
      const occurredAt = `${dateStr}T00:00:00Z`;

      const payload = {
        search_term: String(row.search_term ?? ''),
        campaign_name: String(row.campaign_name ?? ''),
        impressions,
        clicks,
        cost,
        conversions,
        conversion_value: conversionValue,
        cpc,
        ctr,
        date: dateStr,
      };

      await dbClient.query(INSERT_SQL, [
        'google-ads-bq',
        'search_term_performance',
        occurredAt,
        JSON.stringify(payload),
        ingestionRunId,
      ]);
      inserted++;
    }

    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    throw err;
  } finally {
    dbClient.release();
  }

  return { rows: inserted, errors };
}
