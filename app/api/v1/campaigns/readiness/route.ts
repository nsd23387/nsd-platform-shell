import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockReadiness() {
  return {
    total: 8,
    draft: 2,
    pendingReview: 2,
    runnable: 2,
    running: 1,
    completed: 1,
    failed: 0,
    archived: 0,
    blockers: [
      { reason: 'MISSING_HUMAN_APPROVAL', count: 2 },
      { reason: 'NO_LEADS_PERSISTED', count: 1 },
    ],
  };
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockReadiness());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/readiness`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockReadiness());
  }
}
