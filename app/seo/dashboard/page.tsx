/**
 * SEO Intelligence - Dashboard Page
 * 
 * Main dashboard showing SEO metrics overview.
 * Displays KPIs, trends, and recommendation summary.
 * 
 * GOVERNANCE:
 * - Read-only display
 * - Admin-only access
 * - Data sourced from analytics
 * 
 * NOT ALLOWED:
 * - Data mutations
 * - Direct metric modifications
 * - Public access
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
import { SeoMetricCard } from '../components';

// ============================================
// Component
// ============================================

/**
 * SEO Dashboard Page
 * 
 * Displays:
 * 1. Key SEO metrics (traffic, rankings, CTR)
 * 2. Recommendation summary
 * 3. Recent activity
 * 
 * NOTE: All data is placeholder. Will be populated when
 * backend integration is complete.
 */
export default function SeoDashboardPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>SEO Dashboard</h1>
        <p style={descStyles}>
          Overview of SEO performance metrics and pending actions.
        </p>
      </div>

      {/* Metrics Grid */}
      <section style={sectionStyles}>
        <h2 style={h2Styles}>Key Metrics</h2>
        <div style={metricsGridStyles}>
          <SeoMetricCard
            label="Indexed Pages"
            value="—"
            subtitle="Total pages in index"
            icon="📄"
          />
          <SeoMetricCard
            label="Avg. Position"
            value="—"
            subtitle="Search ranking"
            icon="📈"
          />
          <SeoMetricCard
            label="Total Clicks"
            value="—"
            subtitle="Last 28 days"
            icon="👆"
          />
          <SeoMetricCard
            label="CTR"
            value="—"
            subtitle="Click-through rate"
            icon="🎯"
          />
        </div>
      </section>

      {/* Recommendations Summary */}
      <section style={sectionStyles}>
        <h2 style={h2Styles}>Recommendations</h2>
        <div style={summaryGridStyles}>
          <SummaryCard
            label="Pending"
            value="0"
            status="warning"
            href="/seo/approvals"
          />
          <SummaryCard
            label="Approved"
            value="0"
            status="success"
          />
          <SummaryCard
            label="Rejected"
            value="0"
            status="neutral"
          />
          <SummaryCard
            label="Implemented"
            value="0"
            status="info"
          />
        </div>
      </section>

      {/* Not Implemented Notice */}
      <div style={noticeStyles}>
        <span style={noticeIconStyles}>ℹ️</span>
        <div>
          <strong>Data Not Connected</strong>
          <p style={noticeTextStyles}>
            This dashboard will display real metrics once connected to
            Search Console and analytics data sources.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

interface SummaryCardProps {
  label: string;
  value: string;
  status: 'success' | 'warning' | 'info' | 'neutral';
  href?: string;
}

function SummaryCard({ label, value, status, href }: SummaryCardProps) {
  const statusColors = {
    success: { bg: semantic.success.light, text: semantic.success.dark },
    warning: { bg: semantic.warning.light, text: semantic.warning.dark },
    info: { bg: semantic.info.light, text: semantic.info.dark },
    neutral: { bg: background.muted, text: text.muted },
  };

  const colors = statusColors[status];

  const content = (
    <div
      style={{
        ...summaryCardStyles,
        backgroundColor: colors.bg,
        borderColor: colors.text + '30',
      }}
    >
      <span style={{ ...summaryValueStyles, color: colors.text }}>{value}</span>
      <span style={summaryLabelStyles}>{label}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} style={{ textDecoration: 'none' }}>
        {content}
      </a>
    );
  }

  return content;
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

const sectionStyles: React.CSSProperties = {
  marginBottom: space['8'],
};

const h2Styles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
  marginBottom: space['4'],
};

const metricsGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: space['4'],
};

const summaryGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: space['4'],
};

const summaryCardStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: space['5'],
  borderRadius: radius.xl,
  border: '1px solid',
  textAlign: 'center',
};

const summaryValueStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.bold,
};

const summaryLabelStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['1'],
};

const noticeStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['3'],
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.info.base}20`,
};

const noticeIconStyles: React.CSSProperties = {
  fontSize: fontSize.xl,
};

const noticeTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  marginTop: space['1'],
  margin: 0,
};
