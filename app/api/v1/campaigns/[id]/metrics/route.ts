import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

/**
 * Returns default metrics for campaigns that haven't reached the send stage.
 * 
 * IMPORTANT: Existing campaigns have not yet reached post-approval email sending,
 * so all send metrics should be zero. These values will be populated from
 * backend-observed data once emails are actually dispatched.
 */
function getMockMetrics(campaignId: string) {
  return {
    campaign_id: campaignId,
    total_leads: 0,
    emails_sent: 0,
    emails_opened: 0,
    emails_replied: 0,
    open_rate: 0,
    reply_rate: 0,
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
