'use client';

import React from 'react';
import Link from 'next/link';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';

interface Props {
  label: string;
  count: number;
  subtitle: string;
  href: string;
  accent?: string;
}

export function PipelineTile({ label, count, subtitle, href, accent }: Props) {
  const tc = useThemeColors();

  return (
    <Link
      href={href}
      style={{
        display: 'block',
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        padding: space['6'],
        background: tc.background.surface,
        textDecoration: 'none',
        transition: 'border-color 0.15s ease',
        flex: 1,
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = tc.border.strong;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = tc.border.default;
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: '11px',
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          color: tc.text.muted,
          marginBottom: space['1'],
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fontFamily.display,
          fontSize: '40px',
          fontWeight: fontWeight.semibold,
          color: accent ?? tc.text.primary,
          lineHeight: 1.1,
          marginBottom: space['1'],
        }}
      >
        {count.toLocaleString('en-US')}
      </div>
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: '13px',
          color: tc.text.muted,
        }}
      >
        {subtitle}
      </div>
    </Link>
  );
}
