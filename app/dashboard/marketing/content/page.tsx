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
import { space } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';

export default function PostFreeContentPage() {
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
            Post Free Content
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Organic search performance, content attribution, and SEO pipeline.
          </p>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <MarketingSeoRevenuePanel
          pages={data?.pages ?? []}
          loading={loading}
          error={error}
        />

        <MarketingSeoIntelligencePanel
          seoQueries={data?.seo_queries ?? []}
          seoMovers={data?.seo_movers ?? []}
          loading={loading}
          error={error}
        />

        <MarketingPagesPerformancePanel
          pages={data?.pages ?? []}
          loading={loading}
          error={error}
        />
      </div>
    </DashboardGuard>
  );
}
