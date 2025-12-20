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
 */

import React from 'react';
import { DashboardCard, DashboardCardProps } from './DashboardCard';
import type { MockupSLADistribution } from '../../types/activity-spine';

// ============================================
// Semantic Colors for SLA Tiers
// ============================================
export const SLA_TIER_COLORS = {
  exceptional: '#22c55e', // green - best performance
  standard: '#eab308',    // yellow - acceptable
  breach: '#ef4444',      // red - requires attention
  pending: '#9ca3af',     // gray - in progress
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
        <div style={{ marginTop: '8px' }}>
          {/* Stacked Bar Visualization */}
          {showStackedBar && (
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  height: '24px',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: '#f3f4f6',
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
                        transition: 'width 0.3s ease',
                        cursor: 'help',
                      }}
                    />
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Tier Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Color indicator */}
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: SLA_TIER_COLORS[tier.key],
                    }}
                  />
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#374151',
                    }}
                  >
                    {SLA_TIER_LABELS[tier.key]}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#111827',
                    }}
                  >
                    {tier.value.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#6b7280',
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
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '13px',
            }}
          >
            <span style={{ color: '#6b7280' }}>Total Evaluated</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {total.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </DashboardCard>
  );
}
