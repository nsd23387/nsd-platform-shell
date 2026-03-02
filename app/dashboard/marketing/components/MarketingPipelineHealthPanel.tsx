'use client';

import React from 'react';
import type { MarketingPipelineHealth } from '../../../../types/activity-spine';
import { DashboardSection, EmptyStateCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { DashboardGrid } from '../../../../components/dashboard';
import { text, border, background, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  health: MarketingPipelineHealth[];
  loading: boolean;
  error: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; pulseColor: string }> = {
  healthy: { label: 'Healthy', color: semantic.success.dark, bg: semantic.success.light, pulseColor: semantic.success.base },
  warning: { label: 'Warning', color: semantic.warning.dark, bg: semantic.warning.light, pulseColor: semantic.warning.base },
  stale: { label: 'Stale', color: semantic.danger.dark, bg: semantic.danger.light, pulseColor: semantic.danger.base },
};

const SOURCE_LABELS: Record<string, string> = {
  'web-events': 'Web Events',
  'search_console': 'Search Console',
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff) || diff < 0) return 'Unknown';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PulseDot({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <>
      <style>{`
        @keyframes healthPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
      <span style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        animation: isActive ? 'healthPulse 2s ease-in-out infinite' : 'none',
      }} />
    </>
  );
}

export function MarketingPipelineHealthPanel({ health, loading, error }: Props) {
  if (loading) {
    return (
      <DashboardSection title="Data Pipeline Health" description="Ingestion status for each data source.">
        <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }}>
          <SkeletonCard height={120} lines={2} />
          <SkeletonCard height={120} lines={2} />
        </DashboardGrid>
      </DashboardSection>
    );
  }
  if (error) return null;

  if (health.length === 0) {
    return (
      <DashboardSection title="Data Pipeline Health" description="Ingestion status for each data source.">
        <EmptyStateCard message="No pipeline health data available." />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Data Pipeline Health" description="Ingestion status for each data source.">
      <DashboardGrid columns={{ sm: 1, md: 2, lg: 2 }} data-testid="card-pipeline-health">
        {health.map((h) => {
          const cfg = STATUS_CONFIG[h.status] ?? STATUS_CONFIG.stale;
          const isHealthy = h.status === 'healthy';

          return (
            <div
              key={h.source}
              style={{
                backgroundColor: background.surface,
                border: `1px solid ${border.default}`,
                borderRadius: radius.xl,
                padding: space['5'],
              }}
              data-testid={`health-source-${h.source}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['4'] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
                  <PulseDot color={cfg.pulseColor} isActive={isHealthy} />
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: text.primary }}>
                    {SOURCE_LABELS[h.source] ?? h.source}
                  </span>
                </div>
                <span style={{
                  fontFamily: fontFamily.body, fontSize: fontSize.xs, fontWeight: fontWeight.medium,
                  color: cfg.color, backgroundColor: cfg.bg,
                  padding: `${space['0.5']} ${space['2.5']}`, borderRadius: radius.full,
                }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted }}>Last Success</span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: text.secondary }}>{timeAgo(h.last_success)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted }}>Failure Rate (24h)</span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: h.failure_rate_24h > 0.3 ? semantic.danger.dark : text.secondary }}>
                    {(h.failure_rate_24h * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </DashboardGrid>
    </DashboardSection>
  );
}
