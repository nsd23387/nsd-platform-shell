'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { background, text, border, violet, chartColors } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { radius, space } from '../../../design/tokens/spacing';

export interface BarChartProps {
  data: Array<{ name: string; value: number; color?: string; [key: string]: unknown }>;
  height?: number;
  layout?: 'vertical' | 'horizontal';
  formatValue?: (v: number) => string;
  barSize?: number;
  showGrid?: boolean;
  dataKey?: string;
  nameKey?: string;
}

function CustomTooltip({ active, payload, formatValue }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color?: string } }>;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div style={{
      backgroundColor: background.surface,
      border: `1px solid ${border.default}`,
      borderRadius: radius.lg,
      padding: `${space['2']} ${space['3']}`,
      fontFamily: fontFamily.body,
      fontSize: fontSize.sm,
    }}>
      <div style={{ color: text.secondary }}>{entry.name}</div>
      <div style={{ fontWeight: fontWeight.semibold, color: text.primary, marginTop: 2 }}>{formatValue(entry.value)}</div>
    </div>
  );
}

export function BarChart({
  data,
  height = 250,
  layout = 'vertical',
  formatValue = (v) => v.toLocaleString(),
  barSize = 20,
  showGrid = true,
  dataKey = 'value',
  nameKey = 'name',
}: BarChartProps) {
  if (!data.length) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: text.muted, fontFamily: fontFamily.body }}>
        No data available
      </div>
    );
  }

  const isHorizontal = layout === 'horizontal';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout} margin={{ top: 8, right: 16, left: isHorizontal ? 0 : 80, bottom: 0 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={border.subtle} horizontal={isHorizontal} vertical={!isHorizontal} />}
        {isHorizontal ? (
          <>
            <XAxis dataKey={nameKey} tick={{ fill: text.muted, fontSize: 11, fontFamily: fontFamily.body }} tickLine={false} axisLine={{ stroke: border.default }} />
            <YAxis tick={{ fill: text.muted, fontSize: 11, fontFamily: fontFamily.body }} tickLine={false} axisLine={false} tickFormatter={formatValue} />
          </>
        ) : (
          <>
            <XAxis type="number" tick={{ fill: text.muted, fontSize: 11, fontFamily: fontFamily.body }} tickLine={false} axisLine={false} tickFormatter={formatValue} />
            <YAxis dataKey={nameKey} type="category" tick={{ fill: text.secondary, fontSize: 12, fontFamily: fontFamily.body }} tickLine={false} axisLine={false} width={80} />
          </>
        )}
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} cursor={{ fill: `${violet[50]}66` }} />
        <Bar dataKey={dataKey} barSize={barSize} radius={[4, 4, 4, 4]}>
          {data.map((entry, i) => (
            <Cell key={`${entry[nameKey]}`} fill={entry.color ?? chartColors[i % chartColors.length]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
