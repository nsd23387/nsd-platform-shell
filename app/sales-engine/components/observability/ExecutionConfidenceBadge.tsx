/**
 * ExecutionConfidenceBadge
 * 
 * A compact badge that provides a 1-second signal of execution state.
 * Replaces ambiguous "Running" semantics with clear, outcome-oriented states.
 * 
 * Uses brand-aligned status indicators (no emojis):
 * - Completed (No Work Required) → Muted/Gray with check icon
 * - Execution Idle (Expected) → Muted/Gray with info icon
 * - Execution In Progress → Active/Indigo with refresh icon
 * - Not Yet Executed → Muted/Gray with clock icon
 * - Completed → Positive/Indigo with check icon
 * - Failed → Critical/Coral with warning icon
 * 
 * READ-ONLY: This component only displays state, never modifies it.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { ExecutionConfidence } from '../../lib/execution-state-mapping';

interface ExecutionConfidenceBadgeProps {
  confidence: ExecutionConfidence;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

interface BadgeStyle {
  bg: string;
  text: string;
  border: string;
  icon: 'check' | 'info' | 'refresh' | 'clock' | 'warning';
  label: string;
}

function getBadgeStyle(confidence: ExecutionConfidence): BadgeStyle {
  switch (confidence) {
    case 'completed':
      return {
        ...NSD_COLORS.semantic.positive,
        icon: 'check',
        label: 'Completed',
      };
    case 'in_progress':
      return {
        ...NSD_COLORS.semantic.active,
        icon: 'refresh',
        label: 'In Progress',
      };
    case 'queued':
      return {
        ...NSD_COLORS.semantic.info,
        icon: 'clock',
        label: 'Queued',
      };
    case 'not_executed':
      return {
        ...NSD_COLORS.semantic.muted,
        icon: 'clock',
        label: 'Not Yet Executed',
      };
    case 'failed':
      return {
        ...NSD_COLORS.semantic.critical,
        icon: 'warning',
        label: 'Failed',
      };
    case 'unknown':
    default:
      return {
        ...NSD_COLORS.semantic.muted,
        icon: 'info',
        label: 'Unknown',
      };
  }
}

function getSizeStyles(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        padding: '4px 8px',
        fontSize: '11px',
        iconSize: 12,
        gap: '4px',
      };
    case 'lg':
      return {
        padding: '8px 16px',
        fontSize: '14px',
        iconSize: 18,
        gap: '8px',
      };
    case 'md':
    default:
      return {
        padding: '6px 12px',
        fontSize: '12px',
        iconSize: 14,
        gap: '6px',
      };
  }
}

export function ExecutionConfidenceBadge({
  confidence,
  label,
  size = 'md',
  showLabel = true,
}: ExecutionConfidenceBadgeProps) {
  const style = getBadgeStyle(confidence);
  const sizeStyles = getSizeStyles(size);
  const displayLabel = label || style.label;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        padding: sizeStyles.padding,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: NSD_RADIUS.sm,
      }}
      title={displayLabel}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: sizeStyles.iconSize + 4,
          height: sizeStyles.iconSize + 4,
          borderRadius: '50%',
          backgroundColor: `${style.text}15`,
        }}
      >
        <Icon name={style.icon} size={sizeStyles.iconSize} color={style.text} />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: sizeStyles.fontSize,
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: style.text,
            whiteSpace: 'nowrap',
          }}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}

export default ExecutionConfidenceBadge;
