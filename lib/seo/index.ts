/**
 * SEO Intelligence Domain - Library Exports
 * 
 * Central export point for all SEO Intelligence library code.
 * 
 * GOVERNANCE:
 * - ODS (nsd-ods-api) is the system of record
 * - This domain is read-only except for approval workflows
 * - All data access goes through governed fetchers
 * - No direct CMS or website mutations allowed
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

// Types (canonical schema)
export * from './types';

// Constants
export * from './constants';

// Selectors (pure functions for deriving state)
export * from './selectors';

// Formatters (pure functions for display formatting)
export * from './formatters';

// Permissions (access control)
export * from './permissions';

// UI Contracts (derived types for UI consumption)
export * from './ui-contracts';
