'use client';

/**
 * RBAC Hook - Bootstrap-Driven
 * 
 * Provides role-based access control for dashboard visibility.
 * All permissions come from the bootstrap context (/api/v1/me).
 * 
 * GOVERNANCE:
 * - No hardcoded permission matrices
 * - No role-to-permission mappings
 * - No role hierarchy logic
 * - All checks read directly from bootstrap.permissions
 */

import React from 'react';
import { useBootstrap, PermissionGuard } from '../contexts/BootstrapContext';

// ============================================
// Permission Constants
// ============================================

/**
 * Dashboard permission strings as expected from bootstrap.
 * These are the permission keys to check against bootstrap.permissions[].
 */
export const DASHBOARD_PERMISSIONS = {
  executive: 'dashboard:executive:view',
  operations: 'dashboard:operations:view',
  design: 'dashboard:design:view',
  media: 'dashboard:media:view',
  sales: 'dashboard:sales:view',
  marketing: 'dashboard:marketing:view',
} as const;

export type DashboardName = keyof typeof DASHBOARD_PERMISSIONS;

// ============================================
// RBAC Hook
// ============================================

/**
 * Hook for accessing RBAC functionality.
 * All checks are bootstrap-driven.
 */
export function useRBAC() {
  const { data, hasPermission, isFeatureVisible, loading, error } = useBootstrap();

  /**
   * Check if current user can view a specific dashboard.
   * Reads directly from bootstrap.permissions - no inference.
   */
  const canView = (dashboard: DashboardName): boolean => {
    const permission = DASHBOARD_PERMISSIONS[dashboard];
    return hasPermission(permission);
  };

  return {
    user: data?.user ?? null,
    organization: data?.organization ?? null,
    roles: data?.roles ?? [],
    permissions: data?.permissions ?? [],
    isAuthenticated: data !== null && !error,
    loading,
    error,
    canView,
    hasPermission,
    isFeatureVisible,
    orgId: data?.organization?.id ?? null,
  };
}

// ============================================
// Dashboard Access Guard Component
// ============================================

interface DashboardGuardProps {
  dashboard: DashboardName;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guards dashboard content based on permissions from bootstrap.
 * Permission is checked directly against bootstrap.permissions array.
 */
export function DashboardGuard({ 
  dashboard, 
  children, 
  fallback = null 
}: DashboardGuardProps) {
  const permission = DASHBOARD_PERMISSIONS[dashboard];
  
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

// Re-export for convenience
export { PermissionGuard } from '../contexts/BootstrapContext';
