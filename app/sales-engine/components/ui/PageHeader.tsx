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
    <div style={{ marginBottom: 'clamp(20px, 4vw, 32px)' }}>
      {backHref && (
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            fontSize: '13px',
            color: NSD_COLORS.secondary,
            textDecoration: 'none',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          <Icon name="arrow-left" size={14} color={NSD_COLORS.secondary} />
          {backLabel || 'Back'}
        </Link>
      )}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.2,
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              wordBreak: 'break-word',
            }}
          >
            {title}
          </h1>
          {description && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: 'clamp(14px, 3vw, 16px)',
                lineHeight: 1.5,
                color: NSD_COLORS.text.secondary,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                wordBreak: 'break-word',
              }}
            >
              {description}
            </p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{actions}</div>}
      </div>
    </div>
  );
}
