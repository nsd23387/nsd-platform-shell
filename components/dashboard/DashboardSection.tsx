'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space, componentSpacing } from '../../design/tokens/spacing';

export interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  const tc = useThemeColors();

  return (
    <section
      style={{
        marginTop: componentSpacing.sectionTopMargin,
        marginBottom: space['8'],
      }}
    >
      <div style={{ marginBottom: componentSpacing.sectionHeaderMargin }}>
        <h2
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.semibold,
            color: tc.text.secondary,
            marginBottom: space['1'],
            lineHeight: lineHeight.snug,
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: tc.text.muted,
              lineHeight: lineHeight.normal,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
