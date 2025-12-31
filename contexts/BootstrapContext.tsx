'use client';

/**
 * Bootstrap Context
 * 
 * Provides application-wide access to bootstrap data from /api/v1/me.
 * 
 * GOVERNANCE RULES:
 * - Calls getMe() exactly ONCE on app load
 * - Stores response in React context memory only (no persistence)
 * - No retries, caching, or transforms
 * - No JWT parsing
 * - No role/permission inference
 * - Helpers read directly from bootstrap data
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type {
  BootstrapResponse,
  BootstrapContextValue,
} from '../types/bootstrap';
import { getMe } from '../lib/sdk';

// ============================================
// Context Definition
// ============================================

const BootstrapContext = createContext<BootstrapContextValue>({
  data: null,
  loading: true,
  error: null,
  initialized: false,
  hasPermission: () => false,
  isFeatureVisible: () => false,
});

// ============================================
// Provider Component
// ============================================

interface BootstrapProviderProps {
  children: React.ReactNode;
}

export function BootstrapProvider({ children }: BootstrapProviderProps) {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Bootstrap fetch - runs exactly once on mount
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await getMe();
        if (!cancelled) {
          setData(response);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Bootstrap failed';
          setError(message);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialized(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []); // Empty deps = runs once on mount

  /**
   * Check if user has a specific permission.
   * Reads directly from bootstrap.permissions array.
   * No inference, no role mapping, no hierarchy.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!data) return false;
      return data.permissions.includes(permission);
    },
    [data]
  );

  /**
   * Check if a feature is visible.
   * Reads directly from bootstrap.feature_visibility map.
   * No inference, no defaults.
   */
  const isFeatureVisible = useCallback(
    (feature: string): boolean => {
      if (!data) return false;
      return data.feature_visibility[feature] === true;
    },
    [data]
  );

  const value = useMemo<BootstrapContextValue>(
    () => ({
      data,
      loading,
      error,
      initialized,
      hasPermission,
      isFeatureVisible,
    }),
    [data, loading, error, initialized, hasPermission, isFeatureVisible]
  );

  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Access bootstrap context.
 * Must be used within BootstrapProvider.
 */
export function useBootstrap(): BootstrapContextValue {
  const context = useContext(BootstrapContext);
  return context;
}

// ============================================
// Guard Component
// ============================================

interface BootstrapGuardProps {
  children: React.ReactNode;
  /** Content to show while loading */
  loadingFallback?: React.ReactNode;
  /** Content to show on bootstrap error (401, network, etc.) */
  errorFallback?: React.ReactNode;
}

/**
 * Guards content until bootstrap is complete.
 * Shows loading state during bootstrap, error state on failure.
 */
export function BootstrapGuard({
  children,
  loadingFallback,
  errorFallback,
}: BootstrapGuardProps) {
  const { loading, error, initialized } = useBootstrap();

  if (loading || !initialized) {
    return <>{loadingFallback ?? <BootstrapLoading />}</>;
  }

  if (error) {
    return <>{errorFallback ?? <BootstrapError error={error} />}</>;
  }

  return <>{children}</>;
}

// ============================================
// Default Fallback Components
// ============================================

function BootstrapLoading() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function BootstrapError({ error }: { error: string }) {
  // M67.9-01: No authentication assumed - Vercel Password Protection handles access
  // Show generic error message without auth-specific messaging
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        padding: '24px',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</span>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#111827',
          marginBottom: '8px',
        }}
      >
        Unable to Load
      </h1>
      <p
        style={{
          color: '#6b7280',
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '400px',
        }}
      >
        Failed to initialize the application. Please try again later.
      </p>
      <p
        style={{
          color: '#9ca3af',
          fontSize: '12px',
          marginTop: '16px',
          fontFamily: 'monospace',
        }}
      >
        {error}
      </p>
    </div>
  );
}

// ============================================
// Permission Guard Component
// ============================================

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guards content based on a specific permission.
 * Permission is checked directly against bootstrap.permissions array.
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission } = useBootstrap();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// Feature Guard Component
// ============================================

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guards content based on feature visibility.
 * Feature is checked directly against bootstrap.feature_visibility map.
 */
export function FeatureGuard({
  feature,
  children,
  fallback = null,
}: FeatureGuardProps) {
  const { isFeatureVisible } = useBootstrap();

  if (!isFeatureVisible(feature)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
