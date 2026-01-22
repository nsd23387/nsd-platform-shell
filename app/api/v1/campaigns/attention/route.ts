/**
 * Attention Items API Route - Target-State Architecture
 * 
 * Returns campaigns that need attention. Updated to use governance-first
 * terminology - no "Start Run" labels per read-only constraints.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.SALES_ENGINE_API_BASE_URL || process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL;

/**
 * Returns empty array for attention items when no backend is configured.
 * 
 * IMPORTANT: Existing campaigns have not reached execution stage, so there
 * are no attention items (failed runs, stale approvals, etc.) to display.
 * Showing placeholder attention items would create an inconsistency with
 * other observability components showing "Ready for execution" or
 * "No activity observed yet".
 * 
 * Attention items will be populated from backend-observed events once
 * campaigns are actually executed and require attention.
 */
function getMockAttentionItems() {
  // Return empty array - no attention items exist yet
  return [];
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
