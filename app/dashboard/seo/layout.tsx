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

interface SubTab {
  href: string;
  label: string;
}

interface NavArea {
  key: string;
  href: string; // primary route the sidebar item links to
  label: string;
  icon: string;
  tabs: SubTab[]; // in-screen sub-tabs that merge sibling views into one area
  gated?: boolean; // hidden until there is something to show (Results)
}

// Information architecture (Fix 0): four top-level areas mirror the handful of
// decisions the operator makes. Within each area, sibling views are merged into
// one screen via sub-tabs (rendered above the content) rather than separate nav
// routes. Empty/duplicative/paused routes (SERP Features, Schema, All
// Recommendations) are gone; Results stays hidden until ≥1 candidate executes.
const NAV_AREAS: NavArea[] = [
  {
    key: 'review',
    href: '/dashboard/seo',
    label: 'Review',
    icon: 'review',
    tabs: [
      { href: '/dashboard/seo', label: 'Review Queue' },
      { href: '/dashboard/seo/internal-links', label: 'Internal Links' },
      { href: '/dashboard/seo/suppressed', label: 'Suppressed' },
    ],
  },
  {
    key: 'performance',
    href: '/dashboard/seo/pages',
    label: 'Performance',
    icon: 'search',
    tabs: [
      { href: '/dashboard/seo/pages', label: 'Pages' },
      { href: '/dashboard/seo/signals', label: 'Signals' },
    ],
  },
  {
    key: 'competitors',
    href: '/dashboard/seo/competitive',
    label: 'Competitors',
    icon: 'chart',
    tabs: [
      { href: '/dashboard/seo/competitive', label: 'Deep Dive' },
      { href: '/dashboard/seo/content', label: 'Content Pipeline' },
    ],
  },
  {
    key: 'results',
    href: '/dashboard/seo/outcomes',
    label: 'Results',
    icon: 'trending',
    gated: true,
    tabs: [
      { href: '/dashboard/seo/execution-log', label: 'Execution Log' },
      { href: '/dashboard/seo/attribution', label: 'Revenue Attribution' },
      { href: '/dashboard/seo/content-scores', label: 'Content Scores' },
      { href: '/dashboard/seo/outcomes', label: 'Outcomes' },
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
  // Results area stays hidden until at least one candidate has executed.
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    fetch('/api/proxy/seo/executions', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if ((j?.data?.executed ?? 0) > 0) setShowResults(true); })
      .catch(() => { /* keep Results hidden on error */ });
  }, []);

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

  const visibleAreas = NAV_AREAS.filter((a) => !a.gated || showResults);
  const activeArea =
    NAV_AREAS.find((a) => a.tabs.some((t) => t.href === currentPath)) ?? visibleAreas[0];
  const currentLabel = activeArea?.label ?? 'SEO Intelligence';

  const navWidth = collapsed ? '48px' : '220px';

  // Sidebar: one row per top-level area.
  const navLinks = (
    <>
      {visibleAreas.map((area) => {
        const isActive = activeArea?.key === area.key;
        return (
          <Link
            key={area.key}
            href={area.href}
            title={collapsed && !isMobile ? area.label : undefined}
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
            data-testid={`nav-seo-${area.key}`}
          >
            <Icon name={area.icon as any} size={16} />
            {(collapsed && !isMobile) ? null : <span>{area.label}</span>}
          </Link>
        );
      })}
    </>
  );

  // Sub-tab bar for the active area — merges its sibling views into one screen.
  const subTabs = activeArea && activeArea.tabs.length > 1 ? (
    <div style={{ display: 'flex', gap: space['4'], borderBottom: `1px solid ${tc.border.default}`, marginBottom: space['5'], flexWrap: 'wrap' }}>
      {activeArea.tabs.map((t) => {
        const active = currentPath === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            data-testid={`subtab-${t.href.split('/').pop()}`}
            style={{
              padding: `${space['2']} ${space['1']}`,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: active ? fontWeight.semibold : fontWeight.normal,
              color: active ? tc.text.primary : tc.text.muted,
              borderBottom: active ? `2px solid ${violet[500]}` : '2px solid transparent',
              marginBottom: '-1px',
              textDecoration: 'none',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  ) : null;

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
          {subTabs}
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
          {subTabs}
          {children}
        </div>
      </div>
    </div>
  );
}
