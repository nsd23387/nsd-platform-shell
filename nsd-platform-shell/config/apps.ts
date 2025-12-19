/**
 * App Registry Configuration
 * 
 * This config-driven registry defines all applications accessible through the platform shell.
 * Each app entry specifies routing, access control, and display properties.
 * 
 * To add a new application:
 * 1. Add an entry to the APP_REGISTRY array below
 * 2. Ensure the required_roles match entries in config/roles.ts
 * 3. For internal routes, create the corresponding page in app/apps/[app_id]/
 * 4. For external URLs, set is_external: true and provide the full URL
 */

import { LucideIcon } from 'lucide-react';
import {
  ShoppingCart,
  FileText,
  Package,
  Factory,
  Tv,
  Share2,
  Signpost,
  Type,
  DollarSign,
  Boxes,
} from 'lucide-react';

export type AppStatus = 'active' | 'coming_soon' | 'maintenance';

/**
 * Optional capabilities that an application may support.
 * This is a schema-only extension for future-proofing.
 * 
 * NOTE: No logic currently depends on these fields.
 * They exist to allow incremental capability discovery as the platform evolves.
 */
export interface AppCapabilities {
  /** Whether the app supports deep linking from the shell */
  supportsDeepLink?: boolean;
  /** Whether the app can receive notifications from the shell */
  supportsNotifications?: boolean;
  /** Whether the app supports embedding via iframe */
  supportsIframeEmbed?: boolean;
  /** Whether the app exposes search results to universal search */
  supportsUniversalSearch?: boolean;
}

export interface AppConfig {
  app_id: string;
  display_name: string;
  description: string;
  route: string;
  is_external: boolean;
  required_roles: string[];
  icon: LucideIcon;
  status: AppStatus;
  category: 'sales' | 'operations' | 'media' | 'finance' | 'tools';
  /**
   * Optional capabilities supported by this application.
   * This field is for future extensibility and does not affect current behavior.
   */
  capabilities?: AppCapabilities;
}

export const APP_REGISTRY: AppConfig[] = [
  // Sales Category
  {
    app_id: 'sales-engine',
    display_name: 'Sales Engine',
    description: 'CRM and sales pipeline management',
    route: '/apps/sales-engine',
    is_external: false,
    required_roles: ['sales_rep', 'sales_manager', 'admin'],
    icon: ShoppingCart,
    status: 'active',
    category: 'sales',
  },
  {
    app_id: 'custom-quotes',
    display_name: 'Custom Quotes',
    description: 'Create and manage custom quote requests',
    route: '/apps/custom-quotes',
    is_external: false,
    required_roles: ['sales_rep', 'sales_manager', 'estimator', 'admin'],
    icon: FileText,
    status: 'active',
    category: 'sales',
  },
  {
    app_id: 'wholesale-quotes',
    display_name: 'Wholesale Quotes',
    description: 'Wholesale pricing and bulk order quotes',
    route: '/apps/wholesale-quotes',
    is_external: false,
    required_roles: ['sales_rep', 'sales_manager', 'wholesale_manager', 'admin'],
    icon: Boxes,
    status: 'active',
    category: 'sales',
  },

  // Operations Category
  {
    app_id: 'oms',
    display_name: 'Order Management',
    description: 'Track and manage orders end-to-end',
    route: '/apps/oms',
    is_external: false,
    required_roles: ['operations', 'sales_rep', 'sales_manager', 'admin'],
    icon: Package,
    status: 'active',
    category: 'operations',
  },
  {
    app_id: 'production',
    display_name: 'Production',
    description: 'Production scheduling and job tracking',
    route: '/apps/production',
    is_external: false,
    required_roles: ['production', 'operations', 'admin'],
    icon: Factory,
    status: 'coming_soon',
    category: 'operations',
  },

  // Media Category
  {
    app_id: 'media-intelligence',
    display_name: 'Media Intelligence',
    description: 'Media asset management and analytics',
    route: '/apps/media-intelligence',
    is_external: false,
    required_roles: ['media', 'marketing', 'admin'],
    icon: Tv,
    status: 'coming_soon',
    category: 'media',
  },
  {
    app_id: 'social-automation',
    display_name: 'Social Automation',
    description: 'Automated social media management',
    route: '/apps/social-automation',
    is_external: false,
    required_roles: ['marketing', 'admin'],
    icon: Share2,
    status: 'coming_soon',
    category: 'media',
  },

  // Tools Category
  {
    app_id: 'sign-partner',
    display_name: 'Sign Partner App',
    description: 'Partner portal for sign vendors',
    route: '/apps/sign-partner',
    is_external: false,
    required_roles: ['partner', 'operations', 'admin'],
    icon: Signpost,
    status: 'coming_soon',
    category: 'tools',
  },
  {
    app_id: 'channel-letter',
    display_name: 'Channel Letter App',
    description: 'Channel letter design and configuration',
    route: '/apps/channel-letter',
    is_external: false,
    required_roles: ['designer', 'sales_rep', 'admin'],
    icon: Type,
    status: 'coming_soon',
    category: 'tools',
  },

  // Finance Category
  {
    app_id: 'finance-console',
    display_name: 'Finance Console',
    description: 'Financial reporting and management',
    route: '/apps/finance-console',
    is_external: false,
    required_roles: ['finance', 'admin'],
    icon: DollarSign,
    status: 'active',
    category: 'finance',
  },
];

/**
 * Get apps accessible by a user based on their roles
 */
export function getAccessibleApps(userRoles: string[]): AppConfig[] {
  return APP_REGISTRY.filter((app) =>
    app.required_roles.some((role) => userRoles.includes(role))
  );
}

/**
 * Get app by ID
 */
export function getAppById(appId: string): AppConfig | undefined {
  return APP_REGISTRY.find((app) => app.app_id === appId);
}

/**
 * Check if user has access to a specific app
 */
export function hasAppAccess(appId: string, userRoles: string[]): boolean {
  const app = getAppById(appId);
  if (!app) return false;
  return app.required_roles.some((role) => userRoles.includes(role));
}

/**
 * Get apps grouped by category
 */
export function getAppsByCategory(userRoles: string[]): Record<string, AppConfig[]> {
  const accessibleApps = getAccessibleApps(userRoles);
  return accessibleApps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, AppConfig[]>);
}

export const CATEGORY_LABELS: Record<string, string> = {
  sales: 'Sales',
  operations: 'Operations',
  media: 'Media & Marketing',
  finance: 'Finance',
  tools: 'Tools & Utilities',
};
