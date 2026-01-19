/**
 * SEO Intelligence - Server Layer Exports
 * 
 * Central export point for SEO server-side functionality.
 * 
 * ============================================================
 * GOVERNANCE NOTICE
 * ============================================================
 * 
 * This system does NOT execute SEO changes.
 * This system does NOT modify website content.
 * This system ONLY proposes and governs decisions.
 * All execution happens externally (e.g., website repo via PR).
 * 
 * Architectural Constraints:
 * - ODS (nsd-ods-api) is the system of record
 * - Platform Shell is a read-only façade, except for approvals
 * - No SEO code may write to website content, CMS, or trigger deployments
 * - All fetchers are READ-ONLY
 * - All writes must go through approval functions
 * - All writes must reference a recommendation_id
 * - All writes create audit entries
 * 
 * ============================================================
 */

// Read-only fetchers (ODS GET calls)
export * from './fetchers';

// Write operations (approval workflow only)
export * from './approvals';
