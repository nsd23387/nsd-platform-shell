'use client';

import React from 'react';
import type { MarketingAnomalies } from '../../../../types/activity-spine';
import { DashboardSection, DashboardGrid } from '../../../../components/dashboard';
import { background, text, border, semantic } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  anomalies: MarketingAnomalies | undefined;
  loading: boolean;
  error: string | null;
}

interface AnomalyDef {
  key: keyof MarketingAnomalies;
  label: string;
}

const ANOMALY_DEFS: AnomalyDef[] = [
  { key: 'sessions_spike', label: 'Sessions' },
  { key: 'submissions_spike', label: 'Submissions' },
  { key: 'pipeline_spike', label: 'Pipeline Value' },
];

export function MarketingAnomaliesPanel({ anomalies, loading, error }: Props) {
  if (loading || error || !anomalies) return null;

  const hasAny = ANOMALY_DEFS.some((d) => anomalies[d.key]);
  if (!hasAny) return null;

  return (
    <DashboardSection title="Anomalies" description="Statistical spikes detected in the current period (>2 standard deviations).">
      <DashboardGrid columns={3}>
        {ANOMALY_DEFS.filter((d) => anomalies[d.key]).map((d) => (
          <div
            key={d.key}
            style={{
              backgroundColor: semantic.warning.light,
              border: `1px solid ${semantic.warning.base}`,
              borderRadius: radius.xl,
              padding: space['5'],
              display: 'flex',
              alignItems: 'center',
              gap: space['3'],
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: space['3'],
                height: space['3'],
                borderRadius: radius.full,
                backgroundColor: semantic.warning.base,
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: text.primary }}>
                {d.label}
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: semantic.warning.dark }}>
                Observed spike
              </div>
            </div>
          </div>
        ))}
      </DashboardGrid>
    </DashboardSection>
  );
}
