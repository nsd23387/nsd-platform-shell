'use client';

import type { CampaignStatus } from '../types/campaign';

const statusStyles: Record<CampaignStatus, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: '#fef3c7', text: '#92400e', label: 'Draft' },
  PENDING_REVIEW: { bg: '#dbeafe', text: '#1e40af', label: 'Pending Review' },
  RUNNABLE: { bg: '#d1fae5', text: '#065f46', label: 'Runnable' },
  ARCHIVED: { bg: '#f3f4f6', text: '#4b5563', label: 'Archived' },
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
      }}
    >
      {style.label}
    </span>
  );
}
