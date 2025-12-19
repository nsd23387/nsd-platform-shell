/**
 * Authentication Helpers
 * 
 * This module handles session management for the platform shell.
 * It works in conjunction with SSO and manages JWT token storage.
 * 
 * Security considerations:
 * - JWT tokens are stored in httpOnly cookies (server-side)
 * - Client-side uses a short-lived token for API calls
 * - All sensitive operations require token validation
 */

import Cookies from 'js-cookie';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Cookie configuration
const AUTH_TOKEN_KEY = 'nsd_auth_token';
const AUTH_TOKEN_EXPIRY_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  avatar_url?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Store JWT token securely
 */
export function setAuthToken(token: string): void {
  Cookies.set(AUTH_TOKEN_KEY, token, {
    expires: AUTH_TOKEN_EXPIRY_DAYS,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
}

/**
 * Get JWT token
 */
export function getAuthToken(): string | undefined {
  return Cookies.get(AUTH_TOKEN_KEY);
}

/**
 * Remove JWT token
 */
export function removeAuthToken(): void {
  Cookies.remove(AUTH_TOKEN_KEY);
}

/**
 * Check if token exists
 */
export function hasAuthToken(): boolean {
  return !!getAuthToken();
}

// ============================================================================
// Auth Store (Zustand)
// ============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () => {
        removeAuthToken();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'nsd-auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ============================================================================
// Session Helpers
// ============================================================================

/**
 * Initialize authentication state from stored token
 */
export async function initializeAuth(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) {
    useAuthStore.getState().setUser(null);
    return null;
  }

  try {
    // In production, this would validate the token with the server
    // For now, we'll decode the mock user from storage
    const storedUser = useAuthStore.getState().user;
    if (storedUser) {
      useAuthStore.getState().setUser(storedUser);
      return storedUser;
    }
    
    // Token exists but no user data - need to re-authenticate
    useAuthStore.getState().logout();
    return null;
  } catch {
    useAuthStore.getState().logout();
    return null;
  }
}

/**
 * Login user and store session
 */
export async function loginUser(email: string, password: string): Promise<User> {
  // In production, this calls the SDK authenticate function
  // For development, we use mock data
  
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock authentication - in production this would call the SDK
  if (email && password) {
    const mockUser: User = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      roles: getMockRolesForEmail(email),
      avatar_url: undefined,
    };

    // Store token
    const mockToken = 'mock_jwt_' + Date.now();
    setAuthToken(mockToken);

    // Update store
    useAuthStore.getState().setUser(mockUser);

    return mockUser;
  }

  throw new Error('Invalid credentials');
}

/**
 * Logout user and clear session
 */
export async function logoutUser(): Promise<void> {
  // In production, this would call the SDK logout function
  removeAuthToken();
  useAuthStore.getState().logout();
}

/**
 * Check if current user has a specific role
 */
export function hasRole(role: string): boolean {
  const user = useAuthStore.getState().user;
  return user?.roles.includes(role) ?? false;
}

/**
 * Check if current user has any of the specified roles
 */
export function hasAnyRole(roles: string[]): boolean {
  const user = useAuthStore.getState().user;
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

/**
 * Get current user roles
 */
export function getUserRoles(): string[] {
  return useAuthStore.getState().user?.roles ?? [];
}

// ============================================================================
// Mock Helpers (Development Only)
// ============================================================================

function getMockRolesForEmail(email: string): string[] {
  const lowerEmail = email.toLowerCase();
  
  // Admin users
  if (lowerEmail.includes('admin')) {
    return ['admin'];
  }
  
  // Sales users
  if (lowerEmail.includes('sales') || lowerEmail.includes('rep')) {
    return ['sales_rep'];
  }
  
  // Manager users
  if (lowerEmail.includes('manager')) {
    return ['sales_manager', 'operations'];
  }
  
  // Finance users
  if (lowerEmail.includes('finance') || lowerEmail.includes('accounting')) {
    return ['finance'];
  }
  
  // Production users
  if (lowerEmail.includes('production') || lowerEmail.includes('factory')) {
    return ['production'];
  }
  
  // Default - give reasonable access for testing
  return ['sales_rep', 'viewer'];
}

// ============================================================================
// Auth Guard Helper
// ============================================================================

/**
 * Redirect path for unauthenticated users
 */
export const LOGIN_PATH = '/auth';

/**
 * Default redirect path after login
 */
export const DEFAULT_AUTHENTICATED_PATH = '/dashboard';

/**
 * Check if path requires authentication
 */
export function requiresAuth(path: string): boolean {
  const publicPaths = ['/auth', '/auth/login', '/auth/forgot-password'];
  return !publicPaths.some((p) => path.startsWith(p));
}
