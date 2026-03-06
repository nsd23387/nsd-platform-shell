'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { MarketingSeoRevenuePanel } from '../components/MarketingSeoRevenuePanel';
import { MarketingSeoIntelligencePanel } from '../components/MarketingSeoIntelligencePanel';
import { MarketingPagesPerformancePanel } from '../components/MarketingPagesPerformancePanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { indigo, violet } from '../../../../design/tokens/colors';
import { getTargetForMetric } from '../lib/marketingTargets';
import type { ExportSection } from '../../../../lib/exportUtils';

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
  const { data, loading, error } = useContext(MarketingContext);

  const exportSections = useMemo<ExportSection[]>(() => {
    if (!data) return [];
    const sections: ExportSection[] = [];

    if (data.seo_queries?.length) {
      sections.push({
        type: 'table',
        title: 'SEO Queries',
        columns: [
          { key: 'query', label: 'Query' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'impressions', label: 'Impressions', format: 'number' },
          { key: 'ctr', label: 'CTR', format: 'percent' },
          { key: 'position', label: 'Position', format: 'number' },
        ],
        rows: data.seo_queries.map((r: any) => ({ ...r })),
      });
    }

    if (data.seo_movers?.length) {
      sections.push({
        type: 'table',
        title: 'SEO Movers',
        columns: [
          { key: 'query', label: 'Query' },
          { key: 'clicks_delta', label: 'Clicks Delta', format: 'number' },
          { key: 'impressions_delta', label: 'Impressions Delta', format: 'number' },
          { key: 'position_delta', label: 'Position Delta', format: 'number' },
        ],
        rows: data.seo_movers.map((r: any) => ({ ...r })),
      });
    }

    if (data.pages?.length) {
      sections.push({
        type: 'table',
        title: 'Page Performance',
        columns: [
          { key: 'page', label: 'Page' },
          { key: 'sessions', label: 'Sessions', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'quotes', label: 'Quotes', format: 'number' },
          { key: 'pipeline_value_usd', label: 'Pipeline', format: 'currency' },
        ],
        rows: data.pages.map((r: any) => ({ ...r })),
      });
    }

    return sections;
  }, [data]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Deep Dives'}, {label:'SEO Command Center'}]} />
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
              SEO Command Center
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Query opportunities, page performance, and technical health.
            </p>
          </div>
          <PageExportBar
            filename="seo-command-center"
            pdfTitle="SEO Command Center"
            sections={exportSections}
            loading={loading}
          />
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Search Performance Trend" description="Daily clicks and impressions from Google Search Console." index={0}>
          {(() => {
            const clicks = data?.timeseries?.clicks ?? [];
            const impressions = data?.timeseries?.impressions ?? [];
            if (!clicks.length && !impressions.length && !loading) return null;
            const merged = clicks.map((c, i) => ({
              date: c.date,
              clicks: c.value,
              impressions: impressions[i]?.value ?? 0,
            }));
            const clicksTarget = getTargetForMetric('clicks', merged.length || 30);
            return (
              <AreaLineChart
                data={merged}
                series={[
                  { dataKey: 'clicks', label: 'Clicks', color: indigo[600] },
                  { dataKey: 'impressions', label: 'Impressions', color: violet[500] },
                ]}
                height={220}
                targetValue={clicksTarget?.daily}
                targetLabel={clicksTarget?.label}
                formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            );
          })()}
        </DashboardSection>

        <DashboardSection title="Query Opportunities" description="Search queries with opportunity tags for optimization." index={1}>
          <MarketingSeoIntelligencePanel
            seoQueries={data?.seo_queries ?? []}
            seoMovers={data?.seo_movers ?? []}
            loading={loading}
            error={error}
          />
        </DashboardSection>

        <DashboardSection title="Page Performance" description="Organic page engagement and pipeline attribution." index={2}>
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

        <DashboardSection title="Technical Health" index={3}>
          <TechnicalHealthPlaceholder />
        </DashboardSection>
      </div>
    </DashboardGuard>
  );
}
