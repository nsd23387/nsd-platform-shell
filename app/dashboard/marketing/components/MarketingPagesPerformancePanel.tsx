'use client';

import React from 'react';
import type { MarketingPage } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { DataTable } from '../../../sales-engine/components/ui/DataTable';
import { formatNumber, formatPercent, formatDuration, formatCurrency } from '../lib/format';

interface Props {
  pages: MarketingPage[];
  loading: boolean;
  error: string | null;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url, 'https://placeholder');
    return u.pathname;
  } catch {
    return url;
  }
}

const COLUMNS = [
  { key: 'page_url', header: 'Page', width: '26%', render: (r: MarketingPage) => shortenUrl(r.page_url) },
  { key: 'sessions', header: 'Sessions', width: '10%', align: 'right' as const, render: (r: MarketingPage) => formatNumber(r.sessions) },
  { key: 'bounce_rate', header: 'Bounce', width: '10%', align: 'right' as const, render: (r: MarketingPage) => formatPercent(r.bounce_rate) },
  { key: 'avg_time_on_page_seconds', header: 'Avg Time', width: '10%', align: 'right' as const, render: (r: MarketingPage) => formatDuration(r.avg_time_on_page_seconds) },
  { key: 'clicks', header: 'Clicks', width: '10%', align: 'right' as const, render: (r: MarketingPage) => formatNumber(r.clicks) },
  { key: 'submissions', header: 'Submissions', width: '12%', align: 'right' as const, render: (r: MarketingPage) => formatNumber(r.submissions) },
  { key: 'pipeline_value_usd', header: 'Pipeline ($)', width: '14%', align: 'right' as const, render: (r: MarketingPage) => formatCurrency(r.pipeline_value_usd) },
];

export function MarketingPagesPerformancePanel({ pages, loading, error }: Props) {
  if (loading || error) return null;

  return (
    <DashboardSection title="Pages" description="Per-page engagement, search, and conversion metrics.">
      {pages.length === 0 ? (
        <EmptyStateCard message="No page performance data available." />
      ) : (
        <DataTable<MarketingPage>
          columns={COLUMNS}
          data={pages}
          keyExtractor={(r) => r.page_url}
          emptyMessage="No page data available."
        />
      )}
    </DashboardSection>
  );
}
