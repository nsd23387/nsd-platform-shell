'use client';

import React from 'react';
import type { MarketingSource } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { BarChart } from '../../../../components/dashboard/charts';
import { formatCurrency, formatNumber } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  sources: MarketingSource[];
  loading: boolean;
  error: string | null;
}

export function MarketingSourcesPanel({ sources, loading, error }: Props) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <DashboardSection title="Sources" description="Submission sources ranked by pipeline value.">
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={250} />
          <SkeletonCard height={250} />
        </DashboardGrid>
      </DashboardSection>
    );
  }
  if (error) return null;

  const byCanonical = new Map<string, { submissions: number; pipeline: number }>();
  for (const s of sources) {
    const key = s.canonical_source ?? s.submission_source;
    const cur = byCanonical.get(key) ?? { submissions: 0, pipeline: 0 };
    cur.submissions += s.submissions ?? 0;
    cur.pipeline += s.pipeline_value_usd ?? 0;
    byCanonical.set(key, cur);
  }

  const entries = Array.from(byCanonical.entries()).sort((a, b) => b[1].pipeline - a[1].pipeline);

  if (entries.length === 0) {
    return (
      <DashboardSection title="Sources" description="Submission sources ranked by pipeline value.">
        <EmptyStateCard message="No source data available for this period." />
      </DashboardSection>
    );
  }

  const pipelineData = entries.map(([name, d], i) => ({ name, value: d.pipeline, color: tc.chartColors[i % tc.chartColors.length] }));
  const submissionData = entries.map(([name, d], i) => ({ name, value: d.submissions, color: tc.chartColors[i % tc.chartColors.length] }));

  return (
    <DashboardSection title="Sources" description="Submission sources ranked by pipeline value.">
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="chart-pipeline-by-source">
          <h4 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>
            Pipeline by Source
          </h4>
          <BarChart data={pipelineData} height={220} layout="vertical" formatValue={formatCurrency} barSize={16} />
        </div>
        <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="chart-submissions-by-source">
          <h4 style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>
            Submissions by Source
          </h4>
          <BarChart data={submissionData} height={220} layout="vertical" formatValue={formatNumber} barSize={16} />
        </div>
      </DashboardGrid>
    </DashboardSection>
  );
}
