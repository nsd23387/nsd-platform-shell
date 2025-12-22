/**
 * DashboardSection Component
 * 
 * Groups related cards with a section title.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { text } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space } from '../../design/tokens/spacing';

export interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DashboardSection({ title, description, children }: DashboardSectionProps) {
  return (
    <section style={{ marginBottom: space['8'] }}>
      <div style={{ marginBottom: space['4'] }}>
        <h2
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.semibold,
            color: text.secondary,
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
              color: text.muted,
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
