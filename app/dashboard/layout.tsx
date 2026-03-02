'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Icon } from '../../design/components/Icon';
import { violet } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius, duration, easing } from '../../design/tokens/spacing';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: '/dashboard/executive', label: 'Executive', icon: 'chart' },
  { href: '/dashboard/operations', label: 'Operations', icon: 'clock' },
  { href: '/dashboard/design', label: 'Design', icon: 'lightbulb' },
  { href: '/dashboard/media', label: 'Media', icon: 'eye' },
  { href: '/dashboard/sales', label: 'Sales', icon: 'trending' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: 'target' },
];

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const tc = useThemeColors();
  const isDark = mode === 'dark';

  return (
    <button
      onClick={toggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space['2'],
        width: '100%',
        padding: `${space['2.5']} ${space['6']}`,
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        color: tc.text.muted,
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: `all ${duration.normal} ${easing.DEFAULT}`,
      }}
      data-testid="button-theme-toggle"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const tc = useThemeColors();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: tc.background.page, transition: `background-color ${duration.slow} ${easing.DEFAULT}` }}>
      <aside
        style={{
          width: '240px',
          backgroundColor: tc.background.surface,
          borderRight: `1px solid ${tc.border.default}`,
          padding: `${space['6']} 0`,
          position: 'relative',
          transition: `background-color ${duration.slow}, border-color ${duration.slow}`,
        }}
      >
        <div
          style={{
            padding: `0 ${space['6']} ${space['6']}`,
            borderBottom: `1px solid ${tc.border.default}`,
            marginBottom: space['4'],
          }}
        >
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
            }}
          >
            Dashboards
          </h2>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.muted,
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
                  color: isActive ? tc.text.primary : tc.text.muted,
                  backgroundColor: isActive ? tc.background.muted : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? `3px solid ${violet[500]}` : '3px solid transparent',
                  transition: `all ${duration.normal} ${easing.DEFAULT}`,
                }}
              >
                <Icon name={item.icon as any} size={18} />
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
          <ThemeToggle />
          <div
            style={{
              padding: space['3'],
              backgroundColor: tc.semantic.info.light,
              borderRadius: radius.lg,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.semantic.info.dark,
              marginTop: space['2'],
            }}
          >
            <strong>Read-Only Mode</strong>
            <p style={{ marginTop: space['1'], opacity: 0.8 }}>
              Data sourced from Activity Spine
            </p>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, padding: space['8'], overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
