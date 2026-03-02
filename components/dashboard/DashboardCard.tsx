'use client';

import React from 'react';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { ThemeColors } from '../../design/tokens/theme-colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface DashboardCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  timeWindow?: '7d' | '30d';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  onRetry?: () => void;
  children?: React.ReactNode;
}

interface TrendBadgeProps {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

function TrendBadge({ direction, value }: TrendBadgeProps) {
  const tc = useThemeColors();
  const colors = tc.trendColors[direction];

  const arrows = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: space['1'],
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        padding: `${space['0.5']} ${space['2']}`,
        borderRadius: radius.DEFAULT,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {arrows[direction]} {value}
    </span>
  );
}

function getVariantStyles(variant: DashboardCardProps['variant'], tc: ThemeColors): React.CSSProperties {
  if (!variant || variant === 'default') return {};
  return {
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    borderLeftColor: tc.cardVariants[variant],
  };
}

export function DashboardCard({
  title,
  value,
  subtitle,
  trend,
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'No data available',
  timeWindow,
  variant = 'default',
  onRetry,
  children,
}: DashboardCardProps) {
  const tc = useThemeColors();

  const cardStyles: React.CSSProperties = {
    backgroundColor: tc.background.surface,
    borderRadius: radius.xl,
    padding: space['6'],
    border: `1px solid ${tc.border.default}`,
    minHeight: '140px',
    display: 'flex',
    flexDirection: 'column',
  };

  const titleStyles: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: tc.text.muted,
    marginBottom: space['2'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    lineHeight: lineHeight.normal,
  };

  const valueStyles: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.semibold,
    color: tc.text.primary,
    marginBottom: space['1'],
    lineHeight: lineHeight.tight,
  };

  const subtitleStyles: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: tc.text.muted,
    lineHeight: lineHeight.normal,
  };

  const timeWindowStyles: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.muted,
    backgroundColor: tc.background.muted,
    padding: `${space['0.5']} ${space['2']}`,
    borderRadius: radius.DEFAULT,
  };

  const skeletonStyles: React.CSSProperties = {
    backgroundColor: tc.border.default,
    borderRadius: radius.DEFAULT,
    animation: 'pulse 2s infinite',
  };

  const errorStyles: React.CSSProperties = {
    color: tc.text.primary,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  };

  const emptyStyles: React.CSSProperties = {
    color: tc.text.muted,
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
  };

  const retryButtonStyles: React.CSSProperties = {
    marginTop: space['2'],
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    backgroundColor: tc.background.muted,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.md,
    cursor: 'pointer',
    color: tc.text.secondary,
  };

  return (
    <div style={{ ...cardStyles, ...getVariantStyles(variant, tc) }}>
      <div style={titleStyles}>
        <span>{title}</span>
        {timeWindow && <span style={timeWindowStyles}>{timeWindow}</span>}
      </div>

      {loading && (
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...skeletonStyles,
              height: '32px',
              width: '60%',
              marginBottom: space['2'],
            }}
          />
          <div
            style={{
              ...skeletonStyles,
              height: '16px',
              width: '40%',
            }}
          />
        </div>
      )}

      {!loading && error && (
        <div style={errorStyles}>
          <span>⚠️ {error}</span>
          {onRetry && (
            <button style={retryButtonStyles} onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && empty && (
        <div style={emptyStyles}>
          <span>{emptyMessage}</span>
        </div>
      )}

      {!loading && !error && !empty && (
        <>
          {value !== undefined && (
            <div style={valueStyles}>{value}</div>
          )}
          {subtitle && (
            <div style={subtitleStyles}>
              {subtitle}
              {trend && (
                <span style={{ marginLeft: space['2'] }}>
                  <TrendBadge direction={trend.direction} value={trend.value} />
                </span>
              )}
            </div>
          )}
          {children}
        </>
      )}
    </div>
  );
}
