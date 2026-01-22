import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

/**
 * Returns empty array for recent runs when no backend is configured.
 * 
 * IMPORTANT: Existing campaigns have not yet been executed, so there are
 * no recent runs to display. Showing placeholder runs would create an
 * inconsistency with other observability components showing "Ready for execution"
 * or "No activity observed yet".
 * 
 * Recent run data will be populated from backend-observed events once
 * campaigns are actually executed.
 */
function getMockRecentRuns() {
  // Return empty array - no runs have been executed yet
  return [];
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
