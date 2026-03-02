'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { background, text, border, chartColors } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { radius, space } from '../../../design/tokens/spacing';

export interface DonutChartItem {
  name: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutChartItem[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
}

function CustomTooltip({ active, payload, formatValue }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DonutChartItem }>;
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.payload.color ?? chartColors[0] }} />
        <span style={{ color: text.secondary }}>{entry.name}</span>
      </div>
      <div style={{ fontWeight: fontWeight.semibold, color: text.primary, marginTop: 2 }}>{formatValue(entry.value)}</div>
    </div>
  );
}

export function DonutChart({
  data,
  height = 200,
  innerRadius = 55,
  outerRadius = 80,
  formatValue = (v) => v.toLocaleString(),
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const coloredData = data.map((d, i) => ({
    ...d,
    color: d.color ?? chartColors[i % chartColors.length],
  }));

  return (
    <div style={{ position: 'relative' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={coloredData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            strokeWidth={0}
          >
            {coloredData.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}>
          {centerValue && (
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary }}>
              {centerValue}
            </div>
          )}
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.xs, color: text.muted }}>
            {centerLabel}
          </div>
        </div>
      )}
    </div>
  );
}
