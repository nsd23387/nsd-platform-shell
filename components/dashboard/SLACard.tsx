/**
 * SLACard Component
 * 
 * Specialized card for displaying SLA compliance metrics.
 * Read-only with visual compliance indicator.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import { text, background, semantic } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius, duration, easing, componentSpacing } from '../../design/tokens/spacing';

export interface SLACardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  complianceRate: number;
  breaches: number;
  total: number;
  targetLabel?: string;
}

function getComplianceColor(rate: number): string {
  if (rate >= 0.95) return semantic.success.base;
  if (rate >= 0.85) return semantic.warning.base;
  return semantic.danger.base;
}

function getComplianceVariant(rate: number): 'success' | 'warning' | 'danger' {
  if (rate >= 0.95) return 'success';
  if (rate >= 0.85) return 'warning';
  return 'danger';
}

export function SLACard({
  complianceRate,
  breaches,
  total,
  targetLabel = 'SLA Target',
  ...props
}: SLACardProps) {
  const percentageDisplay = `${(complianceRate * 100).toFixed(1)}%`;
  const color = getComplianceColor(complianceRate);
  const variant = getComplianceVariant(complianceRate);

  return (
    <DashboardCard {...props} variant={variant}>
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize['6xl'],
          fontWeight: fontWeight.semibold,
          color: color,
          marginBottom: space['2'],
        }}
      >
        {percentageDisplay}
      </div>
      
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.base,
          color: text.muted,
          marginBottom: space['4'],
        }}
      >
        {targetLabel}
      </div>

      {/* Compliance bar - normalized height */}
      <div
        style={{
          height: componentSpacing.progressBarHeight,
          backgroundColor: background.muted,
          borderRadius: radius.DEFAULT,
          overflow: 'hidden',
          marginBottom: space['3'],
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${complianceRate * 100}%`,
            backgroundColor: color,
            borderRadius: radius.DEFAULT,
            transition: `width ${duration.slow} ${easing.DEFAULT}`,
            opacity: 0.9,
          }}
        />
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: fontFamily.body,
          fontSize: fontSize.md,
          color: text.muted,
        }}
      >
        <span>
          <strong style={{ color: text.secondary }}>{total - breaches}</strong> compliant
        </span>
        <span>
          <strong style={{ color: semantic.danger.base }}>{breaches}</strong> breaches
        </span>
      </div>
    </DashboardCard>
  );
}
