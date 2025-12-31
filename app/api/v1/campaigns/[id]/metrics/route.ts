import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  const metrics = {
    campaign_id: campaignId,
    total_leads: 1247,
    emails_sent: 892,
    emails_opened: 423,
    emails_replied: 67,
    open_rate: 0.474,
    reply_rate: 0.075,
    last_updated: new Date().toISOString(),
  };

  return NextResponse.json(metrics);
}
