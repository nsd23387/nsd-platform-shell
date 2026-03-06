/**
 * QMS Analytics API Route
 *
 * GET /api/activity-spine/marketing/qms
 *
 * Returns QMS deal analytics for the Warm Outreach screen:
 * pipeline summary, aging buckets, close rate, deal velocity,
 * status breakdown, and recent deals.
 *
 * GOVERNANCE: Read-only. All data comes from analytics.raw_qms_deals.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL not configured');
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      statement_timeout: 10000,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

const PIPELINE_SUMMARY_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE quote_active AND quote_activity NOT IN ('Quote Paid', 'Not Interested')) AS active_deals,
    COALESCE(SUM(total_price_cents) FILTER (WHERE quote_active AND quote_activity NOT IN ('Quote Paid', 'Not Interested')), 0) AS pipeline_cents,
    COALESCE(AVG(total_price_cents) FILTER (WHERE quote_active AND quote_activity NOT IN ('Quote Paid', 'Not Interested')), 0) AS avg_deal_cents,
    COUNT(*) FILTER (WHERE quote_activity = 'Quote Paid') AS won_deals,
    COALESCE(SUM(total_price_cents) FILTER (WHERE quote_activity = 'Quote Paid'), 0) AS won_cents,
    COUNT(*) AS total_deals
  FROM analytics.raw_qms_deals
`;

const AGING_BUCKETS_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE NOW() - updated_at < INTERVAL '2 days') AS bucket_0_2d,
    COUNT(*) FILTER (WHERE NOW() - updated_at >= INTERVAL '2 days' AND NOW() - updated_at < INTERVAL '7 days') AS bucket_3_7d,
    COUNT(*) FILTER (WHERE NOW() - updated_at >= INTERVAL '7 days' AND NOW() - updated_at < INTERVAL '14 days') AS bucket_8_14d,
    COUNT(*) FILTER (WHERE NOW() - updated_at >= INTERVAL '14 days') AS bucket_15_plus
  FROM analytics.raw_qms_deals
  WHERE quote_active
    AND quote_activity NOT IN ('Quote Paid', 'Not Interested')
`;

const CLOSE_RATE_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE quote_activity = 'Quote Paid') AS won,
    COUNT(*) FILTER (WHERE quote_activity = 'Not Interested') AS lost,
    COUNT(*) AS total,
    CASE WHEN COUNT(*) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE quote_activity = 'Quote Paid')::numeric
        / COUNT(*)::numeric,
      4)
      ELSE 0
    END AS close_rate,
    CASE WHEN COUNT(*) FILTER (WHERE quote_activity IN ('Quote Paid', 'Not Interested')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE quote_activity = 'Quote Paid')::numeric
        / COUNT(*) FILTER (WHERE quote_activity IN ('Quote Paid', 'Not Interested'))::numeric,
      4)
      ELSE 0
    END AS decision_rate,
    COALESCE(SUM(total_price_cents) FILTER (WHERE quote_activity = 'Quote Paid'), 0) AS won_revenue_cents,
    COALESCE(SUM(total_price_cents) FILTER (WHERE quote_activity = 'Not Interested'), 0) AS lost_revenue_cents,
    COUNT(*) - COUNT(*) FILTER (WHERE quote_activity IN ('Quote Paid', 'Not Interested')) AS open
  FROM analytics.raw_qms_deals
  WHERE created_at >= NOW() - INTERVAL '90 days'
`;

const DEAL_VELOCITY_SQL = `
  SELECT
    ROUND(AVG(EXTRACT(EPOCH FROM (quote_paid_at - created_at)) / 86400.0)::numeric, 1) AS avg_days_to_close,
    ROUND(AVG(EXTRACT(EPOCH FROM (deposit_paid_at - created_at)) / 86400.0)::numeric, 1) AS avg_days_to_deposit,
    COUNT(*) AS sample_size
  FROM analytics.raw_qms_deals
  WHERE quote_paid_at IS NOT NULL
    AND created_at >= NOW() - INTERVAL '90 days'
`;

const STATUS_BREAKDOWN_SQL = `
  SELECT
    quote_activity AS status,
    COUNT(*) AS count,
    COALESCE(SUM(total_price_cents), 0) AS value_cents
  FROM analytics.raw_qms_deals
  WHERE quote_active
  GROUP BY quote_activity
  ORDER BY count DESC
`;

const RECENT_DEALS_SQL = `
  SELECT
    quote_number,
    customer_name,
    quote_activity AS status,
    total_price_cents,
    sign_type,
    sign_text,
    created_at,
    updated_at,
    utm_source,
    landing_page,
    deposit_paid_at,
    quote_paid_at,
    followup_count,
    revision_round,
    discount_code
  FROM analytics.raw_qms_deals
  ORDER BY updated_at DESC
  LIMIT 25
`;

const ATTRIBUTION_SQL = `
  SELECT
    COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct') AS source,
    COUNT(*) AS count,
    COALESCE(SUM(total_price_cents), 0) AS value_cents,
    COUNT(*) FILTER (WHERE quote_activity = 'Quote Paid') AS won
  FROM analytics.raw_qms_deals
  GROUP BY COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct')
  ORDER BY count DESC
  LIMIT 15
`;

const DISCOUNT_USAGE_SQL = `
  SELECT
    COUNT(*) FILTER (WHERE discount_code IS NOT NULL) AS with_discount,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE discount_used_at IS NOT NULL) AS discount_redeemed,
    ROUND(AVG(discount_percentage) FILTER (WHERE discount_code IS NOT NULL), 1) AS avg_discount_pct
  FROM analytics.raw_qms_deals
  WHERE created_at >= NOW() - INTERVAL '90 days'
`;

const CLICK_TO_QUOTE_SQL = `
  WITH
    organic_clicks AS (
      SELECT COALESCE(SUM(clicks), 0) AS total_clicks
      FROM analytics.metrics_search_console_page
    ),
    paid_clicks AS (
      SELECT COALESCE(SUM((payload->>'clicks')::int), 0) AS total_clicks
      FROM analytics.raw_google_ads
      WHERE event_name = 'campaign_performance'
        AND source_system = 'google-ads-bq'
        AND occurred_at >= NOW() - INTERVAL '90 days'
    ),
    qms_totals AS (
      SELECT
        COUNT(*) AS total_quotes,
        COUNT(*) FILTER (WHERE COALESCE(NULLIF(utm_source, ''), NULLIF(referrer, ''), 'direct') != 'google' OR utm_medium IS NULL OR utm_medium != 'cpc') AS organic_quotes,
        COUNT(*) FILTER (WHERE utm_source = 'google' AND utm_medium = 'cpc') AS paid_quotes
      FROM analytics.raw_qms_deals
      WHERE created_at >= NOW() - INTERVAL '90 days'
    )
  SELECT
    oc.total_clicks AS organic_clicks,
    pc.total_clicks AS paid_clicks,
    q.total_quotes,
    q.organic_quotes,
    q.paid_quotes,
    CASE WHEN oc.total_clicks > 0
      THEN ROUND(q.organic_quotes::numeric / oc.total_clicks::numeric, 6)
      ELSE 0
    END AS organic_click_to_quote_rate,
    CASE WHEN pc.total_clicks > 0
      THEN ROUND(q.paid_quotes::numeric / pc.total_clicks::numeric, 6)
      ELSE 0
    END AS paid_click_to_quote_rate,
    CASE WHEN (oc.total_clicks + pc.total_clicks) > 0
      THEN ROUND(q.total_quotes::numeric / (oc.total_clicks + pc.total_clicks)::numeric, 6)
      ELSE 0
    END AS blended_click_to_quote_rate
  FROM organic_clicks oc, paid_clicks pc, qms_totals q
`;

const TIMESERIES_PIPELINE_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series(
      (NOW() - INTERVAL '90 days')::date,
      NOW()::date,
      '1 day'::interval
    ) AS d
  ),
  daily AS (
    SELECT created_at::date AS day, SUM(total_price_cents) / 100.0 AS val
    FROM analytics.raw_qms_deals
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY created_at::date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.day
  ORDER BY dr.d ASC
`;

const TIMESERIES_QUOTES_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series(
      (NOW() - INTERVAL '90 days')::date,
      NOW()::date,
      '1 day'::interval
    ) AS d
  ),
  daily AS (
    SELECT created_at::date AS day, COUNT(*) AS val
    FROM analytics.raw_qms_deals
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY created_at::date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.day
  ORDER BY dr.d ASC
`;

const TIMESERIES_WON_SQL = `
  WITH date_range AS (
    SELECT d::date FROM generate_series(
      (NOW() - INTERVAL '90 days')::date,
      NOW()::date,
      '1 day'::interval
    ) AS d
  ),
  daily AS (
    SELECT quote_paid_at::date AS day, SUM(total_price_cents) / 100.0 AS val
    FROM analytics.raw_qms_deals
    WHERE quote_paid_at IS NOT NULL
      AND quote_paid_at >= NOW() - INTERVAL '90 days'
    GROUP BY quote_paid_at::date
  )
  SELECT dr.d::text AS date, COALESCE(dy.val, 0) AS value
  FROM date_range dr
  LEFT JOIN daily dy ON dr.d = dy.day
  ORDER BY dr.d ASC
`;

function toNum(val: unknown): number {
  if (val == null) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

async function tableExists(db: Pool): Promise<boolean> {
  const result = await db.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'analytics' AND table_name = 'raw_qms_deals'
    ) AS exists
  `);
  return result.rows[0]?.exists === true;
}

export async function GET(request: NextRequest) {
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ data: null, error: 'Database not configured' }, { status: 200 });
  }

  try {
    const db = getPool();

    const exists = await tableExists(db);
    if (!exists) {
      return NextResponse.json({
        data: {
          available: false,
          pipeline: null,
          aging: null,
          close_rate: null,
          velocity: null,
          status_breakdown: [],
          recent_deals: [],
          attribution: [],
          discount_usage: null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const t0 = performance.now();

    const [
      pipelineRes,
      agingRes,
      closeRateRes,
      velocityRes,
      statusRes,
      recentRes,
      attrRes,
      discountRes,
      tsPipelineRes,
      tsQuotesRes,
      tsWonRes,
      clickToQuoteRes,
    ] = await Promise.all([
      db.query(PIPELINE_SUMMARY_SQL),
      db.query(AGING_BUCKETS_SQL),
      db.query(CLOSE_RATE_SQL),
      db.query(DEAL_VELOCITY_SQL),
      db.query(STATUS_BREAKDOWN_SQL),
      db.query(RECENT_DEALS_SQL),
      db.query(ATTRIBUTION_SQL),
      db.query(DISCOUNT_USAGE_SQL),
      db.query(TIMESERIES_PIPELINE_SQL),
      db.query(TIMESERIES_QUOTES_SQL),
      db.query(TIMESERIES_WON_SQL),
      db.query(CLICK_TO_QUOTE_SQL),
    ]);

    const queryMs = Math.round(performance.now() - t0);

    const p = pipelineRes.rows[0] ?? {};
    const a = agingRes.rows[0] ?? {};
    const cr = closeRateRes.rows[0] ?? {};
    const v = velocityRes.rows[0] ?? {};
    const disc = discountRes.rows[0] ?? {};
    const ctq = clickToQuoteRes.rows[0] ?? {};

    return NextResponse.json({
      data: {
        available: true,
        pipeline: {
          active_deals: toNum(p.active_deals),
          pipeline_value_usd: toNum(p.pipeline_cents) / 100,
          avg_deal_value_usd: toNum(p.avg_deal_cents) / 100,
          won_deals: toNum(p.won_deals),
          won_revenue_usd: toNum(p.won_cents) / 100,
          total_deals: toNum(p.total_deals),
        },
        aging: {
          bucket_0_2d: toNum(a.bucket_0_2d),
          bucket_3_7d: toNum(a.bucket_3_7d),
          bucket_8_14d: toNum(a.bucket_8_14d),
          bucket_15_plus: toNum(a.bucket_15_plus),
        },
        close_rate: {
          won: toNum(cr.won),
          lost: toNum(cr.lost),
          open: toNum(cr.open),
          total: toNum(cr.total),
          rate: toNum(cr.close_rate),
          decision_rate: toNum(cr.decision_rate),
          won_revenue_usd: toNum(cr.won_revenue_cents) / 100,
          lost_revenue_usd: toNum(cr.lost_revenue_cents) / 100,
        },
        velocity: {
          avg_days_to_close: toNum(v.avg_days_to_close),
          avg_days_to_deposit: toNum(v.avg_days_to_deposit),
          sample_size: toNum(v.sample_size),
        },
        status_breakdown: (statusRes.rows ?? []).map((r: Record<string, unknown>) => ({
          status: String(r.status),
          count: toNum(r.count),
          value_usd: toNum(r.value_cents) / 100,
        })),
        recent_deals: (recentRes.rows ?? []).map((r: Record<string, unknown>) => ({
          quote_number: String(r.quote_number),
          customer_name: r.customer_name ? String(r.customer_name) : null,
          status: String(r.status),
          total_price_usd: toNum(r.total_price_cents) / 100,
          sign_type: r.sign_type ? String(r.sign_type) : null,
          sign_text: r.sign_text ? String(r.sign_text) : null,
          created_at: r.created_at ? String(r.created_at) : null,
          updated_at: r.updated_at ? String(r.updated_at) : null,
          utm_source: r.utm_source ? String(r.utm_source) : null,
          landing_page: r.landing_page ? String(r.landing_page) : null,
          deposit_paid_at: r.deposit_paid_at ? String(r.deposit_paid_at) : null,
          quote_paid_at: r.quote_paid_at ? String(r.quote_paid_at) : null,
          followup_count: toNum(r.followup_count),
          revision_round: toNum(r.revision_round),
          discount_code: r.discount_code ? String(r.discount_code) : null,
        })),
        attribution: (attrRes.rows ?? []).map((r: Record<string, unknown>) => ({
          source: String(r.source),
          count: toNum(r.count),
          value_usd: toNum(r.value_cents) / 100,
          won: toNum(r.won),
        })),
        discount_usage: {
          with_discount: toNum(disc.with_discount),
          total: toNum(disc.total),
          discount_redeemed: toNum(disc.discount_redeemed),
          avg_discount_pct: toNum(disc.avg_discount_pct),
        },
        click_to_quote: {
          organic_clicks: toNum(ctq.organic_clicks),
          paid_clicks: toNum(ctq.paid_clicks),
          total_quotes: toNum(ctq.total_quotes),
          organic_quotes: toNum(ctq.organic_quotes),
          paid_quotes: toNum(ctq.paid_quotes),
          organic_rate: toNum(ctq.organic_click_to_quote_rate),
          paid_rate: toNum(ctq.paid_click_to_quote_rate),
          blended_rate: toNum(ctq.blended_click_to_quote_rate),
        },
        timeseries: {
          pipeline: (tsPipelineRes.rows ?? []).map((r: Record<string, unknown>) => ({
            date: String(r.date),
            value: toNum(r.value),
          })),
          quotes: (tsQuotesRes.rows ?? []).map((r: Record<string, unknown>) => ({
            date: String(r.date),
            value: toNum(r.value),
          })),
          won_revenue: (tsWonRes.rows ?? []).map((r: Record<string, unknown>) => ({
            date: String(r.date),
            value: toNum(r.value),
          })),
        },
      },
      meta: { query_execution_ms: queryMs },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[marketing/qms] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch QMS analytics' }, { status: 500 });
  }
}
