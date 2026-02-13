/**
 * SEO Intelligence - Fetchers Index
 * 
 * Central export point for all SEO data fetchers.
 * All fetchers are READ-ONLY and source data from ODS.
 * 
 * GOVERNANCE:
 * - ODS (nsd-ods-api) is the system of record
 * - Platform Shell is a read-only façade
 * - No fetcher may modify external systems
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

// Page fetchers
export * from './fetchSeoPages';

// Query fetchers
export * from './fetchSeoQueries';

// Snapshot fetchers
export * from './fetchSeoSnapshots';

// Recommendation fetchers (primary domain entity)
export * from './fetchRecommendations';

// Approval fetchers
export * from './fetchApprovals';

// Audit log fetchers
export * from './fetchAuditLog';
