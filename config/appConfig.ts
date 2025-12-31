/**
 * Application Configuration - M67.9-01 Vercel Hosting Setup
 * 
 * Centralized configuration module for environment variable gating.
 * This module controls read-only mode and API access for Vercel deployment.
 * 
 * HARD CONSTRAINTS (M67.9-01):
 * - READ-ONLY ONLY. No writes. No mutations. No pipeline execution.
 * - No Supabase, Smartlead, Apollo, Make, or backend service connections.
 * - No secrets or real API keys.
 * - All network calls disabled when API mode is disabled.
 * - This milestone is hosting-only - does NOT enable M68 functionality.
 */

// =============================================================================
// ENVIRONMENT VARIABLE GATING
// =============================================================================

/**
 * Whether API mode is disabled.
 * When true, all API calls are short-circuited and return mock/empty data.
 * 
 * Set via: NEXT_PUBLIC_API_MODE=disabled
 */
export const isApiDisabled = 
  process.env.NEXT_PUBLIC_API_MODE === 'disabled';

/**
 * Whether the application is in read-only mode.
 * When true, all execution-related buttons are disabled and a banner is shown.
 * 
 * Set via: NEXT_PUBLIC_READ_ONLY=true
 */
export const isReadOnly = 
  process.env.NEXT_PUBLIC_READ_ONLY === 'true' || isApiDisabled;

/**
 * Current deployment mode.
 * Used for logging and debugging only.
 */
export const deploymentMode: 'production' | 'preview' | 'development' = 
  process.env.NODE_ENV === 'production' 
    ? (process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production')
    : 'development';

// =============================================================================
// READ-ONLY BANNER CONFIGURATION
// =============================================================================

/**
 * Read-only mode banner message.
 * Displayed globally when isReadOnly is true.
 */
export const READ_ONLY_BANNER_MESSAGE = 
  'Read-only mode. Runtime will be enabled in Milestone M68.';

/**
 * Detailed explanation for read-only mode.
 */
export const READ_ONLY_BANNER_DESCRIPTION = 
  'This deployment is for UI preview only. No API connections, no execution, no data modifications.';

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * Base URLs for API endpoints.
 * These are placeholders when API mode is disabled.
 */
export const apiConfig = {
  /** Sales Engine M60 API base URL (client-side) */
  salesEngineApi: process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns',
  
  /** Sales Engine M60 API base URL (server-side) */
  salesEngineApiServer: process.env.SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns',
  
  /** ODS API URL for bootstrap/identity */
  odsApi: process.env.NEXT_PUBLIC_ODS_API_URL || '/functions/v1/ods-api',
  
  /** Activity Spine API URL */
  activitySpine: process.env.NEXT_PUBLIC_ACTIVITY_SPINE_URL || '/api/activity-spine',
  
  /** Supabase URL (placeholder - never used when API disabled) */
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  
  /** Supabase anon key (placeholder - never used when API disabled) */
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/**
 * Feature flags for M67.9-01 Vercel hosting.
 * All execution features are disabled.
 */
export const featureFlags = {
  /** Can create campaigns (allowed in M67-14 exception) */
  canCreateCampaign: !isApiDisabled,
  
  /** Can execute/run campaigns */
  canExecuteCampaign: false,
  
  /** Can approve campaigns */
  canApproveCampaign: false,
  
  /** Can submit campaigns for review */
  canSubmitCampaign: false,
  
  /** Can start campaign runs */
  canStartRun: false,
  
  /** Can reset campaigns */
  canResetCampaign: false,
  
  /** API calls are enabled */
  apiEnabled: !isApiDisabled,
} as const;

// =============================================================================
// DISABLED ACTION MESSAGES
// =============================================================================

/**
 * Messages shown when actions are disabled in read-only mode.
 */
export const disabledActionMessages = {
  start: 'Starting campaigns is disabled in read-only mode. Runtime will be enabled in M68.',
  run: 'Running campaigns is disabled in read-only mode. Runtime will be enabled in M68.',
  execute: 'Execution is disabled in read-only mode. Runtime will be enabled in M68.',
  approve: 'Approving campaigns is disabled in read-only mode. Runtime will be enabled in M68.',
  submit: 'Submitting campaigns is disabled in read-only mode. Runtime will be enabled in M68.',
  reset: 'Resetting campaigns is disabled in read-only mode. Runtime will be enabled in M68.',
  create: 'Creating campaigns is disabled when API mode is disabled.',
  general: 'This action is not available. Read-only mode is active.',
} as const;

// =============================================================================
// LOGGING & DEBUGGING
// =============================================================================

/**
 * Log current configuration state (for debugging).
 * Only logs in development mode.
 */
export function logConfigState(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log('[AppConfig] Configuration state:', {
    isApiDisabled,
    isReadOnly,
    deploymentMode,
    featureFlags,
  });
}

// =============================================================================
// GUARDS
// =============================================================================

/**
 * Check if a specific action is allowed.
 * Returns true only if both not read-only and action is enabled.
 */
export function isActionAllowed(action: keyof typeof featureFlags): boolean {
  return !isReadOnly && featureFlags[action] === true;
}

/**
 * Get the disabled message for an action.
 */
export function getDisabledMessage(action: keyof typeof disabledActionMessages): string {
  return disabledActionMessages[action] || disabledActionMessages.general;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const appConfig = {
  isApiDisabled,
  isReadOnly,
  deploymentMode,
  api: apiConfig,
  features: featureFlags,
  messages: {
    banner: READ_ONLY_BANNER_MESSAGE,
    bannerDescription: READ_ONLY_BANNER_DESCRIPTION,
    disabled: disabledActionMessages,
  },
  isActionAllowed,
  getDisabledMessage,
  logConfigState,
} as const;

export default appConfig;
