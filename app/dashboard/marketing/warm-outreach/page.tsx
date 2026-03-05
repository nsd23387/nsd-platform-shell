'use client';

import React, { useContext } from 'react';
import { useMarketingDashboard } from '../../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { DashboardCard } from '../../../../components/dashboard/DashboardCard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';

function EmptyDataCard({ title, description }: { title: string; description: string }) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        padding: space['6'],
        border: `1px dashed ${tc.border.default}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.muted,
        textAlign: 'center' as const,
      }}
    >
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: space['2'] }}>
        {title}
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        {description}
      </p>
    </div>
  );
}

export default function WarmOutreachPage() {
  const tc = useThemeColors();
  const { queryParams } = useContext(MarketingContext);
  const { data, loading, error } = useMarketingDashboard(queryParams);

  const conversions = data?.recent_conversions ?? [];
  const pipeline = data?.pipeline_categories ?? [];

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <div style={{ marginBottom: space['6'] }}>
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
            Warm Outreach
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Quote follow-ups, close rates, and returning visitor revenue.
          </p>
        </div>

        <DashboardSection title="Available Data" description="Conversion events and pipeline from existing sources.">
          <DashboardGrid columns={{ sm: 1, md: 2, lg: 3 }}>
            <DashboardCard title="Recent Conversions" loading={loading}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-warm-conversions">
                {conversions.length}
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>conversion events tracked</p>
            </DashboardCard>
            <DashboardCard title="Pipeline Categories" loading={loading}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize['3xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-warm-pipeline-cats">
                {pipeline.length}
              </p>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>active categories</p>
            </DashboardCard>
          </DashboardGrid>
        </DashboardSection>

        <DashboardSection title="CRM Integration Required" description="The following metrics require CRM data connection.">
          <DashboardGrid columns={{ sm: 1, md: 2, lg: 3 }}>
            <EmptyDataCard title="Quote Aging Buckets" description="Connect CRM to see 0-2, 3-7, 8-14, 15+ day aging." />
            <EmptyDataCard title="Quote-to-Close Rate" description="Connect CRM to track close rates over time." />
            <EmptyDataCard title="Average Time to Close" description="Connect CRM for deal velocity metrics." />
            <EmptyDataCard title="Returning Visitor Revenue" description="Connect CRM for revenue attribution." />
            <EmptyDataCard title="Discount Usage Rate" description="Connect CRM to track discount patterns." />
            <EmptyDataCard title="Close Rate Trend" description="Connect CRM for historical close rate data." />
          </DashboardGrid>
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
