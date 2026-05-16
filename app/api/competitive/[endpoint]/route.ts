// =============================================================================
// GOVERNANCE LOCK — read-only proxy
//
// Forwards GET requests to the nsd-ods-api competitive endpoints, attaching
// a server-side bearer token. The token MUST NOT leak to the browser. Only
// the endpoints in ALLOWED_ENDPOINTS are reachable; any new endpoint must be
// added explicitly here.
//
// Deployment target: Vercel production (also runs unchanged in local dev).
//
// Environment variables (resolved in order, first match wins):
//
//   Base URL:
//     1. NSD_ODS_API_BASE_URL          — explicit override
//                                        e.g. https://nsd-ods-api.example.com
//     2. NEXT_PUBLIC_SUPABASE_URL      — Supabase project URL
//                                        -> ${url}/functions/v1/ods-api
//     3. SUPABASE_DATABASE_URL         — Postgres connection string;
//                                        project ref parsed from host
//                                        -> https://<ref>.supabase.co/functions/v1/ods-api
//     4. DATABASE_URL                  — same parsing, last-resort fallback
//
//   Bearer token:
//     1. NSD_ODS_API_SERVICE_TOKEN     — explicit per-API token
//     2. SUPABASE_SERVICE_ROLE_KEY     — standard Supabase server-side key
//                                        (already set in this project for
//                                        campaign-create + other server
//                                        routes that bypass RLS)
//
// When either cannot be resolved, the proxy returns 503 with a descriptive
// `error` and `configured: false` so the page can render a friendly banner
// instead of crashing.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Allowlist of endpoint slugs -> upstream paths under the ODS API.
// Keeps the proxy from being usable as a generic forwarder.
const ALLOWED_ENDPOINTS: Record<string, string> = {
  summary: 'api/v1/competitive/summary',
  'weekly-insight': 'api/v1/competitive/weekly-insights/latest',
  changes: 'api/v1/competitive/pages/changes',
};

const ODS_FETCH_TIMEOUT_MS = 8000;

/**
 * Parses a Postgres connection string and extracts the Supabase project ref.
 *
 * Pooled Supabase URLs look like:
 *   postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres
 *
 * Direct (non-pooled) URLs look like:
 *   postgresql://postgres:<pw>@db.<ref>.supabase.co:5432/postgres
 *
 * Returns null if the URL does not match a known Supabase shape.
 */
function projectRefFromDatabaseUrl(dbUrl: string): string | null {
  try {
    const u = new URL(dbUrl);
    // Pooled: username is "postgres.<ref>"
    if (u.username && u.username.startsWith('postgres.')) {
      const ref = u.username.slice('postgres.'.length);
      if (ref) return ref;
    }
    // Direct: hostname is "db.<ref>.supabase.co"
    const dbHost = u.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (dbHost) return dbHost[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves the ODS API base URL using the documented fallback chain.
 * Returns a normalised URL with no trailing slash, or null if unresolvable.
 */
function resolveOdsBaseUrl(): string | null {
  const explicit = process.env.NSD_ODS_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ods-api`;
  }

  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (dbUrl) {
    const ref = projectRefFromDatabaseUrl(dbUrl);
    if (ref) return `https://${ref}.supabase.co/functions/v1/ods-api`;
  }

  return null;
}

function resolveOdsToken(): string | null {
  return (
    process.env.NSD_ODS_API_SERVICE_TOKEN ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
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

  const baseUrl = resolveOdsBaseUrl();
  const token = resolveOdsToken();

  if (!baseUrl || !token) {
    const missing: string[] = [];
    if (!baseUrl) {
      missing.push(
        'ODS base URL (set NSD_ODS_API_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_DATABASE_URL)'
      );
    }
    if (!token) {
      missing.push(
        'bearer token (set NSD_ODS_API_SERVICE_TOKEN or SUPABASE_SERVICE_ROLE_KEY)'
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: `ODS API is not configured: missing ${missing.join(' and ')}.`,
        configured: false,
      },
      { status: 503 }
    );
  }

  const qs = req.nextUrl.searchParams.toString();
  const url = `${baseUrl}/${upstreamPath}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ODS_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Supabase Edge Functions require the apikey header in addition to
        // the bearer token when called over HTTPS. Sending it unconditionally
        // is harmless for non-Supabase upstreams that don't read it.
        apikey: token,
      },
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
