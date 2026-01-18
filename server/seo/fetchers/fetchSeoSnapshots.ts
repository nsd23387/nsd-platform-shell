/**
 * SEO Intelligence - Fetch SEO Snapshots
 * 
 * Server-side fetcher for historical SEO performance snapshots.
 * Returns read-only point-in-time metrics from analytics sources.
 * 
 * GOVERNANCE:
 * - This fetcher is READ-ONLY
 * - No mutations allowed
 * - Data sourced from analytics/observability systems only
 * - Historical data only, no live crawling
 * 
 * NOT ALLOWED:
 * - Writing to any database
 * - Triggering new snapshots
 * - Modifying historical data
 * - Real-time crawling or analysis
 */

import type { SeoSnapshot, PaginatedResponse } from '../../../lib/seo/types';
import { PAGINATION_DEFAULTS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface FetchSeoSnapshotsOptions {
  /** Page ID to fetch snapshots for (optional - all if not specified) */
  pageId?: string;
  /** Start date for range */
  startDate?: string;
  /** End date for range */
  endDate?: string;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface FetchLatestSnapshotOptions {
  /** Page ID to fetch latest snapshot for */
  pageId: string;
}

// ============================================
// Fetchers
// ============================================

/**
 * Fetch paginated list of SEO snapshots.
 * 
 * NOT IMPLEMENTED - Stub only.
 * 
 * Future implementation will:
 * 1. Query snapshot data store
 * 2. Apply date range filters
 * 3. Return paginated results
 * 
 * This function will NEVER:
 * - Write to any database
 * - Trigger new snapshots
 * - Modify historical data
 */
export async function fetchSeoSnapshots(
  options: FetchSeoSnapshotsOptions = {}
): Promise<PaginatedResponse<SeoSnapshot>> {
  const {
    page = 1,
    pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  } = options;

  // NOT IMPLEMENTED - Return empty placeholder
  // This will be connected to snapshot data store
  
  console.warn('[SEO] fetchSeoSnapshots: Not implemented - returning mock data');
  
  return {
    data: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
  };
}

/**
 * Fetch snapshots for a specific page.
 * 
 * NOT IMPLEMENTED - Stub only.
 */
export async function fetchSnapshotsForPage(
  pageId: string,
  options: { startDate?: string; endDate?: string; limit?: number } = {}
): Promise<readonly SeoSnapshot[]> {
  // NOT IMPLEMENTED - Return empty placeholder
  
  console.warn(`[SEO] fetchSnapshotsForPage(${pageId}): Not implemented - returning empty array`);
  
  return [];
}

/**
 * Fetch the latest snapshot for a page.
 * 
 * NOT IMPLEMENTED - Stub only.
 */
export async function fetchLatestSnapshot(
  options: FetchLatestSnapshotOptions
): Promise<SeoSnapshot | null> {
  const { pageId } = options;

  // NOT IMPLEMENTED - Return null placeholder
  
  console.warn(`[SEO] fetchLatestSnapshot(${pageId}): Not implemented - returning null`);
  
  return null;
}

/**
 * Fetch snapshot comparison between two dates.
 * 
 * NOT IMPLEMENTED - Stub only.
 */
export async function fetchSnapshotComparison(
  pageId: string,
  dateA: string,
  dateB: string
): Promise<{
  snapshotA: SeoSnapshot | null;
  snapshotB: SeoSnapshot | null;
  changes: {
    trafficChange: number | null;
    positionChange: number | null;
    keywordsChange: number | null;
  };
} | null> {
  // NOT IMPLEMENTED - Return null placeholder
  
  console.warn(`[SEO] fetchSnapshotComparison(${pageId}): Not implemented - returning null`);
  
  return null;
}
