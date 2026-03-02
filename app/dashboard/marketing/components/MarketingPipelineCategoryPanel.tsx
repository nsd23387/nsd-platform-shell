'use client';

import React from 'react';
import type { MarketingPipelineCategory } from '../../../../types/activity-spine';
import { DashboardSection, DistributionCard, DashboardGrid, EmptyStateCard } from '../../../../components/dashboard';
import { chartColors } from '../../../../design/tokens/colors';

interface Props {
  categories: MarketingPipelineCategory[];
  loading: boolean;
  error: string | null;
}

export function MarketingPipelineCategoryPanel({ categories, loading, error }: Props) {
  if (loading || error) return null;

  if (categories.length === 0) {
    return (
      <DashboardSection title="Pipeline by Category" description="Pipeline value and submissions by product type.">
        <EmptyStateCard message="No product category data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Pipeline by Category" description="Pipeline value and submissions by product type.">
      <DashboardGrid columns={2}>
        <DistributionCard
          title="Pipeline Value"
          items={categories.map((c, i) => ({
            label: c.product_category,
            value: c.pipeline_value_usd,
            color: chartColors[i % chartColors.length],
          }))}
          showPercentages
        />
        <DistributionCard
          title="Submissions"
          items={categories.map((c, i) => ({
            label: c.product_category,
            value: c.submissions,
            color: chartColors[i % chartColors.length],
          }))}
          showPercentages
        />
      </DashboardGrid>
    </DashboardSection>
  );
}
