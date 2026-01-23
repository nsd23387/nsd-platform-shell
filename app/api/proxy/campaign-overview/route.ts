/**
 * Proxy: GET /api/proxy/campaign-overview?campaignId=xxx
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Provides a unified overview of campaign health including:
 * - Governance status (campaign.status - NOT execution)
 * - Last execution outcome (outcomeType + reason)
 * - Market reality metrics (from observations.*)
 * - Operational yield metrics (from public.*)
 * 
 * Target: GET ${SALES_ENGINE_URL}/api/v1/campaigns/:id/overview
 * 
 * This proxy:
 * - Forwards the request server-to-server (avoids CORS)
 * - Returns a combined view for executive dashboards
 * - Does NOT implement any execution logic locally
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Default response when Sales Engine is unavailable.
 * Provides safe defaults that don't mislead about campaign state.
 */
function getDefaultResponse(campaignId: string) {
  return {
    campaignId,
    governance: {
      status: 'unknown',
      isRunnable: false,
      isPlanningOnly: false,
    },
    lastExecution: null,
    marketReality: {
      observedOrganizations: 0,
      observedContacts: 0,
      estimatedReachable: 0,
      observedAt: null,
    },
    operationalYield: {
      processedOrganizations: 0,
      processedContacts: 0,
      promotedLeads: 0,
      sentEmails: 0,
    },
    _source: 'default',
    _note: 'Sales Engine unavailable - showing default state',
  };
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { error: 'MISSING_CAMPAIGN_ID', message: 'campaignId query parameter is required' },
      { status: 400 }
    );
  }

  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.warn('[proxy/campaign-overview] SALES_ENGINE_URL not configured');
    return NextResponse.json(getDefaultResponse(campaignId));
  }

  const targetUrl = `${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/overview`;

  console.log('[proxy/campaign-overview] Forwarding to:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          'Authorization': `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn('[proxy/campaign-overview] Sales Engine returned:', response.status);
      // Return default on error - don't fail the UI
      return NextResponse.json({
        ...getDefaultResponse(campaignId),
        _note: `Sales Engine returned ${response.status}`,
      });
    }

    const data = await response.json();

    console.log('[proxy/campaign-overview] Response received:', {
      campaignId,
      hasLastExecution: !!data.lastExecution,
    });

    return NextResponse.json({
      ...data,
      _source: 'sales-engine',
    });
  } catch (error) {
    console.error('[proxy/campaign-overview] Proxy error:', error);

    return NextResponse.json({
      ...getDefaultResponse(campaignId),
      _note: 'Failed to reach Sales Engine',
    });
  }
}
