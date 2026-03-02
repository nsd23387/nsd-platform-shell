'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface EmptyStateCardProps {
  message?: string;
}

export function EmptyStateCard({
  message = 'No data available for this period.',
}: EmptyStateCardProps) {
  const tc = useThemeColors();

  return (
    <div
      style={{
        backgroundColor: tc.background.surface,
        borderRadius: radius.xl,
        border: `1px solid ${tc.border.default}`,
        padding: `${space['10']} ${space['6']}`,
        textAlign: 'center',
        fontFamily: fontFamily.body,
        fontSize: fontSize.base,
        color: tc.text.muted,
      }}
    >
      {message}
    </div>
  );
}
