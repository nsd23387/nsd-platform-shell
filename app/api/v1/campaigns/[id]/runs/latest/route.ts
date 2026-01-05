import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockLatestRun(campaignId: string) {
  return {
    id: 'run-001',
    campaign_id: campaignId,
    status: 'COMPLETED',
    started_at: '2025-01-20T08:00:00Z',
    completed_at: '2025-01-20T08:45:00Z',
    leads_processed: 250,
    emails_sent: 248,
    errors: 2,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockLatestRun(params.id));
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/runs/latest`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockLatestRun(params.id));
  }
}
