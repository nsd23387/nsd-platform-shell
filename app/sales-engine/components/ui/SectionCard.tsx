'use client';

import { ReactNode } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_SHADOWS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface SectionCardProps {
  title?: string;
  icon?: string;
  iconColor?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
}

export function SectionCard({ title, icon, iconColor, headerAction, children, padding = 'lg' }: SectionCardProps) {
  const paddingMap = { sm: '16px', md: '20px', lg: '24px' };
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        boxShadow: NSD_SHADOWS.sm,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: `${paddingMap[padding]} ${paddingMap[padding]} 0`,
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {icon && <Icon name={icon as any} size={20} color={iconColor || NSD_COLORS.secondary} />}
            <h3
              style={{
                margin: 0,
                ...NSD_TYPOGRAPHY.heading4,
                color: NSD_COLORS.text.primary,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              }}
            >
              {title}
            </h3>
          </div>
          {headerAction}
        </div>
      )}
      <div style={{ padding: paddingMap[padding], paddingTop: title ? 0 : paddingMap[padding] }}>
        {children}
      </div>
    </div>
  );
}
