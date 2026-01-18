/**
 * SEO Intelligence - Defer Recommendation
 * 
 * Server-side action to defer an SEO recommendation for later review.
 * This is one of the FEW write operations allowed in the SEO domain.
 * 
 * GOVERNANCE:
 * - This is a WRITE operation (deferral status change only)
 * - Requires explicit user action and authentication
 * - Requires deferral date for follow-up
 * - Creates audit trail entry
 * - Does NOT modify website content
 * - Deferred recommendations resurface automatically
 * 
 * NOT ALLOWED:
 * - Auto-deferring recommendations
 * - Infinite deferral (must have end date)
 * - Deferring without authentication
 * - Skipping audit logging
 */

import type { DeferralRequest, SeoRecommendation } from '../../../lib/seo/types';

// ============================================
// Types
// ============================================

export interface DeferRecommendationResult {
  success: boolean;
  recommendation: SeoRecommendation | null;
  error?: string;
  auditEntryId?: string;
}

export interface DeferRecommendationContext {
  /** Authenticated user ID */
  userId: string;
  /** User display name for audit */
  userDisplayName: string;
  /** Request timestamp */
  timestamp: string;
}

// ============================================
// Constants
// ============================================

/** Maximum deferral period in days */
export const MAX_DEFERRAL_DAYS = 90;

/** Minimum deferral period in days */
export const MIN_DEFERRAL_DAYS = 1;

// ============================================
// Action
// ============================================

/**
 * Defer an SEO recommendation for later review.
 * 
 * NOT IMPLEMENTED - Stub only.
 * 
 * Future implementation will:
 * 1. Validate recommendation exists and is pending
 * 2. Validate user has deferral permission
 * 3. Validate deferral date is within allowed range
 * 4. Update recommendation status to 'deferred'
 * 5. Store deferral date and reason
 * 6. Create audit log entry
 * 7. Schedule recommendation to resurface after deferral
 * 8. Return updated recommendation
 * 
 * This function will NEVER:
 * - Modify website content
 * - Allow infinite deferral
 * - Auto-defer without human decision
 * - Skip audit logging
 * 
 * IMPORTANT: Deferral is a temporary state. Deferred recommendations
 * will automatically resurface for review after the deferral period.
 */
export async function deferRecommendation(
  request: DeferralRequest,
  context: DeferRecommendationContext
): Promise<DeferRecommendationResult> {
  const { recommendationId, deferUntil, reason } = request;
  const { userId, userDisplayName, timestamp } = context;

  // NOT IMPLEMENTED - Return error placeholder
  // This will be connected to the recommendations data store
  
  console.warn(
    `[SEO] deferRecommendation(${recommendationId}): Not implemented - returning error`,
    { userId, userDisplayName, timestamp, deferUntil, reason }
  );
  
  // Always throw to prevent accidental use
  throw new Error(
    'NotImplemented: deferRecommendation is a stub. ' +
    'Deferral workflow must be explicitly implemented with proper audit trails.'
  );
}

/**
 * Validate deferral request.
 * 
 * NOT IMPLEMENTED - Stub only.
 */
export function validateDeferralRequest(
  request: DeferralRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!request.recommendationId) {
    errors.push('Recommendation ID is required');
  }
  
  if (!request.deferUntil) {
    errors.push('Deferral date is required');
  } else {
    try {
      const deferDate = new Date(request.deferUntil);
      const now = new Date();
      const diffDays = Math.ceil((deferDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays < MIN_DEFERRAL_DAYS) {
        errors.push(`Deferral must be at least ${MIN_DEFERRAL_DAYS} day(s) in the future`);
      }
      
      if (diffDays > MAX_DEFERRAL_DAYS) {
        errors.push(`Deferral cannot exceed ${MAX_DEFERRAL_DAYS} days`);
      }
    } catch {
      errors.push('Invalid deferral date format');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
