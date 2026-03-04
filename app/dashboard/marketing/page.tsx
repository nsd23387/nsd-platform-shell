/**
 * Marketing Dashboard — Thin Orchestrator
 *
 * RBAC-guarded page that composes all marketing panels.
 * Period state is URL-driven via replaceState.
 * All data comes from useMarketingDashboard hook.
 *
 * Supports two views:
 * - Operator: Full operational detail (all panels)
 * - Executive: Strategic summary (KPIs, channel breakdown, funnel, trends)
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useMarketingDashboard } from '../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { DashboardCard, AccessDenied, MarketingPerformanceScore } from '../../../components/dashboard';
import { parsePeriodState, toBackendParams, updateUrl } from './lib/period';
import type { PeriodState } from './lib/period';
import { MarketingDashboardHeader } from './components/MarketingDashboardHeader';
import { MarketingKPIOverview } from './components/MarketingKPIOverview';
import { MarketingSourcesPanel } from './components/MarketingSourcesPanel';
import { MarketingSeoRevenuePanel } from './components/MarketingSeoRevenuePanel';
import { MarketingSeoIntelligencePanel } from './components/MarketingSeoIntelligencePanel';
import { MarketingPagesPerformancePanel } from './components/MarketingPagesPerformancePanel';
import { MarketingTimeseriesPanel } from './components/MarketingTimeseriesPanel';
import { MarketingAnomaliesPanel } from './components/MarketingAnomaliesPanel';
import { MarketingAudiencePanel } from './components/MarketingAudiencePanel';
import { MarketingPipelineCategoryPanel } from './components/MarketingPipelineCategoryPanel';
import { MarketingRecentConversionsPanel } from './components/MarketingRecentConversionsPanel';
import { MarketingFunnelPanel } from './components/MarketingFunnelPanel';
import { MarketingPipelineHealthPanel } from './components/MarketingPipelineHealthPanel';
import { MarketingChannelPerformancePanel } from './components/MarketingChannelPerformancePanel';
import { MarketingGA4FunnelPanel } from './components/MarketingGA4FunnelPanel';
import { MarketingExecutiveKPIs } from './components/MarketingExecutiveKPIs';
import { MarketingChannelBreakdownPanel } from './components/MarketingChannelBreakdownPanel';
import { space } from '../../../design/tokens/spacing';

const EMPTY_GA4_FUNNEL = { view_item: 0, add_to_cart: 0, begin_checkout: 0, purchase: 0, form_start: 0, form_submit: 0 };

export default function MarketingDashboard() {
  const [periodState, setPeriodState] = useState<PeriodState>(() => parsePeriodState());

  useEffect(() => {
    setPeriodState(parsePeriodState());
  }, []);

  const handlePeriodChange = useCallback((next: PeriodState) => {
    setPeriodState(next);
    updateUrl(next);
  }, []);

  const queryParams = useMemo(() => toBackendParams(periodState), [periodState]);
  const { data, loading, error, refetch } = useMarketingDashboard(queryParams);

  const isExecutive = periodState.view === 'executive';

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <MarketingDashboardHeader state={periodState} onChange={handlePeriodChange} />

        {error && !loading && (
          <DashboardCard title="Error" error={error} onRetry={refetch} />
        )}

        <MarketingPerformanceScore
          kpis={data?.kpis}
          comparisons={data?.comparisons}
          loading={loading}
        />

        {isExecutive ? (
          <>
            <MarketingExecutiveKPIs
              kpis={data?.kpis}
              comparisons={data?.comparisons}
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
          </>
        ) : (
          <>
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

            <MarketingAnomaliesPanel anomalies={data?.anomalies} loading={loading} error={error} />

            <MarketingSourcesPanel
              sources={data?.sources ?? []}
              loading={loading}
              error={error}
            />

            <MarketingPipelineCategoryPanel
              categories={data?.pipeline_categories ?? []}
              loading={loading}
              error={error}
            />

            <MarketingRecentConversionsPanel
              conversions={data?.recent_conversions ?? []}
              loading={loading}
              error={error}
            />

            <MarketingAudiencePanel
              devices={data?.device_breakdown ?? []}
              countries={data?.country_breakdown ?? []}
              loading={loading}
              error={error}
            />

            <MarketingSeoRevenuePanel
              pages={data?.pages ?? []}
              loading={loading}
              error={error}
            />

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

            <MarketingPagesPerformancePanel
              pages={data?.pages ?? []}
              loading={loading}
              error={error}
            />

            <MarketingPipelineHealthPanel
              health={data?.pipeline_health ?? []}
              loading={loading}
              error={error}
            />
          </>
        )}
      </div>
    </DashboardGuard>
  );
}
