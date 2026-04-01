/**
 * Proxy: GET /api/proxy/cold-outreach-summary
 *
 * Fetches cold outreach campaign metrics from nsd-sales-engine.
 * Read-only, observability-only. No execution controls.
 *
 * Query params forwarded:
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD   (absolute date range)
 *   ?window=7d|30d|90d                  (relative window fallback)
 *
 * Target: GET ${SALES_ENGINE_URL}/api/analytics/cold-outreach-summary
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export interface ColdOutreachSummary {
  contacts_sourced: number;
  emails_sent: number;
  emails_delivered: number;
  deliverability_rate: number;
  replies: number;
  reply_rate: number;
  positive_replies: number;
  positive_reply_rate: number;
}

const EMPTY_SUMMARY: ColdOutreachSummary = {
  contacts_sourced: 0,
  emails_sent: 0,
  emails_delivered: 0,
  deliverability_rate: 0,
  replies: 0,
  reply_rate: 0,
  positive_replies: 0,
  positive_reply_rate: 0,
};

export async function GET(request: NextRequest) {
  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    return NextResponse.json({
      data: EMPTY_SUMMARY,
      _source: 'default',
      _note: 'SALES_ENGINE_URL not configured',
    });
  }

  const targetUrl = new URL(`${SALES_ENGINE_URL}/api/analytics/cold-outreach-summary`);

  // Forward date range params
  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');
  const window = request.nextUrl.searchParams.get('window');

  if (start) targetUrl.searchParams.set('start', start);
  if (end) targetUrl.searchParams.set('end', end);
  if (window) targetUrl.searchParams.set('window', window);

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          'Authorization': `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn('[proxy/cold-outreach-summary] Sales Engine returned:', response.status);
      return NextResponse.json({
        data: EMPTY_SUMMARY,
        _source: 'default',
        _note: `Sales Engine returned ${response.status}`,
      });
    }

    const data = await response.json();

    return NextResponse.json({
      data: {
        contacts_sourced: Number(data.contacts_sourced ?? data.contactsSourced ?? 0),
        emails_sent: Number(data.emails_sent ?? data.emailsSent ?? 0),
        emails_delivered: Number(data.emails_delivered ?? data.emailsDelivered ?? 0),
        deliverability_rate: Number(data.deliverability_rate ?? data.deliverabilityRate ?? 0),
        replies: Number(data.replies ?? 0),
        reply_rate: Number(data.reply_rate ?? data.replyRate ?? 0),
        positive_replies: Number(data.positive_replies ?? data.positiveReplies ?? 0),
        positive_reply_rate: Number(data.positive_reply_rate ?? data.positiveReplyRate ?? 0),
      } satisfies ColdOutreachSummary,
      _source: 'sales-engine',
    });
  } catch (error) {
    console.error('[proxy/cold-outreach-summary] Proxy error:', error);

    return NextResponse.json({
      data: EMPTY_SUMMARY,
      _source: 'default',
      _note: 'Failed to reach Sales Engine',
    });
  }
}
