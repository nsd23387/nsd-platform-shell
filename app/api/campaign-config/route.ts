/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This UI only mutates configuration via nsd-sales-engine.
 *
 * Campaign Configuration Proxy
 * ============================
 *
 * This endpoint proxies configuration updates (including benchmarks_only)
 * to nsd-sales-engine. It does NOT write to the database directly.
 *
 * Endpoint: PATCH /api/campaign-config
 * Proxies to: PATCH ${SALES_ENGINE_URL}/api/v1/campaigns/:id/sourcing-config
 *
 * Request Body:
 * {
 *   campaignId: string,
 *   sourcing_config: {
 *     benchmarks_only?: boolean
 *   }
 * }
 *
 * Response:
 * - 200: Configuration updated successfully
 * - 400: Missing campaignId or sourcing_config
 * - 404: Campaign not found
 * - 409: Campaign cannot be modified in current state
 * - 502/503: Sales Engine unavailable
 *
 * GUARDRAILS:
 * - No writes to ODS
 * - No calls to execution endpoints
 * - No activity.events usage
 * - All persistence via nsd-sales-engine only
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * Fetch with timeout helper.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * PATCH /api/campaign-config
 *
 * Proxies sourcing configuration updates to nsd-sales-engine.
 * This is the ONLY way platform-shell should modify campaign config.
 */
export async function PATCH(req: Request) {
  try {
    // Parse request body
    const body = await req.json();
    const { campaignId, sourcing_config } = body;

    // Validate required fields
    if (!campaignId) {
      return NextResponse.json(
        {
          error: 'MISSING_CAMPAIGN_ID',
          message: 'Campaign ID is required',
        },
        { status: 400 }
      );
    }

    if (!sourcing_config || typeof sourcing_config !== 'object') {
      return NextResponse.json(
        {
          error: 'MISSING_SOURCING_CONFIG',
          message: 'sourcing_config object is required',
        },
        { status: 400 }
      );
    }

    // Get Sales Engine URL from server-side env
    const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

    if (!SALES_ENGINE_URL) {
      console.error('[campaign-config] SALES_ENGINE_URL not configured');
      return NextResponse.json(
        {
          error: 'SERVICE_UNAVAILABLE',
          message: 'Configuration service not configured',
        },
        { status: 503 }
      );
    }

    // Build proxy URL
    // PATCH ${SALES_ENGINE_URL}/api/v1/campaigns/:id/sourcing-config
    const proxyUrl = `${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/sourcing-config`;

    // Forward authorization header if present
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    console.log(`[campaign-config] Proxying PATCH to ${proxyUrl}`);

    // Make request to Sales Engine
    const response = await fetchWithTimeout(
      proxyUrl,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sourcing_config }),
      },
      15000
    );

    // Parse response
    const responseText = await response.text();
    let responseData: Record<string, unknown> = {};

    try {
      responseData = JSON.parse(responseText);
    } catch {
      // Non-JSON response
      if (!response.ok) {
        console.warn(
          `[campaign-config] Sales Engine returned non-JSON response: ${response.status}`
        );
        return NextResponse.json(
          {
            error: 'UPSTREAM_ERROR',
            message: responseText || 'Configuration update failed',
            status: response.status,
          },
          { status: response.status >= 500 ? 502 : response.status }
        );
      }
      // Successful non-JSON response (unlikely but handle)
      responseData = { success: true };
    }

    // Return response with same status code
    return NextResponse.json(responseData, { status: response.status });
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[campaign-config] Request timeout');
      return NextResponse.json(
        {
          error: 'SERVICE_TIMEOUT',
          message: 'Configuration service timed out',
        },
        { status: 504 }
      );
    }

    // Handle network errors
    console.error('[campaign-config] Fetch error:', error);
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Configuration service unavailable',
      },
      { status: 503 }
    );
  }
}
