'use client';

import React from 'react';
import type { MarketingGA4Funnel } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard, SkeletonCard } from '../../../../components/dashboard';
import { formatNumber } from '../lib/format';
import { violet, indigo, magenta } from '../../../../design/tokens/colors';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  funnel: MarketingGA4Funnel;
  loading: boolean;
  error: string | null;
}

interface FunnelStage {
  key: keyof MarketingGA4Funnel;
  label: string;
  color: string;
}

const STAGES: FunnelStage[] = [
  { key: 'view_item', label: 'View Item', color: violet[400] },
  { key: 'form_start', label: 'Form Start', color: violet[500] },
  { key: 'add_to_cart', label: 'Add to Cart', color: indigo[400] },
  { key: 'begin_checkout', label: 'Begin Checkout', color: indigo[500] },
  { key: 'form_submit', label: 'Form Submit', color: indigo[600] },
  { key: 'purchase', label: 'Purchase', color: magenta[500] },
];

export function MarketingGA4FunnelPanel({ funnel, loading, error }: Props) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <DashboardSection title="GA4 Event Funnel" description="Ecommerce and form submission funnel from Google Analytics.">
        <SkeletonCard height={200} />
      </DashboardSection>
    );
  }
  if (error) return null;

  const total = Object.values(funnel).reduce((s, v) => s + v, 0);
  if (total === 0) {
    return (
      <DashboardSection title="GA4 Event Funnel" description="Ecommerce and form submission funnel from Google Analytics.">
        <EmptyStateCard message="No GA4 funnel events in this period." />
      </DashboardSection>
    );
  }

  const maxVal = Math.max(...STAGES.map((s) => funnel[s.key]), 1);

  return (
    <DashboardSection title="GA4 Event Funnel" description="Ecommerce and form submission funnel from Google Analytics.">
      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['6'] }} data-testid="panel-ga4-funnel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {STAGES.map((stage, i) => {
            const value = funnel[stage.key];
            const widthPct = Math.max((value / maxVal) * 100, 4);
            const prevValue = i > 0 ? funnel[STAGES[i - 1].key] : 0;
            const dropOff = prevValue > 0 ? ((prevValue - value) / prevValue * 100) : 0;

            return (
              <div key={stage.key} data-testid={`ga4-funnel-stage-${stage.key}`}>
                {i > 0 && prevValue > 0 && (
                  <div style={{
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    color: tc.text.muted,
                    marginBottom: space['1'],
                    paddingLeft: space['2'],
                  }}>
                    {'\u2193'} {dropOff.toFixed(1)}% drop-off
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space['1'] }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                    {stage.label}
                  </span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                    {formatNumber(value)}
                  </span>
                </div>
                <div style={{ backgroundColor: tc.background.muted, borderRadius: radius.full, height: 20, overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: stage.color,
                    height: '100%',
                    width: `${widthPct}%`,
                    borderRadius: radius.full,
                    transition: 'width 0.5s ease-out',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardSection>
  );
}
