/**
 * SEO Intelligence - Layout
 * 
 * Shared layout for all SEO Intelligence pages.
 * Provides navigation, admin context, and read-only indicators.
 * 
 * GOVERNANCE:
 * - Admin-only access (requires authentication)
 * - Read-only by default (write actions explicitly marked)
 * - Non-public (not accessible without authentication)
 * - Uses existing Platform Shell navigation patterns
 * 
 * NOT ALLOWED:
 * - Public access
 * - Unauthenticated access
 * - Hidden admin functions
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
import { space, radius, duration, easing } from '../../design/tokens/spacing';
import { SEO_ROUTES } from '../../lib/seo/constants';

// ============================================
// Types
// ============================================

interface SeoLayoutProps {
  children: React.ReactNode;
}

// ============================================
// Navigation Configuration
// ============================================

const navItems = [
  { href: SEO_ROUTES.DASHBOARD, label: 'Dashboard', icon: '📊' },
  { href: SEO_ROUTES.PAGES, label: 'Pages', icon: '📄' },
  { href: SEO_ROUTES.QUERIES, label: 'Queries', icon: '🔍' },
  { href: SEO_ROUTES.RECOMMENDATIONS, label: 'Recommendations', icon: '💡' },
  { href: SEO_ROUTES.APPROVALS, label: 'Approvals', icon: '✅' },
  { href: SEO_ROUTES.AUDIT, label: 'Audit Log', icon: '📋' },
];

// ============================================
// Component
// ============================================

/**
 * SEO Layout - wraps all SEO Intelligence pages.
 * 
 * This layout:
 * 1. Provides consistent navigation
 * 2. Shows admin-only indicator
 * 3. Displays read-only mode banner
 * 4. Handles authentication state (when implemented)
 * 
 * NOTE: Authentication check is not implemented yet.
 * When implemented, unauthenticated users will be redirected.
 */
export default function SeoLayout({ children }: SeoLayoutProps) {
  // In a real app, this would use usePathname() from next/navigation
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div style={layoutStyles}>
      {/* Sidebar Navigation */}
      <aside style={sidebarStyles}>
        {/* Header */}
        <div style={sidebarHeaderStyles}>
          <h2 style={titleStyles}>SEO Intelligence</h2>
          <p style={subtitleStyles}>Admin-only dashboard</p>
        </div>

        {/* Navigation Links */}
        <nav style={navStyles}>
          {navItems.map((item) => {
            const isActive = currentPath === item.href || 
              (item.href !== SEO_ROUTES.DASHBOARD && currentPath.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  ...navLinkStyles,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? text.primary : text.muted,
                  backgroundColor: isActive ? background.muted : 'transparent',
                  borderLeft: isActive ? `3px solid ${violet[500]}` : '3px solid transparent',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Footer - Read-only notice */}
        <div style={sidebarFooterStyles}>
          <div style={readOnlyNoticeStyles}>
            <strong>Read-Only Mode</strong>
            <p style={readOnlyTextStyles}>
              Data is observational only.
              Changes require approval workflow.
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={mainAreaStyles}>
        {/* Top Banner - Admin Notice */}
        <div style={adminBannerStyles}>
          <span style={adminBannerIconStyles}>🔒</span>
          <span style={adminBannerTextStyles}>
            Admin-only area. All actions are logged for audit purposes.
          </span>
          <span style={adminBannerBadgeStyles}>INTERNAL</span>
        </div>

        {/* Page Content */}
        <main style={mainContentStyles}>
          {children}
        </main>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const layoutStyles: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: background.page,
};

const sidebarStyles: React.CSSProperties = {
  width: '260px',
  backgroundColor: background.surface,
  borderRight: `1px solid ${border.default}`,
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',
};

const sidebarHeaderStyles: React.CSSProperties = {
  padding: space['6'],
  borderBottom: `1px solid ${border.default}`,
};

const titleStyles: React.CSSProperties = {
  fontFamily: fontFamily.display,
  fontSize: fontSize.xl,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const subtitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  marginTop: space['1'],
  margin: 0,
};

const navStyles: React.CSSProperties = {
  flex: 1,
  padding: `${space['4']} 0`,
  overflowY: 'auto',
};

const navLinkStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['3'],
  padding: `${space['3']} ${space['6']}`,
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  textDecoration: 'none',
  transition: `all ${duration.normal} ${easing.DEFAULT}`,
};

const sidebarFooterStyles: React.CSSProperties = {
  padding: space['4'],
  borderTop: `1px solid ${border.default}`,
};

const readOnlyNoticeStyles: React.CSSProperties = {
  padding: space['3'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
};

const readOnlyTextStyles: React.CSSProperties = {
  marginTop: space['1'],
  opacity: 0.8,
  margin: 0,
  fontSize: fontSize.xs,
};

const mainAreaStyles: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
};

const adminBannerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['3'],
  padding: `${space['2']} ${space['6']}`,
  backgroundColor: violet[50],
  borderBottom: `1px solid ${violet[100]}`,
};

const adminBannerIconStyles: React.CSSProperties = {
  fontSize: fontSize.base,
};

const adminBannerTextStyles: React.CSSProperties = {
  flex: 1,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: violet[700],
};

const adminBannerBadgeStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  fontWeight: fontWeight.semibold,
  color: violet[600],
  backgroundColor: violet[100],
  padding: `${space['0.5']} ${space['2']}`,
  borderRadius: radius.full,
};

const mainContentStyles: React.CSSProperties = {
  flex: 1,
  padding: space['8'],
  overflow: 'auto',
};
