'use client';

import React from 'react';
import type { MarketingSource } from '../../../../types/activity-spine';
import { DashboardGrid, DashboardSection, DistributionCard, EmptyStateCard } from '../../../../components/dashboard';
import { chartColors } from '../../../../design/tokens/colors';

interface Props {
  sources: MarketingSource[];
  loading: boolean;
  error: string | null;
}

export function MarketingSourcesPanel({ sources, loading, error }: Props) {
  if (loading || error) return null;

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

  return (
    <DashboardSection title="Sources" description="Submission sources ranked by pipeline value.">
      <DashboardGrid columns={2}>
        <DistributionCard
          title="Pipeline by Source"
          items={entries.map(([label, d], i) => ({ label, value: d.pipeline, color: chartColors[i % chartColors.length] }))}
          showPercentages
        />
        <DistributionCard
          title="Submissions by Source"
          items={entries.map(([label, d], i) => ({ label, value: d.submissions, color: chartColors[i % chartColors.length] }))}
          showPercentages
        />
      </DashboardGrid>
    </DashboardSection>
  );
}
