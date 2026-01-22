import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

/**
 * Returns default throughput config with zero usage for a campaign.
 * 
 * IMPORTANT: Existing campaigns have not yet been executed, so throughput
 * usage should be zero. Showing placeholder usage would create an
 * inconsistency with other observability components showing "Ready for execution"
 * or "No activity observed yet".
 * 
 * Throughput data will be populated from backend-observed events once
 * campaigns are actually executed.
 */
function getMockThroughput(campaignId: string) {
  return {
    campaign_id: campaignId,
    daily_limit: 500,
    hourly_limit: 50,
    mailbox_limit: 100,
    current_daily_usage: 0,
    current_hourly_usage: 0,
    is_blocked: false,
    block_reason: null,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockThroughput(params.id));
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/throughput`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockThroughput(params.id));
  }
}
