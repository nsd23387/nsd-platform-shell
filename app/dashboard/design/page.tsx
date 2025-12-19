/**
 * Design Dashboard
 * 
 * Design team visibility for mockup performance and SLA tracking.
 * Read-only metrics from Activity Spine.
 * 
 * Widgets:
 * - Avg mockup turnaround (minutes)
 * - SLA compliance rate (2h)
 * - Quotes pending > 90 minutes
 * - Breaches by quote type
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
  SLACard,
  BreachListCard,
} from '../../../components/dashboard';

export default function DesignDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useDesignDashboard(period);

  return (
    <DashboardGuard dashboard="design" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Design Dashboard"
        description="Mockup turnaround times and design SLA compliance"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Key Design Metrics */}
      <DashboardSection title="Mockup Performance">
        <DashboardGrid columns={3}>
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
            comparison={{
              label: 'Target',
              value: `${data?.mockupSLAs.targetMinutes ?? 120} min`,
            }}
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

          {/* Pending Mockups */}
          <MetricCard
            title="Pending Mockups"
            value={data?.mockups.pendingMockups}
            subtitle="Currently in queue"
            variant={data?.mockups.pendingMockups && data.mockups.pendingMockups > 10 ? 'warning' : 'default'}
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
          {/* SLA Compliance Rate */}
          <SLACard
            title="2-Hour SLA Compliance"
            complianceRate={data?.mockupSLAs.complianceRate ?? 0}
            breaches={data?.mockupSLAs.totalEvaluated 
              ? Math.round(data.mockupSLAs.totalEvaluated * (1 - data.mockupSLAs.complianceRate)) 
              : 0}
            total={data?.mockupSLAs.totalEvaluated ?? 0}
            targetLabel="Mockups within 2h target"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Quotes Pending > 90 min */}
          <MetricCard
            title="Quotes Pending > 90 min"
            value={data?.mockupSLAs.quotesPendingOver90Min}
            subtitle="Approaching SLA breach"
            variant={
              data?.mockupSLAs.quotesPendingOver90Min && data.mockupSLAs.quotesPendingOver90Min > 0
                ? 'warning'
                : 'success'
            }
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Breach Analysis */}
      <DashboardSection 
        title="Breach Analysis"
        description="SLA breaches broken down by quote type"
      >
        <DashboardGrid columns={2}>
          <BreachListCard
            title="Breaches by Quote Type"
            breaches={data?.mockupSLAs.breachesByQuoteType ?? {}}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            emptyMessage="No SLA breaches recorded"
          />

          {/* Summary Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <MetricCard
              title="SLA Target"
              value={data?.mockupSLAs.targetMinutes ?? 120}
              unit=" min"
              subtitle="Maximum turnaround time"
              loading={loading}
              error={error}
              onRetry={refetch}
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
