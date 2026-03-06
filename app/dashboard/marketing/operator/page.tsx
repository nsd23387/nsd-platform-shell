'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { DashboardCard, AccessDenied } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import type { ExportSection } from '../../../../lib/exportUtils';
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
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

const EMPTY_GA4_FUNNEL = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 };

export default function OperatorHubPage() {
  const tc = useThemeColors();
  const { periodState, data, loading, error, refetch } = useContext(MarketingContext);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.sources?.length) {
      sections.push({
        type: 'table',
        title: 'Traffic Sources',
        columns: [
          { key: 'source', label: 'Source' },
          { key: 'sessions', label: 'Sessions', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'quotes', label: 'Quotes', format: 'number' },
          { key: 'pipeline_value_usd', label: 'Pipeline', format: 'currency' },
        ],
        rows: data.sources as unknown as Record<string, unknown>[],
      });
    }

    if (data.recent_conversions?.length) {
      sections.push({
        type: 'table',
        title: 'Recent Conversions',
        columns: [
          { key: 'landing_page', label: 'Landing Page' },
          { key: 'source', label: 'Source' },
          { key: 'event_name', label: 'Event' },
          { key: 'event_date', label: 'Date' },
          { key: 'value_usd', label: 'Value', format: 'currency' },
        ],
        rows: data.recent_conversions as unknown as Record<string, unknown>[],
      });
    }

    if (data.pipeline_health?.length) {
      sections.push({
        type: 'table',
        title: 'Pipeline Health',
        columns: [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
          { key: 'status', label: 'Status' },
        ],
        rows: data.pipeline_health as unknown as Record<string, unknown>[],
      });
    }

    if (data.device_breakdown?.length || data.country_breakdown?.length) {
      if (data.device_breakdown?.length) {
        sections.push({
          type: 'table',
          title: 'Audience — Devices',
          columns: [
            { key: 'device', label: 'Device' },
            { key: 'sessions', label: 'Sessions', format: 'number' },
            { key: 'percentage', label: 'Share', format: 'percent' },
          ],
          rows: data.device_breakdown as unknown as Record<string, unknown>[],
        });
      }
      if (data.country_breakdown?.length) {
        sections.push({
          type: 'table',
          title: 'Audience — Countries',
          columns: [
            { key: 'country', label: 'Country' },
            { key: 'sessions', label: 'Sessions', format: 'number' },
            { key: 'percentage', label: 'Share', format: 'percent' },
          ],
          rows: data.country_breakdown as unknown as Record<string, unknown>[],
        });
      }
    }

    if (data.pipeline_categories?.length) {
      sections.push({
        type: 'table',
        title: 'Pipeline Categories',
        columns: [
          { key: 'category', label: 'Category' },
          { key: 'count', label: 'Count', format: 'number' },
          { key: 'value_usd', label: 'Value', format: 'currency' },
        ],
        rows: data.pipeline_categories as unknown as Record<string, unknown>[],
      });
    }

    return sections;
  }, [data]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Overview'}, {label:'Operator Hub'}]} />
        <div style={{ marginBottom: space['6'], display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
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
          <PageExportBar
            filename="operator-hub"
            pdfTitle="Operator Hub"
            sections={exportSections}
            loading={loading}
          />
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
