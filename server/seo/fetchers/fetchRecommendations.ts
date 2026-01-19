/**
 * SEO Intelligence - Fetch Recommendations
 * 
 * Server-side fetcher for AI-generated SEO recommendations.
 * Reads from ODS (nsd-ods-api) as the system of record.
 * 
 * GOVERNANCE:
 * - This fetcher is READ-ONLY
 * - ODS is the system of record
 * - Recommendations require human approval before any action
 * - No auto-apply or auto-publish functionality
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import type {
  SeoRecommendation,
  RecommendationFilters,
  PaginatedResponse,
  RecommendationStatus,
  SeoRecommendationType,
  RiskLevel,
  SeoIntentTarget,
  UUID,
} from '../../../lib/seo/types';
import { PAGINATION_DEFAULTS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface FetchRecommendationsOptions {
  /** Filter criteria */
  filters?: RecommendationFilters;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: 'created_at' | 'confidence' | 'risk' | 'status';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface FetchRecommendationByIdOptions {
  /** Recommendation UUID */
  recommendationId: UUID;
}

// ============================================
// Fetchers
// ============================================

/**
 * Fetch paginated list of SEO recommendations from ODS.
 * 
 * ODS API: GET /api/v1/seo/recommendations
 * 
 * @param options - Filter, pagination, and sort options
 * @returns Paginated response with recommendations
 * 
 * This function will NEVER:
 * - Apply recommendations
 * - Modify website content
 * - Trigger AI generation
 */
export async function fetchSeoRecommendations(
  options: FetchRecommendationsOptions = {}
): Promise<PaginatedResponse<SeoRecommendation>> {
  const {
    filters,
    page = 1,
    pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options;

  // ODS API: GET /api/v1/seo/recommendations
  // Query params: status, type, risk_level, min_confidence, page_id, intent_target, page, page_size, sort_by, sort_order
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/recommendations', {
  //   params: {
  //     status: filters?.status,
  //     type: filters?.type,
  //     risk_level: filters?.risk_level,
  //     min_confidence: filters?.min_confidence,
  //     page_id: filters?.page_id,
  //     intent_target: filters?.intent_target,
  //     page,
  //     page_size: pageSize,
  //     sort_by: sortBy,
  //     sort_order: sortOrder,
  //   },
  // });
  // return response.data;

  console.warn('[SEO] fetchSeoRecommendations: ODS integration pending - returning empty response');

  return {
    data: [],
    total: 0,
    page,
    page_size: pageSize,
    has_more: false,
  };
}

/**
 * Fetch a single SEO recommendation by ID from ODS.
 * 
 * ODS API: GET /api/v1/seo/recommendations/:id
 * 
 * @param options - Recommendation ID
 * @returns Recommendation or null if not found
 */
export async function fetchSeoRecommendationById(
  options: FetchRecommendationByIdOptions
): Promise<SeoRecommendation | null> {
  const { recommendationId } = options;

  // ODS API: GET /api/v1/seo/recommendations/:id
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get(`/api/v1/seo/recommendations/${recommendationId}`);
  // return response.data ?? null;

  console.warn(`[SEO] fetchSeoRecommendationById(${recommendationId}): ODS integration pending - returning null`);

  return null;
}

/**
 * Fetch recommendations for a specific page.
 * 
 * ODS API: GET /api/v1/seo/recommendations?page_id=:pageId
 * 
 * @param pageId - Target page ID
 * @param status - Optional status filter
 * @param limit - Maximum results
 * @returns Array of recommendations
 */
export async function fetchRecommendationsForPage(
  pageId: string,
  options: { status?: RecommendationStatus; limit?: number } = {}
): Promise<readonly SeoRecommendation[]> {
  const { status, limit = 10 } = options;

  // ODS API: GET /api/v1/seo/recommendations?page_id=:pageId&status=:status&limit=:limit
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/recommendations', {
  //   params: { page_id: pageId, status, limit },
  // });
  // return response.data.data;

  console.warn(`[SEO] fetchRecommendationsForPage(${pageId}): ODS integration pending - returning empty array`);

  return [];
}

/**
 * Fetch count of pending recommendations.
 * 
 * ODS API: GET /api/v1/seo/recommendations/count?status=pending
 */
export async function fetchPendingRecommendationsCount(): Promise<number> {
  // ODS API: GET /api/v1/seo/recommendations/count?status=pending
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/recommendations/count', {
  //   params: { status: 'pending' },
  // });
  // return response.data.count;

  console.warn('[SEO] fetchPendingRecommendationsCount: ODS integration pending - returning 0');

  return 0;
}

/**
 * Fetch recommendations summary grouped by status.
 * 
 * ODS API: GET /api/v1/seo/recommendations/summary
 */
export async function fetchRecommendationsSummary(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  deferred: number;
  implemented: number;
  rolled_back: number;
  total: number;
}> {
  // ODS API: GET /api/v1/seo/recommendations/summary
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/recommendations/summary');
  // return response.data;

  console.warn('[SEO] fetchRecommendationsSummary: ODS integration pending - returning zeros');

  return {
    pending: 0,
    approved: 0,
    rejected: 0,
    deferred: 0,
    implemented: 0,
    rolled_back: 0,
    total: 0,
  };
}

/**
 * Fetch high-impact pending recommendations for priority review.
 * 
 * ODS API: GET /api/v1/seo/recommendations?status=pending&sort_by=risk&sort_order=desc&limit=:limit
 * 
 * @param limit - Maximum results
 * @returns Array of high-priority recommendations
 */
export async function fetchHighImpactPendingRecommendations(
  limit: number = 5
): Promise<readonly SeoRecommendation[]> {
  // ODS API: GET /api/v1/seo/recommendations?status=pending&sort_by=risk&sort_order=desc&limit=:limit
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/recommendations', {
  //   params: { status: 'pending', sort_by: 'risk', sort_order: 'desc', limit },
  // });
  // return response.data.data;

  console.warn('[SEO] fetchHighImpactPendingRecommendations: ODS integration pending - returning empty array');

  return [];
}
