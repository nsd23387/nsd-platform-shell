/**
 * MetricCard Component
 * 
 * Specialized card for displaying single metric values.
 * Read-only display with optional comparison data.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import { text, border } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space } from '../../design/tokens/spacing';

export interface MetricCardProps extends Omit<DashboardCardProps, 'children'> {
  unit?: string;
  comparison?: {
    label: string;
    value: string | number;
  };
}

export function MetricCard({
  value,
  unit,
  comparison,
  ...props
}: MetricCardProps) {
  const displayValue = unit ? `${value}${unit}` : value;

  return (
    <DashboardCard {...props} value={displayValue}>
      {comparison && (
        <div
          style={{
            marginTop: space['3'],
            paddingTop: space['3'],
            borderTop: `1px solid ${border.subtle}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.md,
            color: text.muted,
          }}
        >
          <span>{comparison.label}: </span>
          <span style={{ fontWeight: fontWeight.medium, color: text.secondary }}>
            {comparison.value}
          </span>
        </div>
      )}
    </DashboardCard>
  );
}
