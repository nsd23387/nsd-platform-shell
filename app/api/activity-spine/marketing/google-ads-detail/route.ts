export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

function dateParams(req: NextRequest): { start: string; end: string } {
  const sp = req.nextUrl.searchParams;
  const preset = sp.get('preset');
  const now = new Date();
  let start: string;
  let end: string = now.toISOString().slice(0, 10);

  if (sp.get('start') && sp.get('end')) {
    start = sp.get('start')!;
    end = sp.get('end')!;
  } else if (preset === 'last_7d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    start = d.toISOString().slice(0, 10);
  } else if (preset === 'last_90d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 90);
    start = d.toISOString().slice(0, 10);
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    start = d.toISOString().slice(0, 10);
  }
  return { start, end };
}

async function getCampaignDaily(start: string, end: string) {
  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (occurred_at, payload->>'campaign_id')
        occurred_at,
        payload
      FROM analytics.raw_google_ads_campaign_daily
      WHERE occurred_at BETWEEN $1 AND $2
      ORDER BY occurred_at, payload->>'campaign_id', ingestion_run_id DESC
    )
    SELECT
      occurred_at::text AS date,
      payload->>'campaign_id' AS campaign_id,
      payload->>'campaign_name' AS campaign_name,
      COALESCE((payload->>'clicks')::int, 0) AS clicks,
      COALESCE((payload->>'impressions')::int, 0) AS impressions,
      COALESCE((payload->>'cost')::numeric, 0) AS cost,
      COALESCE((payload->>'conversions')::numeric, 0) AS conversions,
      COALESCE((payload->>'conversion_value')::numeric, 0) AS conversion_value,
      COALESCE((payload->>'ctr')::numeric, 0) AS ctr,
      COALESCE((payload->>'average_cpc')::numeric, 0) AS average_cpc
    FROM deduped
    ORDER BY occurred_at ASC, payload->>'campaign_id'
  `, [start, end]);
  return rows;
}

async function getCampaignSummary(start: string, end: string) {
  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (occurred_at, payload->>'campaign_id')
        payload
      FROM analytics.raw_google_ads_campaign_daily
      WHERE occurred_at BETWEEN $1 AND $2
      ORDER BY occurred_at, payload->>'campaign_id', ingestion_run_id DESC
    )
    SELECT
      payload->>'campaign_id' AS campaign_id,
      payload->>'campaign_name' AS campaign_name,
      SUM(COALESCE((payload->>'clicks')::int, 0)) AS clicks,
      SUM(COALESCE((payload->>'impressions')::int, 0)) AS impressions,
      SUM(COALESCE((payload->>'cost')::numeric, 0)) AS cost,
      SUM(COALESCE((payload->>'conversions')::numeric, 0)) AS conversions,
      SUM(COALESCE((payload->>'conversion_value')::numeric, 0)) AS conversion_value
    FROM deduped
    GROUP BY payload->>'campaign_id', payload->>'campaign_name'
    ORDER BY SUM(COALESCE((payload->>'cost')::numeric, 0)) DESC
  `, [start, end]);

  let totalSpend = 0, totalClicks = 0, totalImpressions = 0, totalConversions = 0, totalConversionValue = 0;
  for (const r of rows) {
    totalSpend += Number(r.cost);
    totalClicks += Number(r.clicks);
    totalImpressions += Number(r.impressions);
    totalConversions += Number(r.conversions);
    totalConversionValue += Number(r.conversion_value);
  }

  return {
    campaigns: rows.map(r => ({
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
      cost: Number(r.cost),
      conversions: Number(r.conversions),
      conversion_value: Number(r.conversion_value),
      cpc: Number(r.clicks) > 0 ? Number(r.cost) / Number(r.clicks) : 0,
      ctr: Number(r.impressions) > 0 ? Number(r.clicks) / Number(r.impressions) : 0,
      roas: Number(r.cost) > 0 ? Number(r.conversion_value) / Number(r.cost) : 0,
    })),
    totals: {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      conversions: totalConversions,
      conversion_value: totalConversionValue,
      cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      cpl: totalConversions > 0 ? totalSpend / totalConversions : 0,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      roas: totalSpend > 0 ? totalConversionValue / totalSpend : 0,
    },
  };
}

async function getKeywords(start: string, end: string, campaignId?: string | null) {
  const params: (string | null)[] = [start, end];
  let campaignFilter = '';
  if (campaignId) {
    params.push(campaignId);
    campaignFilter = `AND payload->>'campaign_id' = $3`;
  }

  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (occurred_at, payload->>'keyword_text', payload->>'campaign_id', payload->>'ad_group_id')
        payload
      FROM analytics.raw_google_ads_keyword_daily
      WHERE occurred_at BETWEEN $1 AND $2
        ${campaignFilter}
      ORDER BY occurred_at, payload->>'keyword_text', payload->>'campaign_id', payload->>'ad_group_id', ingestion_run_id DESC
    )
    SELECT
      payload->>'keyword_text' AS keyword_text,
      payload->>'keyword_match_type' AS keyword_match_type,
      payload->>'campaign_id' AS campaign_id,
      payload->>'campaign_name' AS campaign_name,
      payload->>'ad_group_id' AS ad_group_id,
      SUM(COALESCE((payload->>'clicks')::int, 0)) AS clicks,
      SUM(COALESCE((payload->>'impressions')::int, 0)) AS impressions,
      SUM(COALESCE((payload->>'cost')::numeric, 0)) AS cost,
      SUM(COALESCE((payload->>'conversions')::numeric, 0)) AS conversions,
      SUM(COALESCE((payload->>'conversion_value')::numeric, 0)) AS conversion_value
    FROM deduped
    GROUP BY
      payload->>'keyword_text',
      payload->>'keyword_match_type',
      payload->>'campaign_id',
      payload->>'campaign_name',
      payload->>'ad_group_id'
    ORDER BY SUM(COALESCE((payload->>'cost')::numeric, 0)) DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    keyword_text: r.keyword_text,
    keyword_match_type: r.keyword_match_type,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    ad_group_id: r.ad_group_id,
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
    cost: Number(r.cost),
    conversions: Number(r.conversions),
    conversion_value: Number(r.conversion_value),
    ctr: Number(r.impressions) > 0 ? Number(r.clicks) / Number(r.impressions) : 0,
    cpc: Number(r.clicks) > 0 ? Number(r.cost) / Number(r.clicks) : 0,
    cost_per_conversion: Number(r.conversions) > 0 ? Number(r.cost) / Number(r.conversions) : 0,
  }));
}

async function getSearchTerms(start: string, end: string, campaignId?: string | null, sortBy?: string | null) {
  const params: (string | null)[] = [start, end];
  let campaignFilter = '';
  if (campaignId) {
    params.push(campaignId);
    campaignFilter = `AND payload->>'campaign_id' = $3`;
  }
  const orderCol = sortBy === 'clicks' ? "SUM(COALESCE((payload->>'clicks')::int, 0))" : "SUM(COALESCE((payload->>'cost')::numeric, 0))";

  const { rows } = await pool.query(`
    WITH deduped AS (
      SELECT DISTINCT ON (occurred_at, payload->>'campaign_id', payload->>'ad_group_id', payload->>'search_term')
        payload
      FROM analytics.raw_google_ads_search_term_daily
      WHERE occurred_at BETWEEN $1 AND $2
        ${campaignFilter}
      ORDER BY occurred_at, payload->>'campaign_id', payload->>'ad_group_id', payload->>'search_term', ingestion_run_id DESC
    )
    SELECT
      payload->>'campaign_id' AS campaign_id,
      payload->>'campaign_name' AS campaign_name,
      payload->>'ad_group_id' AS ad_group_id,
      payload->>'ad_group_name' AS ad_group_name,
      SUM(COALESCE((payload->>'clicks')::int, 0)) AS clicks,
      SUM(COALESCE((payload->>'impressions')::int, 0)) AS impressions,
      SUM(COALESCE((payload->>'cost')::numeric, 0)) AS cost,
      SUM(COALESCE((payload->>'conversions')::numeric, 0)) AS conversions,
      SUM(COALESCE((payload->>'conversion_value')::numeric, 0)) AS conversion_value
    FROM deduped
    GROUP BY
      payload->>'campaign_id',
      payload->>'campaign_name',
      payload->>'ad_group_id',
      payload->>'ad_group_name'
    ORDER BY SUM(COALESCE((payload->>'cost')::numeric, 0)) DESC
    LIMIT 200
  `, params);

  return rows.map(r => ({
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    ad_group_id: r.ad_group_id,
    ad_group_name: r.ad_group_name,
    clicks: Number(r.clicks),
    impressions: Number(r.impressions),
    cost: Number(r.cost),
    conversions: Number(r.conversions),
    conversion_value: Number(r.conversion_value),
    ctr: Number(r.impressions) > 0 ? Number(r.clicks) / Number(r.impressions) : 0,
    cpc: Number(r.clicks) > 0 ? Number(r.cost) / Number(r.clicks) : 0,
    cost_per_conversion: Number(r.conversions) > 0 ? Number(r.cost) / Number(r.conversions) : 0,
  }));
}

async function getConversionActions(start: string, end: string) {
  try {
    const { rows } = await pool.query(`
      WITH deduped AS (
        SELECT DISTINCT ON (occurred_at, payload->>'campaign_id', payload->>'conversion_action_name')
          payload
        FROM analytics.raw_google_ads_campaign_conversions
        WHERE occurred_at BETWEEN $1 AND $2
        ORDER BY occurred_at, payload->>'campaign_id', payload->>'conversion_action_name', ingestion_run_id DESC
      )
      SELECT
        payload->>'conversion_action_name' AS conversion_action_name,
        payload->>'conversion_action_category' AS conversion_action_category,
        SUM(COALESCE((payload->>'conversions')::numeric, 0)) AS conversions,
        SUM(COALESCE((payload->>'conversion_value')::numeric, 0)) AS conversion_value
      FROM deduped
      GROUP BY payload->>'conversion_action_name', payload->>'conversion_action_category'
      ORDER BY SUM(COALESCE((payload->>'conversions')::numeric, 0)) DESC
    `, [start, end]);

    return rows.map(r => ({
      conversion_action_name: r.conversion_action_name,
      conversion_action_category: r.conversion_action_category,
      conversions: Number(r.conversions),
      conversion_value: Number(r.conversion_value),
      value_per_conversion: Number(r.conversions) > 0 ? Number(r.conversion_value) / Number(r.conversions) : 0,
    }));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('does not exist')) {
      return [];
    }
    throw err;
  }
}

async function getDistinctCampaigns(start: string, end: string) {
  const { rows } = await pool.query(`
    SELECT DISTINCT
      payload->>'campaign_id' AS campaign_id,
      payload->>'campaign_name' AS campaign_name
    FROM analytics.raw_google_ads_campaign_daily
    WHERE occurred_at BETWEEN $1 AND $2
    ORDER BY payload->>'campaign_name'
  `, [start, end]);
  return rows;
}

export async function GET(req: NextRequest) {
  try {
    const view = req.nextUrl.searchParams.get('view') || 'summary';
    const { start, end } = dateParams(req);
    const campaignId = req.nextUrl.searchParams.get('campaign_id');
    const sortBy = req.nextUrl.searchParams.get('sort_by');

    let result: unknown;

    switch (view) {
      case 'daily':
        result = await getCampaignDaily(start, end);
        break;
      case 'summary':
        result = await getCampaignSummary(start, end);
        break;
      case 'keywords':
        result = await getKeywords(start, end, campaignId);
        break;
      case 'search-terms':
        result = await getSearchTerms(start, end, campaignId, sortBy);
        break;
      case 'conversions':
        result = await getConversionActions(start, end);
        break;
      case 'campaigns-list':
        result = await getDistinctCampaigns(start, end);
        break;
      default:
        return NextResponse.json({ error: `Unknown view: ${view}` }, { status: 400 });
    }

    return NextResponse.json({ data: result, meta: { start, end, view } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[google-ads-detail] Error:', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
