/**
 * SEO Intelligence - Pages List
 * 
 * Lists all tracked pages with their SEO metrics.
 * Supports filtering by page type and index status.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Admin-only access
 * - Links to page details
 * 
 * NOT ALLOWED:
 * - Creating pages
 * - Modifying page content
 * - Triggering re-indexing
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
 * SEO Pages List Page
 * 
 * Displays:
 * 1. Filterable list of tracked pages
 * 2. Index status indicators
 * 3. Key metrics per page
 * 
 * NOTE: All data is placeholder. Will be populated when
 * backend integration is complete.
 */
export default function SeoPagesPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>SEO Pages</h1>
        <p style={descStyles}>
          View all tracked pages and their SEO performance metrics.
        </p>
      </div>

      {/* Filters Placeholder */}
      <div style={filtersStyles}>
        <select style={selectStyles} disabled>
          <option>All Page Types</option>
        </select>
        <select style={selectStyles} disabled>
          <option>All Index Statuses</option>
        </select>
        <input
          type="text"
          placeholder="Search pages..."
          style={searchStyles}
          disabled
        />
      </div>

      {/* Empty State */}
      <div style={emptyStateStyles}>
        <span style={emptyIconStyles}>📄</span>
        <h3 style={emptyTitleStyles}>No Pages Available</h3>
        <p style={emptyDescStyles}>
          Page data will appear here once connected to analytics sources.
          This is a read-only view of indexed pages.
        </p>
      </div>

      {/* Table Structure Preview (hidden) */}
      <div style={tablePreviewStyles}>
        <p style={previewLabelStyles}>Expected table columns:</p>
        <ul style={previewListStyles}>
          <li>Path / URL</li>
          <li>Title</li>
          <li>Page Type</li>
          <li>Index Status</li>
          <li>Organic Traffic</li>
          <li>Avg. Position</li>
          <li>Last Crawled</li>
          <li>Recommendations</li>
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
