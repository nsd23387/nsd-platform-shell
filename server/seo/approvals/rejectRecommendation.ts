/**
 * SEO Intelligence - Reject Recommendation
 * 
 * Governed write operation to reject an SEO recommendation.
 * Writes to ODS (nsd-ods-api) as the system of record.
 * 
 * ============================================================
 * THIS IS THE ONLY ALLOWED WRITE SURFACE FOR SEO INTELLIGENCE v1
 * ============================================================
 * 
 * GOVERNANCE:
 * - This is a WRITE operation (rejection status change only)
 * - Requires explicit user action and authentication
 * - Requires rejection reason for learning loop
 * - Creates audit trail entry in activity.events
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
 * Input for rejection action.
 * Reason is REQUIRED to feed the learning loop.
 */
export interface RejectRecommendationInput {
  /** Required: reason for rejection (feeds learning loop) */
  reason: string;
  /** Optional: additional notes */
  notes?: string;
}

/**
 * Context for the rejection action (from authenticated session).
 */
export interface RejectionContext {
  /** Authenticated user ID */
  userId: string;
  /** User display name for audit */
  userDisplayName: string;
}

/**
 * Result of rejection action.
 */
export interface RejectRecommendationResult {
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
// Constants
// ============================================

/** Minimum length for rejection reason */
const MIN_REASON_LENGTH = 10;

/** Maximum length for rejection reason */
const MAX_REASON_LENGTH = 2000;

// ============================================
// Status Transition Rules
// ============================================

/**
 * Valid status transitions for rejection.
 * Only pending and deferred recommendations can be rejected.
 */
const REJECTABLE_STATUSES: readonly RecommendationStatus[] = ['pending', 'deferred'];

/**
 * Check if a recommendation can be rejected.
 */
function canReject(status: RecommendationStatus): boolean {
  return REJECTABLE_STATUSES.includes(status);
}

// ============================================
// Validation
// ============================================

/**
 * Validate rejection input.
 */
export function validateRejectionInput(
  input: RejectRecommendationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Reason is required
  if (!input.reason || input.reason.trim().length === 0) {
    errors.push('Rejection reason is required');
  } else if (input.reason.trim().length < MIN_REASON_LENGTH) {
    errors.push(`Rejection reason must be at least ${MIN_REASON_LENGTH} characters`);
  } else if (input.reason.length > MAX_REASON_LENGTH) {
    errors.push(`Rejection reason must be ${MAX_REASON_LENGTH} characters or less`);
  }

  // Notes are optional but if provided should be reasonable
  if (input.notes !== undefined && input.notes.length > MAX_REASON_LENGTH) {
    errors.push(`Notes must be ${MAX_REASON_LENGTH} characters or less`);
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
 * Reject an SEO recommendation.
 * 
 * ODS API:
 * - GET /api/v1/seo/recommendations/:id (validate exists)
 * - POST /api/v1/seo/approvals (create rejection record)
 * - PATCH /api/v1/seo/recommendations/:id (update status)
 * - POST /api/v1/activity/events (audit entry)
 * 
 * @param recommendationId - UUID of recommendation to reject
 * @param input - Rejection input (reason required, notes optional)
 * @param context - Authenticated user context
 * @returns Result with updated recommendation or error
 * 
 * IMPORTANT: Rejection reasons are valuable learning signals.
 * They help improve future recommendation quality.
 * 
 * This function will NEVER:
 * - Modify website content
 * - Delete the recommendation (it's retained for audit)
 * - Skip the rejection reason requirement
 */
export async function rejectRecommendation(
  recommendationId: UUID,
  input: RejectRecommendationInput,
  context: RejectionContext
): Promise<RejectRecommendationResult> {
  const { userId, userDisplayName } = context;
  const timestamp = new Date().toISOString() as IsoUtcTimestamp;

  // 1. Validate input
  const validation = validateRejectionInput(input);
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

  // 3. Validate status allows rejection
  if (!canReject(recommendation.status)) {
    return {
      success: false,
      recommendation: null,
      approval: null,
      error: `Cannot reject recommendation with status '${recommendation.status}'. Only pending or deferred recommendations can be rejected.`,
      errorCode: 'INVALID_STATUS',
    };
  }

  // 4. Create approval record (with decision='reject')
  const approvalRecord: ApprovalRecord = {
    decision: 'reject',
    decided_by: userId,
    decided_at: timestamp,
    notes: input.notes ? `${input.reason}\n\nAdditional notes: ${input.notes}` : input.reason,
  };

  // ODS API: POST /api/v1/seo/approvals
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/seo/approvals', {
  //   recommendation_id: recommendationId,
  //   decision: 'reject',
  //   decided_by: userId,
  //   decided_at: timestamp,
  //   reason: input.reason,  // Stored separately for learning loop
  //   notes: input.notes,
  // });

  // ODS API: PATCH /api/v1/seo/recommendations/:id
  // TODO: Replace with actual ODS API call
  // await odsClient.patch(`/api/v1/seo/recommendations/${recommendationId}`, {
  //   status: 'rejected',
  // });

  // ODS API: POST /api/v1/activity/events
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/activity/events', {
  //   domain: 'seo',
  //   action: 'recommendation_rejected',
  //   entity_type: 'recommendation',
  //   entity_id: recommendationId,
  //   user_id: userId,
  //   user_display_name: userDisplayName,
  //   timestamp,
  //   metadata: { reason: input.reason, notes: input.notes },
  //   previous_state: { status: recommendation.status },
  //   new_state: { status: 'rejected' },
  // });

  console.warn(
    `[SEO] rejectRecommendation(${recommendationId}): ODS integration pending`,
    { userId, userDisplayName, timestamp, reason: input.reason }
  );

  // For now, return a simulated success response
  const updatedRecommendation: SeoRecommendation = {
    ...recommendation,
    status: 'rejected',
    approval: approvalRecord,
    updated_at: timestamp,
  };

  return {
    success: true,
    recommendation: updatedRecommendation,
    approval: approvalRecord,
  };
}
