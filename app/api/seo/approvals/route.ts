/**
 * SEO Intelligence API - Approvals Route
 * 
 * API endpoint for SEO recommendation approval actions.
 * This is one of the FEW write endpoints in the SEO domain.
 * 
 * GOVERNANCE:
 * - GET: Fetch approval records (read-only)
 * - POST: Submit approval/rejection/deferral actions (governed write)
 * - Requires authentication (admin-only)
 * - All actions create audit entries
 * - Does NOT deploy or publish anything
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllApprovals,
  fetchApprovalsSummary,
} from '../../../../server/seo/fetchers';
import {
  approveRecommendation,
  rejectRecommendation,
  deferRecommendation,
  validateApprovalInput,
  validateRejectionInput,
  validateDeferralInput,
} from '../../../../server/seo/approvals';
import type { ApprovalDecision, UUID, IsoUtcTimestamp } from '../../../../lib/seo/types';

// ============================================
// Types
// ============================================

interface ApprovalActionRequest {
  action: ApprovalDecision;
  recommendationId: UUID;
  notes?: string;
  reason?: string;
  deferUntil?: IsoUtcTimestamp;
}

// ============================================
// RBAC Check (Stub)
// ============================================

/**
 * Stub RBAC check for admin access with write permissions.
 */
async function checkApprovalAccess(request: NextRequest): Promise<{
  authorized: boolean;
  userId: string;
  userDisplayName: string;
}> {
  // TODO: Integrate with bootstrap context / session
  // const session = await getSession(request);
  // if (!session) return { authorized: false, userId: '', userDisplayName: '' };
  // const hasPermission = session.permissions.includes('seo:recommendations:approve');
  // return { authorized: hasPermission, userId: session.userId, userDisplayName: session.displayName };

  // For now, allow all requests (development mode)
  console.warn('[SEO API] RBAC check stubbed - allowing request');
  return { authorized: true, userId: 'stub-user', userDisplayName: 'Stub User' };
}

// ============================================
// GET Handler
// ============================================

/**
 * Fetch approval records.
 * 
 * Query Parameters:
 * - recommendationId: Filter by recommendation
 * - decision: Filter by decision type
 * - summary: If 'true', return summary counts only
 */
export async function GET(request: NextRequest) {
  const auth = await checkApprovalAccess(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;

  // Check if summary requested
  if (searchParams.get('summary') === 'true') {
    const summary = await fetchApprovalsSummary();
    return NextResponse.json(summary);
  }

  // Parse filters
  const recommendationId = searchParams.get('recommendationId') ?? undefined;
  const decision = searchParams.get('decision') as ApprovalDecision | undefined;
  const limit = parseInt(searchParams.get('limit') ?? '100', 10);

  const approvals = await fetchAllApprovals({
    recommendationId,
    decision,
    limit,
  });

  return NextResponse.json({ data: approvals });
}

// ============================================
// POST Handler
// ============================================

/**
 * Submit an approval action.
 * 
 * Request Body:
 * - action: 'approve' | 'reject' | 'defer'
 * - recommendationId: UUID of target recommendation
 * - notes: Optional notes (for approve)
 * - reason: Required reason (for reject)
 * - deferUntil: Required date (for defer)
 * 
 * This is the ONLY governed write path for SEO recommendations.
 * All writes must reference a recommendation_id.
 */
export async function POST(request: NextRequest) {
  // 1. Check authorization
  const auth = await checkApprovalAccess(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required for approval actions' },
      { status: 401 }
    );
  }

  // 2. Parse request body
  let body: ApprovalActionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', message: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  // 3. Validate required fields
  if (!body.action) {
    return NextResponse.json(
      { error: 'Missing field', message: 'action is required' },
      { status: 400 }
    );
  }

  if (!body.recommendationId) {
    return NextResponse.json(
      { error: 'Missing field', message: 'recommendationId is required' },
      { status: 400 }
    );
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(body.recommendationId)) {
    return NextResponse.json(
      { error: 'Invalid ID', message: 'recommendationId must be a valid UUID' },
      { status: 400 }
    );
  }

  // 4. Route to appropriate handler based on action
  const context = { userId: auth.userId, userDisplayName: auth.userDisplayName };

  switch (body.action) {
    case 'approve': {
      // Validate approval input
      const validation = validateApprovalInput({ notes: body.notes });
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation error', message: validation.errors.join('; ') },
          { status: 400 }
        );
      }

      const result = await approveRecommendation(
        body.recommendationId,
        { notes: body.notes },
        context
      );

      if (!result.success) {
        const statusCode = result.errorCode === 'NOT_FOUND' ? 404 : 400;
        return NextResponse.json(
          { error: result.errorCode, message: result.error },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        recommendation: result.recommendation,
        approval: result.approval,
      });
    }

    case 'reject': {
      // Rejection requires reason
      if (!body.reason) {
        return NextResponse.json(
          { error: 'Missing field', message: 'reason is required for rejection' },
          { status: 400 }
        );
      }

      const validation = validateRejectionInput({ reason: body.reason, notes: body.notes });
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation error', message: validation.errors.join('; ') },
          { status: 400 }
        );
      }

      const result = await rejectRecommendation(
        body.recommendationId,
        { reason: body.reason, notes: body.notes },
        context
      );

      if (!result.success) {
        const statusCode = result.errorCode === 'NOT_FOUND' ? 404 : 400;
        return NextResponse.json(
          { error: result.errorCode, message: result.error },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        recommendation: result.recommendation,
        approval: result.approval,
      });
    }

    case 'defer': {
      // Deferral requires deferUntil
      if (!body.deferUntil) {
        return NextResponse.json(
          { error: 'Missing field', message: 'deferUntil is required for deferral' },
          { status: 400 }
        );
      }

      const validation = validateDeferralInput({ deferUntil: body.deferUntil, reason: body.reason });
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Validation error', message: validation.errors.join('; ') },
          { status: 400 }
        );
      }

      const result = await deferRecommendation(
        body.recommendationId,
        { deferUntil: body.deferUntil, reason: body.reason },
        context
      );

      if (!result.success) {
        const statusCode = result.errorCode === 'NOT_FOUND' ? 404 : 400;
        return NextResponse.json(
          { error: result.errorCode, message: result.error },
          { status: statusCode }
        );
      }

      return NextResponse.json({
        success: true,
        recommendation: result.recommendation,
        approval: result.approval,
      });
    }

    default:
      return NextResponse.json(
        { error: 'Invalid action', message: 'action must be one of: approve, reject, defer' },
        { status: 400 }
      );
  }
}

// ============================================
// Method Restrictions
// ============================================

/**
 * PUT is not allowed - use POST with action type.
 */
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST with action type (approve/reject/defer)' },
    { status: 405 }
  );
}

/**
 * DELETE is not allowed - approval decisions are immutable.
 */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Approval decisions cannot be deleted. They are part of the audit trail.' },
    { status: 405 }
  );
}
