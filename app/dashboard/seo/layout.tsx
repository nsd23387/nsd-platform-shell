'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useThemeColors } from '../../../hooks/useThemeColors';
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

// Consolidated information architecture — four governed areas. Retired routes
// (pages, actions, serp-features, competitive, execution-log, content,
// internal-links, schema, suppressed, attribution, content-scores, outcomes,
// signals, clusters, backlinks, opportunities) 301-redirect into these four via
// next.config.js so old links and bookmarks keep resolving.
const NAV_GROUPS: NavGroup[] = [
  {
    title: 'SEO',
    items: [
      { href: '/dashboard/seo', label: 'Command Center', icon: 'review' },
      { href: '/dashboard/seo/recommendations', label: 'Review', icon: 'target' },
      { href: '/dashboard/seo/evaluation', label: 'In Evaluation', icon: 'search' },
      { href: '/dashboard/seo/results', label: 'Results', icon: 'trending' },
      { href: '/dashboard/seo/strategy', label: 'Strategy', icon: 'chart' },
      { href: '/dashboard/seo/performance', label: 'Performance', icon: 'search' },
      { href: '/dashboard/seo/competitors', label: 'Competitors', icon: 'chart' },
      { href: '/dashboard/seo/authority', label: 'Authority', icon: 'target' },
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
  const [pipelineHealth, setPipelineHealth] = useState<'live' | 'degraded' | 'down'>('degraded');
  const [pipelineHealthLabel, setPipelineHealthLabel] = useState('Pipeline: checking...');

  useEffect(() => {
    getSeoOverviewKpis()
      .then((kpis) => {
        if (!kpis.last_pipeline_run_at) {
          setPipelineHealth('degraded');
          setPipelineHealthLabel('Pipeline: no runs yet');
          return;
        }
        const hoursAgo = (Date.now() - new Date(kpis.last_pipeline_run_at).getTime()) / (1000 * 60 * 60);
        if (hoursAgo < 25) {
          setPipelineHealth('live');
          setPipelineHealthLabel(`Pipeline: healthy (${Math.round(hoursAgo)}h ago)`);
        } else if (hoursAgo < 48) {
          setPipelineHealth('degraded');
          setPipelineHealthLabel(`Pipeline: stale (${Math.round(hoursAgo)}h ago)`);
        } else {
          setPipelineHealth('down');
          setPipelineHealthLabel(`Pipeline: offline (${Math.round(hoursAgo)}h ago)`);
        }
      })
      .catch(() => {
        setPipelineHealth('degraded');
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

  const currentLabel = NAV_GROUPS.flatMap(g => g.items).find(i => i.href === currentPath)?.label || 'SEO Command Center';

  const navWidth = '236px';
  const statusColor = pipelineHealth === 'live' ? 'var(--green)' : pipelineHealth === 'down' ? 'var(--red)' : 'var(--amber)';
  const statusLabel = pipelineHealth === 'live' ? 'Live' : pipelineHealth === 'down' ? 'Down' : 'Degraded';

  const navLinks = (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: space['2'] }}>
          {!isMobile && (
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  gap: space['2.5'],
                  padding: `${space['2']} ${space['4']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? tc.text.primary : tc.text.muted,
                  backgroundColor: isActive ? 'var(--violet-soft)' : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? `2.5px solid var(--violet)` : '2.5px solid transparent',
                  transition: `all ${duration.normal} ${easing.DEFAULT}`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                data-testid={`nav-seo-${item.href.split('/').pop()}`}
              >
                <Icon name={item.icon as any} size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );

  if (isMobile) {
    return (
      <div className="seo-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <button
          onClick={() => setMobileSubNavOpen(prev => !prev)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${space['2.5']} ${space['4']}`,
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
            fontWeight: fontWeight.medium,
            color: 'var(--fg)',
            border: 'none',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: 'var(--border)',
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
              backgroundColor: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
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
              backgroundColor: 'var(--amber-soft)',
              borderBottom: '1px solid var(--amber)',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: 'var(--amber)',
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
      className="seo-shell"
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
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: `${space['4']} 0`,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: `width ${duration.slow} ${easing.DEFAULT}, min-width ${duration.slow} ${easing.DEFAULT}, background-color ${duration.slow} ${easing.DEFAULT}, border-color ${duration.slow} ${easing.DEFAULT}`,
          display: 'flex',
          flexDirection: 'column',
        }}
        data-testid="nav-seo-intelligence"
      >
        <div
          style={{
            padding: `0 ${space['4']} ${space['4']}`,
            borderBottom: '1px solid var(--border)',
            marginBottom: space['3'],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space['2'], marginBottom: space['0.5'] }}>
            <h3
              style={{
                fontFamily: fontFamily.display,
                fontSize: fontSize.base,
                fontWeight: fontWeight.semibold,
                color: 'var(--fg)',
                whiteSpace: 'nowrap',
              }}
            >
              SEO Command Center
            </h3>
            <span
              title={pipelineHealthLabel}
              className="seo-chip"
              style={{
                flexShrink: 0,
                color: statusColor,
              }}
              data-testid="indicator-pipeline-health"
            >
              <span className="seo-dot" />
              {statusLabel}
            </span>
          </div>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: 'var(--fg-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            Cluster analysis and decisions
          </p>
        </div>

        <div style={{ flex: 1 }}>
          {navLinks}
        </div>

        <button
          onClick={handleToggleCollapse}
          aria-hidden="true"
          style={{
            display: 'none',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-end',
            padding: collapsed ? `${space['2']} 0` : `${space['2']} ${space['4']}`,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--fg-muted)',
            transition: `color ${duration.normal} ${easing.DEFAULT}`,
            width: '100%',
            flexShrink: 0,
            borderTop: '1px solid var(--border)',
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
              backgroundColor: 'var(--amber-soft)',
              borderBottom: '1px solid var(--amber)',
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              color: 'var(--amber)',
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
