/**
 * SEO Intelligence API - Recommendations Route
 * 
 * API endpoint for fetching SEO recommendations from ODS.
 * This endpoint is READ-ONLY.
 * 
 * GOVERNANCE:
 * - GET only (no mutations on this route)
 * - Requires authentication (admin-only)
 * - Returns paginated recommendation data from ODS
 * - Thin route handler — delegates to server layer
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  fetchSeoRecommendations,
  fetchRecommendationsSummary,
} from '../../../../server/seo/fetchers';
import type {
  RecommendationFilters,
  RecommendationStatus,
  SeoRecommendationType,
  RiskLevel,
  SeoIntentTarget,
} from '../../../../lib/seo/types';
import { PAGINATION_DEFAULTS } from '../../../../lib/seo/constants';

// ============================================
// RBAC Check (Stub)
// ============================================

/**
 * Stub RBAC check for admin access.
 * TODO: Replace with actual authentication/authorization.
 */
async function checkAdminAccess(request: NextRequest): Promise<{
  authorized: boolean;
  userId?: string;
  userDisplayName?: string;
}> {
  // TODO: Integrate with bootstrap context / session
  // const session = await getSession(request);
  // if (!session) return { authorized: false };
  // const hasPermission = session.permissions.includes('seo:recommendations:view');
  // return { authorized: hasPermission, userId: session.userId, userDisplayName: session.displayName };

  // For now, allow all requests (development mode)
  console.warn('[SEO API] RBAC check stubbed - allowing request');
  return { authorized: true, userId: 'stub-user', userDisplayName: 'Stub User' };
}

// ============================================
// GET Handler
// ============================================

/**
 * Fetch SEO recommendations with optional filters.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 25)
 * - status: Filter by approval status
 * - type: Filter by recommendation type
 * - riskLevel: Filter by risk level
 * - minConfidence: Minimum confidence filter (0-1)
 * - pageId: Filter by target page
 * - intentTarget: Filter by intent segment
 * - sortBy: Sort field (created_at, confidence, risk, status)
 * - sortOrder: Sort direction (asc, desc)
 * - summary: If 'true', return summary counts only
 */
export async function GET(request: NextRequest) {
  // 1. Check authorization
  const auth = await checkAdminAccess(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Admin access required' },
      { status: 401 }
    );
  }

  // 2. Parse query parameters
  const searchParams = request.nextUrl.searchParams;

  // Check if summary requested
  if (searchParams.get('summary') === 'true') {
    const summary = await fetchRecommendationsSummary();
    return NextResponse.json(summary);
  }

  // Parse filters
  const filters: RecommendationFilters = {};
  
  const status = searchParams.get('status');
  if (status) filters.status = status as RecommendationStatus;
  
  const type = searchParams.get('type');
  if (type) filters.type = type as SeoRecommendationType;
  
  const riskLevel = searchParams.get('riskLevel');
  if (riskLevel) filters.risk_level = riskLevel as RiskLevel;
  
  const minConfidence = searchParams.get('minConfidence');
  if (minConfidence) filters.min_confidence = parseFloat(minConfidence);
  
  const pageId = searchParams.get('pageId');
  if (pageId) filters.page_id = pageId;
  
  const intentTarget = searchParams.get('intentTarget');
  if (intentTarget) filters.intent_target = intentTarget as SeoIntentTarget;

  // Parse pagination
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = Math.min(
    parseInt(searchParams.get('pageSize') ?? String(PAGINATION_DEFAULTS.PAGE_SIZE), 10),
    PAGINATION_DEFAULTS.MAX_PAGE_SIZE
  );

  // Parse sorting
  const sortBy = searchParams.get('sortBy') as 'created_at' | 'confidence' | 'risk' | 'status' | undefined;
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

  // 3. Call server layer
  const result = await fetchSeoRecommendations({
    filters,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  // 4. Return typed response
  return NextResponse.json(result);
}

// ============================================
// Method Restrictions
// ============================================

/**
 * POST is not allowed - recommendations are AI-generated only.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Method not allowed',
      message: 'Recommendations are AI-generated and cannot be created via this API. Use the AI recommendation pipeline.',
    },
    { status: 405 }
  );
}

/**
 * PUT is not allowed - use approval endpoints for status changes.
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
 * DELETE is not allowed - recommendations must be retained for audit.
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
