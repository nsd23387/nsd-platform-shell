export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'summary';

    let result: unknown;

    switch (view) {
      case 'summary':
        result = await getSummary();
        break;
      case 'aging':
        result = await getAging();
        break;
      case 'win-rate-by-type':
        result = await getWinRateByType();
        break;
      case 'pipeline-trend':
        result = await getPipelineTrend();
        break;
      case 'stage-breakdown':
        result = await getStageBreakdown();
        break;
      case 'attribution':
        result = await getAttribution();
        break;
      case 'cost-per-quote':
        result = await getCostPerQuote();
        break;
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }

    return NextResponse.json({ data: result, meta: { view } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[quote-funnel] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getSummary() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) AS total_quotes,
      COUNT(*) FILTER (WHERE quote_paid_at IS NOT NULL) AS won_orders,
      COUNT(*) FILTER (WHERE quote_active = true AND quote_activity NOT IN ('Quote Paid', 'Not Interested')) AS open_quotes,
      COUNT(*) FILTER (WHERE quote_active = false OR quote_activity = 'Not Interested') AS lost_quotes,
      COALESCE(SUM(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS won_revenue_cents,
      COALESCE(SUM(total_price_cents), 0) AS total_pipeline_cents,
      COALESCE(AVG(total_price_cents) FILTER (WHERE total_price_cents > 0), 0) AS avg_quote_value_cents,
      COALESCE(AVG(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL AND total_price_cents > 0), 0) AS avg_won_value_cents,
      COALESCE(AVG(EXTRACT(EPOCH FROM (quote_paid_at - created_at)) / 86400) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS avg_sales_cycle_days,
      MIN(created_at)::text AS earliest_quote,
      MAX(created_at)::text AS latest_quote
    FROM analytics.raw_qms_deals
  `);

  const r = rows[0];
  const totalQuotes = Number(r.total_quotes);
  const wonOrders = Number(r.won_orders);

  return {
    total_quotes: totalQuotes,
    won_orders: wonOrders,
    open_quotes: Number(r.open_quotes),
    lost_quotes: Number(r.lost_quotes),
    quote_to_close_rate: totalQuotes > 0 ? wonOrders / totalQuotes : 0,
    won_revenue: Number(r.won_revenue_cents) / 100,
    total_pipeline: Number(r.total_pipeline_cents) / 100,
    revenue_per_quote: totalQuotes > 0 ? Number(r.won_revenue_cents) / 100 / totalQuotes : 0,
    avg_quote_value: Number(r.avg_quote_value_cents) / 100,
    avg_won_value: Number(r.avg_won_value_cents) / 100,
    avg_sales_cycle_days: Number(Number(r.avg_sales_cycle_days).toFixed(1)),
    earliest_quote: r.earliest_quote,
    latest_quote: r.latest_quote,
  };
}

async function getAging() {
  const { rows } = await pool.query(`
    WITH banded AS (
      SELECT
        CASE
          WHEN NOW() - created_at < interval '3 days' THEN '0-3 days'
          WHEN NOW() - created_at < interval '7 days' THEN '3-7 days'
          WHEN NOW() - created_at < interval '14 days' THEN '7-14 days'
          WHEN NOW() - created_at < interval '30 days' THEN '14-30 days'
          WHEN NOW() - created_at < interval '60 days' THEN '30-60 days'
          ELSE '60+ days'
        END AS aging_band,
        CASE
          WHEN NOW() - created_at < interval '3 days' THEN 1
          WHEN NOW() - created_at < interval '7 days' THEN 2
          WHEN NOW() - created_at < interval '14 days' THEN 3
          WHEN NOW() - created_at < interval '30 days' THEN 4
          WHEN NOW() - created_at < interval '60 days' THEN 5
          ELSE 6
        END AS band_order,
        total_price_cents
      FROM analytics.raw_qms_deals
      WHERE quote_active = true
        AND quote_activity NOT IN ('Quote Paid', 'Not Interested')
    )
    SELECT
      aging_band,
      COUNT(*) AS count,
      COALESCE(SUM(total_price_cents), 0) AS pipeline_cents
    FROM banded
    GROUP BY aging_band, band_order
    ORDER BY band_order
  `);

  const bands = rows.map(r => ({
    band: r.aging_band,
    count: Number(r.count),
    pipeline_value: Number(r.pipeline_cents) / 100,
  }));

  const totalOpen = bands.reduce((s, b) => s + b.count, 0);
  const aged30Plus = bands.filter(b => ['30-60 days', '60+ days'].includes(b.band)).reduce((s, b) => s + b.count, 0);

  return {
    bands,
    total_open: totalOpen,
    aged_30_plus: aged30Plus,
    aged_rate: totalOpen > 0 ? aged30Plus / totalOpen : 0,
  };
}

async function getWinRateByType() {
  const { rows: byQuoteType } = await pool.query(`
    SELECT
      quote_type,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE quote_paid_at IS NOT NULL) AS won,
      COALESCE(SUM(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS won_revenue_cents,
      COALESCE(AVG(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL AND total_price_cents > 0), 0) AS avg_won_cents
    FROM analytics.raw_qms_deals
    GROUP BY quote_type
    ORDER BY COUNT(*) DESC
  `);

  const { rows: bySignType } = await pool.query(`
    SELECT
      COALESCE(sign_type, 'Unknown') AS sign_type,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE quote_paid_at IS NOT NULL) AS won,
      COALESCE(SUM(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS won_revenue_cents,
      COALESCE(AVG(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL AND total_price_cents > 0), 0) AS avg_won_cents
    FROM analytics.raw_qms_deals
    GROUP BY sign_type
    ORDER BY COUNT(*) DESC
  `);

  const mapRow = (r: Record<string, unknown>) => ({
    type: String(r.quote_type || r.sign_type || 'Unknown'),
    total: Number(r.total),
    won: Number(r.won),
    win_rate: Number(r.total) > 0 ? Number(r.won) / Number(r.total) : 0,
    won_revenue: Number(r.won_revenue_cents) / 100,
    avg_won_value: Number(r.avg_won_cents) / 100,
  });

  return {
    by_quote_type: byQuoteType.map(r => mapRow(r as unknown as Record<string, unknown>)),
    by_sign_type: bySignType.map(r => mapRow(r as unknown as Record<string, unknown>)),
  };
}

async function getPipelineTrend() {
  const { rows } = await pool.query(`
    SELECT
      date_trunc('week', created_at)::date::text AS week,
      COUNT(*) AS submissions,
      COUNT(*) FILTER (WHERE quote_paid_at IS NOT NULL) AS won,
      COALESCE(SUM(total_price_cents), 0) AS pipeline_cents,
      COALESCE(SUM(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS won_cents
    FROM analytics.raw_qms_deals
    GROUP BY 1
    ORDER BY 1
  `);

  return rows.map(r => ({
    week: r.week,
    submissions: Number(r.submissions),
    won: Number(r.won),
    pipeline_value: Number(r.pipeline_cents) / 100,
    won_revenue: Number(r.won_cents) / 100,
  }));
}

async function getStageBreakdown() {
  const { rows } = await pool.query(`
    SELECT
      quote_activity AS stage,
      quote_active AS active,
      COUNT(*) AS count,
      COALESCE(SUM(total_price_cents), 0) AS pipeline_cents,
      COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 0) AS avg_age_days
    FROM analytics.raw_qms_deals
    GROUP BY quote_activity, quote_active
    ORDER BY COUNT(*) DESC
  `);

  return rows.map(r => ({
    stage: r.stage,
    active: r.active,
    count: Number(r.count),
    pipeline_value: Number(r.pipeline_cents) / 100,
    avg_age_days: Number(Number(r.avg_age_days).toFixed(1)),
  }));
}

async function getAttribution() {
  const { rows: bySource } = await pool.query(`
    SELECT
      COALESCE(utm_source, 'Unknown') AS source,
      COALESCE(utm_medium, 'Unknown') AS medium,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE quote_paid_at IS NOT NULL) AS won,
      COALESCE(SUM(total_price_cents) FILTER (WHERE quote_paid_at IS NOT NULL), 0) AS won_cents
    FROM analytics.raw_qms_deals
    GROUP BY utm_source, utm_medium
    ORDER BY COUNT(*) DESC
  `);

  const totalWithAttribution = bySource.filter(r => r.source !== 'Unknown').reduce((s, r) => s + Number(r.total), 0);
  const totalAll = bySource.reduce((s, r) => s + Number(r.total), 0);

  return {
    by_source: bySource.map(r => ({
      source: r.source,
      medium: r.medium,
      total: Number(r.total),
      won: Number(r.won),
      win_rate: Number(r.total) > 0 ? Number(r.won) / Number(r.total) : 0,
      won_revenue: Number(r.won_cents) / 100,
    })),
    attribution_rate: totalAll > 0 ? totalWithAttribution / totalAll : 0,
    total_with_attribution: totalWithAttribution,
    total_quotes: totalAll,
  };
}

async function getCostPerQuote() {
  const { rows: adSpend } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (occurred_at, payload->>'campaign_id')
        occurred_at,
        payload
      FROM analytics.raw_google_ads_campaign_daily
      ORDER BY occurred_at, payload->>'campaign_id', ingestion_run_id DESC
    )
    SELECT
      SUM(COALESCE((payload->>'cost')::numeric, 0)) AS total_spend,
      MIN(occurred_at)::text AS spend_start,
      MAX(occurred_at)::text AS spend_end,
      COUNT(DISTINCT occurred_at) AS spend_days
    FROM deduped
  `);

  const { rows: quoteCount } = await pool.query(`
    SELECT COUNT(*) AS cnt
    FROM analytics.raw_web_events
    WHERE event_type = 'conversion'
  `);

  const totalSpend = Number(adSpend[0].total_spend);
  const totalQuotes = Number(quoteCount[0].cnt);

  return {
    google_ads_spend: totalSpend,
    web_quote_submissions: totalQuotes,
    cost_per_quote: totalQuotes > 0 ? totalSpend / totalQuotes : 0,
    spend_period: {
      start: adSpend[0].spend_start,
      end: adSpend[0].spend_end,
      days: Number(adSpend[0].spend_days),
    },
    caveat: 'Cost per Quote uses total Google Ads spend divided by all web quote submissions. UTM campaign attribution is not yet available for per-campaign breakdown.',
  };
}
