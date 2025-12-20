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
  overview: 'dashboard:overview:view',
  executive: 'dashboard:executive:view',
  operations: 'dashboard:operations:view',
  design: 'dashboard:design:view',
  media: 'dashboard:media:view',
  sales: 'dashboard:sales:view',
} as const;

/**
 * Overview Dashboard section permissions (Milestone 7)
 * 
 * Role-based visibility:
 * - platform_admin: Full dashboard
 * - executive: Full dashboard  
 * - operator: Full dashboard
 * - viewer: System Pulse only
 */
export const OVERVIEW_SECTION_PERMISSIONS = {
  systemPulse: 'dashboard:overview:system-pulse',
  throughput: 'dashboard:overview:throughput',
  latency: 'dashboard:overview:latency',
  trend: 'dashboard:overview:trend',
} as const;

export type OverviewSection = keyof typeof OVERVIEW_SECTION_PERMISSIONS;

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

// ============================================
// Overview Section Guard Component (Milestone 7)
// ============================================

interface OverviewSectionGuardProps {
  section: OverviewSection;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guards overview dashboard sections based on permissions.
 * 
 * Permission mapping:
 * - platform_admin, executive, operator: All sections visible
 * - viewer: System Pulse only
 * 
 * Permission is checked directly against bootstrap.permissions array.
 */
export function OverviewSectionGuard({ 
  section, 
  children, 
  fallback = null 
}: OverviewSectionGuardProps) {
  const permission = OVERVIEW_SECTION_PERMISSIONS[section];
  
  return (
    <PermissionGuard permission={permission} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

/**
 * Hook to check if user can view a specific overview section.
 * Used for conditional rendering of dashboard sections.
 */
export function useOverviewSectionAccess() {
  const { hasPermission } = useBootstrap();
  
  const canViewSection = (section: OverviewSection): boolean => {
    const permission = OVERVIEW_SECTION_PERMISSIONS[section];
    return hasPermission(permission);
  };
  
  return {
    canViewSystemPulse: canViewSection('systemPulse'),
    canViewThroughput: canViewSection('throughput'),
    canViewLatency: canViewSection('latency'),
    canViewTrend: canViewSection('trend'),
    canViewSection,
  };
}

// Re-export for convenience
export { PermissionGuard } from '../contexts/BootstrapContext';
