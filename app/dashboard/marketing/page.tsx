/**
 * Marketing Dashboard
 *
 * Marketing team visibility for purchase volume, revenue, channels,
 * and landing page performance.
 * Read-only metrics from Activity Spine.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { TimePeriod, MarketingLandingPage } from '../../../types/activity-spine';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import {
  DashboardCard,
  DashboardGrid,
  DashboardSection,
  MetricCard,
  DistributionCard,
  AccessDenied,
} from '../../../components/dashboard';
import { DataTable } from '../../sales-engine/components/ui/DataTable';
import {
  background,
  text,
  border,
  chartColors,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../design/tokens/spacing';

// ============================================
// Constants
// ============================================

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const EMPTY_STATE_MESSAGE = 'No marketing data available for this period.';

const LANDING_PAGE_COLUMNS = [
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
    render: (item: MarketingLandingPage) =>
      `${((item.bounceRate ?? 0) * 100).toFixed(1)}%`,
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

// ============================================
// Helpers
// ============================================

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function isValidPeriod(value: string | null): value is TimePeriod {
  return value === '7d' || value === '30d';
}

// ============================================
// Header Styles (matches DashboardHeader tokens)
// ============================================

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: space['8'],
  paddingBottom: space['6'],
  borderBottom: `1px solid ${border.default}`,
};

const titleStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['4xl'],
  fontWeight: fontWeight.semibold,
  color: text.primary,
  marginBottom: space['1'],
  lineHeight: lineHeight.snug,
};

const descriptionStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  lineHeight: lineHeight.normal,
};

const segmentedControlStyles: React.CSSProperties = {
  display: 'inline-flex',
  border: `1px solid ${border.default}`,
  borderRadius: radius.lg,
  overflow: 'hidden',
};

function segmentButtonStyle(
  isActive: boolean,
  isLast: boolean
): React.CSSProperties {
  return {
    padding: `${space['2']} ${space['4']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    backgroundColor: isActive ? text.primary : background.surface,
    color: isActive ? text.inverse : text.secondary,
    border: 'none',
    borderRight: isLast ? 'none' : `1px solid ${border.default}`,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

// ============================================
// Component
// ============================================

export default function MarketingDashboard() {
  const [period, setPeriod] = useState<TimePeriod>('30d');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('period');
    if (isValidPeriod(p)) {
      setPeriod(p);
    }
  }, []);

  const handlePeriodChange = useCallback((newPeriod: TimePeriod) => {
    setPeriod(newPeriod);
    const url = new URL(window.location.href);
    url.searchParams.set('period', newPeriod);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const { data, loading, error, refetch } = useMarketingDashboard(period);

  const hasChannels = !loading && !error && (data?.channels?.length ?? 0) > 0;
  const hasLandingPages =
    !loading && !error && (data?.landingPages?.length ?? 0) > 0;

  const channelVisitorItems = (data?.channels ?? []).map((ch, i) => ({
    label: ch.channel,
    value: ch.visitors,
    color: chartColors[i % chartColors.length],
  }));

  const channelConversionItems = (data?.channels ?? []).map((ch, i) => ({
    label: ch.channel,
    value: ch.conversions,
    color: chartColors[i % chartColors.length],
  }));

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      {/* Header with segmented period control */}
      <div style={headerStyles}>
        <div>
          <h1 style={titleStyles}>Marketing Dashboard</h1>
          <p style={descriptionStyles}>
            Purchase volume, revenue, channel distribution, and landing page
            performance
          </p>
        </div>
        <div style={segmentedControlStyles}>
          {PERIODS.map((p, i) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              style={segmentButtonStyle(
                period === p.value,
                i === PERIODS.length - 1
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview KPIs */}
      <DashboardSection
        title="Overview"
        description="Key marketing performance indicators for selected period."
      >
        <DashboardGrid columns={4}>
          <MetricCard
            title="Revenue"
            value={
              data?.revenue != null ? formatCurrency(data.revenue) : undefined
            }
            subtitle="Gross revenue"
            variant="success"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Purchases"
            value={
              data?.purchases != null
                ? data.purchases.toLocaleString()
                : undefined
            }
            subtitle="Total purchases in period"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Conversion Rate"
            value={
              data?.conversionRate != null
                ? (data.conversionRate * 100).toFixed(1)
                : undefined
            }
            unit="%"
            subtitle="Visitor to purchase"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />

          <MetricCard
            title="Organic Clicks"
            value={
              data?.organicClicks != null
                ? data.organicClicks.toLocaleString()
                : undefined
            }
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
        description="Conversion and traffic distribution by acquisition source."
      >
        {loading ? (
          <DashboardGrid columns={2}>
            <DashboardCard
              title="Visitors by Channel"
              loading
              timeWindow={period}
            />
            <DashboardCard
              title="Conversions by Channel"
              loading
              timeWindow={period}
            />
          </DashboardGrid>
        ) : error ? (
          <DashboardCard
            title="Channels"
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        ) : !hasChannels ? (
          <DashboardCard
            title="Channel Data"
            empty
            emptyMessage={EMPTY_STATE_MESSAGE}
          />
        ) : (
          <DashboardGrid columns={2}>
            <DistributionCard
              title="Visitors by Channel"
              items={channelVisitorItems}
              timeWindow={period}
            />
            <DistributionCard
              title="Conversions by Channel"
              items={channelConversionItems}
              timeWindow={period}
            />
          </DashboardGrid>
        )}
      </DashboardSection>

      {/* Landing Pages */}
      <DashboardSection
        title="Landing Pages"
        description="SEO performance and downstream revenue by landing page."
      >
        {loading ? (
          <DashboardCard
            title="Landing Pages"
            loading
            timeWindow={period}
          />
        ) : error ? (
          <DashboardCard
            title="Landing Pages"
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        ) : !hasLandingPages ? (
          <DashboardCard
            title="Landing Page Data"
            empty
            emptyMessage={EMPTY_STATE_MESSAGE}
          />
        ) : (
          <DataTable<MarketingLandingPage>
            columns={LANDING_PAGE_COLUMNS}
            data={data?.landingPages ?? []}
            keyExtractor={(item) => item.path}
            emptyMessage={EMPTY_STATE_MESSAGE}
          />
        )}
      </DashboardSection>
    </DashboardGuard>
  );
}
