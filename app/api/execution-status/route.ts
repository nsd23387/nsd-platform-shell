/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This endpoint exposes the execution contract validation status
 * to the UI so it can enable/disable execution-related controls.
 */

// Force Node.js runtime
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import {
  validateExecutionContract,
  getCachedExecutionContract,
} from '../../../lib/execution-contract';

/**
 * GET /api/execution-status
 *
 * Returns the execution contract validation status.
 * If not yet validated, performs validation first.
 *
 * Response:
 * {
 *   executionSupported: boolean,
 *   reason?: string,
 *   validatedAt: string
 * }
 */
export async function GET() {
  try {
    // Check if already validated
    let validation = getCachedExecutionContract();

    // If not validated yet, perform validation
    if (validation === null) {
      validation = await validateExecutionContract();
    }

    return NextResponse.json({
      executionSupported: validation.supported,
      reason: validation.reason,
      validatedAt: validation.validatedAt,
    });
  } catch (error) {
    // Should never happen since validateExecutionContract never throws,
    // but handle defensively
    console.error('[execution-status] Unexpected error:', error);
    return NextResponse.json({
      executionSupported: false,
      reason: 'Unexpected validation error',
      validatedAt: new Date().toISOString(),
    });
  }
}
