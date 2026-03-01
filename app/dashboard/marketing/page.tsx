/**
 * Marketing Dashboard — Thin Orchestrator
 *
 * RBAC-guarded page that composes all marketing panels.
 * Period state is URL-driven via replaceState.
 * All data comes from useMarketingDashboard hook.
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

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <MarketingDashboardHeader state={periodState} onChange={handlePeriodChange} />

      {/* Global error state */}
      {error && !loading && (
        <DashboardCard title="Error" error={error} onRetry={refetch} />
      )}

      {/* Loading skeletons */}
      {loading && (
        <>
          <DashboardCard title="Pipeline" loading />
          <div style={{ height: '1rem' }} />
          <DashboardCard title="Engagement" loading />
        </>
      )}

      {/* Data panels */}
      {!error && (
        <>
          <MarketingPerformanceScore
            kpis={data?.kpis}
            comparisons={data?.comparisons}
            loading={loading}
          />

          <MarketingKPIOverview
            kpis={data?.kpis}
            comparisons={data?.comparisons}
            compareEnabled={periodState.compare}
            loading={loading}
            error={error}
            onRetry={refetch}
          />

          <MarketingAnomaliesPanel anomalies={data?.anomalies} loading={loading} error={error} />

          <MarketingSourcesPanel
            sources={data?.sources ?? []}
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
            loading={loading}
            error={error}
          />

          <MarketingPagesPerformancePanel
            pages={data?.pages ?? []}
            loading={loading}
            error={error}
          />
        </>
      )}
    </DashboardGuard>
  );
}
