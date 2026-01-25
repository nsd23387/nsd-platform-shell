/**
 * Design System: Card Component
 * 
 * Base card component for content containers.
 * Flat, minimal design with optional border accent.
 * 
 * Rules:
 * - No shadows by default (border > shadow)
 * - Generous padding for white-space-forward design
 * - Optional left border accent for status
 */

import React from 'react';
import { background, border as borderTokens, cardVariants } from '../tokens/colors';
import { space, radius, shadow } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export interface CardProps {
  /** Content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning' | 'danger';
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Enable subtle shadow (use sparingly) */
  elevated?: boolean;
  /** Additional styles */
  style?: React.CSSProperties;
  /** HTML element type */
  as?: 'div' | 'section' | 'article';
}

// ============================================
// Styles
// ============================================

const baseStyles: React.CSSProperties = {
  backgroundColor: background.surface,
  borderRadius: radius.xl,
  border: `1px solid ${borderTokens.default}`,
  display: 'flex',
  flexDirection: 'column',
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, React.CSSProperties> = {
  none: { padding: 0 },
  sm: { padding: space['4'] },
  md: { padding: space['6'] },
  lg: { padding: space['8'] },
};

const variantStyles: Record<NonNullable<CardProps['variant']>, React.CSSProperties> = {
  default: {},
  success: { borderLeftWidth: '4px', borderLeftColor: cardVariants.success },
  warning: { borderLeftWidth: '4px', borderLeftColor: cardVariants.warning },
  danger: { borderLeftWidth: '4px', borderLeftColor: cardVariants.danger },
};

// ============================================
// Component
// ============================================

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  elevated = false,
  style,
  as: Component = 'div',
}: CardProps) {
  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...paddingStyles[padding],
    ...variantStyles[variant],
    ...(elevated && { boxShadow: shadow.sm }),
    ...style,
  };

  return (
    <Component style={combinedStyles}>
      {children}
    </Component>
  );
}

export default Card;
