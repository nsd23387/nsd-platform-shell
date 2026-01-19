/**
 * SEO Intelligence - Approvals Index
 * 
 * Central export point for all SEO approval actions.
 * 
 * ============================================================
 * THESE ARE THE ONLY WRITE OPERATIONS IN SEO INTELLIGENCE v1
 * ============================================================
 * 
 * GOVERNANCE:
 * - All approval actions require authentication
 * - All approval actions create audit entries
 * - All approval actions write to ODS as system of record
 * - No approval action modifies website content
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

// Approve recommendation
export {
  approveRecommendation,
  validateApprovalInput,
} from './approveRecommendation';
export type {
  ApproveRecommendationInput,
  ApprovalContext,
  ApproveRecommendationResult,
} from './approveRecommendation';

// Reject recommendation
export {
  rejectRecommendation,
  validateRejectionInput,
} from './rejectRecommendation';
export type {
  RejectRecommendationInput,
  RejectionContext,
  RejectRecommendationResult,
} from './rejectRecommendation';

// Defer recommendation
export {
  deferRecommendation,
  validateDeferralInput,
} from './deferRecommendation';
export type {
  DeferRecommendationInput,
  DeferralContext,
  DeferRecommendationResult,
} from './deferRecommendation';
