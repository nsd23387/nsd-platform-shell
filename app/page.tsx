/**
 * Home Page
 * 
 * Landing page for the platform shell.
 * Provides navigation to dashboards.
 * 
 * Updated to use design system tokens.
 */

import Link from 'next/link';
import {
  background,
  text,
  border,
  violet,
  semantic,
} from '../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
} from '../design/tokens/typography';
import { space, radius, duration, easing } from '../design/tokens/spacing';

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

      <div
        style={{
          marginTop: space['12'],
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: space['4'],
          maxWidth: '800px',
        }}
      >
        {[
          { name: 'Executive', icon: '📊', href: '/dashboard/executive' },
          { name: 'Operations', icon: '⚙️', href: '/dashboard/operations' },
          { name: 'Design', icon: '🎨', href: '/dashboard/design' },
          { name: 'Media', icon: '📸', href: '/dashboard/media' },
          { name: 'Sales', icon: '💰', href: '/dashboard/sales' },
        ].map((dashboard) => (
          <Link
            key={dashboard.name}
            href={dashboard.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: `${space['6']} ${space['4']}`,
              backgroundColor: background.surface,
              borderRadius: radius.xl,
              border: `1px solid ${border.default}`,
              textDecoration: 'none',
              transition: `all ${duration.normal} ${easing.DEFAULT}`,
            }}
          >
            <span style={{ fontSize: '32px', marginBottom: space['2'] }}>
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
