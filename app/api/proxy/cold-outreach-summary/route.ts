/**
 * Proxy: GET /api/proxy/cold-outreach-summary?window=30d&campaignId=xxx
 *
 * Forwards to: GET ${SALES_ENGINE_URL}/api/analytics/cold-outreach-summary
 *
 * Returns cold outreach KPIs: emailsSent, deliverabilityRate, replyRate,
 * positiveReplyRate, contactsSourced, and engagement breakdowns.
 *
 * D-16 (provenance): the Sales Engine summary is served from ODS campaign
 * metric snapshots (public.campaign_metrics_snapshots), which are written by
 * scheduled syncs — NOT a live Smartlead read. This route therefore also
 * queries the snapshot store for its latest write timestamp and returns it
 * as `asOf`, so consumers can render freshness and warn when data is stale.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool | null {
  const connectionString =
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 2,
      statement_timeout: 5000,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Latest write into the ODS snapshot store backing the Sales Engine summary.
 * Returns an ISO timestamp or null when the DB is unreachable/unconfigured.
 */
async function getSnapshotAsOf(): Promise<string | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const result = await p.query(
      `SELECT (MAX(created_at) AT TIME ZONE 'UTC') AS as_of
       FROM public.campaign_metrics_snapshots`,
    );
    const asOf = result.rows[0]?.as_of;
    if (!asOf) return null;
    return asOf instanceof Date ? asOf.toISOString() : String(asOf);
  } catch (err) {
    console.warn(
      '[proxy/cold-outreach-summary] snapshot as-of lookup failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

const SOURCE_NAME = 'Sales Engine ODS snapshots (campaign_metrics_snapshots)';

function getDefaultResponse(asOf: string | null = null) {
  return {
    window: '30d',
    contactsSourced: 0,
    leadsPushed: 0,
    emailsSent: 0,
    emailsBounced: 0,
    emailsOpened: 0,
    totalReplies: 0,
    positiveReplies: 0,
    negativeReplies: 0,
    neutralReplies: 0,
    optOutReplies: 0,
    deliverabilityRate: 0,
    replyRate: 0,
    positiveReplyRate: 0,
    openRate: 0,
    asOf,
    _source: 'default',
    _sourceName: SOURCE_NAME,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const window = searchParams.get('window') || '30d';
  const campaignId = searchParams.get('campaignId') || '';

  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  // Freshness of the ODS snapshot store backing the Sales Engine summary.
  // Fetched regardless of upstream availability so the page can always show
  // an honest as-of.
  const asOfPromise = getSnapshotAsOf();

  if (!SALES_ENGINE_URL) {
    console.warn('[proxy/cold-outreach-summary] SALES_ENGINE_URL not configured');
    return NextResponse.json(getDefaultResponse(await asOfPromise));
  }

  const params = new URLSearchParams({ window });
  if (campaignId) params.set('campaignId', campaignId);

  const targetUrl = `${SALES_ENGINE_URL}/api/analytics/cold-outreach-summary?${params}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          Authorization: `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn('[proxy/cold-outreach-summary] Sales Engine returned:', response.status);
      return NextResponse.json(getDefaultResponse(await asOfPromise));
    }

    const raw = await response.json();

    // Flatten the nested kpis + breakdown structure into a single object
    const kpis = raw.kpis ?? {};
    const breakdown = raw.breakdown ?? {};
    const flattened: Record<string, unknown> = {
      window,
      contactsSourced: kpis.contactsSourced ?? 0,
      leadsPushed: breakdown.leadsPushed ?? 0,
      emailsSent: kpis.emailsSent ?? 0,
      emailsBounced: breakdown.emailsBounced ?? 0,
      emailsOpened: breakdown.emailsOpened ?? 0,
      totalReplies: breakdown.totalReplies ?? 0,
      positiveReplies: breakdown.positiveReplies ?? 0,
      negativeReplies: breakdown.negativeReplies ?? 0,
      neutralReplies: breakdown.neutralReplies ?? 0,
      optOutReplies: breakdown.optOutReplies ?? 0,
      deliverabilityRate: (kpis.deliverabilityRate ?? 0) / 100,
      replyRate: (kpis.replyRate ?? 0) / 100,
      positiveReplyRate: (kpis.positiveReplyRate ?? 0) / 100,
      openRate: kpis.emailsSent > 0 ? (breakdown.emailsOpened ?? 0) / kpis.emailsSent : 0,
      // D-16: prefer an upstream-declared as-of if the Sales Engine ever
      // returns one; otherwise fall back to the ODS snapshot store timestamp.
      asOf: (typeof raw.asOf === 'string' && raw.asOf) || (await asOfPromise),
      _source: 'live',
      _sourceName: SOURCE_NAME,
    };
    return NextResponse.json(flattened);
  } catch (err) {
    console.error('[proxy/cold-outreach-summary] Proxy error:', err instanceof Error ? err.message : err);
    return NextResponse.json(getDefaultResponse(await asOfPromise));
  }
}
