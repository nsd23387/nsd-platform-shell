'use client';

import React from 'react';
import type { MarketingKPIs, MarketingKPIComparisons, MarketingGoogleAdsOverview, MarketingTimeseries } from '../../../../types/activity-spine';
import { SkeletonCard } from '../../../../components/dashboard';
import { Sparkline } from '../../../../components/dashboard/charts/Sparkline';
import { formatCurrency, formatNumber, formatPercent, safeDivideUI } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { indigo, violet, magenta } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  kpis?: MarketingKPIs;
  comparisons?: MarketingKPIComparisons;
  googleAdsOverview?: MarketingGoogleAdsOverview;
  loading: boolean;
  timeseries?: MarketingTimeseries;
}

interface KPICard {
  label: string;
  value: string;
  delta: number | null;
  testId: string;
  sparkData?: number[];
  sparkColor?: string;
}

function DeltaBadge({ delta, tc }: { delta: number | null; tc: ReturnType<typeof useThemeColors> }) {
  if (delta === null || delta === 0) return null;
  const isPositive = delta > 0;
  const color = isPositive ? '#16a34a' : '#dc2626';
  const arrow = isPositive ? '\u2191' : '\u2193';
  return (
    <span style={{
      fontFamily: fontFamily.body,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color,
      marginLeft: space['2'],
    }}>
      {arrow} {Math.abs(delta * 100).toFixed(1)}%
    </span>
  );
}

export function MarketingExecutiveKPIs({ kpis, comparisons, googleAdsOverview, loading, timeseries }: Props) {
  const tc = useThemeColors();

  if (loading || !kpis) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: space['4'], marginBottom: space['6'] }}>
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} height={100} />)}
      </div>
    );
  }

  const conversionRate = safeDivideUI(kpis.total_submissions, kpis.sessions);
  const avgDealSize = safeDivideUI(kpis.total_pipeline_value_usd, kpis.total_submissions);

  const cards: KPICard[] = [
    {
      label: 'Pipeline Value',
      value: formatCurrency(kpis.total_pipeline_value_usd),
      delta: comparisons?.total_pipeline_value_usd.delta_pct ?? null,
      testId: 'exec-kpi-pipeline',
      sparkData: timeseries?.pipeline_value_usd?.map(d => d.value),
      sparkColor: magenta[500],
    },
    {
      label: 'Sessions',
      value: formatNumber(kpis.sessions),
      delta: comparisons?.sessions.delta_pct ?? null,
      testId: 'exec-kpi-sessions',
      sparkData: timeseries?.sessions?.map(d => d.value),
      sparkColor: indigo[600],
    },
    {
      label: 'Conversion Rate',
      value: formatPercent(conversionRate),
      delta: null,
      testId: 'exec-kpi-conversion-rate',
    },
    {
      label: 'Avg Deal Size',
      value: formatCurrency(avgDealSize),
      delta: null,
      testId: 'exec-kpi-avg-deal',
    },
  ];

  const hasAds = googleAdsOverview && (googleAdsOverview.spend > 0 || googleAdsOverview.impressions > 0);
  if (hasAds) {
    cards.push(
      {
        label: 'Ad Spend',
        value: formatCurrency(googleAdsOverview.spend),
        delta: null,
        testId: 'exec-kpi-spend',
      },
      {
        label: 'ROAS',
        value: googleAdsOverview.roas.toFixed(2) + 'x',
        delta: null,
        testId: 'exec-kpi-roas',
      },
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: space['4'], marginBottom: space['6'] }} data-testid="panel-executive-kpis">
      {cards.map((card) => (
        <div
          key={card.testId}
          style={{
            backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.xl,
            padding: space['5'],
          }}
          data-testid={card.testId}
        >
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>
            {card.label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontFamily: fontFamily.display, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                {card.value}
              </span>
              <DeltaBadge delta={card.delta} tc={tc} />
            </div>
            {card.sparkData && card.sparkData.length >= 2 && (
              <Sparkline data={card.sparkData} color={card.sparkColor} width={80} height={32} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
