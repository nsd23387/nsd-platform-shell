/**
 * SEO Intelligence - Recommendation Diff Component
 * 
 * Displays side-by-side comparison of current vs proposed values.
 * Essential for informed approval decisions.
 * 
 * GOVERNANCE:
 * - Display-only component
 * - Shows exact changes for transparency
 * - No editing or modification capability
 * 
 * NOT ALLOWED:
 * - Modifying proposed values
 * - Partial approvals
 * - Auto-merge functionality
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  semantic,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { formatCharDiff } from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface RecommendationDiffProps {
  /** Label for what is being compared */
  label: string;
  /** Current value (null if new) */
  currentValue: string | null;
  /** Proposed new value */
  proposedValue: string;
  /** Optional: Maximum height before scroll */
  maxHeight?: number;
}

// ============================================
// Component
// ============================================

/**
 * Recommendation Diff - shows current vs proposed side-by-side.
 * 
 * This is a DISPLAY-ONLY component.
 * Users review diffs to make informed approval decisions.
 * 
 * NOTE: This is a simplified diff view. Future enhancement could
 * add character-level highlighting for changes.
 */
export function RecommendationDiff({
  label,
  currentValue,
  proposedValue,
  maxHeight = 200,
}: RecommendationDiffProps) {
  const charDiff = formatCharDiff(currentValue, proposedValue);
  const hasChange = currentValue !== proposedValue;

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <span style={labelStyles}>{label}</span>
        <span style={charDiffStyles}>{charDiff}</span>
      </div>

      {/* Diff panels */}
      <div style={diffContainerStyles}>
        {/* Current value */}
        <div style={panelStyles}>
          <div style={panelHeaderStyles}>
            <span style={panelLabelStyles}>Current</span>
            {currentValue === null && (
              <span style={emptyIndicatorStyles}>(empty)</span>
            )}
          </div>
          <div
            style={{
              ...panelContentStyles,
              ...currentPanelStyles,
              maxHeight,
            }}
          >
            {currentValue ?? <em style={emptyTextStyles}>No current value</em>}
          </div>
        </div>

        {/* Arrow indicator */}
        <div style={arrowContainerStyles}>
          <span style={arrowStyles}>→</span>
        </div>

        {/* Proposed value */}
        <div style={panelStyles}>
          <div style={panelHeaderStyles}>
            <span style={panelLabelStyles}>Proposed</span>
            {hasChange && (
              <span style={changeIndicatorStyles}>Changed</span>
            )}
          </div>
          <div
            style={{
              ...panelContentStyles,
              ...proposedPanelStyles,
              maxHeight,
            }}
          >
            {proposedValue}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const labelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
};

const charDiffStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
};

const diffContainerStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  gap: space['3'],
  alignItems: 'start',
};

const panelStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};

const panelHeaderStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const panelLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: text.muted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const panelContentStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  lineHeight: 1.6,
  padding: space['3'],
  borderRadius: radius.lg,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const currentPanelStyles: React.CSSProperties = {
  backgroundColor: semantic.danger.light,
  color: text.primary,
  border: `1px solid ${semantic.danger.base}20`,
};

const proposedPanelStyles: React.CSSProperties = {
  backgroundColor: semantic.success.light,
  color: text.primary,
  border: `1px solid ${semantic.success.base}20`,
};

const arrowContainerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: space['8'],
};

const arrowStyles: React.CSSProperties = {
  fontSize: fontSize.xl,
  color: text.muted,
};

const emptyIndicatorStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  fontStyle: 'italic',
};

const emptyTextStyles: React.CSSProperties = {
  color: text.muted,
};

const changeIndicatorStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  color: semantic.success.dark,
  backgroundColor: semantic.success.light,
  padding: `${space['0.5']} ${space['2']}`,
  borderRadius: radius.full,
};

export default RecommendationDiff;
