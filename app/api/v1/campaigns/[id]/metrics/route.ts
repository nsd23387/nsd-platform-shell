import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: campaignId } = await context.params;

  const metrics = {
    campaign_id: campaignId,
    total_leads: 1247,
    emails_sent: 892,
    emails_opened: 423,
    emails_replied: 67,
    emails_bounced: 23,
    emails_unsubscribed: 8,
    open_rate: 0.474,
    reply_rate: 0.075,
    bounce_rate: 0.026,
    last_updated: new Date().toISOString(),
  };

  return NextResponse.json(metrics);
}
