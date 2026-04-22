'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { violet } from '../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../design/tokens/typography';
import { space, radius, duration, easing } from '../../../../design/tokens/spacing';
import { Icon } from '../../../../design/components/Icon';

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
      { href: '/dashboard/marketing', label: 'Executive Overview', icon: 'chart' },
      { href: '/dashboard/marketing/operator', label: 'Operator Hub', icon: 'clock' },
      { href: '/dashboard/marketing/core4', label: 'Core 4 Comparison', icon: 'metrics' },
    ],
  },
  {
    title: 'Core 4 Engines',
    items: [
      { href: '/dashboard/marketing/warm-outreach', label: 'Warm Outreach', icon: 'users' },
      { href: '/dashboard/marketing/cold-outreach', label: 'Cold Outreach', icon: 'send' },
      { href: '/dashboard/marketing/content', label: 'SEO', icon: 'search' },
      { href: '/dashboard/marketing/paid-ads', label: 'Run Paid Ads', icon: 'campaign' },
    ],
  },
  {
    title: 'Automation',
    items: [
      { href: '/dashboard/marketing/social', label: 'Social Automation', icon: 'campaign' },
    ],
  },
  {
    title: 'Deep Dives',
    items: [
      { href: '/dashboard/marketing/seo', label: 'SEO Command Center', icon: 'search' },
      { href: '/dashboard/marketing/google-ads', label: 'Google Ads War Room', icon: 'target' },
      { href: '/dashboard/marketing/ahrefs', label: 'Ahrefs Intelligence', icon: 'trending' },
    ],
  },
  {
    title: 'Sales Funnel',
    items: [
      { href: '/dashboard/marketing/quote-funnel', label: 'Quote Pipeline', icon: 'chart' },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/dashboard/marketing/data-health', label: 'Data Health', icon: 'shield' },
      { href: '/dashboard/marketing/experiments', label: 'Experiments', icon: 'lightbulb' },
      { href: '/dashboard/marketing/forecasting', label: 'Forecasting', icon: 'trending' },
    ],
  },
];

interface MarketingNavProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobile?: boolean;
}

export function MarketingNav({ collapsed = false, onToggleCollapse, isMobile = false }: MarketingNavProps) {
  const tc = useThemeColors();
  const currentPath = usePathname() ?? '';

  if (isMobile) {
    return null;
  }

  const navWidth = collapsed ? '48px' : '220px';

  return (
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
      data-testid="nav-marketing-command-center"
    >
      {!collapsed && (
        <div
          style={{
            padding: `0 ${space['4']} ${space['4']}`,
            borderBottom: `1px solid ${tc.border.subtle}`,
            marginBottom: space['3'],
          }}
        >
          <h3
            style={{
              fontFamily: fontFamily.display,
              fontSize: fontSize.base,
              fontWeight: fontWeight.semibold,
              color: tc.text.primary,
              marginBottom: space['0.5'],
              whiteSpace: 'nowrap',
            }}
          >
            Command Center
          </h3>
          <p
            style={{
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.muted,
              whiteSpace: 'nowrap',
            }}
          >
            Marketing Intelligence
          </p>
        </div>
      )}

      {collapsed && (
        <div style={{ height: space['3'], flexShrink: 0 }} />
      )}

      <div style={{ flex: 1 }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title} style={{ marginBottom: space['2'] }}>
            {!collapsed && (
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
            {group.items.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? '0' : space['2.5'],
                    padding: collapsed ? `${space['2']} 0` : `${space['2']} ${space['4']}`,
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                    color: isActive ? tc.text.primary : tc.text.muted,
                    backgroundColor: isActive ? tc.background.muted : 'transparent',
                    textDecoration: 'none',
                    borderLeft: collapsed ? 'none' : (isActive ? `3px solid ${violet[500]}` : '3px solid transparent'),
                    transition: `all ${duration.normal} ${easing.DEFAULT}`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}
                  data-testid={`nav-marketing-${item.href.split('/').pop()}`}
                >
                  <Icon name={item.icon as any} size={16} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
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
          data-testid="button-toggle-marketing-nav"
        >
          <Icon name={collapsed ? 'arrow-right' : 'arrow-left'} size={16} />
        </button>
      )}
    </nav>
  );
}

export { NAV_GROUPS };
