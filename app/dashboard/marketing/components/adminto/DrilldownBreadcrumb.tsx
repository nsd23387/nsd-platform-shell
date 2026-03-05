'use client';

import { useThemeColors } from '../../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';
import { space, radius } from '../../../../../design/tokens/spacing';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface DrilldownBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function DrilldownBreadcrumb({ items }: DrilldownBreadcrumbProps) {
  const tc = useThemeColors();

  if (items.length === 0) return null;

  return (
    <nav
      data-testid="drilldown-breadcrumb"
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space['1'],
        fontFamily: fontFamily.body,
        fontSize: fontSize.sm,
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isClickable = !isLast && (item.href || item.onClick);

        return (
          <span key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: space['1'] }}>
            {idx > 0 && (
              <span
                style={{
                  color: tc.text.muted,
                  fontSize: fontSize.xs,
                  userSelect: 'none',
                }}
              >
                /
              </span>
            )}
            {isClickable ? (
              <a
                data-testid={`breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                href={item.href || '#'}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                style={{
                  color: tc.chartColors[0],
                  fontWeight: fontWeight.medium,
                  textDecoration: 'none',
                  padding: `${space['0.5']} ${space['1']}`,
                  borderRadius: radius.sm,
                  transition: 'background-color 100ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = tc.background.hover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </a>
            ) : (
              <span
                data-testid={`breadcrumb-current-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  color: tc.text.primary,
                  fontWeight: isLast ? fontWeight.medium : fontWeight.normal,
                  padding: `${space['0.5']} ${space['1']}`,
                }}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
