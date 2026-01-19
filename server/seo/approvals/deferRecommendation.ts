/**
 * SEO Intelligence - Defer Recommendation
 * 
 * Governed write operation to defer an SEO recommendation for later review.
 * Writes to ODS (nsd-ods-api) as the system of record.
 * 
 * ============================================================
 * THIS IS THE ONLY ALLOWED WRITE SURFACE FOR SEO INTELLIGENCE v1
 * ============================================================
 * 
 * GOVERNANCE:
 * - This is a WRITE operation (deferral status change only)
 * - Requires explicit user action and authentication
 * - Requires deferral date for follow-up
 * - Creates audit trail entry in activity.events
 * - Does NOT modify website content
 * - Deferred recommendations resurface automatically after deferral period
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
import { DEFERRAL_LIMITS } from '../../../lib/seo/constants';
import { fetchSeoRecommendationById } from '../fetchers/fetchRecommendations';

// ============================================
// Types
// ============================================

/**
 * Input for deferral action.
 * Defer until date is REQUIRED.
 */
export interface DeferRecommendationInput {
  /** Required: date to resurface the recommendation */
  deferUntil: IsoUtcTimestamp;
  /** Optional: reason for deferring */
  reason?: string;
}

/**
 * Context for the deferral action (from authenticated session).
 */
export interface DeferralContext {
  /** Authenticated user ID */
  userId: string;
  /** User display name for audit */
  userDisplayName: string;
}

/**
 * Result of deferral action.
 */
export interface DeferRecommendationResult {
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
 * Valid status transitions for deferral.
 * Only pending recommendations can be deferred.
 */
const DEFERRABLE_STATUSES: readonly RecommendationStatus[] = ['pending'];

/**
 * Check if a recommendation can be deferred.
 */
function canDefer(status: RecommendationStatus): boolean {
  return DEFERRABLE_STATUSES.includes(status);
}

// ============================================
// Validation
// ============================================

/**
 * Validate deferral input.
 */
export function validateDeferralInput(
  input: DeferRecommendationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Defer until date is required
  if (!input.deferUntil) {
    errors.push('Deferral date is required');
  } else {
    try {
      const deferDate = new Date(input.deferUntil);
      const now = new Date();
      const diffMs = deferDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (isNaN(deferDate.getTime())) {
        errors.push('Invalid deferral date format');
      } else if (diffDays < DEFERRAL_LIMITS.MIN_DAYS) {
        errors.push(`Deferral must be at least ${DEFERRAL_LIMITS.MIN_DAYS} day(s) in the future`);
      } else if (diffDays > DEFERRAL_LIMITS.MAX_DAYS) {
        errors.push(`Deferral cannot exceed ${DEFERRAL_LIMITS.MAX_DAYS} days`);
      }
    } catch {
      errors.push('Invalid deferral date format');
    }
  }

  // Reason is optional but if provided should be reasonable
  if (input.reason !== undefined && input.reason.length > 2000) {
    errors.push('Reason must be 2000 characters or less');
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
 * Defer an SEO recommendation for later review.
 * 
 * ODS API:
 * - GET /api/v1/seo/recommendations/:id (validate exists)
 * - POST /api/v1/seo/approvals (create deferral record)
 * - PATCH /api/v1/seo/recommendations/:id (update status)
 * - POST /api/v1/activity/events (audit entry)
 * 
 * @param recommendationId - UUID of recommendation to defer
 * @param input - Deferral input (deferUntil required, reason optional)
 * @param context - Authenticated user context
 * @returns Result with updated recommendation or error
 * 
 * IMPORTANT: Deferral is a temporary state. Deferred recommendations
 * will automatically resurface for review after the deferral period.
 * 
 * This function will NEVER:
 * - Modify website content
 * - Allow infinite deferral
 * - Permanently dismiss recommendations
 */
export async function deferRecommendation(
  recommendationId: UUID,
  input: DeferRecommendationInput,
  context: DeferralContext
): Promise<DeferRecommendationResult> {
  const { userId, userDisplayName } = context;
  const timestamp = new Date().toISOString() as IsoUtcTimestamp;

  // 1. Validate input
  const validation = validateDeferralInput(input);
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

  // 3. Validate status allows deferral
  if (!canDefer(recommendation.status)) {
    return {
      success: false,
      recommendation: null,
      approval: null,
      error: `Cannot defer recommendation with status '${recommendation.status}'. Only pending recommendations can be deferred.`,
      errorCode: 'INVALID_STATUS',
    };
  }

  // 4. Create approval record (with decision='defer')
  const approvalRecord: ApprovalRecord = {
    decision: 'defer',
    decided_by: userId,
    decided_at: timestamp,
    notes: input.reason ? `Deferred until ${input.deferUntil}. Reason: ${input.reason}` : `Deferred until ${input.deferUntil}`,
  };

  // ODS API: POST /api/v1/seo/approvals
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/seo/approvals', {
  //   recommendation_id: recommendationId,
  //   decision: 'defer',
  //   decided_by: userId,
  //   decided_at: timestamp,
  //   defer_until: input.deferUntil,
  //   reason: input.reason,
  // });

  // ODS API: PATCH /api/v1/seo/recommendations/:id
  // TODO: Replace with actual ODS API call
  // await odsClient.patch(`/api/v1/seo/recommendations/${recommendationId}`, {
  //   status: 'deferred',
  // });

  // ODS API: POST /api/v1/activity/events
  // TODO: Replace with actual ODS API call
  // await odsClient.post('/api/v1/activity/events', {
  //   domain: 'seo',
  //   action: 'recommendation_deferred',
  //   entity_type: 'recommendation',
  //   entity_id: recommendationId,
  //   user_id: userId,
  //   user_display_name: userDisplayName,
  //   timestamp,
  //   metadata: { defer_until: input.deferUntil, reason: input.reason },
  //   previous_state: { status: recommendation.status },
  //   new_state: { status: 'deferred' },
  // });

  console.warn(
    `[SEO] deferRecommendation(${recommendationId}): ODS integration pending`,
    { userId, userDisplayName, timestamp, deferUntil: input.deferUntil, reason: input.reason }
  );

  // For now, return a simulated success response
  const updatedRecommendation: SeoRecommendation = {
    ...recommendation,
    status: 'deferred',
    approval: approvalRecord,
    updated_at: timestamp,
  };

  return {
    success: true,
    recommendation: updatedRecommendation,
    approval: approvalRecord,
  };
}
