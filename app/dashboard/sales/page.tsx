/**
 * Sales Dashboard
 * 
 * Sales team visibility for funnel conversion and pipeline health.
 * Read-only metrics from Activity Spine.
 * 
 * Widgets:
 * - Funnel conversion (lead → quote → order)
 * - Drop-off by stage
 * - Volume trends
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import { useSalesDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  FunnelCard,
  DistributionCard,
} from '../../../components/dashboard';

export default function SalesDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useSalesDashboard(period);

  // Calculate drop-off data for distribution chart
  const dropOffItems = data?.funnel.stages
    .filter((stage) => stage.dropOffRate > 0)
    .map((stage) => ({
      label: stage.stage,
      value: Math.round(stage.dropOffRate * 100),
      color: stage.dropOffRate > 0.5 ? '#ef4444' : stage.dropOffRate > 0.3 ? '#f59e0b' : '#3b82f6',
    })) ?? [];

  return (
    <DashboardGuard dashboard="sales" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Sales Dashboard"
        description="Funnel conversion, drop-off analysis, and volume trends"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Funnel Overview */}
      <DashboardSection title="Sales Funnel">
        <DashboardGrid columns={2}>
          {/* Funnel Visualization */}
          <FunnelCard
            title="Lead → Quote → Order Funnel"
            stages={data?.funnel.stages ?? []}
            overallConversion={data?.funnel.overallConversion}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Key Conversion Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MetricCard
              title="Overall Conversion Rate"
              value={(data?.funnel.overallConversion ?? 0) * 100}
              unit="%"
              subtitle="Lead to Order"
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />

            <MetricCard
              title="Orders Volume"
              value={data?.orders.volume}
              subtitle="Total orders in period"
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />
          </div>
        </DashboardGrid>
      </DashboardSection>

      {/* Drop-off Analysis */}
      <DashboardSection 
        title="Drop-off Analysis"
        description="Identify where prospects are leaving the funnel"
      >
        <DashboardGrid columns={2}>
          {/* Drop-off by Stage */}
          <DistributionCard
            title="Drop-off by Stage (%)"
            items={dropOffItems}
            showPercentages={false}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            empty={dropOffItems.length === 0}
            emptyMessage="No drop-off data available"
          />

          {/* Stage Volume */}
          <DistributionCard
            title="Volume by Stage"
            items={data?.funnel.stages.map((stage) => ({
              label: stage.stage,
              value: stage.count,
            })) ?? []}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            empty={!data?.funnel.stages.length}
            emptyMessage="No stage data available"
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Volume Trends */}
      <DashboardSection title="Volume Metrics">
        <DashboardGrid columns={3}>
          {/* Stage Counts */}
          {data?.funnel.stages.map((stage) => (
            <MetricCard
              key={stage.stage}
              title={stage.stage}
              value={stage.count.toLocaleString()}
              subtitle={`${(stage.conversionRate * 100).toFixed(1)}% conversion`}
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />
          ))}

          {/* If no stages, show empty state */}
          {!loading && !error && (!data?.funnel.stages || data.funnel.stages.length === 0) && (
            <MetricCard
              title="No Data"
              subtitle="No funnel data available for this period"
              empty
              emptyMessage="No volume data"
              timeWindow={period}
            />
          )}
        </DashboardGrid>
      </DashboardSection>
    </DashboardGuard>
  );
}

function AccessDenied() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        color: '#6b7280',
      }}
    >
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</span>
      <h2 style={{ fontSize: '20px', color: '#374151', marginBottom: '8px' }}>
        Access Denied
      </h2>
      <p>You do not have permission to view this dashboard.</p>
    </div>
  );
}
