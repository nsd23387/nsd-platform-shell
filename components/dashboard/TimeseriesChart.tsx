'use client';

import React, { useState, useCallback } from 'react';
import type { MarketingTimeseriesPoint } from '../../types/activity-spine';
import { background, text, border, violet } from '../../design/tokens/colors';
import { fontFamily, fontSize } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface TimeseriesChartProps {
  data: MarketingTimeseriesPoint[];
  label: string;
  formatValue?: (v: number) => string;
  height?: number;
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 12 };

export function TimeseriesChart({
  data,
  label,
  formatValue = (v) => v.toLocaleString(),
  height = 200,
}: TimeseriesChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const width = 600;
  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);

  const points = data.map((d, i) => ({
    x: PADDING.left + (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2),
    y: PADDING.top + plotH - (d.value / maxVal) * plotH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1]?.x ?? 0},${PADDING.top + plotH} L${points[0]?.x ?? 0},${PADDING.top + plotH} Z`;

  const handleMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(xRatio * (data.length - 1));
    setHovered(Math.max(0, Math.min(idx, data.length - 1)));
  }, [data.length]);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: space['8'], color: text.muted, fontFamily: fontFamily.body, fontSize: fontSize.base }}>
        No timeseries data available.
      </div>
    );
  }

  const hoveredPoint = hovered != null ? data[hovered] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid line at max */}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left + plotW} y2={PADDING.top} stroke={border.subtle} strokeDasharray="4" />
        <line x1={PADDING.left} y1={PADDING.top + plotH} x2={PADDING.left + plotW} y2={PADDING.top + plotH} stroke={border.default} />

        {/* Area fill */}
        <path d={areaD} fill={violet[100]} opacity={0.5} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={violet[500]} strokeWidth={2} />

        {/* Hover dot */}
        {hovered != null && points[hovered] && (
          <circle cx={points[hovered].x} cy={points[hovered].y} r={4} fill={violet[500]} stroke={background.surface} strokeWidth={2} />
        )}

        {/* X-axis labels: start and end dates */}
        <text x={PADDING.left} y={height - 4} fill={text.muted} fontSize={10} fontFamily={fontFamily.body}>
          {data[0]?.date ?? ''}
        </text>
        <text x={PADDING.left + plotW} y={height - 4} fill={text.muted} fontSize={10} fontFamily={fontFamily.body} textAnchor="end">
          {data[data.length - 1]?.date ?? ''}
        </text>

        {/* Y-axis max label */}
        <text x={PADDING.left + 2} y={PADDING.top - 4} fill={text.muted} fontSize={10} fontFamily={fontFamily.body}>
          {formatValue(maxVal)}
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            top: space['2'],
            right: space['2'],
            backgroundColor: background.surface,
            border: `1px solid ${border.default}`,
            borderRadius: radius.md,
            padding: `${space['1.5']} ${space['3']}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            color: text.primary,
            pointerEvents: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ color: text.muted }}>{hoveredPoint.date}</div>
          <div style={{ fontWeight: 600 }}>{label}: {formatValue(hoveredPoint.value)}</div>
        </div>
      )}
    </div>
  );
}
