'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { READ_ONLY_MESSAGE } from '../../lib/read-only-guard';

interface ReadOnlyBannerProps {
  variant?: 'info' | 'warning';
  message?: string;
  compact?: boolean;
}

/**
 * ReadOnlyBanner - Displays read-only mode notification.
 * 
 * Informs users that the UI is a read-only façade and that
 * execution/mutations are managed by backend systems.
 */
export function ReadOnlyBanner({
  variant = 'info',
  message = READ_ONLY_MESSAGE,
  compact = false,
}: ReadOnlyBannerProps) {
  const variantStyles = {
    info: {
      bg: '#EFF6FF',
      border: '#BFDBFE',
      text: '#1E40AF',
      icon: 'ℹ️',
    },
    warning: {
      bg: '#FEF3C7',
      border: '#FCD34D',
      text: '#92400E',
      icon: '⚠️',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: compact ? '12px 16px' : '16px 20px',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <span style={{ fontSize: compact ? '14px' : '16px', flexShrink: 0 }}>{style.icon}</span>
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: 0,
            fontSize: compact ? '12px' : '13px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: style.text,
            lineHeight: 1.5,
          }}
        >
          {compact ? 'Read-Only Mode' : 'Read-Only UI'}
        </p>
        {!compact && (
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '13px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: style.text,
              opacity: 0.9,
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ReadOnlyBanner;
