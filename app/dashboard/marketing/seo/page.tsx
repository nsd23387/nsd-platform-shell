'use client';

import React, { useContext } from 'react';
import { useMarketingDashboard } from '../../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { MarketingSeoRevenuePanel } from '../components/MarketingSeoRevenuePanel';
import { MarketingSeoIntelligencePanel } from '../components/MarketingSeoIntelligencePanel';
import { MarketingPagesPerformancePanel } from '../components/MarketingPagesPerformancePanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';

function TechnicalHealthPlaceholder() {
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
        Technical SEO Health
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        Index coverage, Core Web Vitals, and crawl errors will appear here once connected to Google Search Console API.
      </p>
    </div>
  );
}

export default function SeoCommandCenterPage() {
  const tc = useThemeColors();
  const { queryParams } = useContext(MarketingContext);
  const { data, loading, error } = useMarketingDashboard(queryParams);

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
            SEO Command Center
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Query opportunities, page performance, and technical health.
          </p>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Query Opportunities" description="Search queries with opportunity tags for optimization.">
          <MarketingSeoIntelligencePanel
            seoQueries={data?.seo_queries ?? []}
            seoMovers={data?.seo_movers ?? []}
            loading={loading}
            error={error}
          />
        </DashboardSection>

        <DashboardSection title="Page Performance" description="Organic page engagement and pipeline attribution.">
          <MarketingSeoRevenuePanel
            pages={data?.pages ?? []}
            loading={loading}
            error={error}
          />
          <MarketingPagesPerformancePanel
            pages={data?.pages ?? []}
            loading={loading}
            error={error}
          />
        </DashboardSection>

        <DashboardSection title="Technical Health">
          <TechnicalHealthPlaceholder />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
