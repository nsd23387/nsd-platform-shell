'use client';

import React from 'react';
import type { MarketingFunnelStep } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { formatNumber, formatCurrency, formatPercent } from '../lib/format';
import { text, border, background, chartColors } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  funnel: MarketingFunnelStep[];
  loading: boolean;
  error: string | null;
}

export function MarketingFunnelPanel({ funnel, loading, error }: Props) {
  if (loading || error) return null;

  if (funnel.length === 0) {
    return (
      <DashboardSection title="Conversion Funnel" description="Page views through submissions to pipeline value.">
        <EmptyStateCard message="No funnel data available." />
      </DashboardSection>
    );
  }

  const totals = funnel.reduce(
    (acc, step) => ({
      page_views: acc.page_views + step.page_views,
      submissions: acc.submissions + step.submissions,
      pipeline_value_usd: acc.pipeline_value_usd + step.pipeline_value_usd,
    }),
    { page_views: 0, submissions: 0, pipeline_value_usd: 0 }
  );

  const overallConversionRate = totals.page_views > 0 ? totals.submissions / totals.page_views : 0;

  const stages = [
    { label: 'Page Views', value: totals.page_views, format: formatNumber },
    { label: 'Submissions', value: totals.submissions, format: formatNumber },
    { label: 'Pipeline Value', value: totals.pipeline_value_usd, format: formatCurrency },
  ];

  return (
    <DashboardSection title="Conversion Funnel" description="Page views through submissions to pipeline value.">
      <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['6'] }} data-testid="card-funnel">
        <div style={{ display: 'flex', alignItems: 'stretch', gap: space['4'], justifyContent: 'center' }}>
          {stages.map((stage, i) => {
            const widthPct = i === 0 ? 100 : i === 1 ? 60 : 35;
            return (
              <div key={stage.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    minWidth: '80px',
                    backgroundColor: chartColors[i % chartColors.length],
                    borderRadius: radius.lg,
                    padding: `${space['4']} ${space['3']}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  data-testid={`funnel-stage-${i}`}
                >
                  <div style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: '#fff' }}>
                    {stage.format(stage.value)}
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: 'rgba(255,255,255,0.85)', marginTop: space['1'] }}>
                    {stage.label}
                  </div>
                </div>
                {i < stages.length - 1 && (
                  <div style={{
                    fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted,
                    marginTop: space['2'], textAlign: 'center',
                  }}>
                    {i === 0 && `${formatPercent(overallConversionRate)} conversion`}
                    {i === 1 && totals.submissions > 0 && `${formatCurrency(totals.pipeline_value_usd / totals.submissions)} avg`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {funnel.length > 1 && (
          <div style={{ marginTop: space['6'], borderTop: `1px solid ${border.subtle}`, paddingTop: space['4'] }}>
            <h4 style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.muted, marginBottom: space['3'] }}>
              Daily Breakdown
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border.default}` }}>
                  <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'left', padding: `${space['2']} 0` }}>Date</th>
                  <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Page Views</th>
                  <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Submissions</th>
                  <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Conv. Rate</th>
                  <th style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: text.muted, textAlign: 'right', padding: `${space['2']} 0` }}>Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((step) => (
                  <tr key={step.date} style={{ borderBottom: `1px solid ${border.subtle}` }} data-testid={`row-funnel-${step.date}`}>
                    <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.primary, padding: `${space['2']} 0` }}>{step.date}</td>
                    <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>{formatNumber(step.page_views)}</td>
                    <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>{formatNumber(step.submissions)}</td>
                    <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>{formatPercent(step.conversion_rate)}</td>
                    <td style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.secondary, textAlign: 'right', padding: `${space['2']} 0` }}>{formatCurrency(step.pipeline_value_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardSection>
  );
}
