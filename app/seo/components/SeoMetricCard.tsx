/**
 * SEO Intelligence - Metric Card Component
 * 
 * Displays a single SEO metric with label, value, and optional trend.
 * Used for dashboard KPI display.
 * 
 * GOVERNANCE:
 * - Read-only display component
 * - No user actions or mutations
 * - Data passed as props (no internal fetching)
 * 
 * NOT ALLOWED:
 * - Triggering data refreshes
 * - Modifying displayed values
 * - User input handling
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  trendColors,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';

// ============================================
// Types
// ============================================

export interface SeoMetricCardProps {
  /** Metric label */
  label: string;
  /** Metric value (formatted) */
  value: string;
  /** Optional subtitle or context */
  subtitle?: string;
  /** Trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend value (e.g., "+5%") */
  trendValue?: string;
  /** Optional icon or emoji */
  icon?: string;
  /** Loading state */
  loading?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * SEO Metric Card - displays a single metric.
 * 
 * This is a DISPLAY-ONLY component.
 * It renders the data it receives - no internal state or side effects.
 */
export function SeoMetricCard({
  label,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  loading = false,
}: SeoMetricCardProps) {
  // Trend styling
  const trendStyle = trend ? trendColors[trend] : null;
  
  if (loading) {
    return (
      <div style={cardStyles}>
        <div style={loadingLabelStyles} />
        <div style={loadingValueStyles} />
      </div>
    );
  }

  return (
    <div style={cardStyles}>
      {/* Header with icon and label */}
      <div style={headerStyles}>
        {icon && <span style={iconStyles}>{icon}</span>}
        <span style={labelStyles}>{label}</span>
      </div>
      
      {/* Main value */}
      <div style={valueStyles}>{value}</div>
      
      {/* Subtitle or trend */}
      <div style={footerStyles}>
        {subtitle && <span style={subtitleStyles}>{subtitle}</span>}
        {trend && trendValue && (
          <span
            style={{
              ...trendStyles,
              color: trendStyle?.text,
              backgroundColor: trendStyle?.bg,
            }}
          >
            {trend === 'up' && '↑'}
            {trend === 'down' && '↓'}
            {trend === 'neutral' && '→'}
            {' '}{trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const cardStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  border: `1px solid ${border.default}`,
  borderRadius: radius.xl,
  padding: space['6'],
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const iconStyles: React.CSSProperties = {
  fontSize: fontSize.lg,
};

const labelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const valueStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  lineHeight: 1.2,
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: space['1'],
};

const subtitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
};

const trendStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.md,
};

const loadingLabelStyles: React.CSSProperties = {
  height: '14px',
  width: '60%',
  backgroundColor: border.default,
  borderRadius: radius.sm,
};

const loadingValueStyles: React.CSSProperties = {
  height: '32px',
  width: '80%',
  backgroundColor: border.default,
  borderRadius: radius.md,
  marginTop: space['2'],
};

export default SeoMetricCard;
