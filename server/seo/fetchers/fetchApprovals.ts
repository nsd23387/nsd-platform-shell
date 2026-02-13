/**
 * SEO Intelligence - Fetch Approvals
 * 
 * Server-side fetcher for approval records.
 * Reads from ODS (nsd-ods-api) as the system of record.
 * 
 * GOVERNANCE:
 * - This fetcher is READ-ONLY
 * - ODS is the system of record
 * - Approval records are append-only (immutable once written)
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import type {
  ApprovalRecord,
  UUID,
  IsoUtcTimestamp,
  ApprovalDecision,
} from '../../../lib/seo/types';

// ============================================
// Types
// ============================================

/**
 * Extended approval record with database metadata.
 */
export interface ApprovalRecordWithId extends ApprovalRecord {
  /** Database record ID */
  readonly id: UUID;
  /** Linked recommendation ID */
  readonly recommendation_id: UUID;
}

export interface FetchApprovalsOptions {
  /** Filter by recommendation ID */
  recommendationId?: UUID;
  /** Filter by decision type */
  decision?: ApprovalDecision;
  /** Filter by user */
  decidedBy?: string;
  /** Filter by date range start */
  startDate?: IsoUtcTimestamp;
  /** Filter by date range end */
  endDate?: IsoUtcTimestamp;
  /** Limit results */
  limit?: number;
}

// ============================================
// Fetchers
// ============================================

/**
 * Fetch approval records for a specific recommendation.
 * 
 * ODS API: GET /api/v1/seo/approvals?recommendation_id=:id
 * 
 * @param recommendationId - Target recommendation UUID
 * @returns Array of approval records (may be multiple if deferred then approved)
 * 
 * Note: Approval records are append-only. A recommendation may have multiple
 * approval records if it was deferred and then later approved/rejected.
 */
export async function fetchSeoApprovals(
  recommendationId: UUID
): Promise<readonly ApprovalRecordWithId[]> {
  // ODS API: GET /api/v1/seo/approvals?recommendation_id=:id
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/approvals', {
  //   params: { recommendation_id: recommendationId },
  // });
  // return response.data;

  console.warn(`[SEO] fetchSeoApprovals(${recommendationId}): ODS integration pending - returning empty array`);

  return [];
}

/**
 * Fetch the latest approval record for a recommendation.
 * 
 * ODS API: GET /api/v1/seo/approvals?recommendation_id=:id&limit=1&sort_by=decided_at&sort_order=desc
 * 
 * @param recommendationId - Target recommendation UUID
 * @returns Latest approval record or null if none exists
 */
export async function fetchLatestApproval(
  recommendationId: UUID
): Promise<ApprovalRecordWithId | null> {
  // ODS API: GET /api/v1/seo/approvals?recommendation_id=:id&limit=1&sort_by=decided_at&sort_order=desc
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/approvals', {
  //   params: { 
  //     recommendation_id: recommendationId,
  //     limit: 1,
  //     sort_by: 'decided_at',
  //     sort_order: 'desc',
  //   },
  // });
  // return response.data[0] ?? null;

  console.warn(`[SEO] fetchLatestApproval(${recommendationId}): ODS integration pending - returning null`);

  return null;
}

/**
 * Fetch all approvals with optional filters.
 * 
 * ODS API: GET /api/v1/seo/approvals
 * 
 * @param options - Filter options
 * @returns Array of approval records
 */
export async function fetchAllApprovals(
  options: FetchApprovalsOptions = {}
): Promise<readonly ApprovalRecordWithId[]> {
  const {
    recommendationId,
    decision,
    decidedBy,
    startDate,
    endDate,
    limit = 100,
  } = options;

  // ODS API: GET /api/v1/seo/approvals
  // Query params: recommendation_id, decision, decided_by, start_date, end_date, limit
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/approvals', {
  //   params: {
  //     recommendation_id: recommendationId,
  //     decision,
  //     decided_by: decidedBy,
  //     start_date: startDate,
  //     end_date: endDate,
  //     limit,
  //   },
  // });
  // return response.data;

  console.warn('[SEO] fetchAllApprovals: ODS integration pending - returning empty array');

  return [];
}

/**
 * Fetch approval counts by decision type.
 * 
 * ODS API: GET /api/v1/seo/approvals/summary
 * 
 * @returns Counts by decision type
 */
export async function fetchApprovalsSummary(): Promise<{
  approve: number;
  reject: number;
  defer: number;
  total: number;
}> {
  // ODS API: GET /api/v1/seo/approvals/summary
  // TODO: Replace with actual ODS API call
  // const response = await odsClient.get('/api/v1/seo/approvals/summary');
  // return response.data;

  console.warn('[SEO] fetchApprovalsSummary: ODS integration pending - returning zeros');

  return {
    approve: 0,
    reject: 0,
    defer: 0,
    total: 0,
  };
}
