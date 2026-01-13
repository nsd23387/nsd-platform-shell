/**
 * Application Configuration
 * 
 * Centralized configuration module for environment variable gating.
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
 * Current deployment mode.
 * Used for logging and debugging only.
 */
export const deploymentMode: 'production' | 'preview' | 'development' = 
  process.env.NODE_ENV === 'production' 
    ? (process.env.VERCEL_ENV === 'preview' ? 'preview' : 'production')
    : 'development';

// =============================================================================
// API CONFIGURATION
// =============================================================================

/**
 * Base URLs for API endpoints.
 */
export const apiConfig = {
  /** Sales Engine M60 API base URL (client-side) */
  salesEngineApi: process.env.NEXT_PUBLIC_SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns',
  
  /** Sales Engine M60 API base URL (server-side) */
  salesEngineApiServer: process.env.SALES_ENGINE_API_BASE_URL || '/api/v1/campaigns',
  
  /**
   * Sales Engine Execution URL (nsd-sales-engine)
   * 
   * NOTE:
   * Campaign execution is owned by nsd-sales-engine.
   * platform-shell must never execute or simulate runs.
   * This URL is the canonical endpoint for execution intent.
   */
  salesEngineExecutionUrl: process.env.NEXT_PUBLIC_SALES_ENGINE_URL || '',
  
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
 * Feature flags for execution control.
 * Actions are enabled when API is not disabled.
 */
export const featureFlags = {
  /** Can create campaigns */
  canCreateCampaign: !isApiDisabled,
  
  /** Can execute/run campaigns */
  canExecuteCampaign: !isApiDisabled,
  
  /** Can approve campaigns */
  canApproveCampaign: !isApiDisabled,
  
  /** Can submit campaigns for review */
  canSubmitCampaign: !isApiDisabled,
  
  /** Can start campaign runs */
  canStartRun: !isApiDisabled,
  
  /** Can reset campaigns */
  canResetCampaign: !isApiDisabled,
  
  /** API calls are enabled */
  apiEnabled: !isApiDisabled,
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
    deploymentMode,
    featureFlags,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const appConfig = {
  isApiDisabled,
  deploymentMode,
  api: apiConfig,
  features: featureFlags,
  logConfigState,
} as const;

export default appConfig;
