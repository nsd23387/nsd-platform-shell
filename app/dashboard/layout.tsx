/**
 * Dashboard Layout
 * 
 * Shared layout for all dashboard pages.
 * Provides navigation between dashboards.
 * Read-only - no edit actions.
 * 
 * Updated to use design system tokens.
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

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard/executive', label: 'Executive', icon: '📊' },
  { href: '/dashboard/operations', label: 'Operations', icon: '⚙️' },
  { href: '/dashboard/design', label: 'Design', icon: '🎨' },
  { href: '/dashboard/media', label: 'Media', icon: '📸' },
  { href: '/dashboard/sales', label: 'Sales', icon: '💰' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: '📣' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // In a real app, this would use usePathname() from next/navigation
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: background.page }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: '240px',
          backgroundColor: background.surface,
          borderRight: `1px solid ${border.default}`,
          padding: `${space['6']} 0`,
        }}
      >
        <div
          style={{
            padding: `0 ${space['6']} ${space['6']}`,
            borderBottom: `1px solid ${border.default}`,
            marginBottom: space['4'],
          }}
        >
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              color: text.primary,
            }}
          >
            Dashboards
          </h2>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: text.muted,
              marginTop: space['1'],
            }}
          >
            Read-only analytics
          </p>
        </div>

        <nav>
          {navItems.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space['3'],
                  padding: `${space['3']} ${space['6']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.base,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? text.primary : text.muted,
                  backgroundColor: isActive ? background.muted : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? `3px solid ${violet[500]}` : '3px solid transparent',
                  transition: `all ${duration.normal} ${easing.DEFAULT}`,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div
          style={{
            position: 'absolute',
            bottom: space['6'],
            left: '0',
            right: '0',
            padding: `0 ${space['6']}`,
          }}
        >
          <div
            style={{
              padding: space['3'],
              backgroundColor: semantic.info.light,
              borderRadius: radius.lg,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: semantic.info.dark,
            }}
          >
            <strong>Read-Only Mode</strong>
            <p style={{ marginTop: space['1'], opacity: 0.8 }}>
              Data sourced from Activity Spine
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: space['8'], overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
