/**
 * SEO Intelligence - Approvals Queue
 * 
 * Queue of pending recommendations awaiting human review.
 * Central workflow hub for approval actions.
 * 
 * GOVERNANCE:
 * - Shows only pending recommendations
 * - Links to detail pages for full review
 * - No bulk auto-approval
 * 
 * NOT ALLOWED:
 * - Bulk approve without review
 * - Auto-approval
 * - Skipping diff review
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  semantic,
  violet,
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
 * SEO Approvals Queue Page
 * 
 * Displays:
 * 1. Pending recommendations queue
 * 2. Priority indicators (impact, confidence)
 * 3. Quick navigation to detail pages
 * 
 * NOTE: All data is placeholder. Will be populated when
 * recommendation engine is connected.
 */
export default function SeoApprovalsPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Approvals Queue</h1>
        <p style={descStyles}>
          Recommendations awaiting human review and approval.
        </p>
      </div>

      {/* Queue Stats */}
      <div style={statsStyles}>
        <div style={statCardStyles}>
          <span style={statValueStyles}>0</span>
          <span style={statLabelStyles}>Pending</span>
        </div>
        <div style={statCardStyles}>
          <span style={statValueStyles}>0</span>
          <span style={statLabelStyles}>High Impact</span>
        </div>
        <div style={statCardStyles}>
          <span style={statValueStyles}>0</span>
          <span style={statLabelStyles}>High Confidence</span>
        </div>
        <div style={statCardStyles}>
          <span style={statValueStyles}>0</span>
          <span style={statLabelStyles}>Deferred</span>
        </div>
      </div>

      {/* Empty State */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>✅</span>
        <h3 style={emptyTitleStyles}>No Pending Approvals</h3>
        <p style={emptyDescStyles}>
          When recommendations are generated, they will appear here for review.
          Each recommendation requires explicit human approval.
        </p>
      </div>

      {/* Workflow Guide */}
      <div style={guideStyles}>
        <h3 style={guideTitleStyles}>How to Review</h3>
        <div style={guideStepsStyles}>
          <GuideStep
            number={1}
            title="Select Recommendation"
            description="Click on a recommendation to view full details"
          />
          <GuideStep
            number={2}
            title="Review Diff"
            description="Compare current vs proposed changes"
          />
          <GuideStep
            number={3}
            title="Check Confidence"
            description="Consider AI confidence and expected impact"
          />
          <GuideStep
            number={4}
            title="Take Action"
            description="Approve, reject (with reason), or defer"
          />
        </div>
      </div>

      {/* Important Notice */}
      <div style={noticeStyles}>
        <h4 style={noticeTitleStyles}>Important</h4>
        <ul style={noticeListStyles}>
          <li>
            <strong>No Auto-Deploy:</strong> Approving a recommendation does NOT 
            automatically publish changes.
          </li>
          <li>
            <strong>Rejection Reason Required:</strong> If rejecting, you must provide 
            a reason to help improve future recommendations.
          </li>
          <li>
            <strong>All Actions Logged:</strong> Every approval decision is recorded 
            in the audit log for accountability.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

interface GuideStepProps {
  number: number;
  title: string;
  description: string;
}

function GuideStep({ number, title, description }: GuideStepProps) {
  return (
    <div style={guideStepStyles}>
      <span style={guideStepNumberStyles}>{number}</span>
      <div>
        <h4 style={guideStepTitleStyles}>{title}</h4>
        <p style={guideStepDescStyles}>{description}</p>
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

const statsStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: space['4'],
  marginBottom: space['6'],
};

const statCardStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: space['4'],
  backgroundColor: background.surface,
  borderRadius: radius.lg,
  border: `1px solid ${border.default}`,
};

const statValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['2xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
};

const statLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['1'],
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

const guideStyles: React.CSSProperties = {
  padding: space['5'],
  backgroundColor: violet[50],
  borderRadius: radius.lg,
  marginBottom: space['6'],
};

const guideTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: violet[700],
  margin: 0,
  marginBottom: space['4'],
};

const guideStepsStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: space['4'],
};

const guideStepStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  padding: space['3'],
  backgroundColor: background.surface,
  borderRadius: radius.md,
};

const guideStepNumberStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: violet[500],
  color: 'white',
  fontFamily: fontFamily.mono,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  flexShrink: 0,
};

const guideStepTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const guideStepDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  margin: 0,
  marginTop: space['0.5'],
};

const noticeStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: semantic.warning.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.warning.base}20`,
};

const noticeTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.semibold,
  color: semantic.warning.dark,
  margin: 0,
  marginBottom: space['2'],
};

const noticeListStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  margin: 0,
  paddingLeft: space['5'],
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};
