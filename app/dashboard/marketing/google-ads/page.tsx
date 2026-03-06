'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { MarketingGoogleAdsCampaignsPanel } from '../components/MarketingGoogleAdsCampaignsPanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import type { ExportSection } from '../../../../lib/exportUtils';

function FutureDataSection({ title, description }: { title: string; description: string }) {
  const tc = useThemeColors();
  return (
    <div
      style={{
        padding: space['6'],
        border: `1px dashed ${tc.border.default}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.muted,
        textAlign: 'center' as const,
        marginBottom: space['6'],
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

export default function GoogleAdsWarRoomPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.google_ads_campaigns?.length) {
      sections.push({
        type: 'table',
        title: 'Google Ads Campaigns',
        columns: [
          { key: 'campaign_name', label: 'Campaign' },
          { key: 'status', label: 'Status' },
          { key: 'impressions', label: 'Impressions', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'ctr', label: 'CTR', format: 'percent' },
          { key: 'cpc', label: 'CPC', format: 'currency' },
          { key: 'spend', label: 'Spend', format: 'currency' },
          { key: 'conversions', label: 'Conversions', format: 'number' },
          { key: 'roas', label: 'ROAS', format: 'number' },
        ],
        rows: data.google_ads_campaigns.map((r: any) => ({ ...r })),
      });
    }

    return sections;
  }, [data]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Deep Dives'}, {label:'Google Ads War Room'}]} />
        <div style={{ marginBottom: space['6'], display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap' }}>
          <div>
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
              Google Ads War Room
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Campaign-level detail, budget pacing, and search term triage.
            </p>
          </div>
          <PageExportBar
            filename="google-ads-war-room"
            pdfTitle="Google Ads War Room"
            sections={exportSections}
            loading={loading}
          />
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Campaign Performance" description="Campaign-level metrics from Google Ads.">
          <MarketingGoogleAdsCampaignsPanel
            campaigns={data?.google_ads_campaigns ?? []}
            loading={loading}
            error={error}
          />
        </DashboardSection>

        <DashboardSection title="Ad Group Performance">
          <FutureDataSection
            title="Ad Group Table"
            description="Additional BigQuery tables required. Sync ads_AdGroupStats to see ad group-level spend, CPC, clicks, quotes, CPA, and pipeline."
          />
        </DashboardSection>

        <DashboardSection title="Keyword Performance">
          <FutureDataSection
            title="Keyword Table"
            description="Additional BigQuery tables required. Sync ads_KeywordStats to see keyword-level match type, clicks, CPC, spend, quotes, CPA, and quality score."
          />
        </DashboardSection>

        <DashboardSection title="Search Terms Triage">
          <FutureDataSection
            title="Search Term Triage"
            description="Additional BigQuery tables required. Sync ads_SearchQueryStats to see daily search terms with add-negative, promote-to-exact, and keep/remove actions."
          />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
