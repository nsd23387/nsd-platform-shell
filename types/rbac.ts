/**
 * RBAC Types for Dashboard Access
 * 
 * Dashboard access is read-only for all roles.
 * No mutation permissions are required.
 */

export type UserRole = 'readonly' | 'user' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  orgId: string;
}

export interface Permission {
  resource: string;
  action: 'view' | 'create' | 'update' | 'delete';
}

/**
 * Dashboard permissions matrix
 * All roles can view dashboards - this is intentionally read-only
 */
export const DASHBOARD_PERMISSIONS: Record<UserRole, Permission[]> = {
  readonly: [
    { resource: 'dashboard:executive', action: 'view' },
    { resource: 'dashboard:operations', action: 'view' },
    { resource: 'dashboard:design', action: 'view' },
    { resource: 'dashboard:media', action: 'view' },
    { resource: 'dashboard:sales', action: 'view' },
  ],
  user: [
    { resource: 'dashboard:executive', action: 'view' },
    { resource: 'dashboard:operations', action: 'view' },
    { resource: 'dashboard:design', action: 'view' },
    { resource: 'dashboard:media', action: 'view' },
    { resource: 'dashboard:sales', action: 'view' },
  ],
  manager: [
    { resource: 'dashboard:executive', action: 'view' },
    { resource: 'dashboard:operations', action: 'view' },
    { resource: 'dashboard:design', action: 'view' },
    { resource: 'dashboard:media', action: 'view' },
    { resource: 'dashboard:sales', action: 'view' },
  ],
  admin: [
    { resource: 'dashboard:executive', action: 'view' },
    { resource: 'dashboard:operations', action: 'view' },
    { resource: 'dashboard:design', action: 'view' },
    { resource: 'dashboard:media', action: 'view' },
    { resource: 'dashboard:sales', action: 'view' },
  ],
};

/**
 * Check if a user can access a specific dashboard
 */
export function canViewDashboard(role: UserRole, dashboard: string): boolean {
  const permissions = DASHBOARD_PERMISSIONS[role];
  return permissions.some(
    (p) => p.resource === `dashboard:${dashboard}` && p.action === 'view'
  );
}
