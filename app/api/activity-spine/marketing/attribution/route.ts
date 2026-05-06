export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

type View =
  | 'source-funnel'
  | 'channel-revenue'
  | 'google-ads-performance'
  | 'google-ads-quality';

function defaultWindow30d() {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 29);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const view = (sp.get('view') ?? 'source-funnel') as View;

    switch (view) {
      case 'source-funnel':
        return NextResponse.json({ data: await getSourceFunnel(sp), meta: { view } });
      case 'channel-revenue':
        return NextResponse.json({ data: await getChannelRevenue(sp), meta: { view } });
      case 'google-ads-performance':
        return NextResponse.json({ data: await getGoogleAdsPerformance(sp), meta: { view } });
      case 'google-ads-quality':
        return NextResponse.json({ data: await getGoogleAdsQuality(), meta: { view } });
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[marketing/attribution] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getSourceFunnel(sp: URLSearchParams) {
  const sourceGroup = sp.get('source_group');
  const params: unknown[] = [];
  let where = '';
  if (sourceGroup) {
    params.push(sourceGroup);
    where = 'WHERE source_group = $1';
  }

  const { rows } = await pool.query(
    `SELECT source_group, submitted_quotes, paid_quotes, paid_conversion_rate,
            paid_revenue_cents, test_quotes, quotes_with_origin_page
     FROM metrics.source_to_paid_funnel
     ${where}
     ORDER BY COALESCE(paid_revenue_cents, 0) DESC`,
    params
  );

  return rows.map(r => ({
    source_group: r.source_group,
    submitted_quotes: Number(r.submitted_quotes),
    paid_quotes: Number(r.paid_quotes),
    paid_conversion_rate: r.paid_conversion_rate !== null ? Number(r.paid_conversion_rate) : null,
    paid_revenue_cents: Number(r.paid_revenue_cents),
    paid_revenue_usd: Number(r.paid_revenue_cents) / 100,
    test_quotes: Number(r.test_quotes),
    quotes_with_origin_page: Number(r.quotes_with_origin_page),
    avg_paid_value_usd:
      Number(r.paid_quotes) > 0
        ? Number(r.paid_revenue_cents) / 100 / Number(r.paid_quotes)
        : 0,
  }));
}

async function getChannelRevenue(sp: URLSearchParams) {
  const { start, end } =
    sp.get('start') && sp.get('end')
      ? { start: sp.get('start')!, end: sp.get('end')! }
      : defaultWindow30d();

  const params: unknown[] = [start, end];
  const conditions = ['date BETWEEN $1::date AND $2::date'];

  const sourceGroup = sp.get('source_group');
  if (sourceGroup) {
    params.push(sourceGroup);
    conditions.push(`source_group = $${params.length}`);
  }

  const limit = Math.min(Number(sp.get('limit') ?? 500), 1000);
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT date::text AS date, source_group, submitted_quotes, paid_quotes,
            paid_conversion_rate, paid_revenue_cents, test_quotes, quotes_with_origin_page
     FROM metrics.channel_revenue_daily
     WHERE ${conditions.join(' AND ')}
     ORDER BY date DESC, COALESCE(paid_revenue_cents, 0) DESC
     LIMIT $${params.length}`,
    params
  );

  return rows.map(r => ({
    date: r.date,
    source_group: r.source_group,
    submitted_quotes: Number(r.submitted_quotes),
    paid_quotes: Number(r.paid_quotes),
    paid_conversion_rate: r.paid_conversion_rate !== null ? Number(r.paid_conversion_rate) : null,
    paid_revenue_cents: Number(r.paid_revenue_cents),
    paid_revenue_usd: Number(r.paid_revenue_cents) / 100,
    test_quotes: Number(r.test_quotes),
    quotes_with_origin_page: Number(r.quotes_with_origin_page),
  }));
}

async function getGoogleAdsPerformance(sp: URLSearchParams) {
  const { start, end } =
    sp.get('start') && sp.get('end')
      ? { start: sp.get('start')!, end: sp.get('end')! }
      : defaultWindow30d();

  const params: unknown[] = [start, end];
  const conditions = ['report_date BETWEEN $1::date AND $2::date'];

  const confidence = sp.get('join_confidence');
  if (confidence) {
    params.push(confidence);
    conditions.push(`join_confidence = $${params.length}`);
  }

  const limit = Math.min(Number(sp.get('limit') ?? 200), 1000);
  params.push(limit);

  const { rows } = await pool.query(
    `SELECT report_date::text AS report_date, utm_campaign, utm_content,
            google_campaign_id, google_campaign_name, ad_clicks, ad_impressions,
            ad_ctr_pct, ad_cost_usd, submitted_quotes, paid_quotes, paid_conversion_rate,
            paid_revenue_cents, paid_revenue_usd, estimated_roas_qms,
            cost_per_quote_usd, cost_per_paid_quote_usd,
            quotes_with_gclid, quotes_with_gbraid, quotes_with_wbraid,
            qms_join_path, join_confidence
     FROM marketing.google_ads_quote_performance
     WHERE ${conditions.join(' AND ')}
     ORDER BY report_date DESC NULLS LAST, COALESCE(paid_revenue_cents, 0) DESC
     LIMIT $${params.length}`,
    params
  );

  return rows.map(r => ({
    report_date: r.report_date,
    utm_campaign: r.utm_campaign,
    utm_content: r.utm_content,
    google_campaign_id: r.google_campaign_id,
    google_campaign_name: r.google_campaign_name,
    ad_clicks: Number(r.ad_clicks),
    ad_impressions: Number(r.ad_impressions),
    ad_ctr_pct: r.ad_ctr_pct !== null ? Number(r.ad_ctr_pct) : null,
    ad_cost_usd: Number(r.ad_cost_usd),
    submitted_quotes: Number(r.submitted_quotes),
    paid_quotes: Number(r.paid_quotes),
    paid_conversion_rate: r.paid_conversion_rate !== null ? Number(r.paid_conversion_rate) : null,
    paid_revenue_cents: Number(r.paid_revenue_cents),
    paid_revenue_usd: Number(r.paid_revenue_usd),
    estimated_roas_qms: r.estimated_roas_qms !== null ? Number(r.estimated_roas_qms) : null,
    cost_per_quote_usd: r.cost_per_quote_usd !== null ? Number(r.cost_per_quote_usd) : null,
    cost_per_paid_quote_usd: r.cost_per_paid_quote_usd !== null ? Number(r.cost_per_paid_quote_usd) : null,
    quotes_with_gclid: Number(r.quotes_with_gclid),
    quotes_with_gbraid: Number(r.quotes_with_gbraid),
    quotes_with_wbraid: Number(r.quotes_with_wbraid),
    qms_join_path: r.qms_join_path,
    join_confidence: r.join_confidence,
  }));
}

async function getGoogleAdsQuality() {
  const { rows } = await pool.query(
    `SELECT join_confidence, date_count, row_count, total_submitted_quotes, total_paid_quotes,
            total_revenue_cents, total_revenue_usd, total_spend_usd, pct_of_quotes, pct_of_spend
     FROM marketing.google_ads_quote_attribution_quality
     ORDER BY CASE join_confidence
       WHEN 'exact_campaign_adgroup_id' THEN 1
       WHEN 'exact_campaign_id'         THEN 2
       WHEN 'name_match'                THEN 3
       WHEN 'source_group_only'         THEN 4
       WHEN 'unavailable'               THEN 5
       WHEN 'ads_only'                  THEN 6
       ELSE 7
     END`
  );

  return rows.map(r => ({
    join_confidence: r.join_confidence,
    date_count: Number(r.date_count),
    row_count: Number(r.row_count),
    total_submitted_quotes: Number(r.total_submitted_quotes),
    total_paid_quotes: Number(r.total_paid_quotes),
    total_revenue_cents: Number(r.total_revenue_cents),
    total_revenue_usd: Number(r.total_revenue_usd),
    total_spend_usd: Number(r.total_spend_usd),
    pct_of_quotes: r.pct_of_quotes !== null ? Number(r.pct_of_quotes) : null,
    pct_of_spend: r.pct_of_spend !== null ? Number(r.pct_of_spend) : null,
  }));
}
