'use client';

/**
 * LatestRunStatusCardENM Component
 * 
 * ENM-GOVERNED: Displays the latest campaign run status using ExecutionNarrative only.
 * 
 * GOVERNANCE LOCK:
 * - This component consumes ONLY ExecutionNarrative output
 * - NO access to raw campaign_runs, status, timestamps, or events
 * - NO state derivation or interpretation logic
 * - Pure presentation of ENM-provided data
 * 
 * This component replaces LatestRunStatusCard for ENM-compliant usage.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { ExecutionNarrative } from '../../lib/execution-narrative-mapper';
import { 
  narrativeToHealthLevel,
  narrativeToIcon,
  EXECUTION_COPY,
  type ExecutionNarrativeWithLoadingProps 
} from '../../lib/execution-narrative-governance';

interface LatestRunStatusCardENMProps extends ExecutionNarrativeWithLoadingProps {
  runId?: string;
}

function getColorsByLevel(level: 'success' | 'warning' | 'error' | 'info' | 'neutral') {
  switch (level) {
    case 'success':
      return NSD_COLORS.semantic.positive;
    case 'warning':
      return NSD_COLORS.semantic.attention;
    case 'error':
      return NSD_COLORS.semantic.critical;
    case 'info':
      return NSD_COLORS.semantic.info;
    default:
      return NSD_COLORS.semantic.muted;
  }
}

const MODE_LABELS = {
  idle: 'Idle',
  queued: 'Queued',
  running: 'Running',
  stalled: 'Stalled',
  completed: 'Completed',
  failed: 'Failed',
} as const;

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
 * LatestRunStatusCardENM
 * 
 * Displays run status using ONLY ExecutionNarrative.
 */
export function LatestRunStatusCardENM({
  narrative,
  isLoading = false,
  error,
  runId,
}: LatestRunStatusCardENMProps) {
  if (isLoading) {
    return <LoadingCard />;
  }

  if (error) {
    return <ErrorCard message={error} />;
  }

  if (!narrative) {
    return <ErrorCard message="No narrative data available" />;
  }

  const level = narrativeToHealthLevel(narrative);
  const icon = narrativeToIcon(narrative);
  const colors = getColorsByLevel(level);
  
  let label: string;
  if (narrative.isStalled) {
    label = MODE_LABELS.stalled;
  } else if (narrative.terminal?.status === 'failed') {
    label = MODE_LABELS.failed;
  } else if (narrative.terminal?.status === 'completed') {
    label = MODE_LABELS.completed;
  } else {
    label = MODE_LABELS[narrative.mode as keyof typeof MODE_LABELS] || 'Unknown';
  }

  return (
    <div
      style={{
        backgroundColor: colors.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${colors.border}`,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
        }}
      >
        <Icon name={icon} size={20} color={colors.text} />
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: colors.text,
          }}
        >
          Latest Run Status
        </h4>
        <span
          style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            backgroundColor: `${colors.text}15`,
            borderRadius: NSD_RADIUS.sm,
            fontSize: '12px',
            fontWeight: 600,
            color: colors.text,
          }}
        >
          {label}
        </span>
      </div>

      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 500,
          color: colors.text,
        }}
      >
        {narrative.headline}
      </p>

      {narrative.subheadline && (
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: '13px',
            color: colors.text,
            opacity: 0.85,
          }}
        >
          {narrative.subheadline}
        </p>
      )}

      {runId && (
        <div
          style={{
            padding: '12px 0',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: colors.text,
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
              color: colors.text,
            }}
          >
            {runId.slice(0, 8)}...
          </p>
        </div>
      )}

      {narrative.trustNote && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: colors.text,
              opacity: 0.6,
              fontStyle: 'italic',
            }}
          >
            {narrative.trustNote}
          </p>
        </div>
      )}
    </div>
  );
}

export default LatestRunStatusCardENM;
