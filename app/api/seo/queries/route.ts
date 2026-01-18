/**
 * SEO Intelligence API - Queries Route
 * 
 * API endpoint for fetching SEO search query data.
 * This endpoint is READ-ONLY.
 * 
 * GOVERNANCE:
 * - GET only (no mutations)
 * - Requires authentication
 * - Returns paginated query data
 * 
 * NOT ALLOWED:
 * - POST, PUT, DELETE methods
 * - Creating or modifying queries
 * - Search Console API writes
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET Handler
// ============================================

/**
 * Fetch SEO queries with optional filters.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 25)
 * - intent: Filter by query intent
 * - minImpressions: Minimum impressions filter
 * - minPosition: Minimum position filter
 * - maxPosition: Maximum position filter
 * - search: Search in query text
 * 
 * NOT IMPLEMENTED - Returns empty placeholder response.
 */
export async function GET(request: NextRequest) {
  // NOT IMPLEMENTED - Stub only
  // This will be connected to fetchSeoQueries
  
  console.warn('[SEO API] GET /api/seo/queries: Not implemented - returning mock response');
  
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
      message: 'SEO queries API is not yet implemented',
    },
  });
}

// ============================================
// Method Restrictions
// ============================================

/**
 * POST is not allowed - queries are read-only.
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO queries are read-only. Query creation is not supported.',
    },
    { status: 405 }
  );
}

/**
 * PUT is not allowed - queries are read-only.
 */
export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO queries are read-only. Query modification is not supported.',
    },
    { status: 405 }
  );
}

/**
 * DELETE is not allowed - queries are read-only.
 */
export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'SEO queries are read-only. Query deletion is not supported.',
    },
    { status: 405 }
  );
}
