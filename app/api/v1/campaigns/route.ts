import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getAuthHeader(request: NextRequest): string | null {
  return request.headers.get('authorization');
}

async function proxyToBackend(
  request: NextRequest,
  method: string,
  body?: unknown
): Promise<NextResponse> {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockCampaigns(), { status: 200 });
  }

  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const authHeader = getAuthHeader(request);
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(BACKEND_URL, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend service' },
      { status: 503 }
    );
  }
}

function getMockCampaigns() {
  return [
    {
      id: 'camp-001',
      name: 'Q1 Outreach Campaign',
      description: 'Initial outreach to enterprise prospects',
      status: 'DRAFT',
      created_at: '2025-01-15T10:00:00Z',
      updated_at: '2025-01-20T14:30:00Z',
      canEdit: true,
      canSubmit: true,
      canApprove: false,
      isRunnable: false,
    },
    {
      id: 'camp-002',
      name: 'Product Launch Sequence',
      description: 'Multi-touch campaign for new product launch',
      status: 'PENDING_REVIEW',
      created_at: '2025-01-10T09:00:00Z',
      updated_at: '2025-01-18T16:45:00Z',
      canEdit: false,
      canSubmit: false,
      canApprove: true,
      isRunnable: false,
    },
    {
      id: 'camp-003',
      name: 'Re-engagement Campaign',
      description: 'Targeting dormant leads',
      status: 'RUNNABLE',
      created_at: '2025-01-05T11:00:00Z',
      updated_at: '2025-01-17T10:00:00Z',
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true,
    },
  ];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  if (!BACKEND_URL) {
    let campaigns = getMockCampaigns();
    if (status) {
      campaigns = campaigns.filter((c) => c.status === status);
    }
    return NextResponse.json(campaigns);
  }

  const url = status ? `${BACKEND_URL}?status=${status}` : BACKEND_URL;
  
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = getAuthHeader(request);
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(url, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockCampaigns());
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  if (!BACKEND_URL) {
    const newCampaign = {
      id: `camp-${Date.now()}`,
      name: body.name,
      description: body.description || null,
      status: 'DRAFT',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      canEdit: true,
      canSubmit: true,
      canApprove: false,
      isRunnable: false,
    };
    return NextResponse.json(newCampaign, { status: 201 });
  }

  return proxyToBackend(request, 'POST', body);
}
