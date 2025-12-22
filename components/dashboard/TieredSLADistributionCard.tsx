/**
 * TieredSLADistributionCard Component
 * 
 * Visualizes tiered SLA distribution for mockups.
 * Read-only stacked bar showing:
 * - Exceptional (≤ 2h) - green
 * - Standard (2-24h) - yellow
 * - Breach (> 24h) - red
 * - Pending (no mockup) - gray
 * 
 * Data comes from Activity Spine - no local calculations.
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { MockupSLADistribution } from '../../types/activity-spine';
import { text, border, statusColors } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius, duration, easing } from '../../design/tokens/spacing';

// ============================================
// Semantic Colors for SLA Tiers
// ============================================
export const SLA_TIER_COLORS = {
  exceptional: statusColors.exceptional.border,
  standard: statusColors.standard.border,
  breach: statusColors.breach.border,
  pending: statusColors.pending.border,
} as const;

export const SLA_TIER_LABELS = {
  exceptional: 'Exceptional (≤ 2h)',
  standard: 'Standard (2–24h)',
  breach: 'Breach (> 24h)',
  pending: 'Pending',
} as const;

export const SLA_TIER_TOOLTIPS = {
  exceptional: 'Mockups delivered within 2 hours - exceptional turnaround',
  standard: 'Mockups delivered between 2 and 24 hours - within acceptable range',
  breach: 'Mockups took longer than 24 hours - requires attention',
  pending: 'Mockups still in progress - no delivery yet',
} as const;

// ============================================
// Props
// ============================================
export interface TieredSLADistributionCardProps extends Omit<DashboardCardProps, 'value' | 'children'> {
  distribution: MockupSLADistribution | null | undefined;
  showStackedBar?: boolean;
}

// ============================================
// Component
// ============================================
export function TieredSLADistributionCard({
  distribution,
  showStackedBar = true,
  loading,
  error,
  ...props
}: TieredSLADistributionCardProps) {
  // Calculate total and percentages (display only - no business logic)
  const total = distribution
    ? distribution.exceptional + distribution.standard + distribution.breach + distribution.pending
    : 0;

  const getPercentage = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const tiers = distribution
    ? [
        {
          key: 'exceptional' as const,
          value: distribution.exceptional,
          percentage: getPercentage(distribution.exceptional),
        },
        {
          key: 'standard' as const,
          value: distribution.standard,
          percentage: getPercentage(distribution.standard),
        },
        {
          key: 'breach' as const,
          value: distribution.breach,
          percentage: getPercentage(distribution.breach),
        },
        {
          key: 'pending' as const,
          value: distribution.pending,
          percentage: getPercentage(distribution.pending),
        },
      ]
    : [];

  const isEmpty = !distribution || total === 0;

  return (
    <DashboardCard
      {...props}
      loading={loading}
      error={error}
      empty={isEmpty && !loading && !error}
      emptyMessage="No SLA distribution data available"
    >
      {!isEmpty && (
        <div style={{ marginTop: space['2'] }}>
          {/* Stacked Bar Visualization */}
          {showStackedBar && (
            <div style={{ marginBottom: space['5'] }}>
              <div
                style={{
                  display: 'flex',
                  height: '24px',
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  backgroundColor: border.subtle,
                }}
              >
                {tiers.map((tier) =>
                  tier.percentage > 0 ? (
                    <div
                      key={tier.key}
                      title={SLA_TIER_TOOLTIPS[tier.key]}
                      style={{
                        width: `${tier.percentage}%`,
                        backgroundColor: SLA_TIER_COLORS[tier.key],
                        transition: `width ${duration.slow} ${easing.DEFAULT}`,
                        cursor: 'help',
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Tier Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['2.5'] }}>
            {tiers.map((tier) => (
              <div
                key={tier.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                title={SLA_TIER_TOOLTIPS[tier.key]}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
                  {/* Color indicator */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: radius.sm,
                      backgroundColor: SLA_TIER_COLORS[tier.key],
                    }}
                  />
                  <span
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.md,
                      color: text.secondary,
                    }}
                  >
                    {SLA_TIER_LABELS[tier.key]}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
                  <span
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.md,
                      fontWeight: fontWeight.semibold,
                      color: text.primary,
                    }}
                  >
                    {tier.value.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontFamily: fontFamily.body,
                      fontSize: fontSize.sm,
                      color: text.muted,
                      minWidth: '48px',
                      textAlign: 'right',
                    }}
                  >
                    {tier.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            style={{
              marginTop: space['3'],
              paddingTop: space['3'],
              borderTop: `1px solid ${border.default}`,
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: fontFamily.body,
              fontSize: fontSize.md,
            }}
          >
            <span style={{ color: text.muted }}>Total Evaluated</span>
            <span style={{ fontWeight: fontWeight.semibold, color: text.primary }}>
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
