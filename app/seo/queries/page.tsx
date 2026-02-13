/**
 * SEO Intelligence - Queries List
 * 
 * Lists all tracked search queries with performance metrics.
 * Supports filtering by intent and position range.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Admin-only access
 * - Data from Search Console
 * 
 * NOT ALLOWED:
 * - Modifying queries
 * - Search Console writes
 * - Keyword bidding
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
 * SEO Queries List Page
 * 
 * Displays:
 * 1. Filterable list of tracked queries
 * 2. Performance metrics (clicks, impressions, CTR, position)
 * 3. Query intent classification
 * 
 * NOTE: All data is placeholder. Will be populated when
 * backend integration is complete.
 */
export default function SeoQueriesPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>Search Queries</h1>
        <p style={descStyles}>
          View search query performance from Google Search Console.
        </p>
      </div>

      {/* Filters Placeholder */}
      <div style={filtersStyles}>
        <select style={selectStyles} disabled>
          <option>All Intents</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Positions</option>
        </select>
        <input
          type="text"
          placeholder="Search queries..."
          style={searchStyles}
          disabled
        />
      </div>

      {/* Empty State */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>🔍</span>
        <h3 style={emptyTitleStyles}>No Queries Available</h3>
        <p style={emptyDescStyles}>
          Query data will appear here once connected to Google Search Console.
          This is a read-only view of search performance.
        </p>
      </div>

      {/* Table Structure Preview */}
      <div style={tablePreviewStyles}>
        <p style={previewLabelStyles}>Expected table columns:</p>
        <ul style={previewListStyles}>
          <li>Query Text</li>
          <li>Intent</li>
          <li>Impressions</li>
          <li>Clicks</li>
          <li>CTR</li>
          <li>Avg. Position</li>
          <li>Associated Pages</li>
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

const tablePreviewStyles: React.CSSProperties = {
  marginTop: space['6'],
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
