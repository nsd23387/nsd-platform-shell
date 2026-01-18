/**
 * SEO Intelligence - Recommendation Detail
 * 
 * Detail view for a single recommendation.
 * Shows full diff and approval actions.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Approval actions with confirmation
 * - Full diff visibility for informed decisions
 * 
 * NOT ALLOWED:
 * - Auto-approval
 * - Skipping diff review
 * - Direct CMS modification
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  semantic,
} from '../../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { ApprovalActions } from '../../components';

// ============================================
// Types
// ============================================

interface RecommendationDetailProps {
  params: {
    recommendationId: string;
  };
}

// ============================================
// Component
// ============================================

/**
 * SEO Recommendation Detail Page
 * 
 * Displays:
 * 1. Recommendation type and rationale
 * 2. Full diff (current vs proposed)
 * 3. Confidence and impact assessment
 * 4. Approval actions (approve/reject/defer)
 * 
 * NOTE: All data is placeholder. Will be populated when
 * recommendation engine is connected.
 */
export default function SeoRecommendationDetailPage({ params }: RecommendationDetailProps) {
  const { recommendationId } = params;

  return (
    <div style={containerStyles}>
      {/* Breadcrumb */}
      <nav style={breadcrumbStyles}>
        <a href="/seo/recommendations" style={breadcrumbLinkStyles}>Recommendations</a>
        <span style={breadcrumbSepStyles}>/</span>
        <span style={breadcrumbCurrentStyles}>{recommendationId}</span>
      </nav>

      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Recommendation Details</h1>
        <p style={descStyles}>
          ID: <code style={codeStyles}>{recommendationId}</code>
        </p>
      </div>

      {/* Not Found State (placeholder) */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>💡</span>
        <h3 style={emptyTitleStyles}>Recommendation Not Found</h3>
        <p style={emptyDescStyles}>
          This recommendation detail view will display data once the AI engine is connected.
          The recommendation ID <code style={codeStyles}>{recommendationId}</code> does not exist.
        </p>
        <a href="/seo/recommendations" style={backLinkStyles}>
          ← Back to Recommendations
        </a>
      </div>

      {/* Expected Content Preview */}
      <div style={previewStyles}>
        <p style={previewLabelStyles}>When populated, this page will show:</p>
        
        {/* Expected Sections */}
        <div style={previewGridStyles}>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Recommendation Info</h4>
            <ul style={previewListStyles}>
              <li>Type (title, meta, etc.)</li>
              <li>Target page</li>
              <li>Generated date</li>
              <li>Status</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Assessment</h4>
            <ul style={previewListStyles}>
              <li>Confidence score</li>
              <li>Expected impact</li>
              <li>Rationale</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Diff View</h4>
            <ul style={previewListStyles}>
              <li>Current value</li>
              <li>Proposed value</li>
              <li>Character diff</li>
            </ul>
          </div>
        </div>

        {/* Approval Actions Preview */}
        <div style={actionsPreviewStyles}>
          <h4 style={previewSectionTitleStyles}>Approval Actions</h4>
          <ApprovalActions
            recommendationId={recommendationId}
            // No handlers - will show "not implemented" state
          />
        </div>
      </div>

      {/* Governance Notice */}
      <div style={governanceNoticeStyles}>
        <h4 style={governanceTitleStyles}>Governance</h4>
        <ul style={governanceListStyles}>
          <li>Approval does NOT automatically deploy changes</li>
          <li>Rejection reason is required (feeds learning loop)</li>
          <li>All actions are logged for audit</li>
          <li>Approved changes go through manual implementation</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  maxWidth: '1000px',
  margin: '0 auto',
};

const breadcrumbStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  marginBottom: space['4'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
};

const breadcrumbLinkStyles: React.CSSProperties = {
  color: text.muted,
  textDecoration: 'none',
};

const breadcrumbSepStyles: React.CSSProperties = {
  color: text.muted,
};

const breadcrumbCurrentStyles: React.CSSProperties = {
  color: text.primary,
  fontWeight: fontWeight.medium,
};

const headerStyles: React.CSSProperties = {
  marginBottom: space['6'],
};

const h1Styles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  margin: 0,
};

const descStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  color: text.muted,
  marginTop: space['1'],
  margin: 0,
};

const codeStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  backgroundColor: background.muted,
  padding: `${space['0.5']} ${space['2']}`,
  borderRadius: radius.sm,
};

const emptyStateStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: space['12'],
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${border.default}`,
  textAlign: 'center',
  marginBottom: space['6'],
};

const emptyIconStyles: React.CSSProperties = {
  fontSize: '48px',
  marginBottom: space['4'],
};

const emptyTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const emptyDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['2'],
  maxWidth: '400px',
  margin: `${space['2']} 0`,
};

const backLinkStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
  textDecoration: 'none',
  marginTop: space['4'],
};

const previewStyles: React.CSSProperties = {
  padding: space['5'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  marginBottom: space['6'],
};

const previewLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: semantic.info.dark,
  margin: 0,
  marginBottom: space['4'],
};

const previewGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: space['4'],
  marginBottom: space['4'],
};

const previewSectionStyles: React.CSSProperties = {
  padding: space['3'],
  backgroundColor: background.surface,
  borderRadius: radius.md,
};

const previewSectionTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
  marginBottom: space['2'],
};

const previewListStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  margin: 0,
  paddingLeft: space['4'],
};

const actionsPreviewStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: background.surface,
  borderRadius: radius.md,
};

const governanceNoticeStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: semantic.warning.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.warning.base}20`,
};

const governanceTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: semantic.warning.dark,
  margin: 0,
  marginBottom: space['2'],
};

const governanceListStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  margin: 0,
  paddingLeft: space['5'],
};
