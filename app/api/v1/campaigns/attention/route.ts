import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockAttentionItems() {
  return [
    {
      id: 'att-001',
      campaignId: 'camp-002',
      campaignName: 'Product Launch Sequence',
      reason: 'in_review_stale',
      status: 'PENDING_REVIEW',
      lastUpdated: '2025-01-18T16:45:00Z',
      primaryAction: {
        label: 'Review Now',
        href: '/sales-engine/campaigns/camp-002?tab=approvals',
      },
    },
    {
      id: 'att-002',
      campaignId: 'camp-003',
      campaignName: 'Re-engagement Campaign',
      reason: 'approved_not_started',
      status: 'RUNNABLE',
      lastUpdated: '2025-01-17T10:00:00Z',
      primaryAction: {
        label: 'Start Run',
        href: '/sales-engine/campaigns/camp-003?tab=execution',
      },
    },
    {
      id: 'att-003',
      campaignId: 'camp-004',
      campaignName: 'Holiday Promo',
      reason: 'run_failed',
      status: 'FAILED',
      lastUpdated: '2025-01-20T08:30:00Z',
      primaryAction: {
        label: 'View Errors',
        href: '/sales-engine/campaigns/camp-004?tab=monitoring',
      },
    },
  ];
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockAttentionItems());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/attention`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockAttentionItems());
  }
}
