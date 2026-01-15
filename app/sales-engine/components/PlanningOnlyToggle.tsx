/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This UI only mutates configuration via nsd-sales-engine.
 *
 * PlanningOnlyToggle Component
 * ============================
 *
 * Allows toggling the planning-only (benchmarks_only) flag for existing campaigns.
 * All changes are persisted via nsd-sales-engine, NOT directly to the database.
 *
 * GUARDRAILS:
 * - No writes to ODS
 * - No calls to execution endpoints
 * - No activity.events usage
 * - Optimistic UI with revert on failure
 */

'use client';

import { useState, useCallback } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';
import { Icon } from '../../../design/components/Icon';

interface PlanningOnlyToggleProps {
  /** Campaign ID */
  campaignId: string;
  /** Current planning-only state (from campaign.sourcing_config.benchmarks_only) */
  isPlanningOnly: boolean;
  /** Callback when state changes (for parent to update campaign state) */
  onStateChange?: (newState: boolean) => void;
  /** Whether the campaign can be modified (e.g., not completed/archived) */
  canModify?: boolean;
}

/**
 * Update sourcing config via the proxy endpoint.
 * This is the ONLY way platform-shell should modify campaign config.
 *
 * Calls: PATCH /api/campaign-config
 * Which proxies to: PATCH ${SALES_ENGINE_URL}/api/v1/campaigns/:id/sourcing-config
 */
async function updateSourcingConfig(
  campaignId: string,
  benchmarksOnly: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/campaign-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        sourcing_config: {
          benchmarks_only: benchmarksOnly,
        },
      }),
    });

    if (response.ok) {
      return { success: true };
    }

    const data = await response.json().catch(() => ({}));

    // Handle specific error codes
    if (response.status === 409) {
      return {
        success: false,
        error: data.message || 'Campaign cannot be modified in its current state',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        error: 'Campaign not found',
      };
    }

    if (response.status >= 500) {
      return {
        success: false,
        error: 'Configuration service unavailable. Please try again.',
      };
    }

    return {
      success: false,
      error: data.message || 'Failed to update configuration',
    };
  } catch (error) {
    console.error('[PlanningOnlyToggle] Update failed:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection.',
    };
  }
}

/**
 * PlanningOnlyToggle - Toggle for campaign planning-only mode.
 *
 * Features:
 * - Optimistic UI (immediate visual feedback)
 * - Revert on failure with error message
 * - Help text explaining the feature
 * - Disabled state when campaign cannot be modified
 */
export function PlanningOnlyToggle({
  campaignId,
  isPlanningOnly,
  onStateChange,
  canModify = true,
}: PlanningOnlyToggleProps) {
  // Local state for optimistic UI
  const [localState, setLocalState] = useState(isPlanningOnly);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * Handle toggle change.
   * Uses optimistic UI: update immediately, revert on failure.
   */
  const handleToggle = useCallback(
    async (newValue: boolean) => {
      if (isUpdating || !canModify) return;

      // Clear previous messages
      setError(null);
      setSuccessMessage(null);

      // Optimistic update
      const previousValue = localState;
      setLocalState(newValue);
      setIsUpdating(true);

      // Call proxy endpoint
      const result = await updateSourcingConfig(campaignId, newValue);

      setIsUpdating(false);

      if (result.success) {
        // Success - notify parent
        setSuccessMessage(
          newValue
            ? 'Campaign set to planning-only mode'
            : 'Campaign enabled for execution'
        );
        onStateChange?.(newValue);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        // Failure - revert optimistic update
        setLocalState(previousValue);
        setError(result.error || 'Failed to update');
      }
    },
    [campaignId, localState, isUpdating, canModify, onStateChange]
  );

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: '20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <Icon name="edit" size={18} color={NSD_COLORS.text.secondary} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.primary,
          }}
        >
          Execution Mode
        </h4>
      </div>

      {/* Help text */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '13px',
          color: NSD_COLORS.text.muted,
          lineHeight: 1.5,
        }}
      >
        Planning-only mode controls whether live sourcing is enabled.
        Planning-only campaigns cannot be executed.
      </p>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: NSD_COLORS.semantic.critical.bg,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="warning" size={16} color={NSD_COLORS.semantic.critical.text} />
          <span
            style={{
              fontSize: '13px',
              color: NSD_COLORS.semantic.critical.text,
            }}
          >
            {error}
          </span>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: NSD_COLORS.semantic.positive.bg,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Icon name="check" size={16} color={NSD_COLORS.semantic.positive.text} />
          <span
            style={{
              fontSize: '13px',
              color: NSD_COLORS.semantic.positive.text,
            }}
          >
            {successMessage}
          </span>
        </div>
      )}

      {/* Toggle options */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Executable option */}
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: canModify && !isUpdating ? 'pointer' : 'not-allowed',
            padding: '12px 14px',
            borderRadius: NSD_RADIUS.md,
            border: `2px solid ${
              !localState ? NSD_COLORS.secondary : NSD_COLORS.border.light
            }`,
            backgroundColor: !localState ? '#EEF2FF' : NSD_COLORS.background,
            opacity: canModify && !isUpdating ? 1 : 0.6,
            transition: 'all 0.2s',
          }}
        >
          <input
            type="radio"
            name={`planning-only-${campaignId}`}
            checked={!localState}
            onChange={() => handleToggle(false)}
            disabled={!canModify || isUpdating}
            style={{
              accentColor: NSD_COLORS.secondary,
              width: '16px',
              height: '16px',
            }}
          />
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: NSD_COLORS.text.primary,
              }}
            >
              Executable
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
                marginTop: '2px',
              }}
            >
              Can be launched
            </span>
          </div>
        </label>

        {/* Planning-only option */}
        <label
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: canModify && !isUpdating ? 'pointer' : 'not-allowed',
            padding: '12px 14px',
            borderRadius: NSD_RADIUS.md,
            border: `2px solid ${
              localState
                ? NSD_COLORS.semantic.attention.border
                : NSD_COLORS.border.light
            }`,
            backgroundColor: localState
              ? NSD_COLORS.semantic.attention.bg
              : NSD_COLORS.background,
            opacity: canModify && !isUpdating ? 1 : 0.6,
            transition: 'all 0.2s',
          }}
        >
          <input
            type="radio"
            name={`planning-only-${campaignId}`}
            checked={localState}
            onChange={() => handleToggle(true)}
            disabled={!canModify || isUpdating}
            style={{
              accentColor: NSD_COLORS.semantic.attention.text,
              width: '16px',
              height: '16px',
            }}
          />
          <div>
            <span
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: NSD_COLORS.text.primary,
              }}
            >
              Planning Only
            </span>
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
                marginTop: '2px',
              }}
            >
              Forecasting only
            </span>
          </div>
        </label>
      </div>

      {/* Loading indicator */}
      {isUpdating && (
        <p
          style={{
            margin: '12px 0 0 0',
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          Saving...
        </p>
      )}

      {/* Cannot modify notice */}
      {!canModify && (
        <p
          style={{
            margin: '12px 0 0 0',
            fontSize: '12px',
            color: NSD_COLORS.semantic.attention.text,
            fontStyle: 'italic',
          }}
        >
          This campaign cannot be modified in its current state.
        </p>
      )}

      {/* Footer note */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}
        >
          Changes are saved to nsd-sales-engine. Platform-shell does not write
          directly to the database.
        </p>
      </div>
    </div>
  );
}

export default PlanningOnlyToggle;
