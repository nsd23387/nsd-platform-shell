'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import type { ExportSection } from '../../../../lib/exportUtils';
import { MarketingGoogleAdsOverviewPanel } from '../components/MarketingGoogleAdsOverviewPanel';
import { MarketingGoogleAdsCampaignsPanel } from '../components/MarketingGoogleAdsCampaignsPanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { indigo, magenta } from '../../../../design/tokens/colors';
import { getTargetForMetric, getDailyBudgetTarget, GOOGLE_ADS_TARGETS } from '../lib/marketingTargets';
import { PacingChart } from '../components/adminto/PacingChart';

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
  const { data, loading, error } = useContext(MarketingContext);

  const overview = data?.google_ads_overview ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, cpc: 0, ctr: 0, roas: 0 };
  const campaigns = data?.google_ads_campaigns ?? [];

  const exportSections: ExportSection[] = useMemo(() => {
    const sections: ExportSection[] = [
      {
        type: 'kpis' as const,
        title: 'Google Ads Overview',
        items: [
          { label: 'Spend', value: `$${Number(overview.spend).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
          { label: 'Impressions', value: Number(overview.impressions).toLocaleString('en-US') },
          { label: 'Clicks', value: Number(overview.clicks).toLocaleString('en-US') },
          { label: 'Conversions', value: Number(overview.conversions).toLocaleString('en-US') },
          { label: 'CPC', value: `$${Number(overview.cpc).toFixed(2)}` },
          { label: 'CTR', value: `${Number(overview.ctr).toFixed(1)}%` },
          { label: 'ROAS', value: `${Number(overview.roas).toFixed(2)}x` },
        ],
      },
      {
        type: 'table' as const,
        title: 'Campaigns',
        columns: [
          { key: 'campaign_name', label: 'Campaign' },
          { key: 'spend', label: 'Spend', format: 'currency' as const },
          { key: 'impressions', label: 'Impressions', format: 'number' as const },
          { key: 'clicks', label: 'Clicks', format: 'number' as const },
          { key: 'conversions', label: 'Conversions', format: 'number' as const },
          { key: 'cpc', label: 'CPC', format: 'currency' as const },
          { key: 'ctr', label: 'CTR', format: 'percent' as const },
          { key: 'roas', label: 'ROAS', format: 'number' as const },
        ],
        rows: campaigns as unknown as Record<string, unknown>[],
      },
    ];
    return sections;
  }, [overview, campaigns]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Core 4 Engines'}, {label:'Run Paid Ads'}]} />
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
          <div style={{ marginTop: space['3'] }}>
            <PageExportBar
              filename="paid-ads"
              pdfTitle="Run Paid Ads"
              sections={exportSections}
              loading={loading}
            />
          </div>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Clicks Trend" description="Daily paid search clicks over the selected period.">
          {(() => {
            const clicks = data?.timeseries?.clicks ?? [];
            if (!clicks.length && !loading) return null;
            const chartData = clicks.map((c) => ({ date: c.date, clicks: c.value }));
            const target = getTargetForMetric('clicks', chartData.length || 30);
            return (
              <AreaLineChart
                data={chartData}
                series={[{ dataKey: 'clicks', label: 'Clicks', color: indigo[600] }]}
                height={220}
                targetValue={target?.daily}
                targetLabel={target?.label}
                formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            );
          })()}
        </DashboardSection>

        <MarketingGoogleAdsOverviewPanel
          overview={overview}
          loading={loading}
          error={error}
        />

        <MarketingGoogleAdsCampaignsPanel
          campaigns={campaigns}
          loading={loading}
          error={error}
        />

        <DashboardSection title="Budget Pacing" description="Daily ad spend versus daily budget target.">
          {(() => {
            const pipeline = data?.timeseries?.pipeline_value_usd ?? [];
            const totalSpend = data?.google_ads_overview?.spend ?? 0;
            const daysInPeriod = pipeline.length || 30;
            const dailyTarget = getDailyBudgetTarget(daysInPeriod);

            if (campaigns.length > 0) {
              const pacingData = campaigns.map((c) => ({
                label: c.campaign_name?.length > 20 ? c.campaign_name.slice(0, 18) + '...' : (c.campaign_name || 'Unknown'),
                actual: Number(c.spend) || 0,
                target: dailyTarget,
              }));
              return (
                <PacingChart
                  data={pacingData}
                  title=""
                  targetLabel="Daily Budget"
                  height={260}
                />
              );
            }

            if (totalSpend > 0) {
              return (
                <PacingChart
                  data={[{ label: 'Total', actual: totalSpend, target: GOOGLE_ADS_TARGETS.monthly_budget_usd }]}
                  title=""
                  targetLabel="Monthly Budget"
                  height={200}
                />
              );
            }

            return (
              <div style={{
                padding: space['6'],
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
              }}>
                No spend data available for pacing chart.
              </div>
            );
          })()}
        </DashboardSection>

        <DashboardSection title="Impression Share" description="Coverage and lost impression share data.">
          <ImpressionSharePlaceholder />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
