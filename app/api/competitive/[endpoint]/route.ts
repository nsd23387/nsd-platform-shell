// =============================================================================
// GOVERNANCE LOCK — read-only proxy
// Forwards GET requests to the nsd-ods-api competitive endpoints, attaching
// NSD_ODS_API_SERVICE_TOKEN server-side. The token MUST NOT leak to the
// browser. Only the endpoints in ALLOWED_ENDPOINTS are reachable; any new
// endpoint must be added explicitly here.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowlist of endpoint slugs -> upstream paths under /api/v1/competitive/.
// Keeps the proxy from being usable as a generic forwarder.
const ALLOWED_ENDPOINTS: Record<string, string> = {
  summary: 'summary',
  'weekly-insight': 'weekly-insights/latest',
  changes: 'pages/changes',
};

const ODS_FETCH_TIMEOUT_MS = 8000;

export async function GET(
  req: NextRequest,
  { params }: { params: { endpoint: string } }
) {
  const endpoint = params.endpoint;
  const upstreamPath = ALLOWED_ENDPOINTS[endpoint];
  if (!upstreamPath) {
    return NextResponse.json(
      { success: false, error: `Unknown competitive endpoint: ${endpoint}` },
      { status: 404 }
    );
  }

  const baseUrl = process.env.NSD_ODS_API_BASE_URL;
  const token = process.env.NSD_ODS_API_SERVICE_TOKEN;
  if (!baseUrl || !token) {
    return NextResponse.json(
      {
        success: false,
        error: 'ODS API is not configured. Set NSD_ODS_API_BASE_URL and NSD_ODS_API_SERVICE_TOKEN.',
        configured: false,
      },
      { status: 503 }
    );
  }

  const qs = req.nextUrl.searchParams.toString();
  const url = `${baseUrl.replace(/\/$/, '')}/api/v1/competitive/${upstreamPath}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ODS_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { success: false, error: 'Upstream returned non-JSON', raw: text.slice(0, 200) };
    }
    return NextResponse.json(body, { status: res.status });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    console.error('[competitive proxy]', endpoint, isAbort ? 'TIMEOUT' : err);
    return NextResponse.json(
      {
        success: false,
        error: isAbort
          ? `Upstream timeout after ${ODS_FETCH_TIMEOUT_MS}ms`
          : 'Upstream request failed',
      },
      { status: isAbort ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
