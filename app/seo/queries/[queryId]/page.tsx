/**
 * SEO Intelligence - Query Detail
 * 
 * Detail view for a single search query.
 * Shows performance metrics and associated pages.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Admin-only access
 * - Historical data only
 * 
 * NOT ALLOWED:
 * - Modifying query data
 * - Search Console writes
 * - Keyword targeting changes
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

interface QueryDetailProps {
  params: {
    queryId: string;
  };
}

// ============================================
// Component
// ============================================

/**
 * SEO Query Detail Page
 * 
 * Displays:
 * 1. Query text and intent
 * 2. Performance metrics over time
 * 3. Associated pages
 * 
 * NOTE: All data is placeholder. Will be populated when
 * backend integration is complete.
 */
export default function SeoQueryDetailPage({ params }: QueryDetailProps) {
  const { queryId } = params;

  return (
    <div style={containerStyles}>
      {/* Breadcrumb */}
      <nav style={breadcrumbStyles}>
        <a href="/seo/queries" style={breadcrumbLinkStyles}>Queries</a>
        <span style={breadcrumbSepStyles}>/</span>
        <span style={breadcrumbCurrentStyles}>{queryId}</span>
      </nav>

      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Query Details</h1>
        <p style={descStyles}>
          ID: <code style={codeStyles}>{queryId}</code>
        </p>
      </div>

      {/* Not Found State (placeholder) */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>🔍</span>
        <h3 style={emptyTitleStyles}>Query Not Found</h3>
        <p style={emptyDescStyles}>
          This query detail view will display data once connected to Search Console.
          The query ID <code style={codeStyles}>{queryId}</code> does not exist in the current dataset.
        </p>
        <a href="/seo/queries" style={backLinkStyles}>
          ← Back to Queries List
        </a>
      </div>

      {/* Expected Sections Preview */}
      <div style={previewStyles}>
        <p style={previewLabelStyles}>This page will display:</p>
        <div style={previewGridStyles}>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Query Info</h4>
            <ul style={previewListStyles}>
              <li>Query text</li>
              <li>Intent classification</li>
              <li>Data period</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Performance</h4>
            <ul style={previewListStyles}>
              <li>Click trend</li>
              <li>Impression trend</li>
              <li>Position trend</li>
              <li>CTR trend</li>
            </ul>
          </div>
          <div style={previewSectionStyles}>
            <h4 style={previewSectionTitleStyles}>Associated Pages</h4>
            <ul style={previewListStyles}>
              <li>Ranking pages</li>
              <li>Page performance</li>
              <li>Opportunities</li>
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
