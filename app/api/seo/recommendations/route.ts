/**
 * SEO Intelligence API - Recommendations Route
 * 
 * API endpoint for fetching SEO recommendations.
 * This endpoint is READ-ONLY for fetching recommendations.
 * 
 * GOVERNANCE:
 * - GET: Fetch recommendations (read-only)
 * - Requires authentication
 * - Returns paginated recommendation data
 * - Approval actions use separate endpoints
 * 
 * NOT ALLOWED:
 * - POST, PUT, DELETE methods on this endpoint
 * - Creating recommendations directly (AI-generated only)
 * - Auto-applying recommendations
 */

import { NextRequest, NextResponse } from 'next/server';

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
 * - impact: Filter by impact level
 * - minConfidence: Minimum confidence filter
 * - pageId: Filter by target page
 * 
 * NOT IMPLEMENTED - Returns empty placeholder response.
 */
export async function GET(request: NextRequest) {
  // NOT IMPLEMENTED - Stub only
  // This will be connected to fetchRecommendations
  
  console.warn('[SEO API] GET /api/seo/recommendations: Not implemented - returning mock response');
  
  // Parse query parameters (for future implementation reference)
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25', 10);
  
  return NextResponse.json({
    data: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
    _meta: {
      implemented: false,
      message: 'SEO recommendations API is not yet implemented',
    },
  });
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
      message: 'Recommendations are AI-generated and cannot be created manually. Use the AI recommendation pipeline.',
    },
    { status: 405 }
  );
}

/**
 * PUT is not allowed - use approval endpoints instead.
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
      message: 'Recommendations cannot be deleted. Use rejection workflow to mark as rejected.',
    },
    { status: 405 }
  );
}
