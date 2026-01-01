/**
 * Application Configuration - M67.9-01 Vercel Hosting Setup + M68-02/03 Runtime Gating
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
 * 
 * M68-02 RUNTIME GATING:
 * - canRuntimeExecute() is the SINGLE SOURCE OF TRUTH for runtime permission
 * - Production MUST evaluate false (READ_ONLY=true, API_MODE=disabled)
 * - Preview environments may enable runtime with explicit RUNTIME_ENABLED=true
 * 
 * M68-03 EXECUTION CONFIRMATION:
 * - All runtime actions require explicit user confirmation
 * - Kill switch (RUNTIME_KILL_SWITCH=true) overrides ALL conditions
 * - Confirmation state is local only (no persistence)
 * 
 * SECURITY NOTE:
 * This application is deployed as an internal tool.
 * Access control is handled via HTTP Basic Auth middleware (server-side only).
 * No code assumes a logged-in user.
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
 * Whether runtime is explicitly enabled.
 * This is an opt-in flag for preview environments only.
 * 
 * Set via: NEXT_PUBLIC_RUNTIME_ENABLED=true
 */
export const isRuntimeEnabled = 
  process.env.NEXT_PUBLIC_RUNTIME_ENABLED === 'true';

/**
 * M68-03: Global runtime kill switch.
 * When true, ALL runtime actions are blocked regardless of other conditions.
 * This overrides canRuntimeExecute() and prevents confirmation from proceeding.
 * 
 * Set via: NEXT_PUBLIC_RUNTIME_KILL_SWITCH=true
 */
export const isRuntimeKillSwitchActive = 
  process.env.NEXT_PUBLIC_RUNTIME_KILL_SWITCH === 'true';

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
 * M68-02/03: SINGLE SOURCE OF TRUTH for runtime execution permission.
 * 
 * Returns true ONLY when ALL of the following conditions are met:
 * - NEXT_PUBLIC_RUNTIME_KILL_SWITCH !== "true" (M68-03: kill switch overrides all)
 * - NEXT_PUBLIC_RUNTIME_ENABLED === "true"
 * - NEXT_PUBLIC_READ_ONLY !== "true"
 * - NEXT_PUBLIC_API_MODE !== "disabled"
 * 
 * Production MUST evaluate false because:
 * - READ_ONLY will be true in production
 * - API_MODE will be disabled in production
 * 
 * This function is the ONLY authority for determining if runtime
 * actions (start, approve, reset, run) are permitted.
 * 
 * NOTE: This only checks if runtime is PERMITTED. Actual execution
 * still requires explicit user confirmation (M68-03).
 */
export function canRuntimeExecute(): boolean {
  // M68-03: Kill switch overrides ALL other conditions
  if (isRuntimeKillSwitchActive) {
    return false;
  }
  
  // All three conditions must be satisfied
  const runtimeEnabled = process.env.NEXT_PUBLIC_RUNTIME_ENABLED === 'true';
  const notReadOnly = process.env.NEXT_PUBLIC_READ_ONLY !== 'true';
  const apiEnabled = process.env.NEXT_PUBLIC_API_MODE !== 'disabled';
  
  return runtimeEnabled && notReadOnly && apiEnabled;
}

/**
 * Message shown when runtime is permitted but execution still requires confirmation.
 */
export const RUNTIME_PERMITTED_MESSAGE = 
  'Runtime permitted (Preview only). Execution requires confirmation.';

/**
 * M68-03: Message shown when kill switch is active.
 */
export const KILL_SWITCH_MESSAGE = 
  'Runtime disabled by kill switch. No execution is possible.';

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

/**
 * M68-03: Guard result type for runtime actions.
 */
export type RuntimeGuardResult = {
  allowed: boolean;
  reason: 'kill_switch' | 'not_permitted' | 'requires_confirmation' | 'allowed';
  message: string;
};

/**
 * M68-02/03: Defensive guard for runtime actions.
 * Call this at the start of any handler that could start/approve/reset/run anything.
 * 
 * M68-03 behavior:
 * - If kill switch is active → block immediately
 * - If runtime not permitted → block with explanation
 * - If runtime permitted but not confirmed → require confirmation
 * - If confirmed and kill switch is false → allow continuation
 * 
 * @param actionName - Name of the action being attempted
 * @param isConfirmed - Whether the user has explicitly confirmed the action
 * @returns RuntimeGuardResult with allowed status and reason
 */
export function guardRuntimeAction(actionName: string, isConfirmed: boolean = false): RuntimeGuardResult {
  // M68-03: Kill switch overrides ALL conditions - block immediately
  if (isRuntimeKillSwitchActive) {
    return {
      allowed: false,
      reason: 'kill_switch',
      message: KILL_SWITCH_MESSAGE,
    };
  }
  
  // M68-02: Check if runtime is permitted
  if (!canRuntimeExecute()) {
    return {
      allowed: false,
      reason: 'not_permitted',
      message: `Cannot ${actionName}: Runtime execution is not permitted in this environment.`,
    };
  }
  
  // M68-03: Runtime permitted but requires explicit confirmation
  if (!isConfirmed) {
    return {
      allowed: false,
      reason: 'requires_confirmation',
      message: `${actionName} requires explicit confirmation before proceeding.`,
    };
  }
  
  // All checks passed - allow continuation (still no actual execution logic)
  return {
    allowed: true,
    reason: 'allowed',
    message: `${actionName} confirmed and permitted.`,
  };
}

/**
 * M68-03: Simple guard check (backwards compatible).
 * Returns error message string or null if action is allowed.
 * NOTE: This does NOT check confirmation - use guardRuntimeAction() for full M68-03 compliance.
 */
export function guardRuntimeActionSimple(actionName: string): string | null {
  if (isRuntimeKillSwitchActive) {
    return KILL_SWITCH_MESSAGE;
  }
  if (!canRuntimeExecute()) {
    return `Cannot ${actionName}: Runtime execution is not permitted in this environment.`;
  }
  return null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const appConfig = {
  isApiDisabled,
  isReadOnly,
  isRuntimeEnabled,
  isRuntimeKillSwitchActive,
  deploymentMode,
  api: apiConfig,
  features: featureFlags,
  messages: {
    banner: READ_ONLY_BANNER_MESSAGE,
    bannerDescription: READ_ONLY_BANNER_DESCRIPTION,
    disabled: disabledActionMessages,
    runtimePermitted: RUNTIME_PERMITTED_MESSAGE,
    killSwitch: KILL_SWITCH_MESSAGE,
  },
  canRuntimeExecute,
  isActionAllowed,
  getDisabledMessage,
  guardRuntimeAction,
  guardRuntimeActionSimple,
  logConfigState,
} as const;

export default appConfig;
