import { NextRequest, NextResponse } from 'next/server';

/**
 * Resolve Sales Engine API base URL safely.
 *
 * IMPORTANT:
 * In this repo, `*_SALES_ENGINE_API_BASE_URL` is often configured as a relative path
 * like `/api/v1/campaigns` for client routing. If we proxy using that value here,
 * this route will recurse into itself.
 */
function resolveBackendBaseUrl(): string | null {
  const configured =
    process.env.SALES_ENGINE_API_BASE_URL ||
    process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL ||
    '/api/v1/campaigns';

  // If already an absolute URL, use it directly.
  if (configured.startsWith('http://') || configured.startsWith('https://')) {
    return configured.replace(/\/+$/, '');
  }

  // If relative, only usable when SALES_ENGINE_URL is configured.
  const origin = process.env.SALES_ENGINE_URL;
  if (!origin) return null;

  const normalizedOrigin = origin.replace(/\/+$/, '');
  const normalizedPath = configured.startsWith('/') ? configured : `/${configured}`;
  return `${normalizedOrigin}${normalizedPath}`.replace(/\/+$/, '');
}

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
  const backendBaseUrl = resolveBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json(getMockLatestRun(params.id));
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${backendBaseUrl}/${params.id}/runs/latest`, { headers });

    // If upstream returns 204 (no runs), do NOT attempt to parse JSON.
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => null);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockLatestRun(params.id));
  }
}
