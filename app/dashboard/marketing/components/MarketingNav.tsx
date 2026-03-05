'use client';

import React from 'react';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { violet, indigo } from '../../../../design/tokens/colors';
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
      { href: '/dashboard/marketing/content', label: 'Post Free Content', icon: 'draft' },
      { href: '/dashboard/marketing/paid-ads', label: 'Run Paid Ads', icon: 'campaign' },
    ],
  },
  {
    title: 'Deep Dives',
    items: [
      { href: '/dashboard/marketing/seo', label: 'SEO Command Center', icon: 'search' },
      { href: '/dashboard/marketing/google-ads', label: 'Google Ads War Room', icon: 'target' },
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

export function MarketingNav() {
  const tc = useThemeColors();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <nav
      style={{
        width: '220px',
        minWidth: '220px',
        backgroundColor: tc.background.surface,
        borderRight: `1px solid ${tc.border.default}`,
        padding: `${space['4']} 0`,
        overflowY: 'auto',
        transition: `background-color ${duration.slow} ${easing.DEFAULT}, border-color ${duration.slow} ${easing.DEFAULT}`,
      }}
      data-testid="nav-marketing-command-center"
    >
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
          }}
        >
          Command Center
        </h3>
        <p
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.xs,
            color: tc.text.muted,
          }}
        >
          Marketing Intelligence
        </p>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.title} style={{ marginBottom: space['2'] }}>
          <div
            style={{
              padding: `${space['2']} ${space['4']}`,
              fontFamily: fontFamily.body,
              fontSize: fontSize.xs,
              fontWeight: fontWeight.medium,
              color: tc.text.placeholder,
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            {group.title}
          </div>
          {group.items.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: space['2.5'],
                  padding: `${space['2']} ${space['4']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: isActive ? fontWeight.semibold : fontWeight.normal,
                  color: isActive ? tc.text.primary : tc.text.muted,
                  backgroundColor: isActive ? tc.background.muted : 'transparent',
                  textDecoration: 'none',
                  borderLeft: isActive ? `3px solid ${violet[500]}` : '3px solid transparent',
                  transition: `all ${duration.normal} ${easing.DEFAULT}`,
                }}
                data-testid={`nav-marketing-${item.href.split('/').pop()}`}
              >
                <Icon name={item.icon as any} size={16} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
