'use client';

import type { CampaignStatus } from '../../types/campaign';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

/**
 * Status configuration with target-state terminology.
 * Updated: No "Running" label - use "Executed (Read-Only)" instead.
 */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', ...NSD_COLORS.status.draft },
  PENDING_REVIEW: { label: 'Pending Approval', ...NSD_COLORS.status.pendingReview },
  RUNNABLE: { label: 'Approved (Observed)', ...NSD_COLORS.status.approvedReady },
  RUNNING: { label: 'Executed (Read-Only)', ...NSD_COLORS.status.running },
  COMPLETED: { label: 'Executed (Read-Only)', ...NSD_COLORS.status.completed },
  FAILED: { label: 'Execution Failed', ...NSD_COLORS.status.failed },
  ARCHIVED: { label: 'Archived', ...NSD_COLORS.status.archived },
  // Run status labels
  PARTIAL: { label: 'Partial', bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
};

interface StatusChipProps {
  status: CampaignStatus | string;
  size?: 'sm' | 'md';
}

/**
 * StatusChip - Displays campaign or run status.
 * 
 * Updated for target-state architecture:
 * - Uses governance-first terminology
 * - "Running" becomes "Executed (Read-Only)"
 * - "Approved & Ready" becomes "Approved (Observed)"
 */
export function StatusChip({ status, size = 'md' }: StatusChipProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  
  const sizeStyles = {
    sm: { padding: '3px 8px', fontSize: '11px' },
    md: { padding: '4px 12px', fontSize: '12px' },
  };
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...sizeStyles[size],
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        borderRadius: NSD_RADIUS.sm,
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}
