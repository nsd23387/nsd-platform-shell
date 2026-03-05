'use client';

import React, { useContext } from 'react';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { DashboardCard, AccessDenied, MarketingPerformanceScore } from '../../../components/dashboard';
import { MarketingKPIOverview } from './components/MarketingKPIOverview';
import { MarketingExecutiveKPIs } from './components/MarketingExecutiveKPIs';
import { MarketingChannelBreakdownPanel } from './components/MarketingChannelBreakdownPanel';
import { MarketingTimeseriesPanel } from './components/MarketingTimeseriesPanel';
import { MarketingFunnelPanel } from './components/MarketingFunnelPanel';
import { MarketingGA4FunnelPanel } from './components/MarketingGA4FunnelPanel';
import { MarketingAnomaliesPanel } from './components/MarketingAnomaliesPanel';
import { space } from '../../../design/tokens/spacing';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { MarketingContext } from './lib/MarketingContext';

const EMPTY_GA4_FUNNEL = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 };

export default function MarketingExecutiveOverview() {
  const tc = useThemeColors();
  const { periodState, queryParams } = useContext(MarketingContext);
  const { data, loading, error, refetch } = useMarketingDashboard(queryParams);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <div style={{ marginBottom: space['6'] }}>
          <h1
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize['3xl'],
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
              marginBottom: space['1'],
              lineHeight: lineHeight.snug,
            }}
            data-testid="text-page-title"
          >
            Executive Overview
          </h1>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: tc.text.muted,
              lineHeight: lineHeight.normal,
            }}
          >
            Strategic marketing performance summary with Core 4 engine insights.
          </p>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} onRetry={refetch} />
        )}

        <MarketingPerformanceScore
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          loading={loading}
        />

        <MarketingExecutiveKPIs
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          googleAdsOverview={data?.google_ads_overview}
          loading={loading}
        />

        <MarketingChannelBreakdownPanel
          channels={data?.channel_performance ?? []}
          loading={loading}
          error={error}
        />

        <MarketingTimeseriesPanel
          timeseries={data?.timeseries}
          enabled={periodState.includeTimeseries}
          loading={loading}
          error={error}
        />

        <MarketingFunnelPanel
          funnel={data?.funnel ?? []}
          loading={loading}
          error={error}
        />

        <MarketingGA4FunnelPanel
          funnel={data?.ga4_funnel ?? EMPTY_GA4_FUNNEL}
          loading={loading}
          error={error}
        />

        <MarketingAnomaliesPanel
          anomalies={data?.anomalies}
          loading={loading}
          error={error}
        />
      </div>
    </DashboardGuard>
  );
}
