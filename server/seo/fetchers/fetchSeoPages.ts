/**
 * SEO Intelligence - Fetch SEO Pages
 * 
 * Server-side fetcher for SEO page data.
 * Returns read-only page snapshots from analytics sources.
 * 
 * GOVERNANCE:
 * - This fetcher is READ-ONLY
 * - No mutations allowed
 * - Data sourced from analytics/observability systems only
 * - No direct CMS or website data access
 * 
 * NOT ALLOWED:
 * - Writing to any database
 * - Modifying page content
 * - Triggering crawls or indexing
 * - CMS integration
 */

import type { SeoPage, SeoPageFilters, PaginatedResponse } from '../../../lib/seo/types';
import { PAGINATION_DEFAULTS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface FetchSeoPagesOptions {
  /** Filter criteria */
  filters?: SeoPageFilters;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: 'path' | 'lastCrawledAt' | 'title';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface FetchSeoPageByIdOptions {
  /** Page ID to fetch */
  pageId: string;
}

// ============================================
// Fetchers
// ============================================

/**
 * Fetch paginated list of SEO pages.
 * 
 * NOT IMPLEMENTED - Stub only.
 * 
 * Future implementation will:
 * 1. Query analytics database for page data
 * 2. Apply filters
 * 3. Return paginated results
 * 
 * This function will NEVER:
 * - Write to any database
 * - Modify page content
 * - Access CMS directly
 */
export async function fetchSeoPages(
  options: FetchSeoPagesOptions = {}
): Promise<PaginatedResponse<SeoPage>> {
  const {
    page = 1,
    pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  } = options;

  // NOT IMPLEMENTED - Return empty placeholder
  // This will be connected to analytics data sources
  
  console.warn('[SEO] fetchSeoPages: Not implemented - returning mock data');
  
  return {
    data: [],
    total: 0,
    page,
    pageSize,
    hasMore: false,
  };
}

/**
 * Fetch a single SEO page by ID.
 * 
 * NOT IMPLEMENTED - Stub only.
 * 
 * Future implementation will:
 * 1. Query analytics database for specific page
 * 2. Return page details or null
 * 
 * This function will NEVER:
 * - Write to any database
 * - Modify page content
 * - Access CMS directly
 */
export async function fetchSeoPageById(
  options: FetchSeoPageByIdOptions
): Promise<SeoPage | null> {
  const { pageId } = options;

  // NOT IMPLEMENTED - Return null placeholder
  // This will be connected to analytics data sources
  
  console.warn(`[SEO] fetchSeoPageById(${pageId}): Not implemented - returning null`);
  
  return null;
}

/**
 * Fetch page count by index status.
 * 
 * NOT IMPLEMENTED - Stub only.
 */
export async function fetchPageCountsByStatus(): Promise<Record<string, number>> {
  // NOT IMPLEMENTED - Return empty placeholder
  
  console.warn('[SEO] fetchPageCountsByStatus: Not implemented - returning mock data');
  
  return {
    indexed: 0,
    not_indexed: 0,
    pending: 0,
    blocked: 0,
    unknown: 0,
  };
}
