/**
 * SEO Intelligence - Recommendations List
 * 
 * Lists all AI-generated SEO recommendations.
 * Supports filtering by status, type, and impact.
 * 
 * GOVERNANCE:
 * - Read-only list display
 * - Admin-only access
 * - Links to detail pages for actions
 * 
 * NOT ALLOWED:
 * - Bulk approvals from list view
 * - Auto-approval
 * - CMS modifications
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

// ============================================
// Component
// ============================================

/**
 * SEO Recommendations List Page
 * 
 * Displays:
 * 1. Filterable list of recommendations
 * 2. Status, impact, and confidence indicators
 * 3. Links to detail pages for review/approval
 * 
 * NOTE: All data is placeholder. Will be populated when
 * recommendation engine is connected.
 */
export default function SeoRecommendationsPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Recommendations</h1>
        <p style={descStyles}>
          AI-generated SEO improvement suggestions awaiting review.
        </p>
      </div>

      {/* Filters Placeholder */}
      <div style={filtersStyles}>
        <select style={selectStyles} disabled>
          <option>All Statuses</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Types</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Impact Levels</option>
        </select>
        <input
          type="text"
          placeholder="Search recommendations..."
          style={searchStyles}
          disabled
        />
      </div>

      {/* Empty State */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>💡</span>
        <h3 style={emptyTitleStyles}>No Recommendations Available</h3>
        <p style={emptyDescStyles}>
          Recommendations will appear here once the AI recommendation engine
          is connected. All suggestions require human approval before implementation.
        </p>
      </div>

      {/* Approval Workflow Notice */}
      <div style={workflowNoticeStyles}>
        <h4 style={workflowTitleStyles}>Approval Workflow</h4>
        <div style={workflowStepsStyles}>
          <div style={workflowStepStyles}>
            <span style={stepNumberStyles}>1</span>
            <span>AI generates recommendation</span>
          </div>
          <span style={workflowArrowStyles}>→</span>
          <div style={workflowStepStyles}>
            <span style={stepNumberStyles}>2</span>
            <span>Human reviews diff</span>
          </div>
          <span style={workflowArrowStyles}>→</span>
          <div style={workflowStepStyles}>
            <span style={stepNumberStyles}>3</span>
            <span>Approve / Reject / Defer</span>
          </div>
          <span style={workflowArrowStyles}>→</span>
          <div style={workflowStepStyles}>
            <span style={stepNumberStyles}>4</span>
            <span>Manual implementation</span>
          </div>
        </div>
        <p style={workflowNoteStyles}>
          No changes are auto-deployed. Approved recommendations are handed off
          to the website team for manual implementation.
        </p>
      </div>

      {/* Table Structure Preview */}
      <div style={tablePreviewStyles}>
        <p style={previewLabelStyles}>Expected list item info:</p>
        <ul style={previewListStyles}>
          <li>Recommendation Type</li>
          <li>Target Page</li>
          <li>Impact Level</li>
          <li>Confidence Score</li>
          <li>Status</li>
          <li>Generated Date</li>
          <li>Reviewer</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
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

const filtersStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  marginBottom: space['6'],
  flexWrap: 'wrap',
};

const selectStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['3']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
  color: text.muted,
};

const searchStyles: React.CSSProperties = {
  flex: 1,
  minWidth: '200px',
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: `${space['2']} ${space['3']}`,
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
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
  margin: `${space['2']} 0 0`,
};

const workflowNoticeStyles: React.CSSProperties = {
  padding: space['5'],
  backgroundColor: semantic.success.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.success.base}20`,
  marginBottom: space['6'],
};

const workflowTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: semantic.success.dark,
  margin: 0,
  marginBottom: space['3'],
};

const workflowStepsStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  flexWrap: 'wrap',
  marginBottom: space['3'],
};

const workflowStepStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
};

const stepNumberStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: semantic.success.base,
  color: 'white',
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
};

const workflowArrowStyles: React.CSSProperties = {
  color: text.muted,
};

const workflowNoteStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  fontStyle: 'italic',
  margin: 0,
};

const tablePreviewStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
};

const previewLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: semantic.info.dark,
  margin: 0,
  marginBottom: space['2'],
};

const previewListStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  color: text.secondary,
  margin: 0,
  paddingLeft: space['5'],
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: space['1'],
};
