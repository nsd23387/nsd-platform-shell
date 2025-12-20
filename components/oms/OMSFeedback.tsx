/**
 * OMS Feedback Component
 * 
 * Phase 8B: Explicit success/error feedback for OMS actions.
 * 
 * GOVERNANCE:
 * - Success shows event ID (proof of backend action)
 * - Error shows exact error message (no masking)
 * - No auto-dismiss - user must acknowledge
 */

'use client';

import React from 'react';
import type { OMSActionType, OMSActionResponse } from '../../types/oms';
import { OMS_ACTIONS } from '../../types/oms';

export interface OMSFeedbackProps {
  type: 'success' | 'error';
  action?: OMSActionType;
  result?: OMSActionResponse | null;
  error?: string | null;
  onDismiss: () => void;
}

export function OMSFeedback({
  type,
  action,
  result,
  error,
  onDismiss,
}: OMSFeedbackProps) {
  const config = action ? OMS_ACTIONS[action] : null;
  
  if (type === 'success' && result) {
    return (
      <div style={successStyles}>
        <div style={feedbackHeaderStyles}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={feedbackTitleStyles}>
            {config?.successMessage || 'Action completed successfully'}
          </span>
        </div>
        <div style={feedbackBodyStyles}>
          <p style={feedbackDetailStyles}>
            Event ID: <code style={codeStyles}>{result.eventId}</code>
          </p>
          <p style={feedbackDetailStyles}>
            Timestamp: {new Date(result.timestamp).toLocaleString()}
          </p>
        </div>
        <div style={feedbackNoteStyles}>
          This change will be reflected in dashboards shortly.
        </div>
        <button style={dismissButtonStyles} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }
  
  if (type === 'error' && error) {
    return (
      <div style={errorStyles}>
        <div style={feedbackHeaderStyles}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <span style={feedbackTitleStyles}>Action Failed</span>
        </div>
        <div style={feedbackBodyStyles}>
          <p style={errorMessageStyles}>{error}</p>
        </div>
        <div style={feedbackNoteStyles}>
          The action was not executed. Dashboards remain unchanged.
        </div>
        <button style={dismissButtonStyles} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }
  
  return null;
}

// ============================================
// Inline Feedback (for action rows)
// ============================================

export interface OMSInlineFeedbackProps {
  type: 'success' | 'error';
  message: string;
  onDismiss?: () => void;
}

export function OMSInlineFeedback({
  type,
  message,
  onDismiss,
}: OMSInlineFeedbackProps) {
  const styles = type === 'success' ? inlineSuccessStyles : inlineErrorStyles;
  const icon = type === 'success' ? '✓' : '✗';
  
  return (
    <div style={styles}>
      <span style={{ marginRight: '8px' }}>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      {onDismiss && (
        <button style={inlineDismissStyles} onClick={onDismiss}>
          ×
        </button>
      )}
    </div>
  );
}

// ============================================
// Styles
// ============================================

const successStyles: React.CSSProperties = {
  backgroundColor: '#f0fdf4',
  border: '1px solid #bbf7d0',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
};

const errorStyles: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
};

const feedbackHeaderStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px',
};

const feedbackTitleStyles: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#111827',
};

const feedbackBodyStyles: React.CSSProperties = {
  marginBottom: '12px',
};

const feedbackDetailStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#374151',
  marginBottom: '4px',
};

const errorMessageStyles: React.CSSProperties = {
  fontSize: '14px',
  color: '#dc2626',
  fontWeight: 500,
};

const codeStyles: React.CSSProperties = {
  backgroundColor: '#e5e7eb',
  padding: '2px 6px',
  borderRadius: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
};

const feedbackNoteStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  fontStyle: 'italic',
  marginBottom: '12px',
};

const dismissButtonStyles: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '14px',
  fontWeight: 500,
  backgroundColor: '#ffffff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  cursor: 'pointer',
};

const inlineSuccessStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  backgroundColor: '#dcfce7',
  color: '#166534',
  borderRadius: '6px',
  fontSize: '13px',
};

const inlineErrorStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  borderRadius: '6px',
  fontSize: '13px',
};

const inlineDismissStyles: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  padding: '0 4px',
  color: 'inherit',
  opacity: 0.7,
};
