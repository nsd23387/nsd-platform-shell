/**
 * DistributionCard Component
 * 
 * Card for displaying distribution data (e.g., stage distribution).
 * Read-only bar visualization.
 * 
 * Updated to use design system tokens.
 * 
 * GOVERNANCE NOTE:
 * This component performs display-only transformations.
 * Item values come from pre-computed metrics via props.
 * The percentage calculation (line 38) is for visual bar width only,
 * NOT for metric derivation. The actual metric values are already
 * computed upstream and passed as `items[].value`.
 * 
 * This is an ALLOWED transformation per governance audit.
 * See: docs/seo/METRICS_AUDIT.md
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import { text, background, chartColors } from '../../design/tokens/colors';
import { fontFamily, fontSize } from '../../design/tokens/typography';
import { space, radius, duration, easing, componentSpacing } from '../../design/tokens/spacing';

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

export interface DistributionCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  items: DistributionItem[];
  showPercentages?: boolean;
}

export function DistributionCard({
  items,
  showPercentages = true,
  ...props
}: DistributionCardProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <DashboardCard {...props}>
      <div style={{ marginTop: space['2'] }}>
        {items.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const color = item.color || chartColors[index % chartColors.length];

          return (
            <div key={item.label} style={{ marginBottom: space['3'] }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: space['1'],
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.md,
                }}
              >
                <span style={{ color: text.secondary }}>{item.label}</span>
                <span style={{ color: text.muted }}>
                  {item.value}
                  {showPercentages && ` (${percentage.toFixed(1)}%)`}
                </span>
              </div>
              {/* Progress bar - normalized height */}
              <div
                style={{
                  height: componentSpacing.progressBarHeight,
                  backgroundColor: background.muted,
                  borderRadius: radius.DEFAULT,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: color,
                    borderRadius: radius.DEFAULT,
                    transition: `width ${duration.slow} ${easing.DEFAULT}`,
                    opacity: 0.9,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
