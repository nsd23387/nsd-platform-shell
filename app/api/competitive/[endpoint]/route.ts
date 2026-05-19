// =============================================================================
// GOVERNANCE LOCK — read-only proxy
//
// Forwards GET requests to the nsd-integrations competitive API, attaching
// a server-side bearer token. The token MUST NOT leak to the browser. Only
// the endpoints in ALLOWED_ENDPOINTS are reachable; any new endpoint must be
// added explicitly here.
//
// Deployment target: Vercel production (also runs unchanged in local dev).
//
// Upstream contract (per the nsd-integrations investigation report,
// 2026-05-19): GET /api/v1/competitive/{summary,weekly-insights/latest,
// pages/changes} return raw JSON payloads (not envelopes). This proxy wraps
// each successful response into the {success,data} envelope the dashboard
// page expects, and for /weekly-insights/latest it also unwraps the inner
// `insight` field (which may be null when no insight has been generated).
//
// Environment variables:
//
//   Base URL:
//     1. NSD_ODS_API_BASE_URL          — explicit override
//     2. (default)                     — https://nsd-integrations.vercel.app
//
//   Bearer token:
//     1. API_SECRET_KEY                — required; same value as the
//                                        API_SECRET_KEY env var in the
//                                        nsd-integrations Vercel project
//                                        (one value, one name, two Vercel
//                                        projects — each project's env
//                                        namespace is isolated so the value
//                                        has to be pasted into both).
//
// When the token cannot be resolved, the proxy returns 503 with
// `configured: false` so the page renders a friendly banner instead of
// crashing. Upstream HTTP errors are returned as `{success:false,error}`
// with the upstream status code preserved.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowlist of endpoint slugs -> upstream paths under the producer API.
// Keeps the proxy from being usable as a generic forwarder.
const ALLOWED_ENDPOINTS: Record<string, string> = {
  summary: 'api/v1/competitive/summary',
  'weekly-insight': 'api/v1/competitive/weekly-insights/latest',
  changes: 'api/v1/competitive/pages/changes',
};

const DEFAULT_ODS_BASE_URL = 'https://nsd-integrations.vercel.app';
const ODS_FETCH_TIMEOUT_MS = 8000;

function resolveOdsBaseUrl(): string {
  const explicit = process.env.NSD_ODS_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  return DEFAULT_ODS_BASE_URL;
}

function resolveOdsToken(): string | null {
  return process.env.API_SECRET_KEY || null;
}

/**
 * The producer returns raw payloads. The dashboard page consumes a
 * {success, data, error} envelope. This function adapts upstream JSON to
 * that envelope, applying the per-endpoint unwrap for weekly-insight (which
 * wraps its payload in an outer `insight` field that can be null).
 */
function wrapUpstream(endpoint: string, body: unknown): { success: boolean; data: unknown } {
  if (endpoint === 'weekly-insight') {
    const insight = (body && typeof body === 'object' && 'insight' in body)
      ? (body as Record<string, unknown>).insight ?? null
      : null;
    return { success: true, data: insight };
  }
  return { success: true, data: body };
}

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

  const token = resolveOdsToken();
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Competitive API is not configured: set API_SECRET_KEY ' +
          '(same value as API_SECRET_KEY in the nsd-integrations Vercel project).',
        configured: false,
      },
      { status: 503 }
    );
  }

  const baseUrl = resolveOdsBaseUrl();
  const qs = req.nextUrl.searchParams.toString();
  const url = `${baseUrl}/${upstreamPath}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ODS_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await res.text();
    let upstream: unknown;
    try {
      upstream = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Upstream returned non-JSON', raw: text.slice(0, 200) },
        { status: 502 }
      );
    }
    if (!res.ok) {
      const upstreamError =
        upstream && typeof upstream === 'object' && 'error' in upstream
          ? String((upstream as Record<string, unknown>).error)
          : `Upstream HTTP ${res.status}`;
      return NextResponse.json(
        { success: false, error: upstreamError },
        { status: res.status }
      );
    }
    return NextResponse.json(wrapUpstream(endpoint, upstream), { status: 200 });
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
