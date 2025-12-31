/**
 * Design System: StatusPill Component
 * 
 * Compact status indicator with semantic coloring.
 * Used for SLA status, order status, task status, etc.
 * 
 * Variants:
 * - exceptional: Green - best performance
 * - standard: Yellow - acceptable
 * - breach: Red - requires attention
 * - pending: Gray - in progress
 * - active: Blue - currently active
 * 
 * Sizes:
 * - sm: Compact (for tables)
 * - md: Default
 * - lg: Prominent
 */

import React from 'react';
import { statusColors } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';

// ============================================
// Types
// ============================================

export type StatusVariant = 'exceptional' | 'standard' | 'breach' | 'pending' | 'active';

export interface StatusPillProps {
  /** Status variant determines color */
  variant: StatusVariant;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Display text */
  children: React.ReactNode;
  /** Optional icon before text */
  icon?: React.ReactNode;
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================
// Styles
// ============================================

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: fontFamily.body,
  fontWeight: fontWeight.medium,
  lineHeight: lineHeight.tight,
  borderRadius: radius.full,
  whiteSpace: 'nowrap',
  border: '1px solid',
};

const sizeStyles: Record<NonNullable<StatusPillProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${space['0.5']} ${space['2']}`,
    fontSize: fontSize.xs,
    gap: space['1'],
  },
  md: {
    padding: `${space['1']} ${space['2.5']}`,
    fontSize: fontSize.sm,
    gap: space['1.5'],
  },
  lg: {
    padding: `${space['1.5']} ${space['3']}`,
    fontSize: fontSize.base,
    gap: space['2'],
  },
};

// ============================================
// Component
// ============================================

export function StatusPill({
  variant,
  size = 'md',
  children,
  icon,
  style,
}: StatusPillProps) {
  const colors = statusColors[variant];

  const combinedStyles: React.CSSProperties = {
    ...baseStyles,
    ...sizeStyles[size],
    backgroundColor: colors.bg,
    color: colors.text,
    borderColor: colors.border,
    ...style,
  };

  return (
    <span style={combinedStyles}>
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </span>
  );
}

/**
 * Utility to map common status strings to variants
 */
export function getStatusVariant(status: string): StatusVariant {
  const normalized = status.toLowerCase().trim();
  
  const mapping: Record<string, StatusVariant> = {
    // SLA status
    'exceptional': 'exceptional',
    'standard': 'standard',
    'breach': 'breach',
    'pending': 'pending',
    
    // Order/task status
    'completed': 'exceptional',
    'complete': 'exceptional',
    'done': 'exceptional',
    'success': 'exceptional',
    
    'in_progress': 'active',
    'in progress': 'active',
    'processing': 'active',
    'active': 'active',
    'running': 'active',
    
    'warning': 'standard',
    'review': 'standard',
    'waiting': 'standard',
    
    'failed': 'breach',
    'error': 'breach',
    'overdue': 'breach',
    'cancelled': 'breach',
    'rejected': 'breach',
    
    'draft': 'pending',
    'queued': 'pending',
    'scheduled': 'pending',
    'paused': 'pending',
  };

  return mapping[normalized] || 'pending';
}

export default StatusPill;
