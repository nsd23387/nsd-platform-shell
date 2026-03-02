'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { background, text, border, chartColors } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { radius, space } from '../../../design/tokens/spacing';

export interface AreaLineChartSeries {
  dataKey: string;
  label: string;
  color?: string;
  type?: 'area' | 'line';
}

export interface AreaLineChartProps {
  data: Record<string, unknown>[];
  series: AreaLineChartSeries[];
  xDataKey?: string;
  height?: number;
  formatValue?: (v: number) => string;
  formatXAxis?: (v: string) => string;
  showGrid?: boolean;
  showLegend?: boolean;
}

function CustomTooltip({ active, payload, label, formatValue }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: background.surface,
      border: `1px solid ${border.default}`,
      borderRadius: radius.lg,
      padding: `${space['2']} ${space['3']}`,
      fontFamily: fontFamily.body,
      fontSize: fontSize.sm,
    }}>
      <div style={{ color: text.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
          <span style={{ color: text.secondary }}>{entry.name}:</span>
          <span style={{ fontWeight: fontWeight.semibold, color: text.primary }}>{formatValue(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function AreaLineChart({
  data,
  series,
  xDataKey = 'date',
  height = 280,
  formatValue = (v) => v.toLocaleString(),
  formatXAxis,
  showGrid = true,
  showLegend = true,
}: AreaLineChartProps) {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: text.muted, fontFamily: fontFamily.body }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={border.subtle} vertical={false} />}
        <XAxis
          dataKey={xDataKey}
          tick={{ fill: text.muted, fontSize: 11, fontFamily: fontFamily.body }}
          tickLine={false}
          axisLine={{ stroke: border.default }}
          tickFormatter={formatXAxis}
        />
        <YAxis
          tick={{ fill: text.muted, fontSize: 11, fontFamily: fontFamily.body }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatValue(v)}
          width={52}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, paddingTop: 8 }}
          />
        )}
        {series.map((s, i) => {
          const color = s.color ?? chartColors[i % chartColors.length];
          const gradientId = `gradient-${s.dataKey}`;
          return (
            <React.Fragment key={s.dataKey}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={s.dataKey}
                name={s.label}
                stroke={color}
                strokeWidth={2}
                fill={s.type === 'line' ? 'none' : `url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4, fill: color, stroke: background.surface, strokeWidth: 2 }}
              />
            </React.Fragment>
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
