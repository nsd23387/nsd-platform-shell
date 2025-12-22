/**
 * Design System: ReadOnlyBanner Component
 * 
 * Visual indicator that content is read-only.
 * No edit affordances, no action buttons.
 * 
 * Variants:
 * - inline: Compact banner within content
 * - floating: Fixed position indicator
 * - subtle: Minimal text-only indicator
 * 
 * Used to clearly communicate that users cannot modify data.
 */

import React from 'react';
import { background, text, border, semantic } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export interface ReadOnlyBannerProps {
  /** Visual variant */
  variant?: 'inline' | 'floating' | 'subtle';
  /** Custom message (defaults to "Read-Only") */
  message?: string;
  /** Optional description text */
  description?: string;
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================
// Styles
// ============================================

const baseStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  lineHeight: lineHeight.normal,
};

const variantStyles: Record<NonNullable<ReadOnlyBannerProps['variant']>, React.CSSProperties> = {
  inline: {
    display: 'flex',
    alignItems: 'center',
    gap: space['2'],
    padding: `${space['3']} ${space['4']}`,
    backgroundColor: semantic.info.light,
    borderRadius: radius.lg,
    border: `1px solid ${border.subtle}`,
  },
  floating: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space['2'],
    padding: `${space['2']} ${space['3']}`,
    backgroundColor: semantic.info.light,
    borderRadius: radius.md,
    border: `1px solid ${border.subtle}`,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  subtle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space['1.5'],
    padding: 0,
    backgroundColor: 'transparent',
  },
};

// ============================================
// Icons
// ============================================

const LockIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ============================================
// Component
// ============================================

export function ReadOnlyBanner({
  variant = 'inline',
  message = 'Read-Only',
  description,
  style,
}: ReadOnlyBannerProps) {
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...style,
  };

  const iconColor = variant === 'subtle' ? text.muted : semantic.info.dark;

  return (
    <div style={combinedStyles}>
      <span style={{ color: iconColor, display: 'flex' }}>
        {variant === 'subtle' ? <EyeIcon /> : <LockIcon />}
      </span>
      <div>
        <span
          style={{
            fontSize: variant === 'subtle' ? fontSize.xs : fontSize.sm,
            fontWeight: fontWeight.medium,
            color: variant === 'subtle' ? text.muted : semantic.info.dark,
          }}
        >
          {message}
        </span>
        {description && variant !== 'subtle' && (
          <p
            style={{
              fontSize: fontSize.xs,
              color: text.muted,
              marginTop: space['0.5'],
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default ReadOnlyBanner;
