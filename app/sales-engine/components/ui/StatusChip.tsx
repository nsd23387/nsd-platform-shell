'use client';

import type { CampaignStatus } from '../../types/campaign';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DRAFT: { label: 'Draft', ...NSD_COLORS.status.draft },
  PENDING_REVIEW: { label: 'In Review', ...NSD_COLORS.status.pendingReview },
  RUNNABLE: { label: 'Approved & Ready', ...NSD_COLORS.status.approvedReady },
  RUNNING: { label: 'Running', ...NSD_COLORS.status.running },
  COMPLETED: { label: 'Completed', ...NSD_COLORS.status.completed },
  FAILED: { label: 'Failed', ...NSD_COLORS.status.failed },
  ARCHIVED: { label: 'Archived', ...NSD_COLORS.status.archived },
};

interface StatusChipProps {
  status: CampaignStatus | string;
  size?: 'sm' | 'md';
}

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
