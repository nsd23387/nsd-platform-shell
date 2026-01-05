import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockNotices() {
  return [
    {
      id: 'notice-1',
      type: 'info',
      message: 'Analytics data may be delayed up to 15 minutes',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockNotices());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/notices`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockNotices());
  }
}
