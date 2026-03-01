'use client';

import React from 'react';
import { trendColors } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface DeltaBadgeProps {
  deltaPct: number;
  previous?: number;
}

export function DeltaBadge({ deltaPct, previous }: DeltaBadgeProps) {
  const direction: 'up' | 'down' | 'neutral' =
    deltaPct > 0.005 ? 'up' : deltaPct < -0.005 ? 'down' : 'neutral';
  const colors = trendColors[direction];
  const arrow = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192';
  const label = `${arrow} ${Math.abs(deltaPct * 100).toFixed(1)}%`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space['1'],
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        padding: `${space['0.5']} ${space['2']}`,
        borderRadius: radius.DEFAULT,
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: 'nowrap',
      }}
      title={previous != null ? `Previous: ${previous.toLocaleString()}` : undefined}
    >
      {label}
    </span>
  );
}
