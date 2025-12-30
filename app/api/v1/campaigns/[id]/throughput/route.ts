import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const { id: campaignId } = await context.params;

  const throughput = {
    campaign_id: campaignId,
    daily_limit: 500,
    hourly_limit: 50,
    mailbox_limit: 100,
    current_daily_usage: 248,
    current_hourly_usage: 32,
    is_blocked: false,
    block_reason: null,
    last_reset: new Date(Date.now() - 3600000).toISOString(),
  };

  return NextResponse.json(throughput);
}
