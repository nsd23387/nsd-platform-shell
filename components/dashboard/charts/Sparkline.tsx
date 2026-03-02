'use client';

import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { violet } from '../../../design/tokens/colors';

export interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showArea?: boolean;
}

export function Sparkline({
  data,
  color = violet[500],
  width = 80,
  height = 32,
  showArea = true,
}: SparklineProps) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={showArea ? `url(#${gradientId})` : 'none'}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
