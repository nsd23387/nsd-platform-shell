'use client';

import type { CampaignStatus } from '../types/campaign';
import { getStatusLabel, getStatusStyle } from '../lib/statusLabels';

interface StatusBadgeProps {
  status: CampaignStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const style = getStatusStyle(status);
  const label = getStatusLabel(status);
  
  const padding = size === 'sm' ? '3px 10px' : '4px 12px';
  const fontSize = size === 'sm' ? '11px' : '12px';
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: '9999px',
        fontSize,
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: 'var(--font-body, Inter, sans-serif)',
      }}
    >
      {label}
    </span>
  );
}
