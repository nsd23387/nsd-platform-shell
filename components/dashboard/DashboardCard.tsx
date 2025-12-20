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
 */

import React from 'react';

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
// Styles (inline for portability)
// ============================================

const cardStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb',
  minHeight: '140px',
  display: 'flex',
  flexDirection: 'column',
};

const titleStyles: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const valueStyles: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '4px',
};

const subtitleStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
};

const timeWindowStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#9ca3af',
  backgroundColor: '#f3f4f6',
  padding: '2px 8px',
  borderRadius: '4px',
};

const skeletonStyles: React.CSSProperties = {
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  animation: 'pulse 2s infinite',
};

const errorStyles: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '14px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  textAlign: 'center',
};

const emptyStyles: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  textAlign: 'center',
};

const retryButtonStyles: React.CSSProperties = {
  marginTop: '8px',
  padding: '6px 12px',
  fontSize: '12px',
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  cursor: 'pointer',
  color: '#374151',
};

// ============================================
// Trend Component
// ============================================

interface TrendBadgeProps {
  direction: 'up' | 'down' | 'neutral';
  value: string;
}

function TrendBadge({ direction, value }: TrendBadgeProps) {
  const colors = {
    up: { bg: '#dcfce7', text: '#166534' },
    down: { bg: '#fef2f2', text: '#dc2626' },
    neutral: { bg: '#f3f4f6', text: '#6b7280' },
  };

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
        gap: '4px',
        fontSize: '12px',
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: colors[direction].bg,
        color: colors[direction].text,
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
          marginBottom: '8px',
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
  switch (variant) {
    case 'success':
      return { borderLeft: '4px solid #22c55e' };
    case 'warning':
      return { borderLeft: '4px solid #f59e0b' };
    case 'danger':
      return { borderLeft: '4px solid #ef4444' };
    default:
      return {};
  }
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
                <span style={{ marginLeft: '8px' }}>
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
