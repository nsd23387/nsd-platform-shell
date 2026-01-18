/**
 * SEO Intelligence - Approvals Index
 * 
 * Central export point for all SEO approval actions.
 * These are the ONLY write operations in the SEO domain.
 * 
 * GOVERNANCE:
 * - All approval actions require authentication
 * - All approval actions create audit entries
 * - No approval action modifies website content
 */

export * from './approveRecommendation';
export * from './rejectRecommendation';
export * from './deferRecommendation';
