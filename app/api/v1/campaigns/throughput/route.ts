import { NextResponse } from 'next/server';

export async function GET() {
  const throughputData = {
    daily_limit: 500,
    daily_used: 127,
    daily_remaining: 373,
    hourly_limit: 50,
    hourly_used: 12,
    hourly_remaining: 38,
    active_campaigns_count: 1,
    blocked_by_throughput_count: 0,
    last_reset: new Date().toISOString(),
    is_throttled: false,
  };

  return NextResponse.json(throughputData);
}
