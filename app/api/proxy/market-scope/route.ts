/**
 * Market Scope Proxy Route
 * 
 * GET /api/proxy/market-scope?campaignId=xxx
 * 
 * Proxies to Sales Engine: GET /api/campaigns/:id/market-scope
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Market scope comes from observations.* tables, representing TRUE market reality.
 * This is distinct from operational data in public.* tables.
 * 
 * Do NOT confuse market scope with operational working set.
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

  // When Sales Engine is not configured, return default market scope
  if (!SALES_ENGINE_URL) {
    console.log('[market-scope] Sales Engine not configured, returning default');
    return NextResponse.json({
      campaignId,
      observedOrganizations: 0,
      observedContacts: 0,
      estimatedReachable: 0,
      observedAt: new Date().toISOString(),
      _source: 'default',
      _note: 'Sales Engine not configured - no market observations available',
    });
  }

  try {
    const response = await fetch(`${SALES_ENGINE_URL}/api/campaigns/${campaignId}/market-scope`, {
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
    console.error('[market-scope] Proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch market scope',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
