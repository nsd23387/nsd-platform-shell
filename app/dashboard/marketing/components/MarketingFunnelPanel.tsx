'use client';

import React from 'react';
import type { MarketingFunnelStep } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { formatNumber, formatCurrency, formatPercent } from '../lib/format';
import { violet, indigo } from '../../../../design/tokens/colors';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  funnel: MarketingFunnelStep[];
  loading: boolean;
  error: string | null;
}

interface Stage {
  label: string;
  value: number;
  format: (v: number) => string;
  color: string;
  gradient: string;
}

export function MarketingFunnelPanel({ funnel, loading, error }: Props) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <DashboardSection title="Conversion Funnel" description="Page views through submissions to pipeline value.">
        <SkeletonCard height={160} />
      </DashboardSection>
    );
  }
  if (error) return null;
  if (funnel.length === 0) {
    return (
      <DashboardSection title="Conversion Funnel" description="Page views through submissions to pipeline value.">
        <EmptyStateCard message="No funnel data available." />
      </DashboardSection>
    );
  }

  const totalViews = funnel.reduce((s, f) => s + f.page_views, 0);
  const totalSubs = funnel.reduce((s, f) => s + f.submissions, 0);
  const totalPipeline = funnel.reduce((s, f) => s + f.pipeline_value_usd, 0);

  const stages: Stage[] = [
    { label: 'Page Views', value: totalViews, format: formatNumber, color: violet[500], gradient: `linear-gradient(135deg, ${violet[400]}, ${violet[600]})` },
    { label: 'Submissions', value: totalSubs, format: formatNumber, color: indigo[500], gradient: `linear-gradient(135deg, ${indigo[400]}, ${indigo[600]})` },
    { label: 'Pipeline Value', value: totalPipeline, format: formatCurrency, color: tc.chartColors[2], gradient: `linear-gradient(135deg, #38bdf8, #0284c7)` },
  ];

  const maxVal = Math.max(...stages.map((s) => s.value), 1);

  return (
    <DashboardSection title="Conversion Funnel" description="Page views through submissions to pipeline value.">
      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['6'] }} data-testid="panel-funnel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['4'] }}>
          {stages.map((stage, i) => {
            const widthPct = stage.value === totalPipeline
              ? Math.max((totalSubs / Math.max(totalViews, 1)) * 100, 8)
              : Math.max((stage.value / maxVal) * 100, 8);
            const barWidth = i === 0 ? 100 : widthPct;

            return (
              <div key={stage.label} data-testid={`funnel-stage-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space['1.5'] }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                    {stage.label}
                  </span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                    {stage.format(stage.value)}
                  </span>
                </div>
                <div style={{ backgroundColor: tc.background.muted, borderRadius: radius.full, height: 24, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    background: stage.gradient,
                    height: '100%',
                    width: `${barWidth}%`,
                    borderRadius: radius.full,
                    animation: 'growWidth 0.8s ease-out',
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
                {i < stages.length - 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: space['1'],
                    marginTop: space['1.5'],
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.xs,
                    color: tc.text.muted,
                  }}>
                    <span>{'\u2193'}</span>
                    <span>
                      {i === 0 && totalViews > 0
                        ? `${((totalSubs / totalViews) * 100).toFixed(2)}% conversion`
                        : i === 1 && totalSubs > 0
                          ? `$${(totalPipeline / totalSubs).toFixed(0)} avg value`
                          : ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <style>{`@keyframes growWidth { from { width: 0%; } }`}</style>
      </div>
    </DashboardSection>
  );
}
