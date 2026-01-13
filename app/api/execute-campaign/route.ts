/**
 * Execution Proxy
 *
 * NOTE:
 * platform-shell is NOT an execution engine.
 * This route exists solely to proxy execution requests
 * from the UI to nsd-sales-engine server-to-server.
 *
 * Browsers must NEVER call nsd-sales-engine directly.
 * This proxy eliminates all CORS errors by keeping
 * cross-origin requests server-side only.
 *
 * WHAT THIS ENDPOINT DOES:
 * - Accepts execution requests from the UI (same-origin)
 * - Forwards them server-to-server to nsd-sales-engine
 * - Preserves HTTP status codes and payloads
 *
 * WHAT THIS ENDPOINT DOES NOT DO:
 * - Generate run IDs
 * - Emit activity events
 * - Contain execution logic
 * - Execute campaigns locally
 */

// Force Node.js runtime for server-side fetch
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

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

    // Get Sales Engine URL (server-side only)
    const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;
    if (!SALES_ENGINE_URL) {
      console.error('[execute-campaign proxy] SALES_ENGINE_URL not configured');
      return NextResponse.json(
        { error: 'SALES_ENGINE_URL_NOT_CONFIGURED', message: 'Execution service not configured' },
        { status: 500 }
      );
    }

    // Build target URL
    const targetUrl = `${SALES_ENGINE_URL}/api/campaigns/${campaignId}/start`;
    console.log('[execute-campaign proxy] Forwarding to:', targetUrl);

    // Forward request to sales-engine (server-to-server, no CORS)
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('[execute-campaign proxy] Sales Engine response status:', res.status);

    // Read response as text to preserve exact payload
    const responseText = await res.text();

    // Return exact response from sales-engine
    return new NextResponse(responseText, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[execute-campaign proxy] Error:', err);
    return NextResponse.json(
      { 
        error: 'EXECUTION_PROXY_FAILED', 
        message: err instanceof Error ? err.message : 'Proxy request failed'
      },
      { status: 500 }
    );
  }
}
