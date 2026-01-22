/**
 * Proxy: GET /api/proxy/execution-state?campaignId=xxx
 * 
 * ARCHITECTURAL CONSTRAINT:
 * - Platform-shell does NOT implement execution logic
 * - Sales-engine is the SOLE execution authority
 * - This proxy ONLY forwards requests to sales-engine
 * 
 * Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/execution-state
 * 
 * This proxy:
 * - Forwards the request server-to-server (avoids CORS)
 * - Passes through the response unchanged
 * - Does NOT implement any execution logic
 * - Does NOT query the database directly
 * - Does NOT transform or cache responses
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { error: 'MISSING_CAMPAIGN_ID', message: 'campaignId query parameter is required' },
      { status: 400 }
    );
  }

  // Server-side only: SALES_ENGINE_URL
  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.error('[proxy/execution-state] SALES_ENGINE_URL not configured');
    return NextResponse.json(
      { 
        error: 'SERVICE_NOT_CONFIGURED', 
        message: 'Execution service not configured. Set SALES_ENGINE_URL environment variable.' 
      },
      { status: 503 }
    );
  }

  // Construct target URL to sales-engine
  const targetUrl = `${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/execution-state`;
  
  console.log('[proxy/execution-state] Forwarding to:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth token if present
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          'Authorization': `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      // 10 second timeout for read operations
      signal: AbortSignal.timeout(10000),
    });

    // Pass through the response unchanged
    const data = await response.json();

    console.log('[proxy/execution-state] Response:', {
      campaignId,
      status: response.status,
      hasRun: !!data.run,
    });

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[proxy/execution-state] Proxy error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Execution service timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'PROXY_ERROR', message: 'Failed to reach execution service' },
      { status: 502 }
    );
  }
}
