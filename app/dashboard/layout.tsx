'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Icon } from '../../design/components/Icon';
import { violet } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../design/tokens/typography';
import { space, radius, duration, easing } from '../../design/tokens/spacing';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const MOBILE_BREAKPOINT = 768;

const navItems = [
  { href: '/dashboard/executive', label: 'Executive', icon: 'chart' },
  { href: '/dashboard/operations', label: 'Operations', icon: 'clock' },
  { href: '/dashboard/design', label: 'Design', icon: 'lightbulb' },
  { href: '/dashboard/media', label: 'Media', icon: 'eye' },
  { href: '/dashboard/sales', label: 'Sales', icon: 'trending' },
  { href: '/dashboard/marketing', label: 'Marketing', icon: 'target' },
  { href: '/dashboard/seo', label: 'SEO Intelligence', icon: 'search' },
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
  const currentPath = usePathname() ?? '';
  const tc = useThemeColors();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  const toggleMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const sidebarContent = (
    <>
      <div
        style={{
          padding: `0 ${space['6']} ${space['6']}`,
          borderBottom: `1px solid ${tc.border.default}`,
          marginBottom: space['4'],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
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
        {isMobile && (
          <button
            onClick={toggleMenu}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tc.text.muted,
              padding: space['1'],
            }}
            data-testid="button-close-mobile-menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <nav>
        {navItems.map((item) => {
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <Link
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
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: `0 ${space['6']}`,
          marginTop: 'auto',
          paddingTop: space['4'],
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
    </>
  );

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: tc.background.page, transition: `background-color ${duration.slow} ${easing.DEFAULT}` }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['3'],
            padding: `${space['3']} ${space['4']}`,
            backgroundColor: tc.background.surface,
            borderBottom: `1px solid ${tc.border.default}`,
            position: 'sticky',
            top: 0,
            zIndex: 900,
          }}
        >
          <button
            onClick={toggleMenu}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: tc.text.primary,
              padding: space['1'],
              display: 'flex',
              alignItems: 'center',
            }}
            data-testid="button-open-mobile-menu"
          >
            <Menu size={22} />
          </button>
          <h2
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
              margin: 0,
            }}
          >
            Dashboards
          </h2>
        </header>

        {mobileMenuOpen && (
          <>
            <div
              onClick={toggleMenu}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                zIndex: 998,
              }}
              data-testid="overlay-mobile-menu"
            />
            <aside
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: '280px',
                maxWidth: '85vw',
                backgroundColor: tc.background.surface,
                zIndex: 999,
                padding: `${space['6']} 0`,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {sidebarContent}
            </aside>
          </>
        )}

        <main style={{ padding: space['4'], overflow: 'auto' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: tc.background.page, transition: `background-color ${duration.slow} ${easing.DEFAULT}` }}>
      <aside
        style={{
          width: '240px',
          backgroundColor: tc.background.surface,
          borderRight: `1px solid ${tc.border.default}`,
          padding: `${space['6']} 0`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          transition: `background-color ${duration.slow}, border-color ${duration.slow}`,
        }}
      >
        {sidebarContent}
      </aside>

      <main style={{ flex: 1, padding: space['8'], overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
