'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
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
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';
import { AreaLineChart } from '../../../../components/dashboard/charts/AreaLineChart';
import { violet } from '../../../../design/tokens/colors';
import { getTargetForMetric } from '../lib/marketingTargets';

export default function PostFreeContentPage() {
  const tc = useThemeColors();
  const { data, loading, error } = useContext(MarketingContext);

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
        </div>

        {error && !loading && (
          <DashboardCard title="Error" error={error} />
        )}

        <DashboardSection title="Organic Sessions Trend" description="Daily sessions from organic search and content.">
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
