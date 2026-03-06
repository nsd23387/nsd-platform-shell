'use client';

import { useMemo } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { magenta, indigo } from '../../../../../design/tokens/colors';

export interface PacingDataPoint {
  label: string;
  actual: number;
  target?: number;
}

export interface PacingChartProps {
  data: PacingDataPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  targetLabel?: string;
  height?: number;
  currencyPrefix?: string;
  barColor?: string;
  targetLineColor?: string;
  targetLabelColor?: string;
}

export function PacingChart({
  data,
  title = 'Budget Pacing',
  xLabel,
  yLabel,
  targetLabel = 'Target',
  height = 300,
  currencyPrefix = '$',
  barColor = magenta[500],
  targetLineColor = indigo[800],
  targetLabelColor = indigo[800],
}: PacingChartProps) {
  const tc = useThemeColors();

  const avgTarget = useMemo(() => {
    const targets = data.filter((d) => d.target != null).map((d) => d.target!);
    return targets.length > 0 ? targets.reduce((a, b) => a + b, 0) / targets.length : undefined;
  }, [data]);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.label,
        actual: d.actual,
        target: d.target,
      })),
    [data],
  );

  return (
    <div
      data-testid="pacing-chart"
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: `${space['4']} ${space['5']}`,
            borderBottom: `1px solid ${tc.border.default}`,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              color: tc.text.primary,
            }}
          >
            {title}
          </span>
        </div>
      )}

      <div style={{ padding: space['4'] }}>
        {data.length === 0 ? (
          <div
            style={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tc.text.muted,
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
            }}
          >
            No pacing data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={tc.border.subtle}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{
                  fontFamily: fontFamily.body,
                  fontSize: 11,
                  fill: tc.text.muted,
                }}
                axisLine={{ stroke: tc.border.default }}
                tickLine={false}
                label={
                  xLabel
                    ? {
                        value: xLabel,
                        position: 'insideBottom',
                        offset: -4,
                        style: {
                          fontFamily: fontFamily.body,
                          fontSize: 11,
                          fill: tc.text.muted,
                        },
                      }
                    : undefined
                }
              />
              <YAxis
                tick={{
                  fontFamily: fontFamily.body,
                  fontSize: 11,
                  fill: tc.text.muted,
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${currencyPrefix}${v}`}
                label={
                  yLabel
                    ? {
                        value: yLabel,
                        angle: -90,
                        position: 'insideLeft',
                        style: {
                          fontFamily: fontFamily.body,
                          fontSize: 11,
                          fill: tc.text.muted,
                        },
                      }
                    : undefined
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tc.background.surface,
                  border: `1px solid ${tc.border.default}`,
                  borderRadius: radius.md,
                  fontFamily: fontFamily.body,
                  fontSize: 12,
                  color: tc.text.primary,
                }}
                formatter={(value: number | undefined) => [`${currencyPrefix}${(value ?? 0).toLocaleString()}`, 'Spend']}
              />
              <Bar
                dataKey="actual"
                fill={barColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              {avgTarget != null && (
                <ReferenceLine
                  y={avgTarget}
                  stroke={targetLineColor}
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{
                    value: targetLabel,
                    position: 'right',
                    style: {
                      fontFamily: fontFamily.body,
                      fontSize: 11,
                      fill: targetLabelColor,
                    },
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {avgTarget != null && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['4'],
            padding: `${space['3']} ${space['5']}`,
            borderTop: `1px solid ${tc.border.default}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.xs,
            color: tc.text.muted,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: radius.sm,
                backgroundColor: barColor,
                display: 'inline-block',
              }}
            />
            Actual Spend
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
            <span
              style={{
                width: '12px',
                height: '2px',
                backgroundColor: targetLineColor,
                display: 'inline-block',
                borderTop: `2px dashed ${targetLineColor}`,
              }}
            />
            {targetLabel} ({currencyPrefix}{avgTarget.toLocaleString()})
          </span>
        </div>
      )}
    </div>
  );
}
