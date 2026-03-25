'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { violet } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../design/tokens/spacing';
import { Icon } from '../../../design/components/Icon';
import { isApiDisabled } from '../../../config/appConfig';
import { getSeoOverviewKpis } from '../../../lib/seoApi';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/dashboard/seo', label: 'SEO Overview', icon: 'chart' },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { href: '/dashboard/seo/pages', label: 'Page Performance', icon: 'search' },
    ],
  },
  {
    title: 'Optimization',
    items: [
      { href: '/dashboard/seo/recommendations', label: 'Recommendations', icon: 'review' },
      { href: '/dashboard/seo/internal-links', label: 'Internal Links', icon: 'code' },
      { href: '/dashboard/seo/execution-log', label: 'Execution Log', icon: 'timeline' },
      { href: '/dashboard/seo/content', label: 'Content Pipeline', icon: 'edit' },
      { href: '/dashboard/seo/schema', label: 'Schema Markup', icon: 'code' },
    ],
  },
  {
    title: 'Results',
    items: [
      { href: '/dashboard/seo/outcomes', label: 'Outcomes', icon: 'trending' },
      { href: '/dashboard/seo/signals', label: 'Signals', icon: 'warning' },
    ],
  },
];

const STORAGE_KEY = 'seo-nav-collapsed';
const COLLAPSE_BREAKPOINT = 1024;
const MOBILE_BREAKPOINT = 768;

interface SeoLayoutProps {
  children: React.ReactNode;
}

export default function SeoLayout({ children }: SeoLayoutProps) {
  const tc = useThemeColors();
  const currentPath = usePathname() ?? '';

  const [isMobile, setIsMobile] = useState(false);
  const [mobileSubNavOpen, setMobileSubNavOpen] = useState(false);
  const [pipelineHealthColor, setPipelineHealthColor] = useState('#10b981');
  const [pipelineHealthLabel, setPipelineHealthLabel] = useState('Pipeline: checking...');

  useEffect(() => {
    getSeoOverviewKpis()
      .then((kpis) => {
        if (!kpis.last_pipeline_run_at) {
          setPipelineHealthColor('#f59e0b');
          setPipelineHealthLabel('Pipeline: no runs yet');
          return;
        }
        const hoursAgo = (Date.now() - new Date(kpis.last_pipeline_run_at).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 25) {
          setPipelineHealthColor('#10b981');
          setPipelineHealthLabel(`Pipeline: healthy (${Math.round(hoursAgo)}h ago)`);
        } else if (hoursAgo < 48) {
          setPipelineHealthColor('#f59e0b');
          setPipelineHealthLabel(`Pipeline: stale (${Math.round(hoursAgo)}h ago)`);
        } else {
          setPipelineHealthColor('#ef4444');
          setPipelineHealthLabel(`Pipeline: offline (${Math.round(hoursAgo)}h ago)`);
        }
      })
      .catch(() => {
        setPipelineHealthColor('#f59e0b');
        setPipelineHealthLabel('Pipeline: unknown');
      });
  }, []);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === 'true';
    return window.innerWidth < COLLAPSE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
      if (width < COLLAPSE_BREAKPOINT) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setMobileSubNavOpen(false);
  }, [currentPath]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const currentLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.href === currentPath)?.label || 'SEO Intelligence';

  const navWidth = collapsed ? '48px' : '220px';

  const navLinks = (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: space['2'] }}>
          {!collapsed && !isMobile && (
            <div
              style={{
                padding: `${space['2']} ${space['4']}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: tc.text.placeholder,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              {group.title}
            </div>
          )}
          {isMobile && (
            <div
              style={{
                padding: `${space['1']} ${space['4']}`,
                fontFamily: fontFamily.body,
                fontSize: '11px',
                fontWeight: fontWeight.medium,
                color: tc.text.placeholder,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
              }}
            >
              {group.title}
            </div>
          )}
          {group.items.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed && !isMobile ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                  gap: collapsed && !isMobile ? '0' : space['2.5'],
                  padding: collapsed && !isMobile ? `${space['2']} 0` : `${space['2']} ${space['4']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? tc.text.primary : tc.text.muted,
                  backgroundColor: isActive ? tc.background.muted : 'transparent',
                  textDecoration: 'none',
                  borderLeft: collapsed && !isMobile ? 'none' : (isActive ? `3px solid ${violet[500]}` : '3px solid transparent'),
                  transition: `all ${duration.normal} ${easing.DEFAULT}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                data-testid={`nav-seo-${item.href.split('/').pop()}`}
              >
                <Icon name={item.icon as any} size={16} />
                {(collapsed && !isMobile) ? null : <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <button
          onClick={() => setMobileSubNavOpen(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${space['2.5']} ${space['4']}`,
            backgroundColor: tc.background.surface,
            borderBottom: `1px solid ${tc.border.default}`,
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: tc.text.primary,
            border: 'none',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: tc.border.default,
            cursor: 'pointer',
            width: '100%',
          }}
          data-testid="button-toggle-seo-subnav-mobile"
        >
          <span>{currentLabel}</span>
          {mobileSubNavOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {mobileSubNavOpen && (
          <div
            style={{
              backgroundColor: tc.background.surface,
              borderBottom: `1px solid ${tc.border.default}`,
              padding: `${space['2']} 0`,
            }}
          >
            {navLinks}
          </div>
        )}

        {isApiDisabled && (
          <div
            style={{
              padding: `${space['2']} ${space['4']}`,
              backgroundColor: '#fef3c7',
              borderBottom: '1px solid #f59e0b',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: space['2'],
            }}
            data-testid="banner-api-disabled"
          >
            <Icon name="warning" size={16} />
            SEO data is unavailable.
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: space['4'] }}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        minHeight: 0,
        transition: `background-color ${duration.slow} ${easing.DEFAULT}`,
      }}
    >
      <nav
        style={{
          width: navWidth,
          minWidth: navWidth,
          backgroundColor: tc.background.surface,
          borderRight: `1px solid ${tc.border.default}`,
          padding: `${space['4']} 0`,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: `width ${duration.slow} ${easing.DEFAULT}, min-width ${duration.slow} ${easing.DEFAULT}, background-color ${duration.slow} ${easing.DEFAULT}, border-color ${duration.slow} ${easing.DEFAULT}`,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-testid="nav-seo-intelligence"
      >
        {!collapsed && (
          <div
            style={{
              padding: `0 ${space['4']} ${space['4']}`,
              borderBottom: `1px solid ${tc.border.subtle}`,
              marginBottom: space['3'],
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginBottom: space['0.5'] }}>
              <h3
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                  color: tc.text.primary,
                  whiteSpace: 'nowrap',
                }}
              >
                SEO Intelligence
              </h3>
              <span
                title={pipelineHealthLabel}
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: pipelineHealthColor,
                  flexShrink: 0,
                }}
                data-testid="indicator-pipeline-health"
              />
            </div>
            <p
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                color: tc.text.muted,
                whiteSpace: 'nowrap',
              }}
            >
              Cluster analysis and decisions
            </p>
          </div>
        )}

        {collapsed && <div style={{ height: space['3'], flexShrink: 0 }} />}

        <div style={{ flex: 1 }}>
          {navLinks}
        </div>

        <button
          onClick={handleToggleCollapse}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            padding: collapsed ? `${space['2']} 0` : `${space['2']} ${space['4']}`,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: tc.text.muted,
            transition: `color ${duration.normal} ${easing.DEFAULT}`,
            width: '100%',
            flexShrink: 0,
            borderTop: `1px solid ${tc.border.subtle}`,
            marginTop: space['2'],
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="button-toggle-seo-nav"
        >
          <Icon name={collapsed ? 'arrow-right' : 'arrow-left'} size={16} />
        </button>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {isApiDisabled && (
          <div
            style={{
              padding: `${space['3']} ${space['6']}`,
              backgroundColor: '#fef3c7',
              borderBottom: '1px solid #f59e0b',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              gap: space['2'],
            }}
            data-testid="banner-api-disabled"
          >
            <Icon name="warning" size={16} />
            SEO data is unavailable. API mode is disabled — data shown may be incomplete or empty.
          </div>
        )}
        <div style={{ flex: 1, overflow: 'auto', padding: space['6'] }}>
          {children}
        </div>
      </div>
    </div>
  );
}
