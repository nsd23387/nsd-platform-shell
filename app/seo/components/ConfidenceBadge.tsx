/**
 * SEO Intelligence - Confidence Badge Component
 * 
 * Displays AI confidence score as a visual badge.
 * Helps users understand recommendation reliability.
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows actual confidence values (no manipulation)
 * - Clear visual indicators for confidence levels
 * 
 * NOT ALLOWED:
 * - Hiding low confidence scores
 * - Inflating confidence display
 * - Modifying confidence values
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
import { selectConfidenceLevel } from '../../../lib/seo/selectors';
import { formatConfidence } from '../../../lib/seo/formatters';
import { CONFIDENCE_THRESHOLDS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface ConfidenceBadgeProps {
  /** Confidence score (0-1) */
  confidence: number;
  /** Show percentage value */
  showValue?: boolean;
  /** Show confidence level label */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================
// Component
// ============================================

/**
 * Confidence Badge - visual indicator of AI confidence.
 * 
 * Confidence levels:
 * - Low (< 50%): Orange/warning - Review carefully
 * - Medium (50-85%): Blue/info - Standard review
 * - High (> 85%): Green/success - High confidence
 * 
 * This component displays actual confidence values without manipulation.
 */
export function ConfidenceBadge({
  confidence,
  showValue = true,
  showLabel = true,
  size = 'md',
}: ConfidenceBadgeProps) {
  const level = selectConfidenceLevel(confidence);
  const levelStyle = getLevelStyle(level);
  const sizeStyle = getSizeStyle(size);
  
  const levelLabels: Record<string, string> = {
    low: 'Low Confidence',
    medium: 'Medium Confidence',
    high: 'High Confidence',
  };

  return (
    <div
      style={{
        ...badgeStyles,
        ...levelStyle,
        ...sizeStyle,
      }}
      title={`${formatConfidence(confidence)} confidence - ${levelLabels[level]}`}
    >
      {/* Confidence bar */}
      <div style={barContainerStyles}>
        <div
          style={{
            ...barFillStyles,
            width: `${Math.min(confidence * 100, 100)}%`,
            backgroundColor: levelStyle.color,
          }}
        />
      </div>
      
      {/* Text content */}
      <div style={textContainerStyles}>
        {showValue && (
          <span style={valueStyles}>{formatConfidence(confidence)}</span>
        )}
        {showLabel && (
          <span style={labelStyles}>{levelLabels[level]}</span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getLevelStyle(level: 'low' | 'medium' | 'high'): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  switch (level) {
    case 'high':
      return {
        backgroundColor: semantic.success.light,
        color: semantic.success.dark,
        borderColor: semantic.success.base,
      };
    case 'medium':
      return {
        backgroundColor: semantic.info.light,
        color: semantic.info.dark,
        borderColor: semantic.info.base,
      };
    case 'low':
    default:
      return {
        backgroundColor: semantic.warning.light,
        color: semantic.warning.dark,
        borderColor: semantic.warning.base,
      };
  }
}

function getSizeStyle(size: 'sm' | 'md' | 'lg'): React.CSSProperties {
  switch (size) {
    case 'lg':
      return { padding: `${space['3']} ${space['4']}`, gap: space['3'] };
    case 'sm':
      return { padding: `${space['1']} ${space['2']}`, gap: space['1'] };
    case 'md':
    default:
      return { padding: `${space['2']} ${space['3']}`, gap: space['2'] };
  }
}

// ============================================
// Styles
// ============================================

const badgeStyles: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  borderRadius: radius.lg,
  border: '1px solid',
};

const barContainerStyles: React.CSSProperties = {
  height: '4px',
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: radius.full,
  overflow: 'hidden',
  width: '100%',
  minWidth: '60px',
};

const barFillStyles: React.CSSProperties = {
  height: '100%',
  borderRadius: radius.full,
  transition: 'width 0.3s ease',
};

const textContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const valueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
};

const labelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
};

// ============================================
// Compact Variant
// ============================================

export interface ConfidenceDotProps {
  /** Confidence score (0-1) */
  confidence: number;
  /** Size in pixels */
  size?: number;
}

/**
 * Compact confidence indicator as a colored dot.
 */
export function ConfidenceDot({ confidence, size = 8 }: ConfidenceDotProps) {
  const level = selectConfidenceLevel(confidence);
  const levelStyle = getLevelStyle(level);

  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: levelStyle.color,
      }}
      title={`${formatConfidence(confidence)} confidence`}
    />
  );
}

export default ConfidenceBadge;
