/**
 * EXECUTION CONTRACT NOTE:
 * platform-shell does NOT execute campaigns.
 * This code is read-only and depends on nsd-sales-engine
 * as the sole execution authority.
 *
 * This component displays the latest campaign run status
 * using Sales Engine's canonical read model.
 *
 * NO inference. NO aggregation. NO execution logic.
 * Only renders exact data from GET /api/v1/campaigns/:id/runs/latest
 *
 * UX Copy:
 * - Queued: "Campaign queued for execution"
 * - Running: "Campaign is currently running"
 * - Completed: "Last run completed successfully"
 * - Failed: "Last run failed"
 * - No runs: "This campaign has not been executed yet"
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { useLatestRunStatus, type LatestRun } from '../../../../hooks/useLatestRunStatus';

interface LatestRunStatusCardProps {
  campaignId: string;
}

/**
 * Status display configuration.
 */
interface StatusDisplay {
  icon: 'clock' | 'refresh' | 'check' | 'warning' | 'info';
  label: string;
  copy: string;
  bg: string;
  text: string;
  border: string;
}

/**
 * Get display configuration for run status.
 * Uses exact UX copy from specification.
 */
function getStatusDisplay(status: string): StatusDisplay {
  switch (status.toLowerCase()) {
    case 'queued':
    case 'run_requested':
    case 'pending':
      return {
        icon: 'clock',
        label: 'Queued',
        copy: 'Campaign queued for execution',
        ...NSD_COLORS.semantic.info,
      };
    case 'running':
    case 'in_progress':
      return {
        icon: 'refresh',
        label: 'Running',
        copy: 'Campaign is currently running',
        ...NSD_COLORS.semantic.active,
      };
    case 'completed':
    case 'success':
      return {
        icon: 'check',
        label: 'Completed',
        copy: 'Last run completed successfully',
        ...NSD_COLORS.semantic.positive,
      };
    case 'failed':
    case 'error':
      return {
        icon: 'warning',
        label: 'Failed',
        copy: 'Last run failed',
        ...NSD_COLORS.semantic.critical,
      };
    case 'partial':
    case 'partial_success':
      return {
        icon: 'warning',
        label: 'Partial',
        copy: 'Last run partially completed',
        ...NSD_COLORS.semantic.attention,
      };
    default:
      return {
        icon: 'info',
        label: status,
        copy: `Status: ${status}`,
        ...NSD_COLORS.semantic.muted,
      };
  }
}

/**
 * Format date for display.
 */
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * RunDetailsCard - Displays run data.
 * Only renders exact fields from the API response.
 */
function RunDetailsCard({ run }: { run: LatestRun }) {
  const display = getStatusDisplay(run.status);

  return (
    <div
      style={{
        backgroundColor: display.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${display.border}`,
        padding: '20px 24px',
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
        <Icon name={display.icon} size={20} color={display.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: display.text,
          }}
        >
          Latest Run Status
        </h4>
        <span
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            backgroundColor: `${display.text}15`,
            borderRadius: NSD_RADIUS.sm,
            fontSize: '12px',
            fontWeight: 600,
            color: display.text,
          }}
        >
          {display.label}
        </span>
      </div>

      {/* Status copy */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: display.text,
        }}
      >
        {display.copy}
      </p>

      {/* Run details - exact fields only */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          padding: '12px 0',
          borderTop: `1px solid ${display.border}`,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: display.text,
              opacity: 0.7,
            }}
          >
            Run ID
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: display.text,
            }}
          >
            {run.run_id.slice(0, 8)}...
          </p>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: display.text,
              opacity: 0.7,
            }}
          >
            Execution Mode
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: display.text,
            }}
          >
            {run.execution_mode || 'N/A'}
          </p>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: display.text,
              opacity: 0.7,
            }}
          >
            Created
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: display.text,
            }}
          >
            {formatDate(run.created_at)}
          </p>
        </div>

        <div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: display.text,
              opacity: 0.7,
            }}
          >
            Updated
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '13px',
              color: display.text,
            }}
          >
            {formatDate(run.updated_at)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${display.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: display.text,
            opacity: 0.6,
            fontStyle: 'italic',
          }}
        >
          Read-only data from Sales Engine. Single fetch on page load.
        </p>
      </div>
    </div>
  );
}

/**
 * NoRunsCard - Displays when no runs exist.
 */
function NoRunsCard() {
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.semantic.muted.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.semantic.muted.border}`,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px',
        }}
      >
        <Icon name="info" size={20} color={NSD_COLORS.semantic.muted.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.semantic.muted.text,
          }}
        >
          Latest Run Status
        </h4>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          color: NSD_COLORS.semantic.muted.text,
        }}
      >
        This campaign has not been executed yet
      </p>
    </div>
  );
}

/**
 * ErrorCard - Displays error states.
 */
function ErrorCard({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.semantic.critical.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '8px',
        }}
      >
        <Icon name="warning" size={20} color={NSD_COLORS.semantic.critical.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.semantic.critical.text,
          }}
        >
          Latest Run Status
        </h4>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          color: NSD_COLORS.semantic.critical.text,
        }}
      >
        {message}
      </p>
    </div>
  );
}

/**
 * LoadingCard - Displays loading state.
 */
function LoadingCard() {
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: `2px solid ${NSD_COLORS.border.light}`,
            borderTopColor: NSD_COLORS.secondary,
            animation: 'spin 1s linear infinite',
          }}
        />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.secondary,
          }}
        >
          Loading run status...
        </h4>
      </div>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * LatestRunStatusCard - Main component.
 *
 * Displays the latest campaign run state using Sales Engine's canonical read model.
 * - 200: Show run status
 * - 204: "No runs yet"
 * - 404: "Campaign not found"
 * - 5xx: "Execution service unavailable"
 */
export function LatestRunStatusCard({ campaignId }: LatestRunStatusCardProps) {
  const { run, noRuns, notFound, serviceUnavailable, loading, error } =
    useLatestRunStatus(campaignId);

  // Loading state
  if (loading) {
    return <LoadingCard />;
  }

  // Error states
  if (notFound) {
    return <ErrorCard message="Campaign not found" />;
  }

  if (serviceUnavailable) {
    return <ErrorCard message="Execution service unavailable" />;
  }

  if (error && !run && !noRuns) {
    return <ErrorCard message={error} />;
  }

  // No runs yet
  if (noRuns) {
    return <NoRunsCard />;
  }

  // Display run status
  if (run) {
    return <RunDetailsCard run={run} />;
  }

  // Fallback
  return <NoRunsCard />;
}

export default LatestRunStatusCard;
