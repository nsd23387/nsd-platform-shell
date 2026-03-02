'use client';

import React from 'react';
import type { MarketingPipelineCategory } from '../../../../types/activity-spine';
import { DashboardSection, DashboardGrid, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DonutChart } from '../../../../components/dashboard/charts';
import { BarChart } from '../../../../components/dashboard/charts';
import { formatCurrency, formatNumber } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  categories: MarketingPipelineCategory[];
  loading: boolean;
  error: string | null;
}

export function MarketingPipelineCategoryPanel({ categories, loading, error }: Props) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <DashboardSection title="Pipeline by Category" description="Pipeline value and submissions by product type.">
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={220} />
          <SkeletonCard height={220} />
        </DashboardGrid>
      </DashboardSection>
    );
  }
  if (error) return null;

  if (categories.length === 0) {
    return (
      <DashboardSection title="Pipeline by Category" description="Pipeline value and submissions by product type.">
        <EmptyStateCard message="No product category data available." />
      </DashboardSection>
    );
  }

  const totalPipeline = categories.reduce((s, c) => s + c.pipeline_value_usd, 0);
  const donutData = categories.map((c, i) => ({
    name: c.product_category,
    value: c.pipeline_value_usd,
    color: tc.chartColors[i % tc.chartColors.length],
  }));

  const barData = categories
    .sort((a, b) => b.submissions - a.submissions)
    .map((c, i) => ({
      name: c.product_category,
      value: c.submissions,
      color: tc.chartColors[i % tc.chartColors.length],
    }));

  return (
    <DashboardSection title="Pipeline by Category" description="Pipeline value and submissions by product type.">
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="chart-pipeline-category">
          <h4 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>
            Pipeline Value
          </h4>
          <DonutChart
            data={donutData}
            height={200}
            innerRadius={50}
            outerRadius={78}
            formatValue={formatCurrency}
            centerValue={formatCurrency(totalPipeline)}
            centerLabel="Total"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: space['3'], marginTop: space['3'] }}>
            {donutData.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: space['1.5'] }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: d.color, display: 'inline-block' }} />
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted }}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="chart-submissions-category">
          <h4 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>
            Submissions
          </h4>
          <BarChart data={barData} height={240} layout="vertical" formatValue={formatNumber} barSize={18} />
        </div>
      </DashboardGrid>
    </DashboardSection>
  );
}
