import { NextResponse } from 'next/server';

export async function GET() {
  const throughput = {
    dailyLimit: 500,
    usedToday: 127,
    activeCampaigns: 1,
    blockedByThroughput: 0,
  };

  return NextResponse.json(throughput);
}
