/**
 * Design System: Button Component
 * 
 * Minimalist button with calm, editorial styling.
 * 
 * Variants:
 * - primary: Violet background (rare usage)
 * - secondary: Border only (default)
 * - ghost: No border, subtle hover
 * 
 * Sizes:
 * - sm: Compact
 * - md: Default
 * - lg: Prominent
 * 
 * Rules:
 * - Use secondary (outline) as default
 * - Primary only for main CTAs
 * - Ghost for inline actions
 * - No shadows, no glows
 */

import React from 'react';
import { background, text, border, violet } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius, duration, easing } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Left icon */
  leftIcon?: React.ReactNode;
  /** Right icon */
  rightIcon?: React.ReactNode;
}

// ============================================
// Styles
// ============================================

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: fontFamily.body,
  fontWeight: fontWeight.medium,
  lineHeight: lineHeight.tight,
  borderRadius: radius.md,
  cursor: 'pointer',
  transition: `all ${duration.normal} ${easing.DEFAULT}`,
  border: '1px solid transparent',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: violet[600],
    color: text.inverse,
    borderColor: violet[600],
  },
  secondary: {
    backgroundColor: background.surface,
    color: text.primary,
    borderColor: border.default,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: text.secondary,
    borderColor: 'transparent',
  },
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${space['1.5']} ${space['3']}`,
    fontSize: fontSize.sm,
    gap: space['1.5'],
  },
  md: {
    padding: `${space['2']} ${space['4']}`,
    fontSize: fontSize.base,
    gap: space['2'],
  },
  lg: {
    padding: `${space['3']} ${space['6']}`,
    fontSize: fontSize.lg,
    gap: space['2.5'],
  },
};

const disabledStyles: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed',
  pointerEvents: 'none',
};

// ============================================
// Component
// ============================================

export function Button({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(fullWidth && { width: '100%' }),
    ...(isDisabled && disabledStyles),
    ...style,
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      style={combinedStyles}
    >
      {loading ? (
        <span style={{ opacity: 0.7 }}>Loading...</span>
      ) : (
        <>
          {leftIcon && <span style={{ display: 'flex' }}>{leftIcon}</span>}
          {children}
          {rightIcon && <span style={{ display: 'flex' }}>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default Button;
