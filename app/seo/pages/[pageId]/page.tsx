/**
 * SEO Intelligence - Page Detail
 * 
 * Detail view for a single tracked page.
 * Shows metrics, recommendations, and history.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Admin-only access
 * - Links to recommendations for this page
 * 
 * NOT ALLOWED:
 * - Modifying page content
 * - Direct CMS access
 * - Triggering crawls
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

// ============================================
// Types
// ============================================

interface PageDetailProps {
  params: {
    pageId: string;
  };
}

// ============================================
// Component
// ============================================

/**
 * SEO Page Detail Page
 * 
 * Displays:
 * 1. Page metadata and current state
 * 2. Performance metrics over time
 * 3. Recommendations for this page
 * 4. Audit history
 * 
 * NOTE: All data is placeholder. Will be populated when
 * backend integration is complete.
 */
export default function SeoPageDetailPage({ params }: PageDetailProps) {
  const { pageId } = params;

  return (
    <div style={containerStyles}>
      {/* Breadcrumb */}
      <nav style={breadcrumbStyles}>
        <a href="/seo/pages" style={breadcrumbLinkStyles}>Pages</a>
        <span style={breadcrumbSepStyles}>/</span>
        <span style={breadcrumbCurrentStyles}>{pageId}</span>
      </nav>

      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Page Details</h1>
        <p style={descStyles}>
          ID: <code style={codeStyles}>{pageId}</code>
        </p>
      </div>

      {/* Not Found State (placeholder) */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>🔍</span>
        <h3 style={emptyTitleStyles}>Page Not Found</h3>
        <p style={emptyDescStyles}>
          This page detail view will display data once connected to analytics sources.
          The page ID <code style={codeStyles}>{pageId}</code> does not exist in the current dataset.
        </p>
        <a href="/seo/pages" style={backLinkStyles}>
          ← Back to Pages List
        </a>
      </div>

      {/* Expected Sections Preview */}
      <div style={previewStyles}>
        <p style={previewLabelStyles}>This page will display:</p>
        <div style={previewGridStyles}>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Page Info</h4>
            <ul style={previewListStyles}>
              <li>URL and canonical</li>
              <li>Title and meta description</li>
              <li>Page type</li>
              <li>Index status</li>
              <li>Last crawled date</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Performance</h4>
            <ul style={previewListStyles}>
              <li>Organic traffic trend</li>
              <li>Position history</li>
              <li>Core Web Vitals</li>
              <li>Top queries</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Recommendations</h4>
            <ul style={previewListStyles}>
              <li>Pending recommendations</li>
              <li>Approved changes</li>
              <li>Implementation status</li>
            </ul>
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
