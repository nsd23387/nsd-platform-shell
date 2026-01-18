/**
 * SEO Intelligence Domain - Permissions
 * 
 * Permission definitions and guards for the SEO Intelligence system.
 * All permissions are checked against the bootstrap context.
 * 
 * GOVERNANCE:
 * - All permissions are read from bootstrap (no hardcoded role checks)
 * - Permission strings follow the format: seo:{resource}:{action}
 * - Most actions are read-only; write actions are explicitly documented
 * 
 * NOT ALLOWED:
 * - Role-based permission inference
 * - Hardcoded admin lists
 * - Permission escalation
 * - Bypass mechanisms
 */

import { SEO_PERMISSION_PREFIX } from './constants';

// ============================================
// Permission Definitions
// ============================================

/**
 * All SEO Intelligence permissions.
 * These strings must match what's configured in the backend.
 */
export const SEO_PERMISSIONS = {
  // ----------------------------------------
  // Read Permissions (most common)
  // ----------------------------------------
  
  /** View SEO dashboard and metrics */
  VIEW_DASHBOARD: `${SEO_PERMISSION_PREFIX}dashboard:view`,
  
  /** View SEO pages list and details */
  VIEW_PAGES: `${SEO_PERMISSION_PREFIX}pages:view`,
  
  /** View SEO queries list and details */
  VIEW_QUERIES: `${SEO_PERMISSION_PREFIX}queries:view`,
  
  /** View recommendations */
  VIEW_RECOMMENDATIONS: `${SEO_PERMISSION_PREFIX}recommendations:view`,
  
  /** View audit log */
  VIEW_AUDIT: `${SEO_PERMISSION_PREFIX}audit:view`,
  
  // ----------------------------------------
  // Write Permissions (approval workflow only)
  // ----------------------------------------
  
  /**
   * Approve recommendations.
   * 
   * WRITE OPERATION: This permission allows marking a recommendation
   * as approved. It does NOT grant ability to deploy or publish.
   */
  APPROVE_RECOMMENDATIONS: `${SEO_PERMISSION_PREFIX}recommendations:approve`,
  
  /**
   * Reject recommendations.
   * 
   * WRITE OPERATION: This permission allows marking a recommendation
   * as rejected with a reason.
   */
  REJECT_RECOMMENDATIONS: `${SEO_PERMISSION_PREFIX}recommendations:reject`,
  
  /**
   * Defer recommendations.
   * 
   * WRITE OPERATION: This permission allows deferring a recommendation
   * for later review.
   */
  DEFER_RECOMMENDATIONS: `${SEO_PERMISSION_PREFIX}recommendations:defer`,
  
  // ----------------------------------------
  // Admin Permissions
  // ----------------------------------------
  
  /**
   * Full admin access to SEO domain.
   * Includes all read and write permissions.
   */
  ADMIN: `${SEO_PERMISSION_PREFIX}admin`,
} as const;

export type SeoPermission = typeof SEO_PERMISSIONS[keyof typeof SEO_PERMISSIONS];

// ============================================
// Permission Groups
// ============================================

/**
 * Permissions required for read-only access.
 */
export const SEO_READ_PERMISSIONS: readonly SeoPermission[] = [
  SEO_PERMISSIONS.VIEW_DASHBOARD,
  SEO_PERMISSIONS.VIEW_PAGES,
  SEO_PERMISSIONS.VIEW_QUERIES,
  SEO_PERMISSIONS.VIEW_RECOMMENDATIONS,
  SEO_PERMISSIONS.VIEW_AUDIT,
] as const;

/**
 * Permissions required for approval workflow.
 */
export const SEO_APPROVAL_PERMISSIONS: readonly SeoPermission[] = [
  SEO_PERMISSIONS.APPROVE_RECOMMENDATIONS,
  SEO_PERMISSIONS.REJECT_RECOMMENDATIONS,
  SEO_PERMISSIONS.DEFER_RECOMMENDATIONS,
] as const;

// ============================================
// Permission Check Utilities
// ============================================

/**
 * Check if a permission list includes a specific permission.
 * Also checks for admin permission which grants all access.
 */
export function hasPermission(
  permissions: readonly string[],
  required: SeoPermission
): boolean {
  // Admin permission grants all access
  if (permissions.includes(SEO_PERMISSIONS.ADMIN)) {
    return true;
  }
  
  return permissions.includes(required);
}

/**
 * Check if a permission list includes ANY of the required permissions.
 */
export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly SeoPermission[]
): boolean {
  // Admin permission grants all access
  if (permissions.includes(SEO_PERMISSIONS.ADMIN)) {
    return true;
  }
  
  return required.some(p => permissions.includes(p));
}

/**
 * Check if a permission list includes ALL of the required permissions.
 */
export function hasAllPermissions(
  permissions: readonly string[],
  required: readonly SeoPermission[]
): boolean {
  // Admin permission grants all access
  if (permissions.includes(SEO_PERMISSIONS.ADMIN)) {
    return true;
  }
  
  return required.every(p => permissions.includes(p));
}

/**
 * Check if user can access SEO domain at all.
 * Requires at least one SEO permission.
 */
export function canAccessSeoDomain(permissions: readonly string[]): boolean {
  // Admin permission grants access
  if (permissions.includes(SEO_PERMISSIONS.ADMIN)) {
    return true;
  }
  
  // Check for any SEO permission
  return permissions.some(p => p.startsWith(SEO_PERMISSION_PREFIX));
}

/**
 * Check if user can view SEO dashboard.
 */
export function canViewDashboard(permissions: readonly string[]): boolean {
  return hasPermission(permissions, SEO_PERMISSIONS.VIEW_DASHBOARD);
}

/**
 * Check if user can perform approval actions.
 */
export function canManageApprovals(permissions: readonly string[]): boolean {
  return hasAnyPermission(permissions, SEO_APPROVAL_PERMISSIONS);
}

// ============================================
// Route Guards
// ============================================

/**
 * Permission requirements for each route.
 * Used for route-level access control.
 */
export const ROUTE_PERMISSIONS: Record<string, SeoPermission> = {
  '/seo': SEO_PERMISSIONS.VIEW_DASHBOARD,
  '/seo/dashboard': SEO_PERMISSIONS.VIEW_DASHBOARD,
  '/seo/pages': SEO_PERMISSIONS.VIEW_PAGES,
  '/seo/queries': SEO_PERMISSIONS.VIEW_QUERIES,
  '/seo/recommendations': SEO_PERMISSIONS.VIEW_RECOMMENDATIONS,
  '/seo/approvals': SEO_PERMISSIONS.APPROVE_RECOMMENDATIONS,
  '/seo/audit': SEO_PERMISSIONS.VIEW_AUDIT,
} as const;

/**
 * Get required permission for a route.
 */
export function getRoutePermission(path: string): SeoPermission | null {
  // Exact match
  if (path in ROUTE_PERMISSIONS) {
    return ROUTE_PERMISSIONS[path];
  }
  
  // Check parent routes
  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const parentPath = '/' + segments.join('/');
    if (parentPath in ROUTE_PERMISSIONS) {
      return ROUTE_PERMISSIONS[parentPath];
    }
    segments.pop();
  }
  
  return null;
}

// ============================================
// NOT IMPLEMENTED Notes
// ============================================

/**
 * FUTURE: Permission enforcement middleware
 * 
 * This will be implemented when we integrate with the actual
 * bootstrap context and Next.js middleware.
 * 
 * NOT ALLOWED in this implementation:
 * - Direct database permission checks
 * - Token parsing or validation
 * - Session management
 */
