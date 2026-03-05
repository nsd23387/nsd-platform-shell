'use client';

import React, { useContext } from 'react';
import { useMarketingDashboard } from '../../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { DashboardCard, AccessDenied } from '../../../../components/dashboard';
import { MarketingKPIOverview } from '../components/MarketingKPIOverview';
import { MarketingFunnelPanel } from '../components/MarketingFunnelPanel';
import { MarketingGA4FunnelPanel } from '../components/MarketingGA4FunnelPanel';
import { MarketingChannelPerformancePanel } from '../components/MarketingChannelPerformancePanel';
import { MarketingGoogleAdsOverviewPanel } from '../components/MarketingGoogleAdsOverviewPanel';
import { MarketingGoogleAdsCampaignsPanel } from '../components/MarketingGoogleAdsCampaignsPanel';
import { MarketingAnomaliesPanel } from '../components/MarketingAnomaliesPanel';
import { MarketingSourcesPanel } from '../components/MarketingSourcesPanel';
import { MarketingPipelineCategoryPanel } from '../components/MarketingPipelineCategoryPanel';
import { MarketingRecentConversionsPanel } from '../components/MarketingRecentConversionsPanel';
import { MarketingAudiencePanel } from '../components/MarketingAudiencePanel';
import { MarketingSeoRevenuePanel } from '../components/MarketingSeoRevenuePanel';
import { MarketingTimeseriesPanel } from '../components/MarketingTimeseriesPanel';
import { MarketingSeoIntelligencePanel } from '../components/MarketingSeoIntelligencePanel';
import { MarketingPagesPerformancePanel } from '../components/MarketingPagesPerformancePanel';
import { MarketingPipelineHealthPanel } from '../components/MarketingPipelineHealthPanel';
import { space } from '../../../../design/tokens/spacing';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { MarketingContext } from '../lib/MarketingContext';

const EMPTY_GA4_FUNNEL = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 };

export default function OperatorHubPage() {
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
            Operator Hub
          </h1>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              color: tc.text.muted,
              lineHeight: lineHeight.normal,
            }}
          >
            Daily operational intelligence and actionable watchlists.
          </p>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} onRetry={refetch} />
        )}

        <MarketingKPIOverview
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          compareEnabled={periodState.compare}
          loading={loading}
          error={error}
          onRetry={refetch}
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

        <MarketingChannelPerformancePanel
          channels={data?.channel_performance ?? []}
          loading={loading}
          error={error}
        />

        <MarketingGoogleAdsOverviewPanel
          overview={data?.google_ads_overview ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 0, ctr: 0, roas: 0 }}
          loading={loading}
          error={error}
        />

        <MarketingGoogleAdsCampaignsPanel
          campaigns={data?.google_ads_campaigns ?? []}
          loading={loading}
          error={error}
        />

        <MarketingAnomaliesPanel anomalies={data?.anomalies} loading={loading} error={error} />

        <MarketingSourcesPanel sources={data?.sources ?? []} loading={loading} error={error} />

        <MarketingPipelineCategoryPanel categories={data?.pipeline_categories ?? []} loading={loading} error={error} />

        <MarketingRecentConversionsPanel conversions={data?.recent_conversions ?? []} loading={loading} error={error} />

        <MarketingAudiencePanel
          devices={data?.device_breakdown ?? []}
          countries={data?.country_breakdown ?? []}
          loading={loading}
          error={error}
        />

        <MarketingSeoRevenuePanel pages={data?.pages ?? []} loading={loading} error={error} />

        <MarketingTimeseriesPanel
          timeseries={data?.timeseries}
          enabled={periodState.includeTimeseries}
          loading={loading}
          error={error}
        />

        <MarketingSeoIntelligencePanel
          seoQueries={data?.seo_queries ?? []}
          seoMovers={data?.seo_movers ?? []}
          loading={loading}
          error={error}
        />

        <MarketingPagesPerformancePanel pages={data?.pages ?? []} loading={loading} error={error} />

        <MarketingPipelineHealthPanel health={data?.pipeline_health ?? []} loading={loading} error={error} />
      </div>
    </DashboardGuard>
  );
}
