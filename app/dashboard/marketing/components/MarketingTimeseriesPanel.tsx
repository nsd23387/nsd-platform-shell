'use client';

import React, { useState } from 'react';
import type { MarketingTimeseries } from '../../../../types/activity-spine';
import { DashboardSection, DashboardCard } from '../../../../components/dashboard';
import { SkeletonCard } from '../../../../components/dashboard';
import { AreaLineChart } from '../../../../components/dashboard/charts';
import { formatNumber, formatCurrency } from '../lib/format';
import { text, border, background, indigo, violet } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';

interface Props {
  timeseries: MarketingTimeseries | undefined;
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

type MetricKey = 'sessions' | 'submissions' | 'pipeline_value_usd' | 'impressions' | 'clicks';

const METRICS: { key: MetricKey; label: string; format: (v: number) => string; color: string }[] = [
  { key: 'sessions', label: 'Sessions', format: formatNumber, color: violet[500] },
  { key: 'submissions', label: 'Submissions', format: formatNumber, color: '#10b981' },
  { key: 'pipeline_value_usd', label: 'Pipeline', format: formatCurrency, color: '#0ea5e9' },
  { key: 'impressions', label: 'Impressions', format: formatNumber, color: indigo[500] },
  { key: 'clicks', label: 'Clicks', format: formatNumber, color: '#f59e0b' },
];

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: active ? indigo[950] : 'transparent',
    color: active ? '#fff' : text.muted,
    border: 'none',
    borderRadius: radius.full,
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

  if (loading) {
    return (
      <DashboardSection title="Timeseries" description="Daily trend data for key metrics.">
        <SkeletonCard height={320} lines={0} />
      </DashboardSection>
    );
  }

  if (error) return null;

  const selected = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const rawData = timeseries?.[metric] ?? [];
  const chartData = rawData.map((d) => ({ date: d.date, [selected.label]: d.value }));

  const formatXAxis = (d: string) => {
    const parts = d.split('-');
    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
  };

  return (
    <DashboardSection title="Timeseries" description="Daily trend data for key metrics.">
      <div style={{ backgroundColor: background.surface, border: `1px solid ${border.default}`, borderRadius: radius.xl, padding: space['5'] }} data-testid="panel-timeseries">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: space['3'] }}>
          <div style={{ display: 'inline-flex', backgroundColor: background.muted, borderRadius: radius.full, padding: space['0.5'], gap: space['0.5'] }}>
            {METRICS.map((m) => (
              <button key={m.key} onClick={() => setMetric(m.key)} style={pillStyle(metric === m.key)} data-testid={`ts-metric-${m.key}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <AreaLineChart
          data={chartData}
          series={[{ dataKey: selected.label, label: selected.label, color: selected.color }]}
          height={280}
          formatValue={selected.format}
          formatXAxis={formatXAxis}
          showLegend={false}
        />
      </div>
    </DashboardSection>
  );
}
