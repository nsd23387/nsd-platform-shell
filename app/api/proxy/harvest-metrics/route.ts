/**
 * Harvest Metrics Proxy Route
 * 
 * GET /api/proxy/harvest-metrics?campaignId=xxx
 * 
 * Proxies to Sales Engine: GET /api/v1/campaigns/:id/harvest-metrics
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Harvest metrics provide the operational working set data from public.* tables.
 * This represents what has been processed, NOT market scope.
 * 
 * Use this alongside market-scope to show:
 * - Market Scope: What exists in the market (observations.*)
 * - Operational Set: What has been processed (public.*)
 */

import { NextRequest, NextResponse } from 'next/server';

const SALES_ENGINE_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('campaignId');

  if (!campaignId) {
    return NextResponse.json(
      { error: 'Missing campaignId parameter' },
      { status: 400 }
    );
  }

  // When Sales Engine is not configured, return default metrics
  if (!SALES_ENGINE_URL) {
    console.log('[harvest-metrics] Sales Engine not configured, returning default');
    return NextResponse.json({
      campaignId,
      operationalSet: {
        organizations: 0,
        contacts: 0,
        leads: 0,
        emailsSent: 0,
      },
      _source: 'default',
      _note: 'Sales Engine not configured - no harvest metrics available',
    });
  }

  try {
    const response = await fetch(`${SALES_ENGINE_URL}/api/v1/campaigns/${campaignId}/harvest-metrics`, {
      headers: {
        'Content-Type': 'application/json',
        // Forward auth headers if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!,
        }),
      },
    });

    if (!response.ok) {
      // Pass through error from Sales Engine
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({
      ...data,
      _source: 'sales-engine',
    });
  } catch (error) {
    console.error('[harvest-metrics] Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch harvest metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
