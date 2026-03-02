'use client';

import React, { useState } from 'react';
import type { MarketingSEOQuery, MarketingSEOQueryMover } from '../../../../types/activity-spine';
import { DashboardSection, DashboardGrid, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DataTable } from '../../../sales-engine/components/ui/DataTable';
import { formatNumber, formatPercent, formatPosition, formatCurrency } from '../lib/format';
import { violet } from '../../../../design/tokens/colors';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import type { ThemeColors } from '../../../../design/tokens/theme-colors';

interface Props {
  seoQueries: MarketingSEOQuery[];
  seoMovers?: MarketingSEOQueryMover[];
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

function toggleStyle(active: boolean, tc: ThemeColors): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space['2'],
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? violet[50] : 'transparent',
    color: active ? violet[700] : tc.text.muted,
    border: `1px solid ${active ? violet[200] : tc.border.default}`,
    borderRadius: radius.full,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

function MoversCard({ movers, direction }: { movers: MarketingSEOQueryMover[]; direction: 'rising' | 'falling' }) {
  const tc = useThemeColors();
  const filtered = movers.filter((m) => m.direction === direction);
  if (filtered.length === 0) return null;

  const isRising = direction === 'rising';
  const arrow = isRising ? '\u2191' : '\u2193';
  const cardBg = isRising ? tc.semantic.info.light : tc.semantic.danger.light;
  const borderColor = isRising ? tc.semantic.info.base : tc.semantic.danger.base;
  const badgeColor = isRising ? tc.semantic.info.dark : tc.semantic.danger.dark;
  const badgeBg = isRising ? `${tc.semantic.info.base}22` : `${tc.semantic.danger.base}22`;

  return (
    <div style={{
      backgroundColor: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: radius.xl,
      padding: space['5'],
      opacity: 0,
      animation: 'fadeIn 0.4s ease-out 0.1s forwards',
    }} data-testid={`card-seo-movers-${direction}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginBottom: space['3'] }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: radius.full,
          backgroundColor: badgeBg,
          color: badgeColor,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.semibold,
        }}>
          {arrow}
        </span>
        <h4 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
          {isRising ? 'Rising' : 'Falling'} Queries
        </h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
        {filtered.map((m, idx) => (
          <div
            key={m.query}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: `${space['2']} ${space['3']}`,
              borderRadius: radius.lg,
              backgroundColor: tc.background.surface,
              opacity: 0.7,
              transition: `opacity ${duration.fast}`,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
            data-testid={`row-mover-${direction}-${idx}`}
          >
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, flex: 1 }}>{m.query}</span>
            <span style={{
              fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium,
              color: badgeColor, backgroundColor: badgeBg,
              padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full, whiteSpace: 'nowrap',
            }}>
              {isRising ? 'Rising' : 'Falling'} {arrow} {Math.abs(m.delta_pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export function MarketingSeoIntelligencePanel({ seoQueries, seoMovers = [], loading, error }: Props) {
  const tc = useThemeColors();
  const [filterLowCTR, setFilterLowCTR] = useState(false);

  if (loading) {
    return (
      <DashboardSection title="SEO Query Intelligence" description="Top search queries by clicks with revenue attribution.">
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={160} />
          <SkeletonCard height={160} />
        </DashboardGrid>
        <div style={{ marginTop: space['4'] }}>
          <SkeletonCard height={200} lines={5} />
        </div>
      </DashboardSection>
    );
  }
  if (error) return null;

  const filtered = filterLowCTR
    ? seoQueries.filter((q) => q.impressions > 100 && q.ctr < 0.02)
    : seoQueries;

  return (
    <DashboardSection title="SEO Query Intelligence" description="Top search queries by clicks with revenue attribution.">
      {seoMovers.length > 0 && (
        <div style={{ marginBottom: space['4'] }}>
          <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
            <MoversCard movers={seoMovers} direction="rising" />
            <MoversCard movers={seoMovers} direction="falling" />
          </DashboardGrid>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: space['3'] }}>
        <button onClick={() => setFilterLowCTR(!filterLowCTR)} style={toggleStyle(filterLowCTR, tc)} data-testid="toggle-low-ctr">
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            backgroundColor: filterLowCTR ? violet[500] : tc.border.strong,
            display: 'inline-block',
            transition: `background-color ${duration.normal}`,
          }} />
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
          pageSize={10}
          defaultSortKey="impressions"
          defaultSortDir="desc"
        />
      )}
    </DashboardSection>
  );
}
