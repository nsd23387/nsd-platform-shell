import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockHistory() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return Array.from({ length: 7 }, (_, i) => ({
    timestamp: new Date(now - (6 - i) * day).toISOString(),
    emails_sent: Math.floor(Math.random() * 150) + 50,
    emails_opened: Math.floor(Math.random() * 80) + 20,
    emails_replied: Math.floor(Math.random() * 15) + 5,
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockHistory());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/${params.id}/metrics/history`, { headers });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockHistory());
  }
}
