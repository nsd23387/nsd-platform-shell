'use client';

import React, { useContext, useMemo } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { PageExportBar } from '../../../../components/dashboard/PageExportBar';
import { MarketingSeoRevenuePanel } from '../components/MarketingSeoRevenuePanel';
import { MarketingSeoIntelligencePanel } from '../components/MarketingSeoIntelligencePanel';
import { MarketingPagesPerformancePanel } from '../components/MarketingPagesPerformancePanel';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space } from '../../../../design/tokens/spacing';
import { MarketingContext } from '../lib/MarketingContext';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { violet } from '../../../../design/tokens/colors';
import { getTargetForMetric } from '../lib/marketingTargets';
import type { ExportSection } from '../../../../lib/exportUtils';

export default function PostFreeContentPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);

  const exportSections: ExportSection[] = useMemo(() => {
    const sections: ExportSection[] = [];

    const seoQueries = data?.seo_queries ?? [];
    if (seoQueries.length) {
      sections.push({
        type: 'table' as const,
        title: 'SEO Queries',
        columns: [
          { key: 'query', label: 'Query' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'impressions', label: 'Impressions', format: 'number' },
          { key: 'ctr', label: 'CTR', format: 'percent' },
          { key: 'avg_position', label: 'Avg Position', format: 'number' },
          { key: 'submissions', label: 'Submissions', format: 'number' },
          { key: 'pipeline_value_usd', label: 'Pipeline Value', format: 'currency' },
          { key: 'revenue_per_click', label: 'Rev/Click', format: 'currency' },
        ],
        rows: seoQueries as unknown as Record<string, unknown>[],
      });
    }

    const pages = data?.pages ?? [];
    if (pages.length) {
      sections.push({
        type: 'table' as const,
        title: 'Pages Performance',
        columns: [
          { key: 'page_url', label: 'Page URL' },
          { key: 'sessions', label: 'Sessions', format: 'number' },
          { key: 'page_views', label: 'Page Views', format: 'number' },
          { key: 'bounce_rate', label: 'Bounce Rate', format: 'percent' },
          { key: 'avg_time_on_page_seconds', label: 'Avg Time (s)', format: 'number' },
          { key: 'clicks', label: 'Clicks', format: 'number' },
          { key: 'impressions', label: 'Impressions', format: 'number' },
          { key: 'ctr', label: 'CTR', format: 'percent' },
          { key: 'submissions', label: 'Submissions', format: 'number' },
          { key: 'pipeline_value_usd', label: 'Pipeline Value', format: 'currency' },
        ],
        rows: pages as unknown as Record<string, unknown>[],
      });
    }

    const seoMovers = data?.seo_movers ?? [];
    if (seoMovers.length) {
      sections.push({
        type: 'table' as const,
        title: 'SEO Movers',
        columns: [
          { key: 'query', label: 'Query' },
          { key: 'impressions_first_half', label: 'Impressions (1st Half)', format: 'number' },
          { key: 'impressions_second_half', label: 'Impressions (2nd Half)', format: 'number' },
          { key: 'delta_pct', label: 'Delta %', format: 'percent' },
          { key: 'direction', label: 'Direction' },
        ],
        rows: seoMovers as unknown as Record<string, unknown>[],
      });
    }

    return sections;
  }, [data?.seo_queries, data?.pages, data?.seo_movers]);

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{label:'Marketing', href:'/dashboard/marketing'}, {label:'Core 4 Engines'}, {label:'SEO'}]} />
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
            SEO
          </h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
            Organic search performance, content attribution, and SEO pipeline.
          </p>
          <div style={{ marginTop: space['3'] }}>
            <PageExportBar
              filename="seo-content"
              pdfTitle="SEO Content Performance"
              sections={exportSections}
              loading={loading}
            />
          </div>
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Organic Sessions Trend" description="Daily sessions from organic search and content." index={0}>
          {(() => {
            const sessions = data?.timeseries?.sessions ?? [];
            if (!sessions.length && !loading) return null;
            const chartData = sessions.map((s) => ({ date: s.date, sessions: s.value }));
            const target = getTargetForMetric('sessions', chartData.length || 30);
            return (
              <AreaLineChart
                data={chartData}
                series={[{ dataKey: 'sessions', label: 'Sessions', color: violet[500] }]}
                height={220}
                targetValue={target?.daily}
                targetLabel={target?.label}
                formatXAxis={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
            );
          })()}
        </DashboardSection>

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
