/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ⚠️ EXECUTION DISABLED — PERMANENT GUARD
 *
 * Platform-shell is NOT an execution engine.
 * All campaign execution must occur in nsd-sales-engine
 * via queue-first, cron-adopted runs with durable intent.
 *
 * This guard is intentional and permanent.
 *
 * WHAT THIS FILE DOES:
 * - Exports a blocked processCampaign() function that returns an error
 * - Exports isRuntimeReady() which always returns false
 * - Preserves type exports for API compatibility
 *
 * WHAT THIS FILE DOES NOT DO:
 * - Generate run IDs
 * - Emit run.started / run.running / run.completed events
 * - Execute pipeline stages
 * - Write to activity.events
 * - Act as execution authority
 *
 * ARCHITECTURE:
 * Platform-shell acts ONLY as:
 * - UI rendering layer
 * - Validation layer
 * - Adapter to canonical execution (nsd-sales-engine)
 *
 * All execution requests must be forwarded to nsd-sales-engine,
 * which creates durable campaign_runs records that are adopted
 * by the cron-based execution system.
 *
 * See nsd-sales-engine for execution logic.
 */

// ============================================================================
// Types (preserved for API compatibility)
// ============================================================================

export interface ProcessCampaignOptions {
  triggeredBy: 'platform-shell' | 'scheduler' | 'manual';
}

/**
 * Blocked execution response.
 * Returned when execution is attempted in platform-shell.
 */
export interface BlockedExecutionResponse {
  status: 'blocked';
  reason: 'PLATFORM_SHELL_EXECUTION_DISABLED';
  message: string;
  campaignId: string;
}

/**
 * Legacy response type (for compatibility).
 * @deprecated Execution is disabled. This type exists only for backward compatibility.
 */
export interface ExecutionResponse {
  run_id?: string;
  status: string;
  reason?: string;
  message?: string;
  campaignId?: string;
}

// ============================================================================
// Execution Guard — Hard Disable
// ============================================================================

/**
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 *
 * ⚠️ EXECUTION DISABLED
 *
 * This function does NOT:
 * - Generate run IDs
 * - Emit any activity.events
 * - Execute pipeline logic
 * - Create campaign_runs
 *
 * Instead, it returns a structured blocked response.
 *
 * @param campaignId - The campaign UUID (logged but not executed)
 * @param _options - Execution options (ignored)
 * @returns A blocked response with reason PLATFORM_SHELL_EXECUTION_DISABLED
 */
export async function processCampaign(
  campaignId: string,
  _options: ProcessCampaignOptions
): Promise<BlockedExecutionResponse> {
  console.warn(
    `[runtime] ⚠️ EXECUTION BLOCKED: processCampaign called for ${campaignId}. ` +
    `Platform-shell is NOT an execution engine. ` +
    `All execution must occur via nsd-sales-engine.`
  );

  // Return blocked response — NO execution occurs
  return {
    status: 'blocked',
    reason: 'PLATFORM_SHELL_EXECUTION_DISABLED',
    message: 'Execution is disabled in platform-shell. All campaign execution must occur via nsd-sales-engine.',
    campaignId,
  };
}

// ============================================================================
// Runtime Readiness — Always False
// ============================================================================

/**
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 *
 * Check if the runtime is ready for execution.
 *
 * ⚠️ ALWAYS RETURNS FALSE
 *
 * Platform-shell is not an execution runtime.
 * This function exists for API compatibility but always returns false
 * to prevent any execution code paths from being triggered.
 *
 * @returns false — Execution is permanently disabled
 */
export function isRuntimeReady(): boolean {
  // Execution is permanently disabled in platform-shell
  return false;
}

// ============================================================================
// Deprecated Exports — Preserved for Compatibility
// ============================================================================

/**
 * @deprecated Pipeline context is not used. Execution is disabled.
 */
export interface PipelineContext {
  runId: string;
  campaignId: string;
  triggeredBy: string;
  startedAt: string;
  currentStage: string;
  counters: {
    orgsSourced: number;
    contactsDiscovered: number;
    contactsEvaluated: number;
    leadsPromoted: number;
  };
}
