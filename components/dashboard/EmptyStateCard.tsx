import React from 'react';
import { background, text, border } from '../../design/tokens/colors';
import { fontFamily, fontSize } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface EmptyStateCardProps {
  message?: string;
}

export function EmptyStateCard({
  message = 'No data available for this period.',
}: EmptyStateCardProps) {
  return (
    <div
      style={{
        backgroundColor: background.surface,
        borderRadius: radius.xl,
        border: `1px solid ${border.default}`,
        padding: `${space['10']} ${space['6']}`,
        textAlign: 'center',
        fontFamily: fontFamily.body,
        fontSize: fontSize.base,
        color: text.muted,
      }}
    >
      {message}
    </div>
  );
}
