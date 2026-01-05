import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockMetrics(campaignId: string) {
  return {
    campaign_id: campaignId,
    total_leads: 1247,
    emails_sent: 892,
    emails_opened: 423,
    emails_replied: 67,
    open_rate: 0.474,
    reply_rate: 0.075,
    last_updated: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockMetrics(params.id));
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/metrics`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockMetrics(params.id));
  }
}
