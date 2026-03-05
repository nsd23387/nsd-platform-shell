'use client';

import React, { useContext } from 'react';
import { useMarketingDashboard } from '../../../../hooks/useActivitySpine';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { MarketingGoogleAdsOverviewPanel } from '../components/MarketingGoogleAdsOverviewPanel';
import { MarketingGoogleAdsCampaignsPanel } from '../components/MarketingGoogleAdsCampaignsPanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { MarketingContext } from '../lib/MarketingContext';

function ImpressionSharePlaceholder() {
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
        Impression Share Metrics
      </p>
      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
        Search IS, Lost IS (Budget), Lost IS (Rank) — requires BigQuery schema expansion to include impression share columns.
      </p>
    </div>
  );
}

export default function PaidAdsPage() {
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
            Run Paid Ads
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Spend, ROAS, campaign performance, and budget pacing for all paid channels.
          </p>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <MarketingGoogleAdsOverviewPanel
          overview={data?.google_ads_overview ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 0, ctr: 0, roas: 0 }}
          loading={loading}
          error={error}
        />

        <MarketingGoogleAdsCampaignsPanel
          campaigns={data?.google_ads_campaigns ?? []}
          loading={loading}
          error={error}
        />

        <DashboardSection title="Impression Share" description="Coverage and lost impression share data.">
          <ImpressionSharePlaceholder />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
