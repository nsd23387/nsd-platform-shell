/**
 * SEO Intelligence - Impact Summary Component (v1)
 * 
 * Displays expected impact assessment for a recommendation.
 * Aligned with canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows actual impact assessments (no inflation)
 * - Clear visual hierarchy for prioritization
 * 
 * NOT ALLOWED:
 * - Hiding impact information
 * - Inflating impact scores
 * - Auto-prioritization that bypasses review
 */

'use client';

import React from 'react';
import {
  background,
  text,
  semantic,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type { ExpectedImpact, RiskLevel, RiskAssessment } from '../../../lib/seo/types';
import { formatRiskLevel, formatPrimarySuccessMetric } from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface ImpactSummaryProps {
  /** Expected impact data */
  impact: ExpectedImpact;
  /** Risk assessment (optional, for combined view) */
  risk?: RiskAssessment;
  /** Display variant */
  variant?: 'badge' | 'card' | 'inline';
}

// ============================================
// Component
// ============================================

/**
 * Impact Summary - shows expected recommendation impact.
 * 
 * Displays business-first impact estimates:
 * - SEO metrics (CTR, ranking, impressions)
 * - Conversion metrics (quote starts, conversion rate)
 * - Revenue metrics (revenue per session, monthly revenue)
 * 
 * This component displays actual assessments without manipulation.
 */
export function ImpactSummary({
  impact,
  risk,
  variant = 'card',
}: ImpactSummaryProps) {
  const primaryMetric = impact.primary_success_metric;
  const riskStyle = risk ? getRiskStyle(risk.level) : null;

  if (variant === 'badge') {
    return (
      <span
        style={{
          ...badgeStyles,
          backgroundColor: riskStyle?.bg ?? background.muted,
          color: riskStyle?.text ?? text.muted,
          borderColor: riskStyle?.border ?? text.muted,
        }}
      >
        {primaryMetric && (
          <>
            {getMetricIcon(primaryMetric)} {formatPrimarySuccessMetric(primaryMetric)}
          </>
        )}
        {!primaryMetric && 'Impact not specified'}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span style={inlineStyles}>
        {primaryMetric && (
          <>
            <span
              style={{
                ...dotStyles,
                backgroundColor: riskStyle?.text ?? text.muted,
              }}
            />
            <span style={{ color: riskStyle?.text, fontWeight: fontWeight.medium }}>
              {formatPrimarySuccessMetric(primaryMetric)}
            </span>
          </>
        )}
      </span>
    );
  }

  // Card variant
  return (
    <div
      style={{
        ...cardStyles,
        borderLeftColor: riskStyle?.text ?? text.muted,
      }}
    >
      {/* Header */}
      <div style={cardHeaderStyles}>
        <div>
          <div style={cardTitleStyles}>Expected Impact</div>
          {primaryMetric && (
            <div style={{ ...primaryMetricStyles, color: riskStyle?.text }}>
              Primary: {formatPrimarySuccessMetric(primaryMetric)}
            </div>
          )}
        </div>
        {risk && (
          <span style={{ ...riskBadgeStyles, ...riskStyle }}>
            {formatRiskLevel(risk.level)}
          </span>
        )}
      </div>

      {/* Metrics Grid */}
      <div style={metricsGridStyles}>
        {/* SEO Metrics */}
        {impact.seo_metrics && (
          <div style={metricSectionStyles}>
            <div style={sectionTitleStyles}>SEO</div>
            {impact.seo_metrics.ctr_lift_percent && (
              <MetricRow label="CTR Lift" value={impact.seo_metrics.ctr_lift_percent} />
            )}
            {impact.seo_metrics.ranking_change_estimate && (
              <MetricRow label="Ranking" value={impact.seo_metrics.ranking_change_estimate} />
            )}
            {impact.seo_metrics.impressions_change && (
              <MetricRow label="Impressions" value={impact.seo_metrics.impressions_change} />
            )}
          </div>
        )}

        {/* Conversion Metrics */}
        {impact.conversion_metrics && (
          <div style={metricSectionStyles}>
            <div style={sectionTitleStyles}>Conversion</div>
            {impact.conversion_metrics.quote_start_lift && (
              <MetricRow label="Quote Starts" value={impact.conversion_metrics.quote_start_lift} />
            )}
            {impact.conversion_metrics.conversion_rate_lift && (
              <MetricRow label="Conv. Rate" value={impact.conversion_metrics.conversion_rate_lift} />
            )}
          </div>
        )}

        {/* Revenue Metrics */}
        {impact.revenue_metrics && (
          <div style={metricSectionStyles}>
            <div style={sectionTitleStyles}>Revenue</div>
            {impact.revenue_metrics.revenue_per_session_lift && (
              <MetricRow label="Rev/Session" value={impact.revenue_metrics.revenue_per_session_lift} />
            )}
            {impact.revenue_metrics.monthly_revenue_estimate && (
              <MetricRow label="Monthly Est." value={impact.revenue_metrics.monthly_revenue_estimate} />
            )}
          </div>
        )}
      </div>

      {/* No metrics available */}
      {!impact.seo_metrics && !impact.conversion_metrics && !impact.revenue_metrics && (
        <p style={noMetricsStyles}>Impact estimates not available</p>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

interface MetricRowProps {
  label: string;
  value: string;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div style={metricRowStyles}>
      <span style={metricLabelStyles}>{label}</span>
      <span style={metricValueStyles}>{value}</span>
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getRiskStyle(level: RiskLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'high':
      return {
        bg: semantic.danger.light,
        text: semantic.danger.dark,
        border: semantic.danger.base,
      };
    case 'medium':
      return {
        bg: semantic.warning.light,
        text: semantic.warning.dark,
        border: semantic.warning.base,
      };
    case 'low':
    default:
      return {
        bg: semantic.success.light,
        text: semantic.success.dark,
        border: semantic.success.base,
      };
  }
}

function getMetricIcon(metric: string): string {
  switch (metric) {
    case 'ctr':
      return '🎯';
    case 'ranking':
      return '📈';
    case 'quote_starts':
      return '📝';
    case 'conversion_rate':
      return '💹';
    case 'revenue':
      return '💰';
    default:
      return '📊';
  }
}

// ============================================
// Styles
// ============================================

const badgeStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: space['1'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.full,
  border: '1px solid',
};

const inlineStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: space['2'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
};

const dotStyles: React.CSSProperties = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
};

const cardStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  borderRadius: radius.lg,
  padding: space['4'],
  borderLeft: '4px solid',
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
};

const cardHeaderStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
};

const cardTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
};

const primaryMetricStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  marginTop: space['0.5'],
};

const riskBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.md,
  backgroundColor: background.muted,
  color: text.muted,
};

const metricsGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: space['4'],
};

const metricSectionStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};

const sectionTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const metricRowStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const metricLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

const metricValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: text.primary,
};

const noMetricsStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  fontStyle: 'italic',
  margin: 0,
};

export default ImpactSummary;
