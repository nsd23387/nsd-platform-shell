/**
 * Proxy: GET /api/proxy/run-history?campaignId=xxx
 * 
 * EXECUTION AUTHORITY CONTRACT:
 * - Sales-engine is the SOLE execution authority
 * - Platform-shell is a pure consumer of execution data
 * - This proxy ONLY forwards requests to sales-engine
 * 
 * Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/run-history
 * 
 * Contract:
 * - Returns array of historical runs from sales-engine
 * - NO inference, grouping, or reconstruction
 * - NO fallback to legacy endpoints
 * - If unavailable, returns 503 (caller should show "not available" message)
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
    console.warn('[proxy/run-history] SALES_ENGINE_URL not configured');
    return NextResponse.json(
      { 
        error: 'SERVICE_NOT_CONFIGURED', 
        message: 'Run history service not configured.',
        available: false,
      },
      { status: 503 }
    );
  }

  // Construct target URL to sales-engine
  const targetUrl = `${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/run-history`;
  
  console.log('[proxy/run-history] Forwarding to:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          'Authorization': `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      // 10 second timeout for read operations
      signal: AbortSignal.timeout(10000),
    });

    // Handle 404 - endpoint not implemented yet in sales-engine
    if (response.status === 404) {
      console.log('[proxy/run-history] Endpoint not available (404)');
      return NextResponse.json(
        { 
          error: 'NOT_AVAILABLE', 
          message: 'Run history endpoint not available yet.',
          available: false,
          runs: [],
        },
        { status: 200 } // Return 200 with available: false so UI can handle gracefully
      );
    }

    // Pass through the response unchanged
    const data = await response.json();

    console.log('[proxy/run-history] Response:', {
      campaignId,
      status: response.status,
      runCount: Array.isArray(data.runs) ? data.runs.length : 'N/A',
    });

    // Add available flag for UI consumption
    return NextResponse.json(
      { ...data, available: true },
      { status: response.status }
    );
  } catch (error) {
    console.error('[proxy/run-history] Proxy error:', error);

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'TIMEOUT', message: 'Run history service timed out', available: false },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'PROXY_ERROR', message: 'Failed to reach run history service', available: false },
      { status: 502 }
    );
  }
}
