'use client';

import React from 'react';
import type { MarketingChannelPerformance } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard, SkeletonCard } from '../../../../components/dashboard';
import { formatNumber } from '../lib/format';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  channels: MarketingChannelPerformance[];
  loading: boolean;
  error: string | null;
}

export function MarketingChannelBreakdownPanel({ channels, loading, error }: Props) {
  const tc = useThemeColors();

  if (loading) {
    return (
      <DashboardSection title="Sessions by Channel" description="Acquisition channel breakdown from GA4.">
        <SkeletonCard height={200} />
      </DashboardSection>
    );
  }
  if (error) return null;
  if (channels.length === 0) {
    return (
      <DashboardSection title="Sessions by Channel" description="Acquisition channel breakdown from GA4.">
        <EmptyStateCard message="No channel data available." />
      </DashboardSection>
    );
  }

  const sorted = [...channels].sort((a, b) => b.sessions - a.sessions);
  const maxSessions = sorted[0]?.sessions ?? 1;
  const totalSessions = sorted.reduce((s, c) => s + c.sessions, 0);

  return (
    <DashboardSection title="Sessions by Channel" description="Acquisition channel breakdown from GA4.">
      <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.xl, padding: space['6'] }} data-testid="panel-channel-breakdown">
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
          {sorted.map((ch) => {
            const pct = totalSessions > 0 ? (ch.sessions / totalSessions * 100) : 0;
            const barWidth = Math.max((ch.sessions / maxSessions) * 100, 3);

            return (
              <div key={ch.channel} data-testid={`channel-bar-${ch.channel.toLowerCase().replace(/\s+/g, '-')}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space['1'] }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                    {ch.channel}
                  </span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
                    {formatNumber(ch.sessions)} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div style={{ backgroundColor: tc.background.muted, borderRadius: radius.full, height: 16, overflow: 'hidden' }}>
                  <div style={{
                    backgroundColor: tc.chartColors[sorted.indexOf(ch) % tc.chartColors.length],
                    height: '100%',
                    width: `${barWidth}%`,
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
