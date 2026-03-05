'use client';

import { ReactNode } from 'react';
import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';

export interface EngineMetric {
  label: string;
  value: string | number;
}

export interface EngineCardProps {
  title: string;
  icon?: ReactNode;
  accentColor?: string;
  spend?: string | number;
  leads?: string | number;
  revenue?: string | number;
  cac?: string | number;
  deltaPercent?: number;
  trendLabel?: string;
  metrics?: EngineMetric[];
  onClick?: () => void;
  loading?: boolean;
}

export function EngineCard({
  title,
  icon,
  accentColor,
  spend,
  leads,
  revenue,
  cac,
  deltaPercent,
  trendLabel = '7d',
  metrics,
  onClick,
  loading = false,
}: EngineCardProps) {
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

  const defaultMetrics: EngineMetric[] = [
    ...(spend != null ? [{ label: 'Spend', value: spend }] : []),
    ...(leads != null ? [{ label: 'Leads', value: leads }] : []),
    ...(revenue != null ? [{ label: 'Revenue', value: revenue }] : []),
    ...(cac != null ? [{ label: 'CAC', value: cac }] : []),
  ];

  const displayMetrics = metrics || defaultMetrics;

  if (loading) {
    return (
      <div
        data-testid="engine-card-skeleton"
        style={{
          backgroundColor: tc.background.surface,
          border: `1px solid ${tc.border.default}`,
          borderRadius: radius.lg,
          padding: space['5'],
          minHeight: '180px',
        }}
      >
        <div
          style={{
            backgroundColor: tc.border.default,
            borderRadius: radius.DEFAULT,
            height: '18px',
            width: '60%',
            marginBottom: space['4'],
            animation: 'pulse 2s infinite',
          }}
        />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: tc.border.default,
              borderRadius: radius.DEFAULT,
              height: '14px',
              width: `${40 + i * 10}%`,
              marginBottom: space['2'],
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      data-testid={`engine-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={onClick}
      style={{
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['5'],
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 200ms',
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
      onMouseEnter={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = tc.border.strong;
      }}
      onMouseLeave={(e) => {
        if (onClick) (e.currentTarget as HTMLElement).style.borderColor = tc.border.default;
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: space['4'],
          gap: space['2'],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
          {icon && (
            <span
              style={{
                color: accentColor || tc.chartColors[0],
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {icon}
            </span>
          )}
          <span
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              color: tc.text.primary,
              lineHeight: lineHeight.snug,
            }}
          >
            {title}
          </span>
        </div>

        {deltaPercent != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
            <span
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.xs,
                color: tc.text.muted,
              }}
            >
              {trendLabel}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: space['0.5'],
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
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
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: space['3'],
        }}
      >
        {displayMetrics.map((m) => (
          <div key={m.label}>
            <div
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.xs,
                fontWeight: fontWeight.medium,
                color: tc.text.muted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.04em',
                marginBottom: space['0.5'],
              }}
            >
              {m.label}
            </div>
            <div
              data-testid={`engine-metric-${m.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.xl,
                fontWeight: fontWeight.semibold,
                color: tc.text.primary,
                lineHeight: lineHeight.tight,
              }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
