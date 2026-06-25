'use client';

import React from 'react';
import Link from 'next/link';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space } from '../../../../design/tokens/spacing';

interface Props {
  label: string;
  count: number;
  subtitle: string;
  href: string;
  accent?: string;
  active?: boolean;
}

export function PipelineTile({ label, count, subtitle, href, accent, active = false }: Props) {
  return (
    <Link
      href={href}
      className="seo-card seo-card-interactive"
      style={{
        display: 'block',
        textDecoration: 'none',
        flex: 1,
        minWidth: 0,
        borderLeft: active ? '3px solid var(--violet)' : '1px solid var(--border)',
        paddingLeft: active ? '26px' : undefined,
      }}
    >
      <div
        style={{
          fontFamily: fontFamily.body,
          fontSize: '11px',
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.07em',
          color: 'var(--fg-muted)',
          marginBottom: space['1'],
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '40px',
          fontWeight: fontWeight.semibold,
          color: active ? 'var(--violet)' : (accent ?? 'var(--fg)'),
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
          color: 'var(--fg-muted)',
        }}
      >
        {subtitle}
      </div>
    </Link>
  );
}
