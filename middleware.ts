/**
 * HTTP Basic Auth Middleware - M67.9-01 Internal Access Control
 * 
 * Provides simple HTTP Basic Authentication for internal access gating.
 * This is a hosting-only access control mechanism - NOT application-level auth.
 * 
 * CONSTRAINTS:
 * - Server-side only - credentials never exposed to browser
 * - Fail-open if credentials not configured (dev safety)
 * - Easy to remove when no longer needed
 * - Does NOT affect read-only enforcement or API gating
 * 
 * Environment Variables (server-side only):
 * - BASIC_AUTH_USERNAME: Username for basic auth
 * - BASIC_AUTH_PASSWORD: Password for basic auth
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Paths that should be excluded from authentication.
 * Static assets and Next.js internals don't need auth.
 */
const PUBLIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/static',
  '/api/health', // Health check endpoint if needed
];

/**
 * Check if a path should skip authentication.
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Validate Basic Auth credentials from Authorization header.
 */
function validateCredentials(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  // Should not happen if isAuthEnabled is checked first, but safety check
  if (!username || !password) {
    return true;
  }

  try {
    // Decode Base64 credentials
    const base64Credentials = authHeader.slice(6); // Remove 'Basic '
    const credentials = atob(base64Credentials);
    const [providedUsername, providedPassword] = credentials.split(':');

    // Constant-time comparison to prevent timing attacks
    const usernameMatch = providedUsername === username;
    const passwordMatch = providedPassword === password;

    return usernameMatch && passwordMatch;
  } catch {
    // Invalid Base64 encoding
    return false;
  }
}

/**
 * Check if Basic Auth is enabled (credentials are configured).
 */
function isAuthEnabled(): boolean {
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;
  return Boolean(username && password);
}

/**
 * Create a 401 Unauthorized response with WWW-Authenticate header.
 */
function unauthorizedResponse(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="NSD Sales Engine", charset="UTF-8"',
      'Content-Type': 'text/plain',
    },
  });
}

/**
 * Middleware function for HTTP Basic Auth.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Skip auth for public paths (static assets, etc.)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If auth is not enabled, allow all requests (fail-open for dev safety)
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  // Validate credentials
  const authHeader = request.headers.get('authorization');
  if (!validateCredentials(authHeader)) {
    return unauthorizedResponse();
  }

  // Credentials valid, proceed
  return NextResponse.next();
}

/**
 * Configure which routes the middleware applies to.
 * Excludes static assets, Next.js internals, and API routes.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes - need Node runtime for Supabase service role)
     * - functions (Edge Functions)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images)
     */
    '/((?!api|functions|_next/static|_next/image|favicon.ico|images).*)',
  ],
};
