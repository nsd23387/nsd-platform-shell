/**
 * Home Page
 * 
 * Landing page for the platform shell.
 * Provides navigation to dashboards.
 * 
 * Updated to use design system tokens.
 * M12-02: Visual polish - improved card density and refined icons.
 */

import Link from 'next/link';
import {
  background,
  text,
  border,
  violet,
  semantic,
  indigo,
} from '../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../design/tokens/typography';
import { space, radius, duration, easing, componentSpacing } from '../design/tokens/spacing';

// ============================================
// Refined Outline Icons (consistent style)
// ============================================

const iconStyle = {
  width: 28,
  height: 28,
  strokeWidth: 1.5,
  stroke: indigo[700],
  fill: 'none',
};

const icons = {
  executive: (
    <svg {...iconStyle} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  ),
  operations: (
    <svg {...iconStyle} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4" />
      <path d="M12 19v4" />
      <path d="M4.22 4.22l2.83 2.83" />
      <path d="M16.95 16.95l2.83 2.83" />
      <path d="M1 12h4" />
      <path d="M19 12h4" />
      <path d="M4.22 19.78l2.83-2.83" />
      <path d="M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  design: (
    <svg {...iconStyle} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="6.5" cy="12" r="2.5" />
      <circle cx="13.5" cy="17.5" r="2.5" />
      <path d="M16 6.5h5" />
      <path d="M9 12h12" />
      <path d="M16 17.5h5" />
      <path d="M3 6.5h5" />
      <path d="M3 17.5h5" />
    </svg>
  ),
  media: (
    <svg {...iconStyle} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  sales: (
    <svg {...iconStyle} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

const dashboards = [
  { name: 'Executive', icon: icons.executive, href: '/dashboard/executive' },
  { name: 'Operations', icon: icons.operations, href: '/dashboard/operations' },
  { name: 'Design', icon: icons.design, href: '/dashboard/design' },
  { name: 'Media', icon: icons.media, href: '/dashboard/media' },
  { name: 'Sales', icon: icons.sales, href: '/dashboard/sales' },
];

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space['12'],
        backgroundColor: background.page,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '600px',
        }}
      >
        <h1
          style={{
            fontFamily: fontFamily.display,
            fontSize: fontSize['6xl'],
            fontWeight: fontWeight.semibold,
            color: text.primary,
            marginBottom: space['4'],
            lineHeight: lineHeight.tight,
          }}
        >
          NSD Platform Shell
        </h1>
        <p
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.xl,
            color: text.muted,
            marginBottom: space['8'],
            lineHeight: lineHeight.relaxed,
          }}
        >
          Unified internal platform for the NSD Business Platform.
          Access read-only analytics dashboards powered by Activity Spine.
        </p>

        <Link
          href="/dashboard"
          style={{
            display: 'inline-block',
            padding: `${space['3.5']} ${space['8']}`,
            backgroundColor: violet[600],
            color: text.inverse,
            fontFamily: fontFamily.body,
            fontSize: fontSize.lg,
            fontWeight: fontWeight.medium,
            borderRadius: radius.lg,
            textDecoration: 'none',
            transition: `background-color ${duration.normal} ${easing.DEFAULT}`,
          }}
        >
          View Dashboards →
        </Link>
      </div>

      {/* App Registry Cards - increased density/spacing */}
      <div
        style={{
          marginTop: space['12'],
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: componentSpacing.gridGapRelaxed,
          maxWidth: '900px',
        }}
      >
        {dashboards.map((dashboard) => (
          <Link
            key={dashboard.name}
            href={dashboard.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: `${componentSpacing.cardPaddingRelaxed} ${space['5']}`,
              backgroundColor: background.surface,
              borderRadius: radius.xl,
              border: `1px solid ${border.default}`,
              textDecoration: 'none',
              transition: `all ${duration.normal} ${easing.DEFAULT}`,
            }}
          >
            {/* Refined SVG icon */}
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: space['3'],
              }}
            >
              {dashboard.icon}
            </span>
            <span
              style={{
                fontFamily: fontFamily.body,
                fontSize: fontSize.base,
                fontWeight: fontWeight.medium,
                color: text.secondary,
              }}
            >
              {dashboard.name}
            </span>
          </Link>
        ))}
      </div>

      <div
        style={{
          marginTop: space['12'],
          padding: `${space['4']} ${space['6']}`,
          backgroundColor: semantic.warning.light,
          borderRadius: radius.lg,
          fontFamily: fontFamily.body,
          fontSize: fontSize.base,
          color: semantic.warning.dark,
        }}
      >
        <strong>Read-Only Mode:</strong> All dashboards display analytics from
        Activity Spine. No edit capabilities.
      </div>
    </main>
  );
}
