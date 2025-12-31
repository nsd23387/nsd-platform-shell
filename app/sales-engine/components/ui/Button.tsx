'use client';

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cta' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: {
      backgroundColor: NSD_COLORS.primary,
      color: NSD_COLORS.text.inverse,
      border: 'none',
    },
    secondary: {
      backgroundColor: NSD_COLORS.background,
      color: NSD_COLORS.text.primary,
      border: `1px solid ${NSD_COLORS.border.default}`,
    },
    cta: {
      backgroundColor: NSD_COLORS.cta,
      color: NSD_COLORS.text.inverse,
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: NSD_COLORS.secondary,
      border: 'none',
    },
    danger: {
      backgroundColor: NSD_COLORS.error,
      color: NSD_COLORS.text.inverse,
      border: 'none',
    },
  };
  
  const sizeStyles = {
    sm: { padding: '8px 14px', fontSize: '13px', gap: '6px', iconSize: 14 },
    md: { padding: '10px 18px', fontSize: '14px', gap: '8px', iconSize: 16 },
    lg: { padding: '14px 24px', fontSize: '15px', gap: '10px', iconSize: 18 },
  };
  
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  
  return (
    <button
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        borderRadius: NSD_RADIUS.md,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s, transform 0.1s',
        ...variantStyle,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span
          style={{
            width: sizeStyle.iconSize,
            height: sizeStyle.iconSize,
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      ) : (
        icon && iconPosition === 'left' && <Icon name={icon as any} size={sizeStyle.iconSize} />
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && <Icon name={icon as any} size={sizeStyle.iconSize} />}
    </button>
  );
}
