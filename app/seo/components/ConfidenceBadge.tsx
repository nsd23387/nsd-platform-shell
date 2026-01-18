/**
 * SEO Intelligence - Confidence Badge Component (v1)
 * 
 * Displays AI confidence score with explainable factors.
 * Aligned with canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows actual confidence values (no manipulation)
 * - Clear visual indicators for confidence levels
 * - Explainable factors for transparency
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
import type { ConfidenceModel, ConfidenceFactor } from '../../../lib/seo/types';
import { selectConfidenceLevel, selectTopConfidenceFactors } from '../../../lib/seo/selectors';
import { formatConfidence, formatConfidenceFactorName } from '../../../lib/seo/formatters';
import { CONFIDENCE_THRESHOLDS } from '../../../lib/seo/constants';

// ============================================
// Types
// ============================================

export interface ConfidenceBadgeProps {
  /** Confidence model with score and factors */
  confidence: ConfidenceModel;
  /** Show percentage value */
  showValue?: boolean;
  /** Show confidence level label */
  showLabel?: boolean;
  /** Show top factors */
  showFactors?: boolean;
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
  showFactors = false,
  size = 'md',
}: ConfidenceBadgeProps) {
  const level = selectConfidenceLevel(confidence.score);
  const levelStyle = getLevelStyle(level);
  const sizeStyle = getSizeStyle(size);
  const topFactors = selectTopConfidenceFactors(confidence, 3);
  
  const levelLabels: Record<string, string> = {
    low: 'Low Confidence',
    medium: 'Medium Confidence',
    high: 'High Confidence',
  };

  return (
    <div
      style={{
        ...badgeStyles,
        backgroundColor: levelStyle.backgroundColor,
        borderColor: levelStyle.borderColor,
        ...sizeStyle,
      }}
      title={confidence.explanation}
    >
      {/* Confidence bar */}
      <div style={barContainerStyles}>
        <div
          style={{
            ...barFillStyles,
            width: `${Math.min(confidence.score * 100, 100)}%`,
            backgroundColor: levelStyle.color,
          }}
        />
      </div>
      
      {/* Text content */}
      <div style={textContainerStyles}>
        {showValue && (
          <span style={{ ...valueStyles, color: levelStyle.color }}>
            {formatConfidence(confidence.score)}
          </span>
        )}
        {showLabel && (
          <span style={labelStyles}>{levelLabels[level]}</span>
        )}
      </div>

      {/* Factors */}
      {showFactors && topFactors.length > 0 && (
        <div style={factorsContainerStyles}>
          <div style={factorsTitleStyles}>Top Factors</div>
          {topFactors.map((factor, idx) => (
            <FactorBar key={idx} factor={factor} />
          ))}
        </div>
      )}

      {/* Explanation */}
      {showFactors && confidence.explanation && (
        <div style={explanationStyles}>
          {confidence.explanation}
        </div>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function FactorBar({ factor }: { factor: ConfidenceFactor }) {
  const weightedValue = factor.weight * factor.value;
  
  return (
    <div style={factorRowStyles}>
      <span style={factorNameStyles}>
        {formatConfidenceFactorName(factor.name)}
      </span>
      <div style={factorBarContainerStyles}>
        <div
          style={{
            ...factorBarFillStyles,
            width: `${weightedValue * 100}%`,
          }}
        />
      </div>
      <span style={factorValueStyles}>
        {Math.round(weightedValue * 100)}%
      </span>
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
  color: text.secondary,
};

const factorsContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['1'],
  marginTop: space['2'],
  paddingTop: space['2'],
  borderTop: `1px solid rgba(0, 0, 0, 0.1)`,
};

const factorsTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const factorRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const factorNameStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.secondary,
  flex: '0 0 100px',
};

const factorBarContainerStyles: React.CSSProperties = {
  flex: 1,
  height: '4px',
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
  borderRadius: radius.full,
  overflow: 'hidden',
};

const factorBarFillStyles: React.CSSProperties = {
  height: '100%',
  backgroundColor: 'currentColor',
  borderRadius: radius.full,
  opacity: 0.6,
};

const factorValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
  flex: '0 0 32px',
  textAlign: 'right' as const,
};

const explanationStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.secondary,
  fontStyle: 'italic',
  marginTop: space['2'],
  paddingTop: space['2'],
  borderTop: `1px solid rgba(0, 0, 0, 0.1)`,
};

// ============================================
// Compact Variant
// ============================================

export interface ConfidenceDotProps {
  /** Confidence score (0-1) or model */
  confidence: number | ConfidenceModel;
  /** Size in pixels */
  size?: number;
}

/**
 * Compact confidence indicator as a colored dot.
 */
export function ConfidenceDot({ confidence, size = 8 }: ConfidenceDotProps) {
  const score = typeof confidence === 'number' ? confidence : confidence.score;
  const level = selectConfidenceLevel(score);
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
      title={`${formatConfidence(score)} confidence`}
    />
  );
}

export default ConfidenceBadge;
