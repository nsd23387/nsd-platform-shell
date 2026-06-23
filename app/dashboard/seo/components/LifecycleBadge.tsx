'use client';

import React from 'react';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space } from '../../../../design/tokens/spacing';
import { PALETTE } from '../_shared';
import type { Tc } from '../_shared';
import { useThemeColors } from '../../../../hooks/useThemeColors';

export type LifecycleState =
  | 'evaluating'
  | 'performer'
  | 'probation'
  | 'watch'
  | 'winner'
  | 'retired'
  | 'inconclusive';

interface StateConfig {
  label: string;
  bg: string;
  fg: string;
  icon: React.ReactNode;
}

function getConfig(state: LifecycleState, tc: Tc): StateConfig {
  const iconSize = 12;
  switch (state) {
    case 'evaluating':
      return {
        label: 'Evaluating',
        bg: PALETTE.infoSoft,
        fg: PALETTE.info,
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <polyline points="8,4 8,8 11,10" />
          </svg>
        ),
      };
    case 'performer':
      return {
        label: 'Performer',
        bg: PALETTE.goodSoft,
        fg: PALETTE.good,
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <polyline points="1,12 5,7 9,9 15,3" />
            <polyline points="11,3 15,3 15,7" />
          </svg>
        ),
      };
    case 'probation':
      return {
        label: 'Probation',
        bg: PALETTE.warnSoft,
        fg: PALETTE.warn,
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M8 1.5L14.5 13H1.5L8 1.5z" />
            <line x1="8" y1="6" x2="8" y2="9.5" />
            <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
          </svg>
        ),
      };
    case 'watch':
      return {
        label: 'Watch',
        bg: '#fef9c3',
        fg: '#854d0e',
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M1 8C1 8 3.5 3 8 3s7 5 7 5-2.5 5-7 5S1 8 1 8z" />
            <circle cx="8" cy="8" r="2" />
          </svg>
        ),
      };
    case 'winner':
      return {
        label: 'Winner',
        bg: '#d1fae5',
        fg: '#064e3b',
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <polygon points="8,1.5 10,6 15,6 11,9.5 12.5,14.5 8,11.5 3.5,14.5 5,9.5 1,6 6,6" />
          </svg>
        ),
      };
    case 'retired':
      return {
        label: 'Retired',
        bg: tc.background.muted,
        fg: tc.text.muted,
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="1.5" y="5" width="13" height="9" rx="1" />
            <path d="M5 5V4a3 3 0 016 0v1" />
            <line x1="5.5" y1="9" x2="10.5" y2="9" />
          </svg>
        ),
      };
    case 'inconclusive':
      return {
        label: 'Inconclusive',
        bg: '#f3e8ff',
        fg: '#5b21b6',
        icon: (
          <svg width={iconSize} height={iconSize} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5s2 .9 2 2c0 1.5-2 1.5-2 3" />
            <circle cx="8" cy="12" r="0.5" fill="currentColor" />
          </svg>
        ),
      };
  }
}

interface Props {
  state: LifecycleState;
  size?: 'sm' | 'md';
}

export function LifecycleBadge({ state, size = 'sm' }: Props) {
  const tc = useThemeColors();
  const config = getConfig(state, tc);
  const fontSize = size === 'md' ? '13px' : '11px';
  const px = size === 'md' ? '10px' : '6px';
  const py = size === 'md' ? '4px' : '2px';

  return (
    <span
      role="img"
      aria-label={config.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space['1'],
        padding: `${py} ${px}`,
        borderRadius: 999,
        background: config.bg,
        color: config.fg,
        fontSize,
        fontWeight: fontWeight.medium,
        fontFamily: fontFamily.body,
        whiteSpace: 'nowrap',
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
