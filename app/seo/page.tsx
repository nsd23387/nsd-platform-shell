/**
 * SEO Intelligence - Root Page
 * 
 * Landing page for the SEO Intelligence domain.
 * Redirects to dashboard or shows overview.
 * 
 * GOVERNANCE:
 * - Admin-only access
 * - Read-only display
 * - Entry point to SEO domain
 * 
 * NOT ALLOWED:
 * - Public access
 * - Direct data mutations
 */

'use client';

import React from 'react';
import {
  background,
  text,
  border,
  violet,
  semantic,
} from '../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';
import { SEO_ROUTES } from '../../lib/seo/constants';

// ============================================
// Component
// ============================================

/**
 * SEO Intelligence Root Page
 * 
 * This page provides:
 * 1. Overview of SEO Intelligence capabilities
 * 2. Quick navigation to key sections
 * 3. Status summary (when implemented)
 * 
 * NOTE: This is a placeholder page. In production, this might
 * redirect directly to the dashboard.
 */
export default function SeoPage() {
  return (
    <div style={containerStyles}>
      {/* Page Header */}
      <div style={headerStyles}>
        <h1 style={h1Styles}>SEO Intelligence</h1>
        <p style={descStyles}>
          Monitor SEO performance, review AI-generated recommendations,
          and manage approval workflows.
        </p>
      </div>

      {/* Quick Navigation Cards */}
      <div style={cardsGridStyles}>
        <QuickNavCard
          href={SEO_ROUTES.DASHBOARD}
          icon="📊"
          title="Dashboard"
          description="Overview of SEO metrics and performance trends"
        />
        <QuickNavCard
          href={SEO_ROUTES.PAGES}
          icon="📄"
          title="Pages"
          description="View indexed pages and their SEO health"
        />
        <QuickNavCard
          href={SEO_ROUTES.RECOMMENDATIONS}
          icon="💡"
          title="Recommendations"
          description="Review AI-generated SEO improvements"
        />
        <QuickNavCard
          href={SEO_ROUTES.APPROVALS}
          icon="✅"
          title="Approvals Queue"
          description="Pending recommendations awaiting review"
        />
      </div>

      {/* Not Implemented Notice */}
      <div style={noticeStyles}>
        <h3 style={noticeHeaderStyles}>Implementation Status</h3>
        <p style={noticeTextStyles}>
          This SEO Intelligence system is currently scaffolded with placeholder data.
          Backend integration is required to populate real data.
        </p>
        <div style={noticeListStyles}>
          <div style={noticeItemStyles}>
            <span style={pendingStyles}>⏳</span>
            <span>Data source integration</span>
          </div>
          <div style={noticeItemStyles}>
            <span style={pendingStyles}>⏳</span>
            <span>Authentication integration</span>
          </div>
          <div style={noticeItemStyles}>
            <span style={pendingStyles}>⏳</span>
            <span>Recommendation engine connection</span>
          </div>
          <div style={noticeItemStyles}>
            <span style={doneStyles}>✓</span>
            <span>UI scaffolding complete</span>
          </div>
          <div style={noticeItemStyles}>
            <span style={doneStyles}>✓</span>
            <span>Type definitions complete</span>
          </div>
          <div style={noticeItemStyles}>
            <span style={doneStyles}>✓</span>
            <span>API route stubs complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

interface QuickNavCardProps {
  href: string;
  icon: string;
  title: string;
  description: string;
}

function QuickNavCard({ href, icon, title, description }: QuickNavCardProps) {
  return (
    <a href={href} style={cardStyles}>
      <span style={cardIconStyles}>{icon}</span>
      <h3 style={cardTitleStyles}>{title}</h3>
      <p style={cardDescStyles}>{description}</p>
      <span style={cardArrowStyles}>→</span>
    </a>
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
  marginBottom: space['8'],
};

const h1Styles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize['3xl'],
  fontWeight: fontWeight.bold,
  color: text.primary,
  margin: 0,
};

const descStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  color: text.secondary,
  marginTop: space['2'],
  margin: 0,
  lineHeight: 1.5,
};

const cardsGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: space['4'],
  marginBottom: space['8'],
};

const cardStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  padding: space['5'],
  backgroundColor: background.surface,
  border: `1px solid ${border.default}`,
  borderRadius: radius.xl,
  textDecoration: 'none',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  position: 'relative',
};

const cardIconStyles: React.CSSProperties = {
  fontSize: fontSize['2xl'],
  marginBottom: space['3'],
};

const cardTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.lg,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const cardDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['2'],
  margin: 0,
  flex: 1,
};

const cardArrowStyles: React.CSSProperties = {
  position: 'absolute',
  top: space['5'],
  right: space['5'],
  fontSize: fontSize.lg,
  color: violet[500],
};

const noticeStyles: React.CSSProperties = {
  padding: space['6'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.xl,
  border: `1px solid ${semantic.info.base}20`,
};

const noticeHeaderStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: semantic.info.dark,
  margin: 0,
};

const noticeTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
  marginTop: space['2'],
  marginBottom: space['4'],
  margin: `${space['2']} 0 ${space['4']}`,
};

const noticeListStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['2'],
};

const noticeItemStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['2'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.secondary,
};

const pendingStyles: React.CSSProperties = {
  fontSize: fontSize.base,
};

const doneStyles: React.CSSProperties = {
  fontSize: fontSize.base,
  color: semantic.success.base,
};
