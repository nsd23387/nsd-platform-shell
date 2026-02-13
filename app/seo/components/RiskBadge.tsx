/**
 * SEO Intelligence - Risk Badge Component
 * 
 * Visual indicator for risk level assessment.
 * Part of the governance signal components.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - Risk badges reinforce decision quality, not gamify approvals
 * ============================================================
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows actual risk values (no manipulation)
 * - Clear visual indicators for risk levels
 * 
 * NOT ALLOWED:
 * - Hiding high risk indicators
 * - Minimizing risk display
 * - Modifying risk values
 */

'use client';

import React from 'react';
import {
  semantic,
  text,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type { RiskLevel, RiskAssessment } from '../../../lib/seo/types';
import { formatRiskLevel, formatRollbackComplexity } from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface RiskBadgeProps {
  /** Risk level */
  level: RiskLevel;
  /** Show label text */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

export interface RiskDisplayProps {
  /** Full risk assessment */
  risk: RiskAssessment;
  /** Show reasons */
  showReasons?: boolean;
  /** Show rollback complexity */
  showRollback?: boolean;
}

// ============================================
// Components
// ============================================

/**
 * RiskBadge - Compact risk level indicator.
 * 
 * Risk levels:
 * - Low: Green/success - Safe to proceed
 * - Medium: Orange/warning - Review carefully
 * - High: Red/danger - Requires extra scrutiny
 */
export function RiskBadge({ level, showLabel = true, size = 'md' }: RiskBadgeProps) {
  const style = getRiskStyle(level);
  const sizeStyle = getSizeStyle(size);

  return (
    <span
      style={{
        ...badgeStyles,
        ...style,
        ...sizeStyle,
      }}
      title={`Risk Level: ${formatRiskLevel(level)}`}
    >
      <span style={dotStyles(style.color)} />
      {showLabel && formatRiskLevel(level)}
    </span>
  );
}

/**
 * RiskDisplay - Full risk assessment display.
 * 
 * Shows risk level, reasons, and rollback complexity.
 */
export function RiskDisplay({ 
  risk, 
  showReasons = true, 
  showRollback = true 
}: RiskDisplayProps) {
  const style = getRiskStyle(risk.level);

  return (
    <div style={displayContainerStyles}>
      {/* Risk Level Badge */}
      <div style={{ ...displayHeaderStyles, backgroundColor: style.backgroundColor }}>
        <span style={{ ...displayLevelStyles, color: style.color }}>
          <span style={dotStyles(style.color)} />
          {formatRiskLevel(risk.level)} Risk
        </span>
        {showRollback && (
          <span style={rollbackStyles}>
            Rollback: {formatRollbackComplexity(risk.rollback_complexity)}
          </span>
        )}
      </div>

      {/* Reasons */}
      {showReasons && risk.reasons.length > 0 && (
        <div style={reasonsContainerStyles}>
          <div style={reasonsTitleStyles}>Risk Factors</div>
          <ul style={reasonsListStyles}>
            {risk.reasons.map((reason, idx) => (
              <li key={idx} style={reasonItemStyles}>
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getRiskStyle(level: RiskLevel): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  switch (level) {
    case 'high':
      return {
        backgroundColor: semantic.danger.light,
        color: semantic.danger.dark,
        borderColor: semantic.danger.base,
      };
    case 'medium':
      return {
        backgroundColor: semantic.warning.light,
        color: semantic.warning.dark,
        borderColor: semantic.warning.base,
      };
    case 'low':
    default:
      return {
        backgroundColor: semantic.success.light,
        color: semantic.success.dark,
        borderColor: semantic.success.base,
      };
  }
}

function getSizeStyle(size: 'sm' | 'md' | 'lg'): React.CSSProperties {
  switch (size) {
    case 'lg':
      return { 
        padding: `${space['2']} ${space['4']}`, 
        fontSize: fontSize.base,
      };
    case 'sm':
      return { 
        padding: `${space['0.5']} ${space['2']}`, 
        fontSize: fontSize.xs,
      };
    case 'md':
    default:
      return { 
        padding: `${space['1']} ${space['3']}`, 
        fontSize: fontSize.sm,
      };
  }
}

function dotStyles(color: string): React.CSSProperties {
  return {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    marginRight: space['1'],
  };
}

// ============================================
// Styles
// ============================================

const badgeStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: fontFamily.body,
  fontWeight: fontWeight.medium,
  borderRadius: radius.md,
};

const displayContainerStyles: React.CSSProperties = {
  borderRadius: radius.lg,
  overflow: 'hidden',
  border: `1px solid ${semantic.danger.light}`,
};

const displayHeaderStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: `${space['2']} ${space['3']}`,
};

const displayLevelStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
};

const rollbackStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

const reasonsContainerStyles: React.CSSProperties = {
  padding: space['3'],
  backgroundColor: 'white',
};

const reasonsTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: text.muted,
  marginBottom: space['2'],
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const reasonsListStyles: React.CSSProperties = {
  margin: 0,
  padding: 0,
  paddingLeft: space['4'],
};

const reasonItemStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  marginBottom: space['1'],
};

export default RiskBadge;
