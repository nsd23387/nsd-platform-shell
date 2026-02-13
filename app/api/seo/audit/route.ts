/**
 * SEO Intelligence API - Audit Route
 * 
 * API endpoint for fetching SEO audit log data.
 * This endpoint is STRICTLY READ-ONLY.
 * 
 * GOVERNANCE:
 * - GET only (absolutely no mutations)
 * - Requires authentication
 * - Returns immutable audit entries
 * - Audit data cannot be modified or deleted
 * 
 * NOT ALLOWED:
 * - POST, PUT, DELETE methods
 * - Creating manual audit entries (system-generated only)
 * - Modifying audit history
 * - Deleting audit records
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// GET Handler
// ============================================

/**
 * Fetch audit log entries with optional filters.
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 50)
 * - action: Filter by action type
 * - entityType: Filter by entity type (page/query/recommendation)
 * - entityId: Filter by specific entity ID
 * - userId: Filter by user ID
 * - startDate: Filter by date range start
 * - endDate: Filter by date range end
 * 
 * NOT IMPLEMENTED - Returns empty placeholder response.
 */
export async function GET(request: NextRequest) {
  // NOT IMPLEMENTED - Stub only
  // This will be connected to fetchAuditLog
  
  console.warn('[SEO API] GET /api/seo/audit: Not implemented - returning mock response');
  
  // Parse query parameters (for future implementation reference)
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') ?? '50', 10);
  
  return NextResponse.json({
    data: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
    _meta: {
      implemented: false,
      message: 'SEO audit API is not yet implemented',
    },
  });
}

// ============================================
// Method Restrictions
// ============================================

/**
 * POST is not allowed - audit entries are system-generated only.
 */
export async function POST() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Audit entries are system-generated and cannot be created manually.',
    },
    { status: 405 }
  );
}

/**
 * PUT is not allowed - audit entries are immutable.
 */
export async function PUT() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Audit entries are immutable and cannot be modified.',
    },
    { status: 405 }
  );
}

/**
 * DELETE is not allowed - audit entries cannot be deleted.
 */
export async function DELETE() {
  return NextResponse.json(
    { 
      error: 'Method not allowed',
      message: 'Audit entries cannot be deleted. They are permanent records for compliance and learning.',
    },
    { status: 405 }
  );
}
