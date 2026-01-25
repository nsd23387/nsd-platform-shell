'use client';

import { ReactNode, ButtonHTMLAttributes, useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS, NSD_GRADIENTS, NSD_GLOW, NSD_TRANSITIONS } from '../../lib/design-tokens';
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
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getVariantStyles = () => {
    const base = {
      primary: {
        background: NSD_COLORS.primary,
        color: NSD_COLORS.text.inverse,
        border: 'none',
        boxShadow: 'none',
      },
      secondary: {
        background: NSD_COLORS.background,
        color: NSD_COLORS.text.primary,
        border: `1px solid ${NSD_COLORS.border.default}`,
        boxShadow: NSD_SHADOWS.sm,
      },
      cta: {
        background: NSD_GRADIENTS.ctaButton,
        color: NSD_COLORS.text.inverse,
        border: 'none',
        boxShadow: NSD_SHADOWS.md,
      },
      ghost: {
        background: 'transparent',
        color: NSD_COLORS.secondary,
        border: 'none',
        boxShadow: 'none',
      },
      danger: {
        background: NSD_COLORS.semantic.critical.text,
        color: NSD_COLORS.text.inverse,
        border: 'none',
        boxShadow: 'none',
      },
    };

    const hover = {
      primary: {
        background: NSD_COLORS.indigo.dark,
        boxShadow: NSD_GLOW.indigoSubtle,
      },
      secondary: {
        background: NSD_COLORS.surfaceHover,
        border: `1px solid ${NSD_COLORS.magenta.base}`,
        boxShadow: NSD_SHADOWS.cardHover,
      },
      cta: {
        background: NSD_GRADIENTS.ctaButtonHover,
        boxShadow: NSD_GLOW.ctaHover,
        transform: 'translateY(-1px)',
      },
      ghost: {
        background: NSD_COLORS.violet.light,
        color: NSD_COLORS.violet.dark,
      },
      danger: {
        background: NSD_COLORS.magenta.dark,
        boxShadow: NSD_GLOW.magentaSubtle,
      },
    };

    return isHovered && !disabled ? { ...base[variant], ...hover[variant] } : base[variant];
  };
  
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '13px', gap: '6px', iconSize: 14, borderRadius: NSD_RADIUS.md },
    md: { padding: '12px 20px', fontSize: '14px', gap: '8px', iconSize: 16, borderRadius: NSD_RADIUS.lg },
    lg: { padding: '14px 28px', fontSize: '15px', gap: '10px', iconSize: 18, borderRadius: NSD_RADIUS.lg },
  };
  
  const variantStyle = getVariantStyles();
  const sizeStyle = sizeStyles[size];

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsHovered(false);
    onMouseLeave?.(e);
  };
  
  return (
    <button
      disabled={disabled || loading}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 500,
        fontFamily: NSD_TYPOGRAPHY.fontBody,
        borderRadius: sizeStyle.borderRadius,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: NSD_TRANSITIONS.glow,
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
