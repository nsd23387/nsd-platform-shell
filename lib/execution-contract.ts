/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This module validates that Sales Engine supports queue-first execution
 * before enabling any execution-related UI.
 */

/**
 * Expected execution contract from Sales Engine.
 * This is the authoritative shape we validate against.
 */
interface ExecutionContract {
  execution?: {
    enqueue?: string;
    mode?: string;
    synchronous_execution?: boolean;
  };
}

/**
 * Result of execution contract validation.
 */
export interface ExecutionContractValidation {
  /** Whether execution is supported (contract valid) */
  supported: boolean;
  /** Reason for failure (if not supported) */
  reason?: string;
  /** Timestamp of validation */
  validatedAt: string;
}

// Singleton to store validation result (immutable after first check)
let cachedValidation: ExecutionContractValidation | null = null;

/**
 * Validate the Sales Engine execution contract.
 *
 * This function:
 * - Calls GET ${SALES_ENGINE_URL}/api/meta/routes
 * - Validates queue-first execution support
 * - Caches the result (immutable at runtime)
 * - Never throws (returns unsupported on error)
 *
 * @returns ExecutionContractValidation result
 */
export async function validateExecutionContract(): Promise<ExecutionContractValidation> {
  // Return cached result if already validated
  if (cachedValidation !== null) {
    return cachedValidation;
  }

  const validatedAt = new Date().toISOString();

  // Get Sales Engine URL from server-side env
  const SALES_ENGINE_URL = process.env.SALES_ENGINE_URL;

  if (!SALES_ENGINE_URL) {
    console.warn(
      '[execution-contract] SALES_ENGINE_URL not configured. Disabling execution UI.'
    );
    cachedValidation = {
      supported: false,
      reason: 'SALES_ENGINE_URL not configured',
      validatedAt,
    };
    return cachedValidation;
  }

  try {
    // Call Sales Engine route introspection endpoint
    const response = await fetch(`${SALES_ENGINE_URL}/api/meta/routes`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Short timeout - don't block startup
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(
        `[execution-contract] Sales Engine /api/meta/routes returned ${response.status}. Disabling execution UI.`
      );
      cachedValidation = {
        supported: false,
        reason: `Sales Engine returned ${response.status}`,
        validatedAt,
      };
      return cachedValidation;
    }

    const data: ExecutionContract = await response.json();

    // Validate execution contract requirements
    const validation = validateContract(data);

    if (!validation.supported) {
      console.warn(
        `[execution-contract] Sales Engine does not support queue-first execution. Disabling execution UI. Reason: ${validation.reason}`
      );
    } else {
      console.log(
        '[execution-contract] Sales Engine execution contract validated successfully.'
      );
    }

    cachedValidation = {
      ...validation,
      validatedAt,
    };
    return cachedValidation;
  } catch (error) {
    // Network error, timeout, or parse error - don't crash, just disable
    const reason =
      error instanceof Error ? error.message : 'Unknown error';
    console.warn(
      `[execution-contract] Failed to validate Sales Engine contract: ${reason}. Disabling execution UI.`
    );
    cachedValidation = {
      supported: false,
      reason: `Validation failed: ${reason}`,
      validatedAt,
    };
    return cachedValidation;
  }
}

/**
 * Validate the contract data against requirements.
 */
function validateContract(
  data: ExecutionContract
): Pick<ExecutionContractValidation, 'supported' | 'reason'> {
  // Check execution object exists
  if (!data.execution) {
    return {
      supported: false,
      reason: 'Missing execution configuration in contract',
    };
  }

  const { execution } = data;

  // Validate enqueue endpoint
  if (execution.enqueue !== 'POST /api/v1/campaigns/:id/start') {
    return {
      supported: false,
      reason: `Invalid enqueue endpoint: ${execution.enqueue}`,
    };
  }

  // Validate queue-first mode
  if (execution.mode !== 'queue-first') {
    return {
      supported: false,
      reason: `Invalid execution mode: ${execution.mode} (expected queue-first)`,
    };
  }

  // Validate no synchronous execution
  if (execution.synchronous_execution !== false) {
    return {
      supported: false,
      reason: 'Synchronous execution is not disabled',
    };
  }

  return { supported: true };
}

/**
 * Get the cached execution contract validation result.
 * Returns null if validation has not been performed yet.
 *
 * This is safe to call from anywhere - it never performs validation,
 * just returns the cached result.
 */
export function getCachedExecutionContract(): ExecutionContractValidation | null {
  return cachedValidation;
}

/**
 * Check if execution is supported based on cached validation.
 * Returns false if validation hasn't run yet (safe default).
 *
 * IMPORTANT: This is read-only and never triggers validation.
 */
export function isExecutionSupported(): boolean {
  return cachedValidation?.supported ?? false;
}

/**
 * Reset cached validation (for testing only).
 * @internal
 */
export function resetValidationCache(): void {
  cachedValidation = null;
}
