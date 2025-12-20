/**
 * Media Dashboard
 * 
 * Media team visibility for asset creation and approval workflows.
 * Read-only metrics from Activity Spine.
 * 
 * Widgets:
 * - Media created vs approved
 * - Avg internal → marketing approval time
 * - Unused approved assets
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import { useMediaDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  DistributionCard,
} from '../../../components/dashboard';

export default function MediaDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useMediaDashboard(period);

  // Calculate approval rate
  const approvalRate = data && data.created > 0 
    ? ((data.approved / data.created) * 100).toFixed(1) 
    : '0';

  return (
    <DashboardGuard dashboard="media" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Media Dashboard"
        description="Asset creation, approval workflows, and utilization metrics"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Media Overview */}
      <DashboardSection title="Media Overview">
        <DashboardGrid columns={4}>
          {/* Media Created */}
          <MetricCard
            title="Media Created"
            value={data?.created}
            subtitle="Total assets created"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Media Approved */}
          <MetricCard
            title="Media Approved"
            value={data?.approved}
            subtitle="Assets approved"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Pending Approval */}
          <MetricCard
            title="Pending Approval"
            value={data?.pending}
            subtitle="Awaiting review"
            variant={data?.pending && data.pending > 10 ? 'warning' : 'default'}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Approval Rate */}
          <MetricCard
            title="Approval Rate"
            value={approvalRate}
            unit="%"
            subtitle="Created → Approved"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Approval Workflow */}
      <DashboardSection title="Approval Workflow">
        <DashboardGrid columns={2}>
          {/* Avg Approval Time */}
          <MetricCard
            title="Avg Approval Time"
            value={data?.avgApprovalTimeMinutes}
            unit=" min"
            subtitle="Internal → Marketing approval"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Created vs Approved Distribution */}
          <DistributionCard
            title="Asset Status Distribution"
            items={[
              { label: 'Approved', value: data?.approved ?? 0, color: '#22c55e' },
              { label: 'Pending', value: data?.pending ?? 0, color: '#f59e0b' },
              { label: 'Unused', value: data?.unusedApprovedAssets ?? 0, color: '#6b7280' },
            ]}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Asset Utilization */}
      <DashboardSection 
        title="Asset Utilization"
        description="Track approved assets that haven't been used"
      >
        <DashboardGrid columns={2}>
          {/* Unused Approved Assets */}
          <MetricCard
            title="Unused Approved Assets"
            value={data?.unusedApprovedAssets}
            subtitle="Approved but not deployed"
            variant={data?.unusedApprovedAssets && data.unusedApprovedAssets > 20 ? 'warning' : 'default'}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          {/* Utilization Rate */}
          <MetricCard
            title="Utilization Rate"
            value={
              data && data.approved > 0
                ? (((data.approved - data.unusedApprovedAssets) / data.approved) * 100).toFixed(1)
                : '0'
            }
            unit="%"
            subtitle="Approved assets in use"
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
