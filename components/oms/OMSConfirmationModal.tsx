/**
 * OMS Confirmation Modal
 * 
 * Phase 8B: Explicit confirmation before any OMS mutation.
 * 
 * GOVERNANCE:
 * - Every OMS action MUST be confirmed
 * - User must explicitly click "Confirm" to execute
 * - Cancel dismisses without side effects
 * - Loading state prevents double-submission
 */

'use client';

import React from 'react';
import type { OMSActionType } from '../../types/oms';
import { OMS_ACTIONS } from '../../types/oms';

export interface OMSConfirmationModalProps {
  isOpen: boolean;
  action: OMSActionType | null;
  entityName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OMSConfirmationModal({
  isOpen,
  action,
  entityName,
  loading,
  onConfirm,
  onCancel,
}: OMSConfirmationModalProps) {
  if (!isOpen || !action) {
    return null;
  }

  const config = OMS_ACTIONS[action];

  return (
    <div style={overlayStyles}>
      <div style={modalStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <span style={{ fontSize: '24px' }}>{config.icon}</span>
          <h2 style={titleStyles}>{config.label}</h2>
        </div>

        {/* Body */}
        <div style={bodyStyles}>
          <p style={messageStyles}>{config.confirmationMessage}</p>
          <p style={entityStyles}>
            Entity: <strong>{entityName}</strong>
          </p>
        </div>

        {/* Warning */}
        <div style={warningStyles}>
          <span style={{ marginRight: '8px' }}>⚠️</span>
          This action will be recorded and cannot be undone.
        </div>

        {/* Actions */}
        <div style={actionsStyles}>
          <button
            style={cancelButtonStyles}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={confirmButtonStyles(config.variant)}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyles: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '400px',
  width: '90%',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px',
};

const titleStyles: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  color: '#111827',
  margin: 0,
};

const bodyStyles: React.CSSProperties = {
  marginBottom: '16px',
};

const messageStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  marginBottom: '8px',
};

const entityStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#6b7280',
};

const warningStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#92400e',
  backgroundColor: '#fef3c7',
  padding: '12px',
  borderRadius: '8px',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
};

const actionsStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
};

const cancelButtonStyles: React.CSSProperties = {
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  cursor: 'pointer',
};

const confirmButtonStyles = (variant: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; hover: string }> = {
    primary: { bg: '#3b82f6', hover: '#2563eb' },
    warning: { bg: '#f59e0b', hover: '#d97706' },
    danger: { bg: '#ef4444', hover: '#dc2626' },
    default: { bg: '#6b7280', hover: '#4b5563' },
  };
  
  const color = colors[variant] || colors.default;
  
  return {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: color.bg,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  };
};
