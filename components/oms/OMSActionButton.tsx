/**
 * OMS Action Button
 * 
 * Phase 8B: Single explicit control for each OMS action.
 * 
 * GOVERNANCE:
 * - One button → one action
 * - Requires confirmation before execution
 * - Shows loading state during execution
 * - Shows explicit success/error feedback
 * - No optimistic updates
 */

'use client';

import React from 'react';
import type { OMSActionType } from '../../types/oms';
import { OMS_ACTIONS } from '../../types/oms';

export interface OMSActionButtonProps {
  action: OMSActionType;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export function OMSActionButton({
  action,
  onClick,
  disabled = false,
  loading = false,
  size = 'medium',
  showLabel = true,
}: OMSActionButtonProps) {
  const config = OMS_ACTIONS[action];
  
  const sizeStyles = getSizeStyles(size);
  const variantStyles = getVariantStyles(config.variant);
  
  return (
    <button
      style={{
        ...baseStyles,
        ...sizeStyles,
        ...variantStyles,
        opacity: disabled || loading ? 0.6 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
      }}
      onClick={onClick}
      disabled={disabled || loading}
      title={config.description}
    >
      <span style={{ marginRight: showLabel ? '8px' : '0' }}>
        {loading ? '⏳' : config.icon}
      </span>
      {showLabel && (
        <span>{loading ? 'Processing...' : config.label}</span>
      )}
    </button>
  );
}

// ============================================
// Styles
// ============================================

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 500,
  border: 'none',
  borderRadius: '8px',
  transition: 'all 0.2s',
};

function getSizeStyles(size: 'small' | 'medium' | 'large'): React.CSSProperties {
  switch (size) {
    case 'small':
      return { padding: '6px 12px', fontSize: '12px' };
    case 'large':
      return { padding: '14px 24px', fontSize: '16px' };
    default:
      return { padding: '10px 18px', fontSize: '14px' };
  }
}

function getVariantStyles(variant: string): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return { backgroundColor: '#3b82f6', color: '#ffffff' };
    case 'warning':
      return { backgroundColor: '#f59e0b', color: '#ffffff' };
    case 'danger':
      return { backgroundColor: '#ef4444', color: '#ffffff' };
    default:
      return { backgroundColor: '#6b7280', color: '#ffffff' };
  }
}
