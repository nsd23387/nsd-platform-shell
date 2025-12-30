'use client';

import type { CampaignStatus } from '../types/campaign';

const statusStyles: Record<CampaignStatus, { bg: string; text: string; border: string; label: string }> = {
  DRAFT: { bg: '#f5f5f5', text: '#525252', border: '#d4d4d4', label: 'Draft' },
  PENDING_REVIEW: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24', label: 'Pending Review' },
  RUNNABLE: { bg: '#ecfdf5', text: '#047857', border: '#10b981', label: 'Runnable' },
  ARCHIVED: { bg: '#f5f5f5', text: '#737373', border: '#a3a3a3', label: 'Archived' },
};

interface StatusBadgeProps {
  status: CampaignStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status];
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {style.label}
    </span>
  );
}
