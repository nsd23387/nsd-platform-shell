/**
 * Role Configuration
 * 
 * Defines all roles in the system and their hierarchies.
 * These roles are used for RBAC enforcement at the shell level.
 * 
 * Note: The actual role assignment comes from the authentication system (SSO).
 * This file defines the role metadata and access mappings.
 */

export interface RoleConfig {
  role_id: string;
  display_name: string;
  description: string;
  level: number; // Higher = more permissions
}

export const ROLES: RoleConfig[] = [
  // Administrative
  {
    role_id: 'admin',
    display_name: 'Administrator',
    description: 'Full system access',
    level: 100,
  },

  // Management
  {
    role_id: 'sales_manager',
    display_name: 'Sales Manager',
    description: 'Sales team management and reporting',
    level: 80,
  },
  {
    role_id: 'wholesale_manager',
    display_name: 'Wholesale Manager',
    description: 'Wholesale operations management',
    level: 80,
  },
  {
    role_id: 'operations',
    display_name: 'Operations',
    description: 'Operations oversight and management',
    level: 70,
  },

  // Specialized Roles
  {
    role_id: 'sales_rep',
    display_name: 'Sales Representative',
    description: 'Sales and customer management',
    level: 50,
  },
  {
    role_id: 'estimator',
    display_name: 'Estimator',
    description: 'Quote creation and estimation',
    level: 50,
  },
  {
    role_id: 'production',
    display_name: 'Production',
    description: 'Production floor access',
    level: 50,
  },
  {
    role_id: 'designer',
    display_name: 'Designer',
    description: 'Design tools access',
    level: 50,
  },
  {
    role_id: 'finance',
    display_name: 'Finance',
    description: 'Financial reporting and management',
    level: 60,
  },
  {
    role_id: 'media',
    display_name: 'Media',
    description: 'Media asset management',
    level: 50,
  },
  {
    role_id: 'marketing',
    display_name: 'Marketing',
    description: 'Marketing tools and campaigns',
    level: 50,
  },
  {
    role_id: 'partner',
    display_name: 'Partner',
    description: 'External partner access',
    level: 30,
  },

  // Basic
  {
    role_id: 'viewer',
    display_name: 'Viewer',
    description: 'Read-only access',
    level: 10,
  },
];

/**
 * Route-level access control
 * Maps routes to minimum required roles
 */
export const ROUTE_ACCESS: Record<string, string[]> = {
  '/dashboard': ['viewer', 'sales_rep', 'estimator', 'production', 'designer', 'finance', 'media', 'marketing', 'partner', 'operations', 'sales_manager', 'wholesale_manager', 'admin'],
  '/search': ['viewer', 'sales_rep', 'estimator', 'production', 'designer', 'finance', 'media', 'marketing', 'operations', 'sales_manager', 'wholesale_manager', 'admin'],
  '/notifications': ['viewer', 'sales_rep', 'estimator', 'production', 'designer', 'finance', 'media', 'marketing', 'partner', 'operations', 'sales_manager', 'wholesale_manager', 'admin'],
  '/apps': ['sales_rep', 'estimator', 'production', 'designer', 'finance', 'media', 'marketing', 'partner', 'operations', 'sales_manager', 'wholesale_manager', 'admin'],
};

/**
 * Get role by ID
 */
export function getRoleById(roleId: string): RoleConfig | undefined {
  return ROLES.find((role) => role.role_id === roleId);
}

/**
 * Check if user has access to a route
 */
export function hasRouteAccess(route: string, userRoles: string[]): boolean {
  // Admin always has access
  if (userRoles.includes('admin')) return true;

  // Find the matching route pattern
  const matchingRoute = Object.keys(ROUTE_ACCESS).find((pattern) =>
    route.startsWith(pattern)
  );

  if (!matchingRoute) return false;

  const allowedRoles = ROUTE_ACCESS[matchingRoute];
  return allowedRoles.some((role) => userRoles.includes(role));
}

/**
 * Get the highest role level for a user
 */
export function getHighestRoleLevel(userRoles: string[]): number {
  const levels = userRoles
    .map((roleId) => getRoleById(roleId)?.level || 0);
  return Math.max(...levels, 0);
}

/**
 * Check if user is an admin
 */
export function isAdmin(userRoles: string[]): boolean {
  return userRoles.includes('admin');
}
