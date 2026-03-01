/**
 * Marketing Dashboard
 *
 * Marketing team visibility for purchase volume, revenue, channels,
 * and landing page performance.
 * Read-only metrics from Activity Spine.
 */

'use client';

import React, { useState } from 'react';
import type { TimePeriod } from '../../../types/activity-spine';
import type { MarketingLandingPage } from '../../../types/activity-spine';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardHeader,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  DistributionCard,
  AccessDenied,
} from '../../../components/dashboard';
import { DataTable } from '../../sales-engine/components/ui/DataTable';
import { chartColors } from '../../../design/tokens/colors';

const landingPageColumns = [
  {
    key: 'path',
    header: 'Page Path',
    width: '40%',
  },
  {
    key: 'visitors',
    header: 'Visitors',
    width: '20%',
    align: 'right' as const,
    render: (item: MarketingLandingPage) => (item.visitors ?? 0).toLocaleString(),
  },
  {
    key: 'bounceRate',
    header: 'Bounce Rate',
    width: '20%',
    align: 'right' as const,
    render: (item: MarketingLandingPage) => `${((item.bounceRate ?? 0) * 100).toFixed(1)}%`,
  },
  {
    key: 'avgTimeOnPageSeconds',
    header: 'Avg Time on Page',
    width: '20%',
    align: 'right' as const,
    render: (item: MarketingLandingPage) => {
      const seconds = item.avgTimeOnPageSeconds ?? 0;
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    },
  },
];

export default function MarketingDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const { data, loading, error, refetch } = useMarketingDashboard(period);

  const channelItems = (data?.channels ?? []).map((ch, i) => ({
    label: ch.channel,
    value: ch.visitors,
    color: chartColors[i % chartColors.length],
  }));

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <DashboardHeader
        title="Marketing Dashboard"
        description="Purchase volume, revenue, channel distribution, and landing page performance"
        period={period}
        onPeriodChange={setPeriod}
      />

      {/* Overview KPIs */}
      <DashboardSection title="Overview">
        <DashboardGrid columns={4}>
          <MetricCard
            title="Purchases"
            value={data?.purchases}
            subtitle="Total purchases in period"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Revenue"
            value={data?.revenue != null ? `$${data.revenue.toLocaleString()}` : undefined}
            subtitle="Gross revenue"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Conversion Rate"
            value={data?.conversionRate != null ? (data.conversionRate * 100).toFixed(1) : undefined}
            unit="%"
            subtitle="Visitor → Purchase"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Organic Clicks"
            value={data?.organicClicks}
            subtitle="Unpaid search traffic"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Channel Distribution */}
      <DashboardSection
        title="Channels"
        description="Visitor distribution by acquisition channel"
      >
        <DashboardGrid columns={2}>
          <DistributionCard
            title="Visitors by Channel"
            items={channelItems}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            empty={channelItems.length === 0 && !loading}
            emptyMessage="No channel data available"
          />

          {/* Per-channel conversion rates */}
          <DistributionCard
            title="Conversions by Channel"
            items={(data?.channels ?? []).map((ch, i) => ({
              label: ch.channel,
              value: ch.conversions,
              color: chartColors[i % chartColors.length],
            }))}
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
            empty={!data?.channels?.length && !loading}
            emptyMessage="No conversion data available"
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Landing Pages */}
      <DashboardSection
        title="Landing Pages"
        description="Top landing pages by visitor volume"
      >
        {loading ? (
          <DashboardGrid columns={2}>
            <MetricCard title="Loading landing pages…" loading timeWindow={period} />
            <MetricCard title="" loading timeWindow={period} />
          </DashboardGrid>
        ) : error ? (
          <MetricCard
            title="Landing Pages"
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        ) : (
          <DataTable<MarketingLandingPage>
            columns={landingPageColumns}
            data={data?.landingPages ?? []}
            keyExtractor={(item) => item.path}
            emptyMessage="No landing page data available for this period"
          />
        )}
      </DashboardSection>
    </DashboardGuard>
  );
}
