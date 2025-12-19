/**
 * Executive Dashboard
 * 
 * High-level executive visibility across the organization.
 * Read-only metrics from Activity Spine.
 * 
 * Widgets:
 * - Orders volume (30 days)
 * - Avg order cycle time
 * - Avg mockup turnaround
 * - Mockup SLA compliance %
 * - Production SLA breaches
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import { useExecutiveDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  SLACard,
} from '../../../components/dashboard';

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useExecutiveDashboard(period);

  return (
    <DashboardGuard dashboard="executive" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Executive Dashboard"
        description="High-level visibility across orders, production, and design SLAs"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Key Metrics */}
      <DashboardSection title="Key Performance Indicators">
        <DashboardGrid columns={3}>
          {/* Orders Volume */}
          <MetricCard
            title="Orders Volume"
            value={data?.orders.volume.toLocaleString()}
            subtitle="Total orders in period"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Avg Order Cycle Time */}
          <MetricCard
            title="Avg Order Cycle Time"
            value={data?.orders.avgCycleTimeMinutes}
            unit=" min"
            subtitle="Order to completion"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Avg Mockup Turnaround */}
          <MetricCard
            title="Avg Mockup Turnaround"
            value={data?.mockups.avgTurnaroundMinutes}
            unit=" min"
            subtitle="Request to delivery"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* SLA Compliance */}
      <DashboardSection title="SLA Compliance">
        <DashboardGrid columns={2}>
          {/* Mockup SLA Compliance */}
          <SLACard
            title="Mockup SLA Compliance"
            complianceRate={data?.mockupSLAs.complianceRate ?? 0}
            breaches={data?.mockupSLAs.totalEvaluated 
              ? Math.round(data.mockupSLAs.totalEvaluated * (1 - data.mockupSLAs.complianceRate)) 
              : 0}
            total={data?.mockupSLAs.totalEvaluated ?? 0}
            targetLabel="2-hour target"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Production SLA */}
          <SLACard
            title="Production SLA"
            complianceRate={data?.slas.production.complianceRate ?? 0}
            breaches={data?.slas.production.breaches ?? 0}
            total={data?.slas.production.totalOrders ?? 0}
            targetLabel="Production target"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Additional Metrics */}
      <DashboardSection title="Additional Metrics">
        <DashboardGrid columns={3}>
          <MetricCard
            title="Production SLA Breaches"
            value={data?.slas.production.breaches}
            subtitle="Orders exceeding production SLA"
            variant={data?.slas.production.breaches && data.slas.production.breaches > 0 ? 'danger' : 'success'}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Orders Exceeding SLA"
            value={data?.slas.ordersExceedingSLA}
            subtitle="Currently over target"
            variant={data?.slas.ordersExceedingSLA && data.slas.ordersExceedingSLA > 0 ? 'warning' : 'success'}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Pending Mockups"
            value={data?.mockups.pendingMockups}
            subtitle="Awaiting completion"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
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
