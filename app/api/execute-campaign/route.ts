/**
 * Execution Proxy
 *
 * platform-shell is NOT an execution engine.
 * This route exists solely to proxy execution requests
 * from the UI to nsd-sales-engine server-to-server.
 *
 * ARCHITECTURE:
 * - Browser calls /api/execute-campaign (same-origin, no CORS)
 * - This proxy forwards to nsd-sales-engine server-to-server
 * - The canonical execution endpoint lives in nsd-sales-engine
 * - platform-shell emits NO execution events, generates NO run IDs
 *
 * CONFIGURATION:
 * - SALES_ENGINE_URL (required): Base URL of nsd-sales-engine
 *   Example: https://nsd-sales-engine.vercel.app
 * - SALES_ENGINE_API_BASE_URL (optional): API path prefix
 *   Default: /api/v1/campaigns
 *   Example: /api/v1/campaigns or /api/campaigns
 *
 * TARGET URL CONSTRUCTION:
 *   ${SALES_ENGINE_URL}${SALES_ENGINE_API_BASE_URL}/${campaignId}/start
 *
 * FALLBACK:
 * If primary path returns 404, tries legacy path:
 *   ${SALES_ENGINE_URL}/api/campaigns/${campaignId}/start
 */

// Force Node.js runtime for server-side fetch
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * Build a clean URL path without double slashes.
 */
function buildUrl(baseUrl: string, apiPath: string, campaignId: string): string {
  // Remove trailing slash from base URL
  const cleanBase = baseUrl.replace(/\/+$/, '');
  
  // Ensure API path starts with / and doesn't end with /
  let cleanPath = apiPath.trim();
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  cleanPath = cleanPath.replace(/\/+$/, '');
  
  return `${cleanBase}${cleanPath}/${campaignId}/start`;
}

/**
 * Make a fetch request with timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req: Request) {
  console.log('[execute-campaign proxy] Received execution request');

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { campaignId } = body;

    // Validate campaignId
    if (!campaignId) {
      console.error('[execute-campaign proxy] Missing campaignId');
      return NextResponse.json(
        { error: 'MISSING_CAMPAIGN_ID', message: 'campaignId is required' },
        { status: 400 }
      );
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      console.error('[execute-campaign proxy] Invalid campaignId format:', campaignId);
      return NextResponse.json(
        { error: 'INVALID_CAMPAIGN_ID', message: 'campaignId must be a valid UUID' },
        { status: 400 }
      );
    }

    // Get Sales Engine URL (server-side only, required)
    const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;
    if (!SALES_ENGINE_URL) {
      console.error('[execute-campaign proxy] SALES_ENGINE_URL not configured');
      return NextResponse.json(
        { 
          error: 'SALES_ENGINE_URL_NOT_CONFIGURED', 
          message: 'Execution service not configured. Set SALES_ENGINE_URL environment variable.' 
        },
        { status: 500 }
      );
    }

    // Get API base path (optional, defaults to /api/v1/campaigns)
    const SALES_ENGINE_API_BASE_URL = process.env.SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns';

    // Build request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward Authorization header if present (optional)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Build primary target URL
    const primaryUrl = buildUrl(SALES_ENGINE_URL, SALES_ENGINE_API_BASE_URL, campaignId);
    console.log('[execute-campaign proxy] Primary target:', primaryUrl);

    // Attempt primary request with timeout
    let response: Response;
    try {
      response = await fetchWithTimeout(primaryUrl, {
        method: 'POST',
        headers,
      }, 15000);
      
      console.log('[execute-campaign proxy] Primary response status:', response.status);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[execute-campaign proxy] Request timeout after 15s');
        return NextResponse.json(
          { error: 'EXECUTION_TIMEOUT', message: 'Execution service timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw err;
    }

    // If primary returns 404, try fallback path (legacy /api/campaigns/:id/start)
    if (response.status === 404) {
      const fallbackUrl = buildUrl(SALES_ENGINE_URL, '/api/campaigns', campaignId);
      
      // Only try fallback if it's different from primary
      if (fallbackUrl !== primaryUrl) {
        console.log('[execute-campaign proxy] Primary returned 404, trying fallback:', fallbackUrl);
        
        try {
          response = await fetchWithTimeout(fallbackUrl, {
            method: 'POST',
            headers,
          }, 15000);
          
          console.log('[execute-campaign proxy] Fallback response status:', response.status);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            console.error('[execute-campaign proxy] Fallback request timeout after 15s');
            return NextResponse.json(
              { error: 'EXECUTION_TIMEOUT', message: 'Execution service timed out. Please try again.' },
              { status: 504 }
            );
          }
          throw err;
        }
      }
    }

    // Read response
    const responseText = await response.text();
    
    // Try to parse as JSON to validate
    let responseJson: unknown;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // Response is not valid JSON - wrap it
      console.warn('[execute-campaign proxy] Response is not valid JSON');
      
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'ENDPOINT_NOT_FOUND', 
            message: 'Execution service endpoint not found. Check SALES_ENGINE_URL and SALES_ENGINE_API_BASE_URL configuration.',
            status: response.status,
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'INVALID_RESPONSE', 
          message: 'Execution service returned an invalid response.',
          status: response.status,
          body: responseText.substring(0, 500), // Truncate for safety
        },
        { status: 502 }
      );
    }

    // Return exact JSON response from sales-engine
    return NextResponse.json(responseJson, { status: response.status });

  } catch (err) {
    console.error('[execute-campaign proxy] Error:', err);
    
    // Network errors
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'NETWORK_ERROR', 
          message: 'Could not connect to execution service. Please try again.' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'EXECUTION_PROXY_FAILED', 
        message: err instanceof Error ? err.message : 'Proxy request failed'
      },
      { status: 500 }
    );
  }
}
