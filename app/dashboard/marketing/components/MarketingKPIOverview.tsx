'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { MarketingKPIs, MarketingKPIComparisons } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { formatCurrency, formatNumber, formatPercent, formatDuration, safeNumber } from '../lib/format';
import { text, border, background, violet, indigo, chartColors, trendColors } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

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
  subtitle: string;
  accentColor: string;
}

const PIPELINE_ROW: KPIConfig[] = [
  { title: 'Pipeline Value', key: 'total_pipeline_value_usd', compKey: 'total_pipeline_value_usd', format: formatCurrency, subtitle: 'Total pipeline USD', accentColor: violet[500] },
  { title: 'Submissions', key: 'total_submissions', compKey: 'total_submissions', format: formatNumber, subtitle: 'Form submissions', accentColor: chartColors[1] },
  { title: 'Organic Clicks', key: 'organic_clicks', compKey: 'organic_clicks', format: formatNumber, subtitle: 'Search console clicks', accentColor: chartColors[2] },
  { title: 'Impressions', key: 'impressions', compKey: 'impressions', format: formatNumber, subtitle: 'Search impressions', accentColor: indigo[500] },
];

const ENGAGEMENT_ROW: KPIConfig[] = [
  { title: 'Sessions', key: 'sessions', compKey: 'sessions', format: formatNumber, subtitle: 'Total sessions', accentColor: violet[400] },
  { title: 'Page Views', key: 'page_views', compKey: 'page_views', format: formatNumber, subtitle: 'Total page views', accentColor: indigo[400] },
  { title: 'Bounce Rate', key: 'bounce_rate', format: formatPercent, subtitle: 'Single-page sessions', accentColor: chartColors[3] },
  { title: 'Avg Time on Page', key: 'avg_time_on_page_seconds', format: formatDuration, subtitle: 'Weighted average', accentColor: chartColors[4] },
];

function AnimatedValue({ value, delay = 0 }: { value: string; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <span style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: `opacity 0.4s ease-out, transform 0.4s ease-out`,
      display: 'inline-block',
    }}>
      {value}
    </span>
  );
}

function KPICard({ cfg, kpis, comparisons, compareEnabled, loading, index }: {
  cfg: KPIConfig;
  kpis: MarketingKPIs | undefined;
  comparisons: MarketingKPIComparisons | undefined;
  compareEnabled: boolean;
  loading: boolean;
  index: number;
}) {
  if (loading) return <SkeletonCard lines={2} />;

  const val = safeNumber(kpis?.[cfg.key]);
  const comp = cfg.compKey && compareEnabled ? comparisons?.[cfg.compKey] : undefined;
  const deltaPct = safeNumber(comp?.delta_pct);
  const isUp = deltaPct >= 0;

  return (
    <div
      style={{
        backgroundColor: background.surface,
        border: `1px solid ${border.default}`,
        borderRadius: radius.xl,
        overflow: 'hidden',
        position: 'relative',
      }}
      data-testid={`kpi-card-${cfg.key}`}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: cfg.accentColor,
      }} />
      <div style={{ padding: space['5'] }}>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.muted, marginBottom: space['1'] }}>
        {cfg.title}
      </div>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: text.primary, lineHeight: 1.2 }}>
        <AnimatedValue value={cfg.format(val)} delay={index * 0.05} />
      </div>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted, marginTop: space['1'] }}>
        {cfg.subtitle}
      </div>
      {comp && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: space['1'],
          marginTop: space['2'],
          padding: `${space['0.5']} ${space['2']}`,
          borderRadius: radius.full,
          backgroundColor: isUp ? trendColors.up.bg : trendColors.down.bg,
          fontFamily: fontFamily.body,
          fontSize: fontSize.xs,
          fontWeight: fontWeight.medium,
          color: isUp ? trendColors.up.text : trendColors.down.text,
        }} data-testid={`kpi-delta-${cfg.key}`}>
          {isUp ? '\u2191' : '\u2193'} {Math.abs(deltaPct * 100).toFixed(1)}%
          <span style={{ color: text.muted, fontWeight: fontWeight.normal }}>
            vs prior ({safeNumber(comp.previous).toLocaleString()})
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

function renderRow(row: KPIConfig[], props: Props) {
  return (
    <DashboardGrid columns={{ sm: 1, md: 2, lg: 4 }}>
      {row.map((cfg, i) => (
        <KPICard
          key={cfg.key}
          cfg={cfg}
          kpis={props.kpis}
          comparisons={props.comparisons}
          compareEnabled={props.compareEnabled}
          loading={props.loading}
          index={i}
        />
      ))}
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
