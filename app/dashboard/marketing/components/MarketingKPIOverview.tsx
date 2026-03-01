'use client';

import React from 'react';
import type { MarketingKPIs, MarketingKPIComparisons } from '../../../../types/activity-spine';
import { DashboardGrid, MetricCard, DashboardSection } from '../../../../components/dashboard';
import { formatCurrency, formatNumber, formatPercent, formatDuration, safeNumber } from '../lib/format';

interface Props {
  kpis: MarketingKPIs | undefined;
  comparisons: MarketingKPIComparisons | undefined;
  compareEnabled: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

interface KPIConfig {
  title: string;
  key: keyof MarketingKPIs;
  compKey?: keyof MarketingKPIComparisons;
  format: (v: number) => string;
  unit?: string;
  subtitle: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const PIPELINE_ROW: KPIConfig[] = [
  { title: 'Pipeline Value', key: 'total_pipeline_value_usd', compKey: 'total_pipeline_value_usd', format: formatCurrency, subtitle: 'Total pipeline USD', variant: 'success' },
  { title: 'Submissions', key: 'total_submissions', compKey: 'total_submissions', format: formatNumber, subtitle: 'Form submissions' },
  { title: 'Organic Clicks', key: 'organic_clicks', compKey: 'organic_clicks', format: formatNumber, subtitle: 'Search console clicks' },
  { title: 'Impressions', key: 'impressions', compKey: 'impressions', format: formatNumber, subtitle: 'Search impressions' },
];

const ENGAGEMENT_ROW: KPIConfig[] = [
  { title: 'Sessions', key: 'sessions', compKey: 'sessions', format: formatNumber, subtitle: 'Total sessions' },
  { title: 'Page Views', key: 'page_views', compKey: 'page_views', format: formatNumber, subtitle: 'Total page views' },
  { title: 'Bounce Rate', key: 'bounce_rate', format: formatPercent, unit: '', subtitle: 'Single-page sessions' },
  { title: 'Avg Time on Page', key: 'avg_time_on_page_seconds', format: formatDuration, subtitle: 'Weighted average' },
];

function renderRow(row: KPIConfig[], props: Props) {
  return (
    <DashboardGrid columns={4}>
      {row.map((cfg) => {
        const rawVal = props.kpis?.[cfg.key];
        const val = safeNumber(rawVal);
        const comp = cfg.compKey && props.compareEnabled ? props.comparisons?.[cfg.compKey] : undefined;
        const deltaPct = safeNumber(comp?.delta_pct);
        const previous = safeNumber(comp?.previous);

        return (
          <MetricCard
            key={cfg.key}
            title={cfg.title}
            value={!props.loading && !props.error ? cfg.format(val) : undefined}
            unit={cfg.unit}
            subtitle={cfg.subtitle}
            variant={cfg.variant ?? 'default'}
            loading={props.loading}
            error={props.error}
            onRetry={props.onRetry}
            comparison={comp && !props.loading && !props.error ? {
              label: 'vs prior period',
              value: `${deltaPct >= 0 ? '\u2191' : '\u2193'} ${Math.abs(deltaPct * 100).toFixed(1)}% (${previous.toLocaleString()})`,
            } : undefined}
          />
        );
      })}
    </DashboardGrid>
  );
}

export function MarketingKPIOverview(props: Props) {
  return (
    <>
      <DashboardSection title="Pipeline" description="Submission volume and pipeline value for selected period.">
        {renderRow(PIPELINE_ROW, props)}
      </DashboardSection>
      <DashboardSection title="Engagement" description="Site-wide session and engagement metrics for selected period.">
        {renderRow(ENGAGEMENT_ROW, props)}
      </DashboardSection>
    </>
  );
}
