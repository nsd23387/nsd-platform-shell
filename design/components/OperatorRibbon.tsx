'use client';

/**
 * <OperatorRibbon> — one-line "start here" strip for landing pages (C-9,
 * comprehension pack). Subtle by design: muted background, small type, sits
 * above the page content so a first-time operator knows where to act first.
 */

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';

export interface OperatorRibbonProps {
  children: React.ReactNode;
  testId?: string;
}

export function OperatorRibbon({ children, testId }: OperatorRibbonProps) {
  const tc = useThemeColors();
  return (
    <div
      role="note"
      data-testid={testId ?? 'operator-ribbon'}
      style={{
        display: 'flex',
        gap: space['2'],
        alignItems: 'baseline',
        padding: `${space['2.5']} ${space['4']}`,
        background: tc.background.muted,
        border: `1px solid ${tc.border.subtle}`,
        borderRadius: radius.md,
        marginBottom: space['5'],
        fontFamily: fontFamily.body,
        fontSize: '12.5px',
        color: tc.text.secondary,
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontWeight: fontWeight.semibold, color: tc.text.primary, whiteSpace: 'nowrap' }}>
        Start here:
      </span>
      <span>{children}</span>
    </div>
  );
}
