/**
 * @deprecated LEGACY ENDPOINT - DO NOT USE
 * 
 * POST /api/v1/campaigns/[id]/run
 * 
 * This endpoint is DEPRECATED. Use the canonical endpoint instead:
 * POST /api/campaigns/[id]/start
 * 
 * This route returns 410 Gone to indicate deprecation.
 * All execution requests must use the canonical endpoint.
 */

// Force Node.js runtime
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.warn('[campaign-run] DEPRECATED endpoint called for:', campaignId);
  console.warn('[campaign-run] Use POST /api/campaigns/:id/start instead');

  // Return 410 Gone to indicate this endpoint is deprecated
  return NextResponse.json(
    { 
      error: 'Endpoint deprecated',
      message: 'This endpoint is deprecated. Use POST /api/campaigns/:id/start instead.',
      canonical_endpoint: `/api/campaigns/${campaignId}/start`,
      deprecated_endpoint: `/api/v1/campaigns/${campaignId}/run`,
    },
    { status: 410 }
  );
}
