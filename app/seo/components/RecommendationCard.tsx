/**
 * SEO Intelligence - Recommendation Card Component
 * 
 * Displays a single SEO recommendation with type, impact, confidence,
 * and current status. Links to detail view for full diff.
 * 
 * GOVERNANCE:
 * - Display-only component (no direct mutations)
 * - Actions delegate to parent handlers
 * - Shows confidence and impact for informed decisions
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
import type { SeoRecommendation, ApprovalStatus, ImpactLevel, RecommendationType } from '../../../lib/seo/types';
import {
  formatRecommendationType,
  formatImpactLevel,
  formatApprovalStatus,
  formatConfidence,
  formatRelativeTime,
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
    expectedImpact,
    confidence,
    status,
    rationale,
    generatedAt,
  } = recommendation;

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  const impactStyle = getImpactStyle(expectedImpact);
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
          {formatApprovalStatus(status)}
        </span>
      </div>

      {/* Rationale preview */}
      {!compact && (
        <p style={rationaleStyles}>
          {rationale.length > 150 ? `${rationale.substring(0, 150)}...` : rationale}
        </p>
      )}

      {/* Footer: Impact, Confidence, Time */}
      <div style={footerStyles}>
        <div style={metaGroupStyles}>
          <span style={{ ...impactBadgeStyles, ...impactStyle }}>
            {formatImpactLevel(expectedImpact)}
          </span>
          <span style={confidenceStyles}>
            {formatConfidence(confidence)} confidence
          </span>
        </div>
        <span style={timeStyles}>{formatRelativeTime(generatedAt)}</span>
      </div>
    </div>
  );
}

// ============================================
// Style Helpers
// ============================================

function getImpactStyle(impact: ImpactLevel): React.CSSProperties {
  switch (impact) {
    case 'critical':
      return { backgroundColor: semantic.danger.light, color: semantic.danger.dark };
    case 'high':
      return { backgroundColor: semantic.warning.light, color: semantic.warning.dark };
    case 'medium':
      return { backgroundColor: semantic.info.light, color: semantic.info.dark };
    case 'low':
    default:
      return { backgroundColor: background.muted, color: text.muted };
  }
}

function getStatusStyle(status: ApprovalStatus): React.CSSProperties {
  switch (status) {
    case 'approved':
      return { backgroundColor: statusColors.exceptional.bg, color: statusColors.exceptional.text };
    case 'rejected':
      return { backgroundColor: statusColors.breach.bg, color: statusColors.breach.text };
    case 'deferred':
      return { backgroundColor: statusColors.standard.bg, color: statusColors.standard.text };
    case 'implemented':
      return { backgroundColor: statusColors.active.bg, color: statusColors.active.text };
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

const rationaleStyles: React.CSSProperties = {
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

const impactBadgeStyles: React.CSSProperties = {
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

const timeStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
};

export default RecommendationCard;
