/**
 * Proxy: GET /api/proxy/cold-outreach-summary?window=30d&campaignId=xxx
 *
 * Forwards to: GET ${SALES_ENGINE_URL}/api/analytics/cold-outreach-summary
 *
 * Returns cold outreach KPIs: emailsSent, deliverabilityRate, replyRate,
 * positiveReplyRate, contactsSourced, and engagement breakdowns.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

function getDefaultResponse() {
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
    _source: 'default',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const window = searchParams.get('window') || '30d';
  const campaignId = searchParams.get('campaignId') || '';

  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.warn('[proxy/cold-outreach-summary] SALES_ENGINE_URL not configured');
    return NextResponse.json(getDefaultResponse());
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
      return NextResponse.json(getDefaultResponse());
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
      _source: 'live',
    };
    return NextResponse.json(flattened);
  } catch (err) {
    console.error('[proxy/cold-outreach-summary] Proxy error:', err instanceof Error ? err.message : err);
    return NextResponse.json(getDefaultResponse());
  }
}
