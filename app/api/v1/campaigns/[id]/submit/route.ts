import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockSubmitResponse(campaignId: string) {
  return {
    id: campaignId,
    name: 'Campaign',
    description: null,
    status: 'PENDING_REVIEW',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: new Date().toISOString(),
    canEdit: false,
    canSubmit: false,
    canApprove: true,
    isRunnable: false,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    if (params.id.startsWith('camp-')) {
      return NextResponse.json(getMockSubmitResponse(params.id));
    }
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/submit`, {
      method: 'POST',
      headers,
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json({ error: 'Failed to submit campaign' }, { status: 503 });
  }
}
