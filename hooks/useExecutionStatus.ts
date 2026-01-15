/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This hook provides the execution contract validation status
 * to UI components so they can enable/disable execution controls.
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Execution status from the contract validation.
 */
export interface ExecutionStatus {
  /** Whether execution is supported (contract valid) */
  executionSupported: boolean;
  /** Reason for failure (if not supported) */
  reason?: string;
  /** Timestamp of validation */
  validatedAt?: string;
  /** Whether the status is still loading */
  loading: boolean;
  /** Error message if fetch failed */
  error?: string;
}

// Cache the result to avoid repeated fetches
let cachedStatus: Omit<ExecutionStatus, 'loading'> | null = null;

/**
 * Hook to get execution contract status.
 *
 * This hook:
 * - Fetches /api/execution-status once
 * - Caches the result
 * - Never throws
 * - Returns safe defaults while loading
 *
 * Usage:
 * ```tsx
 * const { executionSupported, loading } = useExecutionStatus();
 *
 * if (!executionSupported) {
 *   // Disable Run Campaign button
 * }
 * ```
 */
export function useExecutionStatus(): ExecutionStatus {
  const [status, setStatus] = useState<ExecutionStatus>(() => {
    // Return cached status if available
    if (cachedStatus !== null) {
      return { ...cachedStatus, loading: false };
    }
    // Default to not supported while loading (safe default)
    return {
      executionSupported: false,
      loading: true,
    };
  });

  useEffect(() => {
    // Skip if already cached
    if (cachedStatus !== null) {
      return;
    }

    // Fetch execution status
    async function fetchStatus() {
      try {
        const response = await fetch('/api/execution-status');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        cachedStatus = {
          executionSupported: data.executionSupported ?? false,
          reason: data.reason,
          validatedAt: data.validatedAt,
        };

        setStatus({ ...cachedStatus, loading: false });
      } catch (error) {
        // Don't crash - just log and disable execution
        console.warn(
          '[useExecutionStatus] Failed to fetch execution status:',
          error
        );

        cachedStatus = {
          executionSupported: false,
          reason: 'Failed to validate execution contract',
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        setStatus({ ...cachedStatus, loading: false });
      }
    }

    fetchStatus();
  }, []);

  return status;
}

/**
 * Get cached execution status synchronously.
 * Returns null if status hasn't been fetched yet.
 *
 * Useful for non-React contexts.
 */
export function getCachedExecutionStatus(): Omit<
  ExecutionStatus,
  'loading'
> | null {
  return cachedStatus;
}

/**
 * Reset cached status (for testing only).
 * @internal
 */
export function resetExecutionStatusCache(): void {
  cachedStatus = null;
}
