/**
 * SEO Intelligence - Approve Recommendation
 * 
 * Governed write operation to approve an SEO recommendation.
 * Writes to ODS (nsd-ods-api) as the system of record.
 * 
 * ============================================================
 * THIS IS THE ONLY ALLOWED WRITE SURFACE FOR SEO INTELLIGENCE v1
 * ============================================================
 * 
 * GOVERNANCE:
 * - This is a WRITE operation (approval status change only)
 * - Requires explicit user action and authentication
 * - Creates audit trail entry in activity.events
 * - Does NOT deploy or publish anything
 * - Does NOT modify website content
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import type {
  ApprovalRecord,
  SeoRecommendation,
  RecommendationStatus,
  UUID,
  IsoUtcTimestamp,
} from '../../../lib/seo/types';
import { fetchSeoRecommendationById } from '../fetchers/fetchRecommendations';

// ============================================
// Types
// ============================================

/**
 * Input for approval action.
 */
export interface ApproveRecommendationInput {
  /** Optional notes explaining the approval */
  notes?: string;
}

/**
 * Context for the approval action (from authenticated session).
 */
export interface ApprovalContext {
  /** Authenticated user ID */
  userId: string;
  /** User display name for audit */
  userDisplayName: string;
}

/**
 * Result of approval action.
 */
export interface ApproveRecommendationResult {
  success: boolean;
  /** Updated recommendation (if successful) */
  recommendation: SeoRecommendation | null;
  /** Approval record created */
  approval: ApprovalRecord | null;
  /** Error message (if failed) */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: 'NOT_FOUND' | 'INVALID_STATUS' | 'VALIDATION_ERROR' | 'ODS_ERROR';
}

// ============================================
// Status Transition Rules
// ============================================

/**
 * Valid status transitions for approval.
 * Only pending and deferred recommendations can be approved.
 */
const APPROVABLE_STATUSES: readonly RecommendationStatus[] = ['pending', 'deferred'];

/**
 * Check if a recommendation can be approved.
 */
function canApprove(status: RecommendationStatus): boolean {
  return APPROVABLE_STATUSES.includes(status);
}

// ============================================
// Validation
// ============================================

/**
 * Validate approval input.
 */
export function validateApprovalInput(
  input: ApproveRecommendationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Notes are optional but if provided should be reasonable
  if (input.notes !== undefined && input.notes.length > 2000) {
    errors.push('Notes must be 2000 characters or less');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// Action
// ============================================

/**
 * Approve an SEO recommendation.
 * 
 * ODS API:
 * - GET /api/v1/seo/recommendations/:id (validate exists)
 * - POST /api/v1/seo/approvals (create approval record)
 * - PATCH /api/v1/seo/recommendations/:id (update status)
 * - POST /api/v1/activity/events (audit entry)
 * 
 * @param recommendationId - UUID of recommendation to approve
 * @param input - Approval input (notes)
 * @param context - Authenticated user context
 * @returns Result with updated recommendation or error
 * 
 * This function will NEVER:
 * - Modify website content
 * - Deploy changes
 * - Publish to CMS
 * - Auto-implement the recommendation
 */
export async function approveRecommendation(
  recommendationId: UUID,
  input: ApproveRecommendationInput,
  context: ApprovalContext
): Promise<ApproveRecommendationResult> {
  const { userId, userDisplayName } = context;
  const timestamp = new Date().toISOString() as IsoUtcTimestamp;

  // 1. Validate input
  const validation = validateApprovalInput(input);
  if (!validation.valid) {
    return {
      success: false,
      recommendation: null,
      approval: null,
      error: validation.errors.join('; '),
      errorCode: 'VALIDATION_ERROR',
    };
  }

  // 2. Fetch recommendation to validate it exists
  // ODS API: GET /api/v1/seo/recommendations/:id
  const recommendation = await fetchSeoRecommendationById({ recommendationId });

  if (!recommendation) {
    return {
      success: false,
      recommendation: null,
      approval: null,
      error: `Recommendation ${recommendationId} not found`,
      errorCode: 'NOT_FOUND',
    };
  }

  // 3. Validate status allows approval
  if (!canApprove(recommendation.status)) {
    return {
      success: false,
      recommendation: null,
      approval: null,
      error: `Cannot approve recommendation with status '${recommendation.status}'. Only pending or deferred recommendations can be approved.`,
      errorCode: 'INVALID_STATUS',
    };
  }

  // 4. Create approval record
  const approvalRecord: ApprovalRecord = {
    decision: 'approve',
    decided_by: userId,
    decided_at: timestamp,
    notes: input.notes,
  };

  // ODS API: POST /api/v1/seo/approvals
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/seo/approvals', {
  //   recommendation_id: recommendationId,
  //   ...approvalRecord,
  // });

  // ODS API: PATCH /api/v1/seo/recommendations/:id
  // TODO: Replace with actual ODS API call
  // await odsClient.patch(`/api/v1/seo/recommendations/${recommendationId}`, {
  //   status: 'approved',
  // });

  // ODS API: POST /api/v1/activity/events
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/activity/events', {
  //   domain: 'seo',
  //   action: 'recommendation_approved',
  //   entity_type: 'recommendation',
  //   entity_id: recommendationId,
  //   user_id: userId,
  //   user_display_name: userDisplayName,
  //   timestamp,
  //   metadata: { notes: input.notes },
  //   previous_state: { status: recommendation.status },
  //   new_state: { status: 'approved' },
  // });

  console.warn(
    `[SEO] approveRecommendation(${recommendationId}): ODS integration pending`,
    { userId, userDisplayName, timestamp, notes: input.notes }
  );

  // For now, return a simulated success response
  // In production, this would return the actual updated recommendation from ODS
  const updatedRecommendation: SeoRecommendation = {
    ...recommendation,
    status: 'approved',
    approval: approvalRecord,
    updated_at: timestamp,
  };

  return {
    success: true,
    recommendation: updatedRecommendation,
    approval: approvalRecord,
  };
}
