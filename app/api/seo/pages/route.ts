/**
 * SEO Intelligence API - Pages Route
 * 
 * API endpoint for fetching SEO page data.
 * This endpoint is READ-ONLY.
 * 
 * GOVERNANCE:
 * - GET only (no mutations)
 * - Requires authentication
 * - Returns paginated page data
 * 
 * NOT ALLOWED:
 * - POST, PUT, DELETE methods
 * - Creating or modifying pages
 * - CMS interactions
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET Handler
// ============================================

/**
 * Fetch SEO pages with optional filters.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 25)
 * - pageType: Filter by page type
 * - indexStatus: Filter by index status
 * - search: Search in path/title
 * 
 * NOT IMPLEMENTED - Returns empty placeholder response.
 */
export async function GET(request: NextRequest) {
  // NOT IMPLEMENTED - Stub only
  // This will be connected to fetchSeoPages
  
  console.warn('[SEO API] GET /api/seo/pages: Not implemented - returning mock response');
  
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
      message: 'SEO pages API is not yet implemented',
    },
  });
}

// ============================================
// Method Restrictions
// ============================================

/**
 * POST is not allowed - pages are read-only.
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO pages are read-only. Page creation is not supported.',
    },
    { status: 405 }
  );
}

/**
 * PUT is not allowed - pages are read-only.
 */
export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO pages are read-only. Page modification is not supported.',
    },
    { status: 405 }
  );
}

/**
 * DELETE is not allowed - pages are read-only.
 */
export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO pages are read-only. Page deletion is not supported.',
    },
    { status: 405 }
  );
}
