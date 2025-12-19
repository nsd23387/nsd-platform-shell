/**
 * Operations Dashboard
 * 
 * Operational visibility for production and fulfillment teams.
 * Read-only metrics from Activity Spine.
 * 
 * Widgets:
 * - Bottleneck stage (highest avg duration)
 * - Orders exceeding SLA
 * - Production stage distribution
 * - P95 order cycle time
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import { useOperationsDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  DistributionCard,
} from '../../../components/dashboard';

export default function OperationsDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useOperationsDashboard(period);

  // Transform stage distribution for the chart
  const stageDistributionItems = data?.slas.stageDistribution
    ? Object.entries(data.slas.stageDistribution).map(([label, value]) => ({
        label,
        value,
      }))
    : [];

  return (
    <DashboardGuard dashboard="operations" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Operations Dashboard"
        description="Production bottlenecks, SLA tracking, and stage distribution"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Key Operations Metrics */}
      <DashboardSection title="Operations Overview">
        <DashboardGrid columns={4}>
          {/* Bottleneck Stage */}
          <MetricCard
            title="Bottleneck Stage"
            value={data?.slas.bottleneckStage.stage || 'N/A'}
            subtitle={data?.slas.bottleneckStage.avgDurationMinutes 
              ? `${data.slas.bottleneckStage.avgDurationMinutes} min avg`
              : undefined}
            variant="warning"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Orders Exceeding SLA */}
          <MetricCard
            title="Orders Exceeding SLA"
            value={data?.slas.ordersExceedingSLA}
            subtitle="Currently over target"
            variant={data?.slas.ordersExceedingSLA && data.slas.ordersExceedingSLA > 0 ? 'danger' : 'success'}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* P95 Cycle Time */}
          <MetricCard
            title="P95 Order Cycle Time"
            value={data?.orders.p95CycleTimeMinutes}
            unit=" min"
            subtitle="95th percentile"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Avg Cycle Time */}
          <MetricCard
            title="Avg Order Cycle Time"
            value={data?.orders.avgCycleTimeMinutes}
            unit=" min"
            subtitle="Mean cycle time"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Stage Distribution */}
      <DashboardSection 
        title="Production Stage Distribution"
        description="Current order distribution across production stages"
      >
        <DashboardGrid columns={2}>
          <DistributionCard
            title="Orders by Stage"
            items={stageDistributionItems}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            empty={stageDistributionItems.length === 0}
            emptyMessage="No stage distribution data available"
          />

          {/* Production SLA Overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MetricCard
              title="Total Orders"
              value={data?.slas.production.totalOrders}
              subtitle="In current period"
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />

            <MetricCard
              title="SLA Breaches"
              value={data?.slas.production.breaches}
              subtitle="Production delays"
              variant={data?.slas.production.breaches && data.slas.production.breaches > 0 ? 'danger' : 'success'}
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />
          </div>
        </DashboardGrid>
      </DashboardSection>

      {/* Order Volume Breakdown */}
      {data?.orders.breakdown?.byStatus && (
        <DashboardSection title="Order Status Breakdown">
          <DashboardGrid columns={2}>
            <DistributionCard
              title="Orders by Status"
              items={Object.entries(data.orders.breakdown.byStatus).map(([label, value]) => ({
                label,
                value,
              }))}
              loading={loading}
              error={error}
              onRetry={refetch}
              timeWindow={period}
            />

            {data.orders.breakdown.byStage && (
              <DistributionCard
                title="Orders by Stage"
                items={Object.entries(data.orders.breakdown.byStage).map(([label, value]) => ({
                  label,
                  value,
                }))}
                loading={loading}
                error={error}
                onRetry={refetch}
                timeWindow={period}
              />
            )}
          </DashboardGrid>
        </DashboardSection>
      )}
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
