/**
 * Proxy: GET /api/proxy/executive-summary
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * Provides read-only executive metrics across all campaigns.
 * 
 * IMPORTANT: This endpoint is READ-ONLY.
 * - No execution controls
 * - No governance actions
 * - Pure observability metrics for executive dashboards
 * 
 * Target: GET ${SALES_ENGINE_URL}/api/v1/executive/summary
 * 
 * Metrics include:
 * - Total campaigns by governance status
 * - Recent execution outcomes by type
 * - Aggregate market reality (total observed)
 * - Aggregate operational yield
 * - Health indicators
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * Default response when Sales Engine is unavailable.
 */
function getDefaultResponse() {
  return {
    timestamp: new Date().toISOString(),
    campaigns: {
      total: 0,
      byGovernanceStatus: {
        DRAFT: 0,
        PENDING_REVIEW: 0,
        RUNNABLE: 0,
        RUNNING: 0,
        COMPLETED: 0,
        FAILED: 0,
      },
    },
    recentOutcomes: {
      last24h: {
        total: 0,
        SUCCESS: 0,
        VALID_EMPTY_OBSERVATION: 0,
        CONFIG_INCOMPLETE: 0,
        INFRA_ERROR: 0,
        EXECUTION_ERROR: 0,
      },
      last7d: {
        total: 0,
        SUCCESS: 0,
        VALID_EMPTY_OBSERVATION: 0,
        CONFIG_INCOMPLETE: 0,
        INFRA_ERROR: 0,
        EXECUTION_ERROR: 0,
      },
    },
    marketReality: {
      totalObservedOrganizations: 0,
      totalObservedContacts: 0,
      totalEstimatedReachable: 0,
    },
    operationalYield: {
      totalProcessedOrganizations: 0,
      totalProcessedContacts: 0,
      totalPromotedLeads: 0,
      totalSentEmails: 0,
    },
    health: {
      systemStatus: 'unknown',
      lastSuccessfulExecution: null,
      errorRate24h: 0,
    },
    _source: 'default',
    _note: 'Sales Engine unavailable - showing default state',
  };
}

export async function GET(request: NextRequest) {
  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.warn('[proxy/executive-summary] SALES_ENGINE_URL not configured');
    return NextResponse.json(getDefaultResponse());
  }

  const targetUrl = `${SALES_ENGINE_URL}/api/v1/executive/summary`;

  console.log('[proxy/executive-summary] Forwarding to:', targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.SALES_ENGINE_API_TOKEN && {
          'Authorization': `Bearer ${process.env.SALES_ENGINE_API_TOKEN}`,
        }),
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn('[proxy/executive-summary] Sales Engine returned:', response.status);
      return NextResponse.json({
        ...getDefaultResponse(),
        _note: `Sales Engine returned ${response.status}`,
      });
    }

    const data = await response.json();

    console.log('[proxy/executive-summary] Response received:', {
      totalCampaigns: data.campaigns?.total,
      systemStatus: data.health?.systemStatus,
    });

    return NextResponse.json({
      ...data,
      _source: 'sales-engine',
    });
  } catch (error) {
    console.error('[proxy/executive-summary] Proxy error:', error);

    return NextResponse.json({
      ...getDefaultResponse(),
      _note: 'Failed to reach Sales Engine',
    });
  }
}
