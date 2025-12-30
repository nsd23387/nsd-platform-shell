/**
 * DashboardCard Component
 * 
 * Reusable card component for displaying metrics on dashboards.
 * Read-only display - no edit actions.
 * 
 * Features:
 * - Loading state with skeleton
 * - Error state with retry option
 * - Empty state messaging
 * - Time window display
 * 
 * Updated to use design system tokens.
 */

import React from 'react';
import {
  background,
  text,
  border,
  cardVariants,
  trendColors,
} from '../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

// ============================================
// Types
// ============================================

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

// ============================================
// Styles (using design tokens)
// ============================================

const cardStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  padding: space['6'],
  border: `1px solid ${border.default}`,
  minHeight: '140px',
  display: 'flex',
  flexDirection: 'column',
};

const titleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.medium,
  color: text.muted,
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
  color: text.primary,
  marginBottom: space['1'],
  lineHeight: lineHeight.tight,
};

const subtitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  lineHeight: lineHeight.normal,
};

const timeWindowStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  backgroundColor: background.muted,
  padding: `${space['0.5']} ${space['2']}`,
  borderRadius: radius.DEFAULT,
};

const skeletonStyles: React.CSSProperties = {
  backgroundColor: border.default,
  borderRadius: radius.DEFAULT,
  animation: 'pulse 2s infinite',
};

const errorStyles: React.CSSProperties = {
  color: text.primary,
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
  color: text.muted,
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
  backgroundColor: background.muted,
  border: `1px solid ${border.default}`,
  borderRadius: radius.md,
  cursor: 'pointer',
  color: text.secondary,
};

// ============================================
// Trend Component
// ============================================

interface TrendBadgeProps {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

function TrendBadge({ direction, value }: TrendBadgeProps) {
  const colors = trendColors[direction];

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

// ============================================
// Loading Skeleton
// ============================================

function CardSkeleton() {
  return (
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
  );
}

// ============================================
// Variant Styles
// ============================================

function getVariantStyles(variant: DashboardCardProps['variant']): React.CSSProperties {
  if (!variant || variant === 'default') return {};
  return {
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    borderLeftColor: cardVariants[variant],
  };
}

// ============================================
// Main Component
// ============================================

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
  return (
    <div style={{ ...cardStyles, ...getVariantStyles(variant) }}>
      {/* Header */}
      <div style={titleStyles}>
        <span>{title}</span>
        {timeWindow && <span style={timeWindowStyles}>{timeWindow}</span>}
      </div>

      {/* Loading State */}
      {loading && <CardSkeleton />}

      {/* Error State */}
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

      {/* Empty State */}
      {!loading && !error && empty && (
        <div style={emptyStyles}>
          <span>{emptyMessage}</span>
        </div>
      )}

      {/* Content */}
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
