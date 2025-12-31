/**
 * Attention Items API Route - Target-State Architecture
 * 
 * Returns campaigns that need attention. Updated to use governance-first
 * terminology - no "Start Run" labels per read-only constraints.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

function getMockAttentionItems() {
  return [
    {
      id: 'att-001',
      campaignId: 'camp-002',
      campaignName: 'Product Launch Sequence',
      reason: 'pending_approval_stale',
      status: 'PENDING_REVIEW',
      lastUpdated: '2025-01-18T16:45:00Z',
      primaryAction: {
        label: 'Review Campaign',
        href: '/sales-engine/campaigns/camp-002?tab=overview',
        type: 'review',
      },
    },
    {
      id: 'att-002',
      campaignId: 'camp-003',
      campaignName: 'Re-engagement Campaign',
      reason: 'approved_not_observed',
      status: 'RUNNABLE',
      lastUpdated: '2025-01-17T10:00:00Z',
      primaryAction: {
        // Updated: No "Start Run" - observability only
        label: 'View Observability',
        href: '/sales-engine/campaigns/camp-003?tab=monitoring',
        type: 'view',
      },
    },
    {
      id: 'att-003',
      campaignId: 'camp-004',
      campaignName: 'Holiday Promo',
      reason: 'execution_failed',
      status: 'FAILED',
      lastUpdated: '2025-01-20T08:30:00Z',
      primaryAction: {
        label: 'View Errors',
        href: '/sales-engine/campaigns/camp-004?tab=monitoring',
        type: 'view',
      },
    },
  ];
}

export async function GET(request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(getMockAttentionItems());
  }

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const authHeader = request.headers.get('authorization');
    if (authHeader) headers['Authorization'] = authHeader;

    const response = await fetch(`${BACKEND_URL}/attention`, { headers });
    const data = await response.json();
    
    // Transform backend response to ensure governance-first terminology
    const transformedData = Array.isArray(data) ? data.map((item: Record<string, unknown>) => ({
      ...item,
      primaryAction: {
        ...((item.primaryAction as Record<string, unknown>) || {}),
        // Ensure no "Start Run" or similar labels
        label: transformActionLabel((item.primaryAction as Record<string, unknown>)?.label as string),
        type: 'view',
      },
    })) : data;
    
    return NextResponse.json(transformedData, { status: response.status });
  } catch (error) {
    console.error('Backend proxy error:', error);
    return NextResponse.json(getMockAttentionItems());
  }
}

/**
 * Transform action labels to governance-first terminology.
 * Removes "Start", "Run", "Launch", "Execute" labels.
 */
function transformActionLabel(label: string | undefined): string {
  if (!label) return 'View Campaign';
  
  const runPatterns = /^(start|run|launch|execute)/i;
  if (runPatterns.test(label)) {
    return 'View Observability';
  }
  
  return label;
}
