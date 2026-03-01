'use client';

import React, { useState } from 'react';
import type { MarketingSEOQuery } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { DataTable } from '../../../sales-engine/components/ui/DataTable';
import { formatNumber, formatPercent, formatPosition, formatCurrency } from '../lib/format';
import { text, border, background, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

interface Props {
  seoQueries: MarketingSEOQuery[];
  loading: boolean;
  error: string | null;
}

const COLUMNS = [
  { key: 'query', header: 'Query', width: '28%' },
  { key: 'clicks', header: 'Clicks', width: '10%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatNumber(r.clicks) },
  { key: 'impressions', header: 'Impressions', width: '12%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatNumber(r.impressions) },
  { key: 'ctr', header: 'CTR', width: '10%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatPercent(r.ctr) },
  { key: 'avg_position', header: 'Avg Pos', width: '10%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatPosition(r.avg_position) },
  { key: 'submissions', header: 'Submissions', width: '12%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatNumber(r.submissions) },
  { key: 'revenue_per_click', header: 'Rev/Click', width: '12%', align: 'right' as const, render: (r: MarketingSEOQuery) => formatCurrency(r.revenue_per_click) },
];

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    padding: `${space['1']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? semantic.warning.light : background.surface,
    color: active ? semantic.warning.dark : text.muted,
    border: `1px solid ${active ? semantic.warning.base : border.default}`,
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

export function MarketingSeoIntelligencePanel({ seoQueries, loading, error }: Props) {
  const [filterLowCTR, setFilterLowCTR] = useState(false);

  if (loading || error) return null;

  const filtered = filterLowCTR
    ? seoQueries.filter((q) => q.impressions > 100 && q.ctr < 0.02)
    : seoQueries;

  return (
    <DashboardSection title="SEO Query Intelligence" description="Top search queries by clicks with revenue attribution.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: space['3'] }}>
        <button onClick={() => setFilterLowCTR(!filterLowCTR)} style={toggleStyle(filterLowCTR)}>
          High impressions, low CTR
        </button>
      </div>
      {filtered.length === 0 ? (
        <EmptyStateCard message={filterLowCTR ? 'No queries match this filter.' : 'No SEO query data available.'} />
      ) : (
        <DataTable<MarketingSEOQuery>
          columns={COLUMNS}
          data={filtered}
          keyExtractor={(r) => r.query}
          emptyMessage="No SEO data available."
        />
      )}
    </DashboardSection>
  );
}
