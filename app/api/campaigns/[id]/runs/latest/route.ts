/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This endpoint proxies to Sales Engine's canonical read model
 * to fetch the latest run status for a campaign.
 *
 * Endpoint: GET /api/campaigns/:id/runs/latest
 * Proxies to: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/runs/latest
 *
 * Response Status Codes:
 * - 200: Run found, returns run data
 * - 204: No runs yet
 * - 404: Campaign not found
 * - 502/503: Execution service unavailable
 */

export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

/**
 * Latest run response from Sales Engine.
 * Only render these exact fields (no derived state).
 */
interface LatestRunResponse {
  run_id: string;
  status: string;
  execution_mode: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch with timeout helper.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 10000
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  // Validate campaign ID
  if (!campaignId) {
    return NextResponse.json(
      { error: 'MISSING_CAMPAIGN_ID', message: 'Campaign ID is required' },
      { status: 400 }
    );
  }

  // Get Sales Engine URL
  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.error('[runs/latest] SALES_ENGINE_URL not configured');
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Execution service not configured',
      },
      { status: 503 }
    );
  }

  try {
    // Proxy to Sales Engine's canonical read model
    const url = `${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/runs/latest`;

    // Forward authorization header if present
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers,
    });

    // Handle 204 No Content (no runs yet)
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // Handle 404 (campaign not found)
    if (response.status === 404) {
      return NextResponse.json(
        {
          error: 'CAMPAIGN_NOT_FOUND',
          message: 'Campaign not found',
        },
        { status: 404 }
      );
    }

    // Handle other non-OK responses
    if (!response.ok) {
      console.warn(
        `[runs/latest] Sales Engine returned ${response.status} for campaign ${campaignId}`
      );
      return NextResponse.json(
        {
          error: 'UPSTREAM_ERROR',
          message: 'Execution service returned an error',
          status: response.status,
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // Parse and validate response
    const data = await response.json();

    // Extract only the fields we need (no derived state)
    const latestRun: LatestRunResponse = {
      run_id: data.run_id,
      status: data.status,
      execution_mode: data.execution_mode,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(latestRun, { status: 200 });
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[runs/latest] Request timeout for campaign ${campaignId}`);
      return NextResponse.json(
        {
          error: 'SERVICE_TIMEOUT',
          message: 'Execution service timed out',
        },
        { status: 504 }
      );
    }

    // Handle network errors
    console.error(`[runs/latest] Fetch error for campaign ${campaignId}:`, error);
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Execution service unavailable',
      },
      { status: 503 }
    );
  }
}
