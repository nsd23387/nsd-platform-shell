import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  const throughput = {
    campaign_id: campaignId,
    daily_limit: 500,
    hourly_limit: 50,
    mailbox_limit: 100,
    current_daily_usage: 248,
    current_hourly_usage: 32,
    is_blocked: false,
    block_reason: null,
  };

  return NextResponse.json(throughput);
}
