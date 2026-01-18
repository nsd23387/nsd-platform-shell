/**
 * SEO Intelligence - Fetch Audit Log
 * 
 * Server-side fetcher for SEO audit trail data.
 * Reads from ODS activity.events as the system of record.
 * 
 * GOVERNANCE:
 * - This fetcher is READ-ONLY
 * - Audit entries are immutable
 * - All actions in SEO domain are logged
 * - Provides accountability and learning data
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import type { 
  SeoAuditEntry, 
  PaginatedResponse, 
  AuditAction,
  UUID,
  IsoUtcTimestamp,
} from '../../../lib/seo/types';
import { AUDIT_CONFIG, PAGINATION_DEFAULTS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface FetchAuditLogOptions {
  /** Filter by action type */
  action?: AuditAction;
  /** Filter by entity type */
  entityType?: SeoAuditEntry['entity_type'];
  /** Filter by entity ID */
  entityId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Start date for range */
  startDate?: IsoUtcTimestamp;
  /** End date for range */
  endDate?: IsoUtcTimestamp;
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
}

// ============================================
// Fetchers
// ============================================

/**
 * Fetch paginated audit log entries.
 * 
 * ODS API: GET /api/v1/activity/events?domain=seo
 * 
 * @param options - Filter and pagination options
 * @returns Paginated audit entries in reverse chronological order
 * 
 * This function will NEVER:
 * - Modify audit entries
 * - Delete audit entries
 * - Filter out any actions for "cleanliness"
 */
export async function fetchSeoAuditLog(
  options: FetchAuditLogOptions = {}
): Promise<PaginatedResponse<SeoAuditEntry>> {
  const {
    action,
    entityType,
    entityId,
    userId,
    startDate,
    endDate,
    page = 1,
    pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  } = options;

  // ODS API: GET /api/v1/activity/events?domain=seo
  // Query params: action, entity_type, entity_id, user_id, start_date, end_date, page, page_size
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events', {
  //   params: {
  //     domain: 'seo',
  //     action,
  //     entity_type: entityType,
  //     entity_id: entityId,
  //     user_id: userId,
  //     start_date: startDate,
  //     end_date: endDate,
  //     page,
  //     page_size: pageSize,
  //     sort_by: 'timestamp',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data;

  console.warn('[SEO] fetchSeoAuditLog: ODS integration pending - returning empty response');

  return {
    data: [],
    total: 0,
    page,
    page_size: pageSize,
    has_more: false,
  };
}

/**
 * Fetch audit entries for a specific recommendation.
 * 
 * ODS API: GET /api/v1/activity/events?domain=seo&entity_type=recommendation&entity_id=:id
 * 
 * @param recommendationId - Target recommendation UUID
 * @param limit - Maximum entries to return
 * @returns Audit entries for the recommendation
 */
export async function fetchAuditEntriesForRecommendation(
  recommendationId: UUID,
  limit: number = AUDIT_CONFIG.DEFAULT_DISPLAY_COUNT
): Promise<readonly SeoAuditEntry[]> {
  // ODS API: GET /api/v1/activity/events?domain=seo&entity_type=recommendation&entity_id=:id
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events', {
  //   params: {
  //     domain: 'seo',
  //     entity_type: 'recommendation',
  //     entity_id: recommendationId,
  //     limit,
  //     sort_by: 'timestamp',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data.data;

  console.warn(`[SEO] fetchAuditEntriesForRecommendation(${recommendationId}): ODS integration pending - returning empty array`);

  return [];
}

/**
 * Fetch audit entries for a specific entity.
 * 
 * ODS API: GET /api/v1/activity/events?domain=seo&entity_type=:type&entity_id=:id
 * 
 * @param entityType - Entity type (page, query, recommendation)
 * @param entityId - Entity ID
 * @param limit - Maximum entries
 * @returns Audit entries for the entity
 */
export async function fetchAuditEntriesForEntity(
  entityType: SeoAuditEntry['entity_type'],
  entityId: string,
  limit: number = AUDIT_CONFIG.DEFAULT_DISPLAY_COUNT
): Promise<readonly SeoAuditEntry[]> {
  // ODS API: GET /api/v1/activity/events?domain=seo&entity_type=:type&entity_id=:id
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events', {
  //   params: {
  //     domain: 'seo',
  //     entity_type: entityType,
  //     entity_id: entityId,
  //     limit,
  //     sort_by: 'timestamp',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data.data;

  console.warn(`[SEO] fetchAuditEntriesForEntity(${entityType}, ${entityId}): ODS integration pending - returning empty array`);

  return [];
}

/**
 * Fetch recent audit activity.
 * 
 * ODS API: GET /api/v1/activity/events?domain=seo&limit=:limit
 * 
 * @param limit - Maximum entries
 * @returns Recent audit entries
 */
export async function fetchRecentAuditActivity(
  limit: number = AUDIT_CONFIG.DEFAULT_DISPLAY_COUNT
): Promise<readonly SeoAuditEntry[]> {
  // ODS API: GET /api/v1/activity/events?domain=seo&limit=:limit
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events', {
  //   params: {
  //     domain: 'seo',
  //     limit,
  //     sort_by: 'timestamp',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data.data;

  console.warn('[SEO] fetchRecentAuditActivity: ODS integration pending - returning empty array');

  return [];
}

/**
 * Fetch audit entries by user.
 * 
 * ODS API: GET /api/v1/activity/events?domain=seo&user_id=:userId
 * 
 * @param userId - User ID
 * @param limit - Maximum entries
 * @returns Audit entries by the user
 */
export async function fetchAuditEntriesByUser(
  userId: string,
  limit: number = AUDIT_CONFIG.DEFAULT_DISPLAY_COUNT
): Promise<readonly SeoAuditEntry[]> {
  // ODS API: GET /api/v1/activity/events?domain=seo&user_id=:userId
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events', {
  //   params: {
  //     domain: 'seo',
  //     user_id: userId,
  //     limit,
  //     sort_by: 'timestamp',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data.data;

  console.warn(`[SEO] fetchAuditEntriesByUser(${userId}): ODS integration pending - returning empty array`);

  return [];
}

/**
 * Fetch audit summary statistics.
 * 
 * ODS API: GET /api/v1/activity/events/summary?domain=seo
 * 
 * @param options - Date range filter
 * @returns Summary statistics
 */
export async function fetchAuditSummary(
  options: { startDate?: IsoUtcTimestamp; endDate?: IsoUtcTimestamp } = {}
): Promise<{
  totalEntries: number;
  entriesByAction: Record<string, number>;
  uniqueUsers: number;
}> {
  // ODS API: GET /api/v1/activity/events/summary?domain=seo
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/activity/events/summary', {
  //   params: {
  //     domain: 'seo',
  //     start_date: options.startDate,
  //     end_date: options.endDate,
  //   },
  // });
  // return response.data;

  console.warn('[SEO] fetchAuditSummary: ODS integration pending - returning zeros');

  return {
    totalEntries: 0,
    entriesByAction: {},
    uniqueUsers: 0,
  };
}
