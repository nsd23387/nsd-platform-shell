'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { NSD_COLORS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '32px' }}>
      {backHref && (
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            fontSize: '14px',
            color: NSD_COLORS.secondary,
            textDecoration: 'none',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          <Icon name="arrow-left" size={16} color={NSD_COLORS.secondary} />
          {backLabel || 'Back'}
        </Link>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1
            style={{
              margin: 0,
              ...NSD_TYPOGRAPHY.heading1,
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                margin: '8px 0 0 0',
                ...NSD_TYPOGRAPHY.body,
                color: NSD_COLORS.text.secondary,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '12px' }}>{actions}</div>}
      </div>
    </div>
  );
}
