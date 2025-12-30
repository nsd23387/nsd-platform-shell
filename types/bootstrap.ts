/**
 * Bootstrap Types
 * 
 * Types for the /api/v1/me bootstrap endpoint response.
 * This is the SOLE source of truth for user identity, permissions, and feature visibility.
 * 
 * GOVERNANCE:
 * - All values come directly from the API response
 * - No local inference or computation
 * - No JWT parsing
 * - No role hierarchy logic
 */

/**
 * User identity from bootstrap
 */
export interface BootstrapUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * Organization context from bootstrap
 */
export interface BootstrapOrganization {
  id: string;
  name: string;
  slug: string;
}

/**
 * Environment information from bootstrap
 */
export interface BootstrapEnvironment {
  name: 'development' | 'staging' | 'production';
  api_version: string;
}

/**
 * App Registry Module Definition
 * Used for lazy-loaded Command Center modules
 */
export interface AppRegistryModule {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  featureFlag?: string;
  enabled: boolean;
}

/**
 * Complete bootstrap response from /api/v1/me
 * 
 * This response is the ONLY authority for:
 * - User identity
 * - Organization context
 * - Roles (as strings, not interpreted)
 * - Permissions (as strings, not interpreted)
 * - Feature visibility flags
 * - Enabled modules
 */
export interface BootstrapResponse {
  user: BootstrapUser;
  organization: BootstrapOrganization;
  roles: string[];
  permissions: string[];
  environment: BootstrapEnvironment;
  feature_visibility: Record<string, boolean>;
  modules?: AppRegistryModule[];
}

/**
 * Bootstrap context state
 */
export interface BootstrapState {
  /** Bootstrap data, null if not loaded or failed */
  data: BootstrapResponse | null;
  /** Loading state */
  loading: boolean;
  /** Error message if bootstrap failed */
  error: string | null;
  /** Whether bootstrap has completed (success or failure) */
  initialized: boolean;
}

/**
 * Bootstrap context value with helpers
 */
export interface BootstrapContextValue extends BootstrapState {
  /**
   * Check if user has a specific permission.
   * Reads directly from bootstrap.permissions array.
   * No inference, no role mapping.
   */
  hasPermission: (permission: string) => boolean;
  
  /**
   * Check if a feature is visible.
   * Reads directly from bootstrap.feature_visibility map.
   * No inference, no default logic.
   */
  isFeatureVisible: (feature: string) => boolean;

  /**
   * Check if a module is enabled.
   * Reads from bootstrap.modules array.
   */
  isModuleEnabled?: (moduleId: string) => boolean;
}
