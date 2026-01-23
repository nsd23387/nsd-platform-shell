'use client';

import Link from 'next/link';
import { Icon } from '../../../../design/components/Icon';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

type NavItem = 'campaigns' | 'executive';

interface NavBarProps {
  active: NavItem;
}

const NAV_ITEMS: { id: NavItem; href: string; icon: string; label: string }[] = [
  { id: 'campaigns', href: '/sales-engine', icon: 'campaigns', label: 'Campaigns' },
  { id: 'executive', href: '/sales-engine/executive', icon: 'chart', label: 'Executive View' },
];

export function NavBar({ active }: NavBarProps) {
  return (
    <nav style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 20px',
            backgroundColor: active === item.id ? NSD_COLORS.primary : NSD_COLORS.background,
            color: active === item.id ? NSD_COLORS.text.inverse : NSD_COLORS.text.primary,
            borderRadius: NSD_RADIUS.md,
            border: `1px solid ${active === item.id ? NSD_COLORS.primary : NSD_COLORS.border.default}`,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            transition: 'all 0.15s ease',
          }}
        >
          <Icon 
            name={item.icon as any} 
            size={18} 
            color={active === item.id ? NSD_COLORS.text.inverse : NSD_COLORS.text.secondary} 
          />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default NavBar;
