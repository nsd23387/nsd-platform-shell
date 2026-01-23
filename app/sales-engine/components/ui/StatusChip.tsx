'use client';

import type { CampaignStatus } from '../../types/campaign';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { STATUS_COPY, getStatusCopy, type CampaignStatusKey } from '../../lib/status-copy';

/**
 * Status configuration for campaign states.
 * 
 * USES CANONICAL STATUS COPY from lib/status-copy.ts
 * 
 * GOVERNANCE STATUS LABELS (campaign.status):
 * - DRAFT: "Draft"
 * - PENDING_REVIEW: "Pending Approval"
 * - RUNNABLE: "Approved"
 * - RUNNING: "Running" (governance state, not execution)
 * - COMPLETED: "Completed"
 * - STOPPED: "Stopped" (human/safety halt)
 * - FAILED: "Failed" (system error)
 * - ARCHIVED: "Archived"
 */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; pulse?: boolean }> = {
  // Campaign governance states - using canonical copy
  DRAFT: { label: STATUS_COPY.DRAFT.label, ...STATUS_COPY.DRAFT.color },
  PENDING_REVIEW: { label: STATUS_COPY.PENDING_REVIEW.label, ...STATUS_COPY.PENDING_REVIEW.color },
  RUNNABLE: { label: STATUS_COPY.RUNNABLE.label, ...STATUS_COPY.RUNNABLE.color },
  RUNNING: { label: STATUS_COPY.RUNNING.label, ...STATUS_COPY.RUNNING.color, pulse: true },
  COMPLETED: { label: STATUS_COPY.COMPLETED.label, ...STATUS_COPY.COMPLETED.color },
  STOPPED: { label: STATUS_COPY.STOPPED.label, ...STATUS_COPY.STOPPED.color },
  FAILED: { label: STATUS_COPY.FAILED.label, ...STATUS_COPY.FAILED.color },
  ARCHIVED: { label: STATUS_COPY.ARCHIVED.label, ...STATUS_COPY.ARCHIVED.color },
  
  // Run status labels (legacy compatibility)
  PARTIAL: { label: 'Partial', ...NSD_COLORS.semantic.attention },
  
  // Execution status labels (for run status, not governance)
  queued: { 
    label: 'Queued', 
    ...NSD_COLORS.semantic.info,
    pulse: true,
  },
  run_requested: { 
    label: 'Queued', 
    ...NSD_COLORS.semantic.info,
    pulse: true,
  },
  running: { 
    label: 'Running', 
    ...NSD_COLORS.semantic.active,
    pulse: true,
  },
  completed: { 
    label: 'Completed', 
    ...NSD_COLORS.semantic.positive,
  },
  stopped: {
    label: 'Stopped',
    ...NSD_COLORS.semantic.attention,
  },
  failed: { 
    label: 'Failed', 
    ...NSD_COLORS.semantic.critical,
  },
  invariant_violation: {
    label: 'Error',
    ...NSD_COLORS.semantic.critical,
  },
  blocked: { 
    label: 'Blocked', 
    ...NSD_COLORS.semantic.critical,
  },
  awaiting_approvals: { 
    label: 'Awaiting Approvals', 
    ...NSD_COLORS.semantic.attention,
  },
  idle: { 
    label: 'Ready', 
    ...NSD_COLORS.semantic.muted,
  },
};

interface StatusChipProps {
  status: CampaignStatus | string;
  size?: 'sm' | 'md';
  /** Optional custom label override */
  label?: string;
  /** Show pulse animation (auto-detected for queued/running states) */
  showPulse?: boolean;
}

/**
 * StatusChip - Displays campaign or run status.
 * 
 * Supports the queued → cron execution model with:
 * - Explicit status labels for queued, running, completed, failed, blocked
 * - Subtle pulse animation for queued and running states
 * - Read-only display (no execution controls)
 */
export function StatusChip({ status, size = 'md', label, showPulse }: StatusChipProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  const displayLabel = label || config.label;
  const shouldPulse = showPulse !== undefined ? showPulse : config.pulse;
  
  const sizeStyles = {
    sm: { padding: '4px 10px', fontSize: '11px' },
    md: { padding: '5px 14px', fontSize: '12px' },
  };
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...sizeStyles[size],
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: NSD_RADIUS.sm,
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        // Pulse animation for queued/running states
        ...(shouldPulse && {
          animation: 'statusPulse 2s ease-in-out infinite',
        }),
      }}
      title={`Status: ${displayLabel}`}
    >
      {/* Pulse indicator dot for active states */}
      {shouldPulse && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: config.text,
            opacity: 0.8,
            animation: 'pulseGlow 1.5s ease-in-out infinite',
          }}
        />
      )}
      {displayLabel}
      <style jsx>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </span>
  );
}
