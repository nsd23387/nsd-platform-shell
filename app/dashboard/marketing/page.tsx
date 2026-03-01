/**
 * Marketing Dashboard
 *
 * Read-only marketing analytics sourced from Activity Spine.
 * KPIs from page engagement, search console, and conversion views.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { TimePeriod, MarketingPage, MarketingSource } from '../../../types/activity-spine';
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

const PAGE_COLUMNS = [
  {
    key: 'page_url',
    header: 'Page',
    width: '30%',
  },
  {
    key: 'sessions',
    header: 'Sessions',
    width: '10%',
    align: 'right' as const,
    render: (item: MarketingPage) => (item.sessions ?? 0).toLocaleString(),
  },
  {
    key: 'bounce_rate',
    header: 'Bounce Rate',
    width: '12%',
    align: 'right' as const,
    render: (item: MarketingPage) =>
      `${((item.bounce_rate ?? 0) * 100).toFixed(1)}%`,
  },
  {
    key: 'avg_time_on_page_seconds',
    header: 'Avg Time',
    width: '10%',
    align: 'right' as const,
    render: (item: MarketingPage) => {
      const s = item.avg_time_on_page_seconds ?? 0;
      const mins = Math.floor(s / 60);
      const secs = Math.round(s % 60);
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    },
  },
  {
    key: 'clicks',
    header: 'Clicks',
    width: '10%',
    align: 'right' as const,
    render: (item: MarketingPage) => (item.clicks ?? 0).toLocaleString(),
  },
  {
    key: 'submissions',
    header: 'Submissions',
    width: '12%',
    align: 'right' as const,
    render: (item: MarketingPage) => (item.submissions ?? 0).toLocaleString(),
  },
  {
    key: 'pipeline_value_usd',
    header: 'Pipeline ($)',
    width: '16%',
    align: 'right' as const,
    render: (item: MarketingPage) => formatCurrency(item.pipeline_value_usd ?? 0),
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

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.round(s % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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

  const kpis = data?.kpis;
  const hasPages = !loading && !error && (data?.pages?.length ?? 0) > 0;
  const hasSources = !loading && !error && (data?.sources?.length ?? 0) > 0;

  const sourceItems = (data?.sources ?? []).map((s: MarketingSource, i: number) => ({
    label: s.submission_source,
    value: s.pipeline_value_usd,
    color: chartColors[i % chartColors.length],
  }));

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      {/* Header */}
      <div style={headerStyles}>
        <div>
          <h1 style={titleStyles}>Marketing Dashboard</h1>
          <p style={descriptionStyles}>
            Page engagement, search performance, and pipeline conversion metrics
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

      {/* Pipeline KPIs */}
      <DashboardSection
        title="Pipeline"
        description="Submission volume and pipeline value for selected period."
      >
        <DashboardGrid columns={4}>
          <MetricCard
            title="Pipeline Value"
            value={kpis?.total_pipeline_value_usd != null
              ? formatCurrency(kpis.total_pipeline_value_usd) : undefined}
            subtitle="Total pipeline USD"
            variant="success"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Submissions"
            value={kpis?.total_submissions != null
              ? kpis.total_submissions.toLocaleString() : undefined}
            subtitle="Form submissions"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Organic Clicks"
            value={kpis?.organic_clicks != null
              ? kpis.organic_clicks.toLocaleString() : undefined}
            subtitle="Search console clicks"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Impressions"
            value={kpis?.impressions != null
              ? kpis.impressions.toLocaleString() : undefined}
            subtitle="Search impressions"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Engagement KPIs */}
      <DashboardSection
        title="Engagement"
        description="Site-wide session and engagement metrics for selected period."
      >
        <DashboardGrid columns={4}>
          <MetricCard
            title="Sessions"
            value={kpis?.sessions != null
              ? kpis.sessions.toLocaleString() : undefined}
            subtitle="Total sessions"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Page Views"
            value={kpis?.page_views != null
              ? kpis.page_views.toLocaleString() : undefined}
            subtitle="Total page views"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Bounce Rate"
            value={kpis?.bounce_rate != null
              ? (kpis.bounce_rate * 100).toFixed(1) : undefined}
            unit="%"
            subtitle="Single-page sessions"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
          <MetricCard
            title="Avg Time on Page"
            value={kpis?.avg_time_on_page_seconds != null
              ? formatSeconds(kpis.avg_time_on_page_seconds) : undefined}
            subtitle="Weighted average"
            loading={loading}
            error={error}
            onRetry={refetch}
            timeWindow={period}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Sources */}
      <DashboardSection
        title="Sources"
        description="Submission sources ranked by pipeline value."
      >
        {loading ? (
          <DashboardCard title="Sources" loading timeWindow={period} />
        ) : error ? (
          <DashboardCard title="Sources" error={error} onRetry={refetch} timeWindow={period} />
        ) : !hasSources ? (
          <DashboardCard title="Source Data" empty emptyMessage={EMPTY_STATE_MESSAGE} />
        ) : (
          <DashboardGrid columns={2}>
            <DistributionCard
              title="Pipeline by Source"
              items={sourceItems}
              showPercentages
              timeWindow={period}
            />
            <DistributionCard
              title="Submissions by Source"
              items={(data?.sources ?? []).map((s: MarketingSource, i: number) => ({
                label: s.submission_source,
                value: s.submissions,
                color: chartColors[i % chartColors.length],
              }))}
              showPercentages
              timeWindow={period}
            />
          </DashboardGrid>
        )}
      </DashboardSection>

      {/* Pages */}
      <DashboardSection
        title="Pages"
        description="Per-page engagement, search, and conversion metrics."
      >
        {loading ? (
          <DashboardCard title="Pages" loading timeWindow={period} />
        ) : error ? (
          <DashboardCard title="Pages" error={error} onRetry={refetch} timeWindow={period} />
        ) : !hasPages ? (
          <DashboardCard title="Page Data" empty emptyMessage={EMPTY_STATE_MESSAGE} />
        ) : (
          <DataTable<MarketingPage>
            columns={PAGE_COLUMNS}
            data={data?.pages ?? []}
            keyExtractor={(item) => item.page_url}
            emptyMessage={EMPTY_STATE_MESSAGE}
          />
        )}
      </DashboardSection>
    </DashboardGuard>
  );
}
