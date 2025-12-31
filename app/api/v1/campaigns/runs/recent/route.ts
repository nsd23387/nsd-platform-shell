import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockRecentRuns() {
  return [
    {
      runId: 'run-001',
      campaignId: 'camp-001',
      campaignName: 'Q4 Enterprise Outreach',
      status: 'COMPLETED',
      leadsAttempted: 150,
      leadsSent: 142,
      leadsBlocked: 8,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      runId: 'run-002',
      campaignId: 'camp-002',
      campaignName: 'SMB Product Launch',
      status: 'PARTIAL',
      leadsAttempted: 75,
      leadsSent: 68,
      leadsBlocked: 7,
      completedAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockRecentRuns());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/runs/recent`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockRecentRuns());
  }
}
