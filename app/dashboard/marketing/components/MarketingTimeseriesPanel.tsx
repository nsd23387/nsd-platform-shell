'use client';

import React, { useState } from 'react';
import type { MarketingTimeseries } from '../../../../types/activity-spine';
import { DashboardSection, DashboardCard, TimeseriesChart } from '../../../../components/dashboard';
import { formatNumber, formatCurrency } from '../lib/format';
import { text, border, background } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

interface Props {
  timeseries: MarketingTimeseries | undefined;
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

type MetricKey = 'sessions' | 'submissions' | 'pipeline_value_usd' | 'impressions' | 'clicks';

const METRICS: { key: MetricKey; label: string; format: (v: number) => string }[] = [
  { key: 'sessions', label: 'Sessions', format: formatNumber },
  { key: 'submissions', label: 'Submissions', format: formatNumber },
  { key: 'pipeline_value_usd', label: 'Pipeline', format: formatCurrency },
  { key: 'impressions', label: 'Impressions', format: formatNumber },
  { key: 'clicks', label: 'Clicks', format: formatNumber },
];

function segBtn(active: boolean, isLast: boolean): React.CSSProperties {
  return {
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? text.primary : background.surface,
    color: active ? text.inverse : text.secondary,
    border: 'none',
    borderRight: isLast ? 'none' : `1px solid ${border.default}`,
    cursor: 'pointer',
    transition: `all ${duration.normal} ${easing.DEFAULT}`,
  };
}

export function MarketingTimeseriesPanel({ timeseries, enabled, loading, error }: Props) {
  const [metric, setMetric] = useState<MetricKey>('sessions');

  if (!enabled) {
    return (
      <DashboardSection title="Timeseries" description="Daily trend data for key metrics.">
        <DashboardCard title="Timeseries Disabled" empty emptyMessage="Enable the Timeseries toggle in the header to view daily trends." />
      </DashboardSection>
    );
  }

  if (loading || error) return null;

  const selected = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const data = timeseries?.[metric] ?? [];

  return (
    <DashboardSection title="Timeseries" description="Daily trend data for key metrics.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: space['3'] }}>
        <div style={{ display: 'inline-flex', border: `1px solid ${border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          {METRICS.map((m, i) => (
            <button key={m.key} onClick={() => setMetric(m.key)} style={segBtn(metric === m.key, i === METRICS.length - 1)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ backgroundColor: background.surface, borderRadius: radius.xl, border: `1px solid ${border.default}`, padding: space['4'] }}>
        <TimeseriesChart data={data} label={selected.label} formatValue={selected.format} height={220} />
      </div>
    </DashboardSection>
  );
}
