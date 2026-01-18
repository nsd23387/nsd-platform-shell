/**
 * SEO Intelligence - Recommendation Card Component (v1)
 * 
 * Displays a single SEO recommendation with type, risk, confidence,
 * and current status. Aligned with canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - Display-only component (no direct mutations)
 * - Actions delegate to parent handlers
 * - Shows confidence, risk, and evidence for informed decisions
 * 
 * NOT ALLOWED:
 * - Direct API calls
 * - Auto-approval functionality
 * - Bypassing approval workflow
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  statusColors,
  semantic,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type { SeoRecommendation, RecommendationStatus, RiskLevel, SeoRecommendationType } from '../../../lib/seo/types';
import {
  formatRecommendationType,
  formatRiskLevel,
  formatRecommendationStatus,
  formatConfidence,
  formatRelativeTime,
  formatEvidenceSignalCount,
} from '../../../lib/seo/formatters';

// ============================================
// Types
// ============================================

export interface RecommendationCardProps {
  /** The recommendation to display */
  recommendation: SeoRecommendation;
  /** Click handler for viewing details */
  onViewDetails?: (id: string) => void;
  /** Whether to show compact view */
  compact?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * Recommendation Card - displays a single recommendation summary.
 * 
 * This is a DISPLAY component with navigation capability.
 * Actual approval actions are handled on the detail page.
 */
export function RecommendationCard({
  recommendation,
  onViewDetails,
  compact = false,
}: RecommendationCardProps) {
  const {
    id,
    type,
    risk,
    confidence,
    status,
    evidence,
    scope,
    created_at,
  } = recommendation;

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  const riskStyle = getRiskStyle(risk.level);
  const statusStyle = getStatusStyle(status);

  return (
    <div
      style={{
        ...cardStyles,
        cursor: onViewDetails ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
    >
      {/* Header: Type and Status */}
      <div style={headerStyles}>
        <span style={typeStyles}>{formatRecommendationType(type)}</span>
        <span style={{ ...statusBadgeStyles, ...statusStyle }}>
          {formatRecommendationStatus(status)}
        </span>
      </div>

      {/* Page URL */}
      <div style={urlStyles}>
        <span style={urlLabelStyles}>Page:</span>
        <span style={urlValueStyles}>{scope.url}</span>
      </div>

      {/* Evidence summary */}
      {!compact && (
        <p style={summaryStyles}>
          {evidence.summary.length > 150 
            ? `${evidence.summary.substring(0, 150)}...` 
            : evidence.summary}
        </p>
      )}

      {/* Footer: Risk, Confidence, Evidence, Time */}
      <div style={footerStyles}>
        <div style={metaGroupStyles}>
          <span style={{ ...riskBadgeStyles, ...riskStyle }}>
            {formatRiskLevel(risk.level)}
          </span>
          <span style={confidenceStyles}>
            {formatConfidence(confidence.score)} confidence
          </span>
          <span style={evidenceStyles}>
            {formatEvidenceSignalCount(evidence)}
          </span>
        </div>
        <span style={timeStyles}>{formatRelativeTime(created_at)}</span>
      </div>
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getRiskStyle(level: RiskLevel): React.CSSProperties {
  switch (level) {
    case 'high':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'medium':
      return { backgroundColor: semantic.warning.light, color: semantic.warning.dark };
    case 'low':
    default:
      return { backgroundColor: semantic.success.light, color: semantic.success.dark };
  }
}

function getStatusStyle(status: RecommendationStatus): React.CSSProperties {
  switch (status) {
    case 'approved':
      return { backgroundColor: statusColors.exceptional.bg, color: statusColors.exceptional.text };
    case 'rejected':
      return { backgroundColor: statusColors.breach.bg, color: statusColors.breach.text };
    case 'deferred':
      return { backgroundColor: statusColors.standard.bg, color: statusColors.standard.text };
    case 'implemented':
      return { backgroundColor: statusColors.active.bg, color: statusColors.active.text };
    case 'rolled_back':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'pending':
    default:
      return { backgroundColor: statusColors.pending.bg, color: statusColors.pending.text };
  }
}

// ============================================
// Styles
// ============================================

const cardStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  border: `1px solid ${border.default}`,
  borderRadius: radius.xl,
  padding: space['5'],
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
  transition: 'border-color 0.15s ease',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const typeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: text.primary,
};

const statusBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.full,
};

const urlStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const urlLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

const urlValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.secondary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const summaryStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: 1.5,
  margin: 0,
};

const footerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: space['1'],
};

const metaGroupStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
};

const riskBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.medium,
  padding: `${space['1']} ${space['2']}`,
  borderRadius: radius.md,
};

const confidenceStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
};

const evidenceStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

const timeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

export default RecommendationCard;
