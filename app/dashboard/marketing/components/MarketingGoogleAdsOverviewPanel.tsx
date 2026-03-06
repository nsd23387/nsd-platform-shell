'use client';

import React from 'react';
import type { MarketingGoogleAdsOverview } from '../../../../types/activity-spine';
import { DashboardSection, SkeletonCard } from '../../../../components/dashboard';
import { formatNumber, formatCurrency, formatPercent } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  overview: MarketingGoogleAdsOverview;
  loading: boolean;
  error: string | null;
}

interface KPICardProps {
  label: string;
  value: string;
  testId: string;
}

function KPICard({ label, value, testId }: KPICardProps) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['4'],
        flex: '1 1 0',
        minWidth: '120px',
      }}
      data-testid={testId}
    >
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted, marginBottom: space['1'] }}>
        {label}
      </div>
      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
        {value}
      </div>
    </div>
  );
}

export function MarketingGoogleAdsOverviewPanel({ overview, loading, error }: Props) {
  if (loading) {
    return (
      <DashboardSection title="Google Ads" description="Paid search performance from Google Ads via BigQuery.">
        <SkeletonCard height={100} />
      </DashboardSection>
    );
  }
  if (error) return null;

  const hasData = overview.spend > 0 || overview.impressions > 0 || overview.clicks > 0;
  if (!hasData) return null;

  return (
    <DashboardSection title="Google Ads" description="Paid search performance from Google Ads via BigQuery.">
      <div
        style={{ display: 'flex', gap: space['3'], flexWrap: 'wrap' }}
        data-testid="panel-google-ads-overview"
      >
        <KPICard label="Spend" value={formatCurrency(overview.spend)} testId="gads-spend" />
        <KPICard label="Impressions" value={formatNumber(overview.impressions)} testId="gads-impressions" />
        <KPICard label="Clicks" value={formatNumber(overview.clicks)} testId="gads-clicks" />
        <KPICard label="Conversions" value={formatNumber(overview.conversions)} testId="gads-conversions" />
        <KPICard label="CPC" value={formatCurrency(overview.cpc)} testId="gads-cpc" />
        <KPICard label="CTR" value={formatPercent(overview.ctr)} testId="gads-ctr" />
        <KPICard label="ROAS" value={overview.roas.toFixed(2) + 'x'} testId="gads-roas" />
      </div>
    </DashboardSection>
  );
}
