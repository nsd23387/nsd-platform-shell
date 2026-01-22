'use client';

import type { CampaignStatus } from '../../types/campaign';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, EXECUTION_STATUS_LABELS } from '../../lib/design-tokens';

/**
 * Status configuration for campaign states.
 * 
 * EXECUTION STATUS MAPPING (queued → cron model):
 * - queued/run_requested: "Queued – execution will start shortly"
 * - running: "Running – sourcing organizations" (or current stage)
 * - completed: "Completed – results available"
 * - failed: "Failed – see timeline for details"
 * - blocked: "Blocked – see reason"
 */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; pulse?: boolean }> = {
  // Campaign lifecycle states
  DRAFT: { label: 'Draft', ...NSD_COLORS.status.draft },
  PENDING_REVIEW: { label: 'Pending Approval', ...NSD_COLORS.status.pendingReview },
  RUNNABLE: { label: 'Approved', ...NSD_COLORS.status.approvedReady },
  RUNNING: { label: 'Running', ...NSD_COLORS.status.running },
  COMPLETED: { label: 'Completed', ...NSD_COLORS.status.completed },
  FAILED: { label: 'Failed', ...NSD_COLORS.status.failed },
  ARCHIVED: { label: 'Archived', ...NSD_COLORS.status.archived },
  
  // Run status labels
  PARTIAL: { label: 'Partial', ...NSD_COLORS.semantic.attention },
  
  // Execution status labels (queued → cron model)
  queued: { 
    label: 'Queued – starting shortly', 
    ...NSD_COLORS.semantic.info,
    pulse: true,  // Indicates this status should show pulse animation
  },
  run_requested: { 
    label: 'Queued – starting shortly', 
    ...NSD_COLORS.semantic.info,
    pulse: true,
  },
  running: { 
    label: 'Running', 
    ...NSD_COLORS.semantic.active,
    pulse: true,
  },
  completed: { 
    label: 'Completed – results available', 
    ...NSD_COLORS.semantic.positive,
  },
  failed: { 
    label: 'Failed – see timeline', 
    ...NSD_COLORS.semantic.critical,
  },
  invariant_violation: {
    label: 'Invariant Violation – results invalid',
    ...NSD_COLORS.semantic.critical,
  },
  blocked: { 
    label: 'Blocked – see reason', 
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
