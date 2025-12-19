/**
 * RBAC Hook for Dashboard Access Control
 * 
 * Provides role-based access control for dashboard visibility.
 * All dashboard access is read-only.
 */

import { useCallback, useContext, createContext } from 'react';
import type { User, UserRole } from '../types/rbac';
import { canViewDashboard } from '../types/rbac';

// ============================================
// Auth Context (to be provided by app)
// ============================================

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
});

// ============================================
// RBAC Hook
// ============================================

export function useRBAC() {
  const { user, isAuthenticated } = useContext(AuthContext);

  /**
   * Check if current user can view a specific dashboard
   */
  const canView = useCallback(
    (dashboard: string): boolean => {
      if (!isAuthenticated || !user) {
        return false;
      }
      return canViewDashboard(user.role, dashboard);
    },
    [user, isAuthenticated]
  );

  /**
   * Check if user has a specific role or higher
   */
  const hasRole = useCallback(
    (requiredRole: UserRole): boolean => {
      if (!user) return false;
      
      const roleHierarchy: UserRole[] = ['readonly', 'user', 'manager', 'admin'];
      const userRoleIndex = roleHierarchy.indexOf(user.role);
      const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
      
      return userRoleIndex >= requiredRoleIndex;
    },
    [user]
  );

  return {
    user,
    isAuthenticated,
    canView,
    hasRole,
    orgId: user?.orgId ?? null,
  };
}

// ============================================
// Dashboard Access Guard Component
// ============================================

interface DashboardGuardProps {
  dashboard: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DashboardGuard({ 
  dashboard, 
  children, 
  fallback = null 
}: DashboardGuardProps) {
  const { canView } = useRBAC();

  if (!canView(dashboard)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
