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
 * UX Copy (Canonical Messaging Matrix):
 * - Queued: "Execution queued"
 * - Running: "Execution in progress"
 * - Completed: "Last execution completed successfully"
 * - Failed: "Last execution failed"
 * - Stalled: "Execution stalled — system will mark failed"
 * - Idle: "No execution has run yet"
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { useLatestRunStatus, type LatestRun } from '../../../../hooks/useLatestRunStatus';
import { isRunStale, RUN_STALE_THRESHOLD_MS, type ResolvableRun } from '../../lib/resolveActiveRun';

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
 * 
 * STALENESS HANDLING:
 * When isStale=true and status is 'running', display a warning state
 * instead of misleading "Running" indicator.
 */
function getStatusDisplay(status?: string, isStale?: boolean): StatusDisplay {
  const normalized = typeof status === 'string' ? status.toLowerCase() : 'unknown';

  // STALE RUN HANDLING: Running runs older than 30 min are displayed as stalled
  // GOVERNANCE: "stalled" messaging ONLY allowed when status='running' AND >30 min
  if (isStale && (normalized === 'running' || normalized === 'in_progress')) {
    return {
      icon: 'warning',
      label: 'Stalled',
      copy: 'Execution stalled — system will mark failed',
      ...NSD_COLORS.semantic.attention,
    };
  }

  // CANONICAL MESSAGING MATRIX: Use exact messaging from resolveCanonicalRunState
  switch (normalized) {
    case 'queued':
    case 'run_requested':
    case 'pending':
      return {
        icon: 'clock',
        label: 'Queued',
        copy: 'Execution queued',
        ...NSD_COLORS.semantic.info,
      };
    case 'running':
    case 'in_progress':
      return {
        icon: 'refresh',
        label: 'Running',
        copy: 'Execution in progress',
        ...NSD_COLORS.semantic.active,
      };
    case 'completed':
    case 'success':
    case 'succeeded':
      return {
        icon: 'check',
        label: 'Completed',
        copy: 'Last execution completed successfully',
        ...NSD_COLORS.semantic.positive,
      };
    case 'failed':
    case 'error':
      return {
        icon: 'warning',
        label: 'Failed',
        copy: 'Last execution failed',
        ...NSD_COLORS.semantic.critical,
      };
    case 'partial':
    case 'partial_success':
      return {
        icon: 'warning',
        label: 'Partial',
        copy: 'Last execution partially completed',
        ...NSD_COLORS.semantic.attention,
      };
    case 'no_runs':
      return {
        icon: 'info',
        label: 'Idle',
        copy: 'No execution has run yet',
        ...NSD_COLORS.semantic.muted,
      };
    default:
      return {
        icon: 'info',
        label: typeof status === 'string' ? status : 'Unknown',
        copy: `Status: ${typeof status === 'string' ? status : 'Unknown'}`,
        ...NSD_COLORS.semantic.muted,
      };
  }
}

/**
 * Format date for display.
 */
function formatDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Convert LatestRun to ResolvableRun for staleness check.
 */
function toResolvableRun(run: LatestRun): ResolvableRun {
  return {
    id: run.run_id,
    status: run.status || '',
    started_at: run.created_at, // API uses created_at as start time
    created_at: run.created_at,
    updated_at: run.updated_at,
  };
}

/**
 * RunDetailsCard - Displays run data.
 * Only renders exact fields from the API response.
 * 
 * STALENESS HANDLING:
 * Checks if the run is stale (running > 30 min) and displays
 * appropriate warning messaging instead of "Running" indicator.
 */
function RunDetailsCard({ run }: { run: LatestRun }) {
  const resolvable = toResolvableRun(run);
  const stale = isRunStale(resolvable);
  const display = getStatusDisplay(run?.status, stale);
  // Runtime safety: `run` payload may be missing fields (or be absent) depending on API response.
  // Guard all string slicing to prevent client-side exceptions.
  const rawRunId = (run as unknown as { run_id?: unknown; id?: unknown })?.run_id ?? (run as unknown as { id?: unknown })?.id;
  const runId = typeof rawRunId === 'string' ? rawRunId : undefined;

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
            {runId ? `${runId.slice(0, 8)}...` : '—'}
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
            {typeof run.execution_mode === 'string' && run.execution_mode.length > 0
              ? run.execution_mode
              : '—'}
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
  // Runtime safety: backend now returns 200 { status: "no_runs" } (no run payload),
  // and older hook versions may map that into a `run` object with missing fields.
  if (noRuns || run?.status?.toLowerCase?.() === 'no_runs') {
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
