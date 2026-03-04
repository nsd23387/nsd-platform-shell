/**
 * GA4 Data API Sync Service
 *
 * Pulls Google Analytics 4 data via the GA4 Data API and writes it to Supabase.
 * This populates the previously-empty `metrics_page_engagement_daily` and
 * `raw_ga4_events` tables, enabling Sessions, Bounce Rate, Avg Time on Page,
 * and device/country breakdowns in the Marketing Dashboard.
 *
 * GOVERNANCE: This module performs WRITE operations to:
 *   - analytics.metrics_page_engagement_daily (upsert)
 *   - analytics.raw_ga4_events (insert)
 *   - analytics.ingestion_runs (insert)
 *
 * Auth: Reads GOOGLE_APPLICATION_CREDENTIALS_JSON (service account JSON string)
 *        and GA4_PROPERTY_ID (numeric property ID) from environment.
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { normalizeToPath } from '../lib/normalize-landing-page';
import type { Pool } from 'pg';

const ACTIONABLE_EVENTS = [
  'add_to_cart',
  'begin_checkout',
  'purchase',
  'view_item',
  'form_start',
  'neon_form_submit',
  'contact_form_submit',
  'wholesale_quote_form_submit',
  'become_a_partner_form_submit',
  'channel_letter_quote_form_submit',
];

export interface SyncResult {
  rows: number;
  errors: string[];
}

function getClient(): BetaAnalyticsDataClient {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON env var is not set');
  }
  const credentials = JSON.parse(credentialsJson);
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
    projectId: credentials.project_id,
  });
}

function getPropertyId(): string {
  const id = process.env.GA4_PROPERTY_ID;
  if (!id) {
    throw new Error('GA4_PROPERTY_ID env var is not set');
  }
  return id;
}

/**
 * Sync page engagement metrics from GA4 into metrics_page_engagement_daily.
 *
 * Pulls per-page, per-day: sessions, screenPageViews, bounceRate,
 * averageSessionDuration, and scrolledUsers (as scroll depth proxy).
 *
 * Uses ON CONFLICT upsert so re-runs for the same date range are idempotent.
 */
export async function syncPageEngagement(
  pool: Pool,
  startDate: string,
  endDate: string,
  clientOverride?: BetaAnalyticsDataClient,
): Promise<SyncResult> {
  const client = clientOverride ?? getClient();
  const propertyId = getPropertyId();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }, { name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
      { name: 'scrolledUsers' },
    ],
    limit: 10000,
  });

  const rows = response.rows ?? [];
  if (rows.length === 0) {
    return { rows: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;

  const UPSERT_SQL = `
    INSERT INTO analytics.metrics_page_engagement_daily
      (metric_date, page_path, sessions, page_views, bounce_rate, avg_time_on_page_seconds, avg_scroll_depth)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (metric_date, page_path)
    DO UPDATE SET
      sessions = EXCLUDED.sessions,
      page_views = EXCLUDED.page_views,
      bounce_rate = EXCLUDED.bounce_rate,
      avg_time_on_page_seconds = EXCLUDED.avg_time_on_page_seconds,
      avg_scroll_depth = EXCLUDED.avg_scroll_depth
  `;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    for (const row of rows) {
      try {
        const pagePath = row.dimensionValues?.[0]?.value ?? '/';
        const dateRaw = row.dimensionValues?.[1]?.value ?? '';
        const sessions = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
        const pageViews = parseInt(row.metricValues?.[1]?.value ?? '0', 10);
        const bounceRate = parseFloat(row.metricValues?.[2]?.value ?? '0');
        const avgDuration = parseFloat(row.metricValues?.[3]?.value ?? '0');
        const scrolledUsers = parseInt(row.metricValues?.[4]?.value ?? '0', 10);

        const normalizedPath = normalizeToPath(pagePath);
        const metricDate = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`;

        const scrollDepthProxy = sessions > 0 ? (scrolledUsers / sessions) * 100 : 0;

        await dbClient.query(UPSERT_SQL, [
          metricDate,
          normalizedPath,
          sessions,
          pageViews,
          bounceRate,
          avgDuration,
          scrollDepthProxy,
        ]);
        inserted++;
      } catch (err) {
        errors.push(`Page engagement row error: ${(err as Error).message}`);
      }
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
 * Sync actionable GA4 events into raw_ga4_events.
 *
 * Pulls event-level data filtered to conversion-relevant events
 * (add_to_cart, purchase, form submissions, etc.) with device and country
 * dimensions in the payload for Audience panel support.
 */
export async function syncGA4Events(
  pool: Pool,
  startDate: string,
  endDate: string,
  ingestionRunId: string,
  clientOverride?: BetaAnalyticsDataClient,
): Promise<SyncResult> {
  const client = clientOverride ?? getClient();
  const propertyId = getPropertyId();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'eventName' },
      { name: 'pagePath' },
      { name: 'date' },
      { name: 'deviceCategory' },
      { name: 'country' },
    ],
    metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: {
          values: ACTIONABLE_EVENTS,
        },
      },
    },
    limit: 10000,
  });

  const rows = response.rows ?? [];
  if (rows.length === 0) {
    return { rows: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    await dbClient.query(
      `DELETE FROM analytics.raw_ga4_events
       WHERE source_system = 'ga4-api'
         AND event_name != 'session_summary'
         AND occurred_at::date BETWEEN $1::date AND $2::date`,
      [startDate, endDate],
    );

    const INSERT_SQL = `
      INSERT INTO analytics.raw_ga4_events
        (source_system, event_name, occurred_at, payload, ingestion_run_id)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const row of rows) {
      try {
        const eventName = row.dimensionValues?.[0]?.value ?? '';
        const pagePath = row.dimensionValues?.[1]?.value ?? '/';
        const dateRaw = row.dimensionValues?.[2]?.value ?? '';
        const device = row.dimensionValues?.[3]?.value ?? '';
        const country = row.dimensionValues?.[4]?.value ?? '';
        const eventCount = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
        const eventValue = parseFloat(row.metricValues?.[1]?.value ?? '0');

        const normalizedPath = normalizeToPath(pagePath);
        const occurredAt = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}T00:00:00Z`;

        const payload = {
          page_path: normalizedPath,
          device_category: device,
          country,
          event_count: eventCount,
          event_value: eventValue,
          date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
        };

        await dbClient.query(INSERT_SQL, [
          'ga4-api',
          eventName,
          occurredAt,
          JSON.stringify(payload),
          ingestionRunId,
        ]);
        inserted++;
      } catch (err) {
        errors.push(`GA4 event row error: ${(err as Error).message}`);
      }
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
 * Sync device/country session summaries from GA4 into raw_ga4_events.
 *
 * Uses event_name='session_summary' to distinguish from actionable events.
 * This data powers the Audience panel device and country breakdowns with
 * more accurate data than Search Console provides.
 */
export async function syncDeviceCountry(
  pool: Pool,
  startDate: string,
  endDate: string,
  ingestionRunId: string,
  clientOverride?: BetaAnalyticsDataClient,
): Promise<SyncResult> {
  const client = clientOverride ?? getClient();
  const propertyId = getPropertyId();

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'deviceCategory' },
      { name: 'country' },
      { name: 'date' },
    ],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
    limit: 10000,
  });

  const rows = response.rows ?? [];
  if (rows.length === 0) {
    return { rows: 0, errors: [] };
  }

  const errors: string[] = [];
  let inserted = 0;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    await dbClient.query(
      `DELETE FROM analytics.raw_ga4_events
       WHERE source_system = 'ga4-api'
         AND event_name = 'session_summary'
         AND occurred_at::date BETWEEN $1::date AND $2::date`,
      [startDate, endDate],
    );

    const INSERT_SQL = `
      INSERT INTO analytics.raw_ga4_events
        (source_system, event_name, occurred_at, payload, ingestion_run_id)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const row of rows) {
      try {
        const device = row.dimensionValues?.[0]?.value ?? '';
        const country = row.dimensionValues?.[1]?.value ?? '';
        const dateRaw = row.dimensionValues?.[2]?.value ?? '';
        const sessions = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
        const pageViews = parseInt(row.metricValues?.[1]?.value ?? '0', 10);

        const occurredAt = `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}T00:00:00Z`;

        const payload = {
          device_category: device,
          country,
          sessions,
          page_views: pageViews,
          date: `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`,
        };

        await dbClient.query(INSERT_SQL, [
          'ga4-api',
          'session_summary',
          occurredAt,
          JSON.stringify(payload),
          ingestionRunId,
        ]);
        inserted++;
      } catch (err) {
        errors.push(`Device/country row error: ${(err as Error).message}`);
      }
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
 * Record an ingestion run in analytics.ingestion_runs.
 * Returns the generated run ID for linking to raw_ga4_events rows.
 */
export async function createIngestionRun(
  pool: Pool,
  source: string,
  dataType: string,
): Promise<string> {
  const result = await pool.query(
    `INSERT INTO analytics.ingestion_runs (source, status, started_at, data_type)
     VALUES ($1, 'started', NOW(), $2)
     RETURNING id`,
    [source, dataType],
  );
  return result.rows[0].id;
}

/**
 * Mark an ingestion run as completed or failed.
 * Allowed status values: 'completed', 'failed' (per ingestion_runs_status_check constraint).
 */
export async function completeIngestionRun(
  pool: Pool,
  runId: string,
  status: 'completed' | 'failed',
  recordsProcessed: number,
  recordsFailed: number,
  durationMs: number,
  errorMessage?: string,
): Promise<void> {
  await pool.query(
    `UPDATE analytics.ingestion_runs
     SET status = $1, completed_at = NOW(), records_processed = $2,
         records_failed = $3, duration_ms = $4, error_message = $5,
         processed_count = $2, failed_count = $3
     WHERE id = $6`,
    [status, recordsProcessed, recordsFailed, durationMs, errorMessage ?? null, runId],
  );
}
