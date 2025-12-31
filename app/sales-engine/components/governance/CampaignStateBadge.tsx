'use client';

import type { CampaignGovernanceState } from '../../lib/campaign-state';
import {
  getGovernanceStateLabel,
  getGovernanceStateStyle,
} from '../../lib/campaign-state';
import { NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface CampaignStateBadgeProps {
  state: CampaignGovernanceState;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATE_ICONS: Record<CampaignGovernanceState, string> = {
  DRAFT: '✎',
  PENDING_APPROVAL: '⏳',
  APPROVED_READY: '✓',
  BLOCKED: '⊘',
  EXECUTED_READ_ONLY: '📋',
};

/**
 * CampaignStateBadge - Displays campaign governance state.
 * 
 * Target-state architecture component that replaces legacy status badges
 * with governance-first terminology (no "run"/"start"/"launch" semantics).
 */
export function CampaignStateBadge({
  state,
  size = 'md',
  showIcon = true,
}: CampaignStateBadgeProps) {
  const style = getGovernanceStateStyle(state);
  const label = getGovernanceStateLabel(state);
  const icon = STATE_ICONS[state];

  const sizeStyles = {
    sm: { padding: '3px 8px', fontSize: '11px', gap: '4px' },
    md: { padding: '4px 12px', fontSize: '12px', gap: '6px' },
    lg: { padding: '6px 16px', fontSize: '14px', gap: '8px' },
  };

  const currentSize = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: currentSize.gap,
        padding: currentSize.padding,
        fontSize: currentSize.fontSize,
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: NSD_RADIUS.sm,
        whiteSpace: 'nowrap',
      }}
      title={`Campaign State: ${label}`}
    >
      {showIcon && (
        <span style={{ fontSize: size === 'sm' ? '10px' : '12px' }}>
          {icon}
        </span>
      )}
      {label}
    </span>
  );
}

export default CampaignStateBadge;
