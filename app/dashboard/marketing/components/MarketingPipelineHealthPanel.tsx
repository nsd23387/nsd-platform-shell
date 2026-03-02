'use client';

import React from 'react';
import type { MarketingPipelineHealth } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { text, border, background, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  health: MarketingPipelineHealth[];
  loading: boolean;
  error: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  healthy: { label: 'Healthy', color: semantic.info.dark, bg: semantic.info.light },
  warning: { label: 'Warning', color: semantic.warning.dark, bg: semantic.warning.light },
  stale: { label: 'Stale', color: semantic.danger.dark, bg: semantic.danger.light },
};

const SOURCE_LABELS: Record<string, string> = {
  'web-events': 'Web Events',
  'search_console': 'Search Console',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MarketingPipelineHealthPanel({ health, loading, error }: Props) {
  if (loading || error) return null;

  if (health.length === 0) {
    return (
      <DashboardSection title="Data Pipeline Health" description="Ingestion status for each data source.">
        <EmptyStateCard message="No pipeline health data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Data Pipeline Health" description="Ingestion status for each data source.">
      <div style={{ display: 'flex', gap: space['3'], flexWrap: 'wrap' }} data-testid="card-pipeline-health">
        {health.map((h) => {
          const cfg = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.stale;
          return (
            <div
              key={h.source}
              style={{
                flex: '1 1 200px',
                backgroundColor: background.surface,
                border: `1px solid ${border.default}`,
                borderRadius: radius.xl,
                padding: space['4'],
              }}
              data-testid={`health-source-${h.source}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['3'] }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.primary }}>
                  {SOURCE_LABELS[h.source] ?? h.source}
                </span>
                <span style={{
                  fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  color: cfg.color, backgroundColor: cfg.bg,
                  padding: `${space['0.5']} ${space['2']}`, borderRadius: radius.full,
                }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>Last Success</span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.secondary }}>{timeAgo(h.last_success)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>Failure Rate (24h)</span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: h.failure_rate_24h > 0.3 ? semantic.danger.dark : text.secondary }}>
                    {(h.failure_rate_24h * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardSection>
  );
}
