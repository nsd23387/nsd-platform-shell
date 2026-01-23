import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

/**
 * Returns default throughput config with zero usage.
 * 
 * IMPORTANT: Existing campaigns have not yet been executed, so throughput
 * usage should be zero. Showing placeholder usage would create an
 * inconsistency with other observability components.
 * 
 * Throughput data will be populated from backend-observed events once
 * campaigns are actually executed.
 */
function getMockThroughput() {
  return {
    dailyLimit: 500,
    usedToday: 0,
    activeCampaigns: 0,
    blockedByThroughput: 0,
  };
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockThroughput());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/throughput`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockThroughput());
  }
}
