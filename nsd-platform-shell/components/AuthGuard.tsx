'use client';

/**
 * AuthGuard Component
 * 
 * Protects routes that require authentication.
 * Redirects unauthenticated users to the login page.
 * Enforces RBAC at the route level.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, initializeAuth, LOGIN_PATH, requiresAuth } from '@/lib/auth';
import { hasRouteAccess } from '@/config/roles';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      await initializeAuth();
      setIsInitialized(true);
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    // Skip auth check for public paths
    if (!requiresAuth(pathname)) {
      // If authenticated and on login page, redirect to dashboard
      if (isAuthenticated && pathname.startsWith('/auth')) {
        router.replace('/dashboard');
      }
      return;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`${LOGIN_PATH}?returnUrl=${returnUrl}`);
      return;
    }

    // Check RBAC access
    if (user && !hasRouteAccess(pathname, user.roles)) {
      router.replace('/dashboard?error=unauthorized');
    }
  }, [isInitialized, isAuthenticated, pathname, router, user]);

  // Show loading state during initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (requiresAuth(pathname) && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
