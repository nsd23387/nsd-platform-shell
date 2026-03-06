'use client';

import { ReactNode } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';
import { Sparkline } from '../../../../../components/dashboard/charts/Sparkline';

export interface StatTileProps {
  label: string;
  value: string | number;
  deltaPercent?: number;
  icon?: ReactNode;
  sparklineData?: number[];
  sparklineColor?: string;
  loading?: boolean;
}

export function StatTile({
  label,
  value,
  deltaPercent,
  icon,
  sparklineData,
  sparklineColor,
  loading = false,
}: StatTileProps) {
  const tc = useThemeColors();

  const direction: 'up' | 'down' | 'neutral' =
    deltaPercent != null
      ? deltaPercent > 0.5
        ? 'up'
        : deltaPercent < -0.5
        ? 'down'
        : 'neutral'
      : 'neutral';

  const trendStyle = tc.trendColors[direction];
  const arrow = direction === 'up' ? '\u2191' : direction === 'down' ? '\u2193' : '\u2192';

  if (loading) {
    return (
      <div
        data-testid="stat-tile-skeleton"
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.lg,
          padding: space['5'],
          minHeight: '110px',
        }}
      >
        <div
          style={{
            backgroundColor: tc.border.default,
            borderRadius: radius.DEFAULT,
            height: '14px',
            width: '50%',
            marginBottom: space['3'],
            animation: 'pulse 2s infinite',
          }}
        />
        <div
          style={{
            backgroundColor: tc.border.default,
            borderRadius: radius.DEFAULT,
            height: '28px',
            width: '60%',
            animation: 'pulse 2s infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid={`stat-tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['5'],
        display: 'flex',
        flexDirection: 'column',
        gap: space['2'],
        minHeight: '110px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space['2'],
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['2'],
          }}
        >
          {icon && (
            <span style={{ color: tc.text.muted, display: 'flex', alignItems: 'center' }}>
              {icon}
            </span>
          )}
          <span
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              color: tc.text.muted,
              letterSpacing: '0.02em',
              textTransform: 'uppercase' as const,
              lineHeight: lineHeight.normal,
            }}
          >
            {label}
          </span>
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline
            data={sparklineData}
            color={sparklineColor || tc.chartColors[0]}
            width={64}
            height={28}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: space['2'],
        }}
      >
        <span
          data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize['4xl'],
            fontWeight: fontWeight.semibold,
            color: tc.text.primary,
            lineHeight: lineHeight.tight,
          }}
        >
          {value}
        </span>

        {deltaPercent != null && (
          <span
            data-testid={`stat-delta-${label.toLowerCase().replace(/\s+/g, '-')}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: space['0.5'],
              fontFamily: fontFamily.body,
              fontSize: fontSize.base,
              fontWeight: fontWeight.medium,
              padding: `${space['0.5']} ${space['2']}`,
              borderRadius: radius.DEFAULT,
              backgroundColor: trendStyle.bg,
              color: trendStyle.text,
              whiteSpace: 'nowrap',
            }}
          >
            {arrow} {Math.abs(deltaPercent).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
