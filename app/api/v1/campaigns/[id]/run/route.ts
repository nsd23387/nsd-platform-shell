/**
 * @deprecated LEGACY ENDPOINT — DO NOT USE
 * 
 * POST /api/v1/campaigns/[id]/run
 * 
 * ⚠️ EXECUTION DISABLED
 * 
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 * 
 * This endpoint is DEPRECATED and returns 410 Gone.
 * 
 * All execution must occur via nsd-sales-engine, which:
 * - Creates durable campaign_runs records
 * - Uses queue-first, cron-adopted execution
 * - Maintains execution authority
 * 
 * RESPONSE:
 * - 410 Gone with deprecation notice
 */

// Force Node.js runtime
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

/**
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.warn('[campaign-run] ⚠️ DEPRECATED endpoint called for:', campaignId);
  console.warn('[campaign-run] Execution is disabled in platform-shell. Use nsd-sales-engine for execution.');

  // Return 410 Gone to indicate this endpoint is deprecated
  return NextResponse.json(
    { 
      error: 'ENDPOINT_DEPRECATED',
      reason: 'This endpoint is deprecated. Execution is disabled in platform-shell.',
      message: 'All campaign execution must occur via nsd-sales-engine.',
      campaign_id: campaignId,
    },
    { status: 410 }
  );
}
