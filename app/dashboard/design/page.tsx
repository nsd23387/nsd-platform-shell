/**
 * Design Dashboard
 * 
 * Design team visibility for mockup performance and tiered SLA tracking.
 * Read-only metrics from Activity Spine (v1.5.1+).
 * 
 * Tiered SLA Model:
 * - Exceptional (≤ 2h): Outstanding turnaround
 * - Standard (2-24h): Acceptable performance
 * - Breach (> 24h): Requires attention
 * - Pending: In progress
 * 
 * Widgets:
 * - Avg mockup turnaround (minutes)
 * - % Exceptional (≤ 2h)
 * - % Breach (> 24h)
 * - Tiered SLA distribution visualization
 * - Breach details by quote
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import { useDesignDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  TieredSLADistributionCard,
  DetailedBreachListCard,
  SLA_TIER_COLORS,
  AccessDenied,
} from '../../../components/dashboard';
import { background, text, border } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';

export default function DesignDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useDesignDashboard(period);

  // Calculate percentages from distribution (display only - values from Activity Spine)
  const distribution = data?.mockups.distribution ?? data?.mockupSLAs.distribution;
  const total = distribution
    ? distribution.exceptional + distribution.standard + distribution.breach + distribution.pending
    : 0;
  
  const exceptionalPercent = total > 0 && distribution
    ? ((distribution.exceptional / total) * 100).toFixed(1)
    : '0.0';
  
  const breachPercent = total > 0 && distribution
    ? ((distribution.breach / total) * 100).toFixed(1)
    : '0.0';

  return (
    <DashboardGuard dashboard="design" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Design Dashboard"
        description="Mockup turnaround performance with tiered SLA tracking"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Primary Performance Metrics */}
      <DashboardSection title="Mockup Performance">
        <DashboardGrid columns={4}>
          {/* Avg Mockup Turnaround */}
          <MetricCard
            title="Avg Turnaround"
            value={data?.mockups.avgTurnaroundMinutes}
            unit=" min"
            subtitle="Request to delivery"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Exceptional Rate */}
          <MetricCard
            title="Exceptional (≤ 2h)"
            value={exceptionalPercent}
            unit="%"
            subtitle="Outstanding turnaround"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            variant={
              parseFloat(exceptionalPercent) >= 70 ? 'success' :
              parseFloat(exceptionalPercent) >= 50 ? 'default' : 'warning'
            }
          />

          {/* Breach Rate */}
          <MetricCard
            title="Breach (> 24h)"
            value={breachPercent}
            unit="%"
            subtitle="Requires attention"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            variant={
              parseFloat(breachPercent) === 0 ? 'success' :
              parseFloat(breachPercent) <= 5 ? 'warning' : 'danger'
            }
          />

          {/* Total Mockups */}
          <MetricCard
            title="Total Mockups"
            value={data?.mockups.totalMockups}
            subtitle="Completed in period"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Tiered SLA Distribution */}
      <DashboardSection 
        title="SLA Performance Distribution"
        description="Breakdown of mockup turnaround by SLA tier. Standard (2-24h) is acceptable performance."
      >
        <DashboardGrid columns={2}>
          {/* Stacked Distribution Card */}
          <TieredSLADistributionCard
            title="Tiered SLA Distribution"
            distribution={distribution}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Tier Summary Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
            {/* Exceptional count */}
            <TierSummaryCard
              tier="Exceptional (≤ 2h)"
              value={loading ? '—' : (distribution?.exceptional ?? 0).toLocaleString()}
              color={SLA_TIER_COLORS.exceptional}
              tooltip="Mockups delivered within 2 hours"
            />

            {/* Standard count */}
            <TierSummaryCard
              tier="Standard (2–24h)"
              value={loading ? '—' : (distribution?.standard ?? 0).toLocaleString()}
              color={SLA_TIER_COLORS.standard}
              tooltip="Mockups delivered between 2 and 24 hours - acceptable performance"
            />

            {/* Pending count */}
            <TierSummaryCard
              tier="Pending"
              value={loading ? '—' : (distribution?.pending ?? data?.mockups.pendingMockups ?? 0).toLocaleString()}
              color={SLA_TIER_COLORS.pending}
              tooltip="Mockups still in progress"
            />
          </div>
        </DashboardGrid>
      </DashboardSection>

      {/* Breach Analysis */}
      <DashboardSection 
        title="Breach Analysis"
        description="Mockups exceeding 24-hour threshold. Standard (2-24h) performance is not shown here."
      >
        <DashboardGrid columns={2}>
          {/* Detailed Breach List */}
          <DetailedBreachListCard
            title="Breaches (> 24h)"
            breachItems={data?.mockupSLAs.breachItems}
            breachesByQuoteType={data?.mockupSLAs.breachesByQuoteType}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            emptyMessage="No breaches (> 24h) recorded"
          />

          {/* Breach Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['4'] }}>
            <MetricCard
              title="Breach Count"
              value={distribution?.breach ?? 0}
              subtitle="Mockups > 24h turnaround"
              variant={
                (distribution?.breach ?? 0) === 0 ? 'success' :
                (distribution?.breach ?? 0) <= 3 ? 'warning' : 'danger'
              }
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />

            <MetricCard
              title="Quotes Pending > 90 min"
              value={data?.mockupSLAs.quotesPendingOver90Min}
              subtitle="Monitor for potential delays"
              variant={
                (data?.mockupSLAs.quotesPendingOver90Min ?? 0) === 0 ? 'success' :
                (data?.mockupSLAs.quotesPendingOver90Min ?? 0) <= 5 ? 'default' : 'warning'
              }
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />

            <MetricCard
              title="Total Evaluated"
              value={data?.mockupSLAs.totalEvaluated}
              subtitle="Mockups measured for SLA"
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />
          </div>
        </DashboardGrid>
      </DashboardSection>

      {/* SLA Tier Reference */}
      <DashboardSection title="SLA Tier Reference">
        <div
          style={{
            backgroundColor: background.muted,
            borderRadius: radius.lg,
            padding: space['5'],
            border: `1px solid ${border.default}`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: space['4'],
            }}
          >
            <TierReference
              tier="Exceptional"
              threshold="≤ 2 hours"
              color={SLA_TIER_COLORS.exceptional}
              description="Outstanding performance"
            />
            <TierReference
              tier="Standard"
              threshold="2–24 hours"
              color={SLA_TIER_COLORS.standard}
              description="Acceptable turnaround"
            />
            <TierReference
              tier="Breach"
              threshold="> 24 hours"
              color={SLA_TIER_COLORS.breach}
              description="Requires attention"
            />
            <TierReference
              tier="Pending"
              threshold="In progress"
              color={SLA_TIER_COLORS.pending}
              description="No delivery yet"
            />
          </div>
        </div>
      </DashboardSection>
    </DashboardGuard>
  );
}

/**
 * Tier Summary Card - compact card for tier counts
 */
function TierSummaryCard({
  tier,
  value,
  color,
  tooltip,
}: {
  tier: string;
  value: string;
  color: string;
  tooltip: string;
}) {
  return (
    <div
      style={{
        backgroundColor: background.surface,
        borderRadius: radius.lg,
        padding: space['4'],
        border: `1px solid ${border.default}`,
        borderLeft: `4px solid ${color}`,
      }}
      title={tooltip}
    >
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          color: text.muted,
          marginBottom: space['1'],
        }}
      >
        {tier}
      </div>
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize['3xl'],
          fontWeight: fontWeight.semibold,
          color: color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Tier Reference - legend item for SLA tiers
 */
function TierReference({
  tier,
  threshold,
  color,
  description,
}: {
  tier: string;
  threshold: string;
  color: string;
  description: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: space['3'] }}>
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: radius.DEFAULT,
          backgroundColor: color,
          flexShrink: 0,
          marginTop: '2px',
        }}
      />
      <div>
        <div
          style={{
            fontFamily: fontFamily.body,
            fontWeight: fontWeight.semibold,
            fontSize: fontSize.base,
            color: text.secondary,
          }}
        >
          {tier}
        </div>
        <div
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.md,
            color: text.muted,
          }}
        >
          {threshold}
        </div>
        <div
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: text.placeholder,
            marginTop: space['0.5'],
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}
