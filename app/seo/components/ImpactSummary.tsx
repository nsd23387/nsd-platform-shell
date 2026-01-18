/**
 * SEO Intelligence - Impact Summary Component
 * 
 * Displays expected impact assessment for a recommendation.
 * Helps prioritize which recommendations to review first.
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
import type { ImpactLevel } from '../../../lib/seo/types';
import { formatImpactLevel } from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface ImpactSummaryProps {
  /** Impact level */
  impact: ImpactLevel;
  /** Optional description of expected impact */
  description?: string;
  /** Expected metrics changes */
  metrics?: {
    traffic?: string;
    ranking?: string;
    ctr?: string;
  };
  /** Display variant */
  variant?: 'badge' | 'card' | 'inline';
}

// ============================================
// Component
// ============================================

/**
 * Impact Summary - shows expected recommendation impact.
 * 
 * Impact levels:
 * - Critical: Urgent, significant business impact
 * - High: Important, measurable improvement expected
 * - Medium: Moderate improvement expected
 * - Low: Minor optimization
 * 
 * This component displays actual assessments without manipulation.
 */
export function ImpactSummary({
  impact,
  description,
  metrics,
  variant = 'badge',
}: ImpactSummaryProps) {
  const impactStyle = getImpactStyle(impact);

  if (variant === 'badge') {
    return (
      <span
        style={{
          ...badgeStyles,
          backgroundColor: impactStyle.bg,
          color: impactStyle.text,
          borderColor: impactStyle.border,
        }}
        title={description}
      >
        {getImpactIcon(impact)} {formatImpactLevel(impact)}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span style={inlineStyles}>
        <span
          style={{
            ...dotStyles,
            backgroundColor: impactStyle.text,
          }}
        />
        <span style={{ color: impactStyle.text, fontWeight: fontWeight.medium }}>
          {formatImpactLevel(impact)}
        </span>
        {description && (
          <span style={inlineDescStyles}>— {description}</span>
        )}
      </span>
    );
  }

  // Card variant
  return (
    <div
      style={{
        ...cardStyles,
        borderLeftColor: impactStyle.text,
      }}
    >
      {/* Header */}
      <div style={cardHeaderStyles}>
        <span style={{ fontSize: fontSize.xl }}>{getImpactIcon(impact)}</span>
        <div>
          <div
            style={{
              ...cardLabelStyles,
              color: impactStyle.text,
            }}
          >
            {formatImpactLevel(impact)}
          </div>
          <div style={cardTitleStyles}>Expected Impact</div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p style={cardDescStyles}>{description}</p>
      )}

      {/* Metrics */}
      {metrics && (
        <div style={metricsStyles}>
          {metrics.traffic && (
            <div style={metricItemStyles}>
              <span style={metricLabelStyles}>Traffic</span>
              <span style={metricValueStyles}>{metrics.traffic}</span>
            </div>
          )}
          {metrics.ranking && (
            <div style={metricItemStyles}>
              <span style={metricLabelStyles}>Ranking</span>
              <span style={metricValueStyles}>{metrics.ranking}</span>
            </div>
          )}
          {metrics.ctr && (
            <div style={metricItemStyles}>
              <span style={metricLabelStyles}>CTR</span>
              <span style={metricValueStyles}>{metrics.ctr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getImpactStyle(impact: ImpactLevel): {
  bg: string;
  text: string;
  border: string;
} {
  switch (impact) {
    case 'critical':
      return {
        bg: semantic.danger.light,
        text: semantic.danger.dark,
        border: semantic.danger.base,
      };
    case 'high':
      return {
        bg: semantic.warning.light,
        text: semantic.warning.dark,
        border: semantic.warning.base,
      };
    case 'medium':
      return {
        bg: semantic.info.light,
        text: semantic.info.dark,
        border: semantic.info.base,
      };
    case 'low':
    default:
      return {
        bg: background.muted,
        text: text.muted,
        border: text.muted,
      };
  }
}

function getImpactIcon(impact: ImpactLevel): string {
  switch (impact) {
    case 'critical':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🔵';
    case 'low':
    default:
      return '⚪';
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

const inlineDescStyles: React.CSSProperties = {
  color: text.muted,
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
  alignItems: 'center',
  gap: space['3'],
};

const cardLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
};

const cardTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

const cardDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: 1.5,
  margin: 0,
};

const metricsStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['4'],
  paddingTop: space['2'],
  borderTop: `1px solid ${background.muted}`,
};

const metricItemStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['0.5'],
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

export default ImpactSummary;
