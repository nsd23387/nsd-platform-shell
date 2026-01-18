/**
 * SEO Intelligence API - Recommendation Detail Route
 * 
 * API endpoint for fetching a single SEO recommendation by ID.
 * This endpoint is READ-ONLY.
 * 
 * GOVERNANCE:
 * - GET only (no mutations on this route)
 * - Requires authentication (admin-only)
 * - Returns full recommendation details from ODS
 * - Thin route handler — delegates to server layer
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchSeoRecommendationById } from '../../../../../server/seo/fetchers';

// ============================================
// Types
// ============================================

interface RouteParams {
  params: {
    id: string;
  };
}

// ============================================
// RBAC Check (Stub)
// ============================================

/**
 * Stub RBAC check for admin access.
 */
async function checkAdminAccess(request: NextRequest): Promise<{
  authorized: boolean;
}> {
  // TODO: Integrate with bootstrap context / session
  console.warn('[SEO API] RBAC check stubbed - allowing request');
  return { authorized: true };
}

// ============================================
// GET Handler
// ============================================

/**
 * Fetch a single SEO recommendation by ID.
 * 
 * Path Parameters:
 * - id: Recommendation UUID
 * 
 * Returns:
 * - 200: Full recommendation object
 * - 404: Recommendation not found
 * - 401: Unauthorized
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 1. Check authorization
  const auth = await checkAdminAccess(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required' },
      { status: 401 }
    );
  }

  const { id } = params;

  // 2. Validate ID format (basic UUID check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json(
      { error: 'Invalid ID', message: 'Recommendation ID must be a valid UUID' },
      { status: 400 }
    );
  }

  // 3. Call server layer
  const recommendation = await fetchSeoRecommendationById({ recommendationId: id });

  // 4. Return result or 404
  if (!recommendation) {
    return NextResponse.json(
      { error: 'Not found', message: `Recommendation ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(recommendation);
}

// ============================================
// Method Restrictions
// ============================================

/**
 * PUT is not allowed - use approval endpoints.
 */
export async function PUT() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Direct recommendation modification is not supported. Use /api/seo/approvals for approval actions.',
    },
    { status: 405 }
  );
}

/**
 * PATCH is not allowed - use approval endpoints.
 */
export async function PATCH() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Direct recommendation modification is not supported. Use /api/seo/approvals for approval actions.',
    },
    { status: 405 }
  );
}

/**
 * DELETE is not allowed - recommendations are immutable.
 */
export async function DELETE() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Recommendations cannot be deleted. They are part of the audit trail.',
    },
    { status: 405 }
  );
}
