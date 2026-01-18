/**
 * SEO Intelligence - Approval Actions Component
 * 
 * Action buttons for approving, rejecting, or deferring recommendations.
 * Delegates all actions to parent handlers - no direct API calls.
 * 
 * GOVERNANCE:
 * - Actions require confirmation
 * - Rejection requires reason
 * - Deferral requires date
 * - All actions are delegated (no direct mutations)
 * 
 * NOT ALLOWED:
 * - Direct API calls
 * - Auto-approval
 * - Skipping confirmation
 * - Bypassing reason requirements
 */

'use client';

import React, { useState } from 'react';
import {
  background,
  text,
  border,
  semantic,
  violet,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';

// ============================================
// Types
// ============================================

export interface ApprovalActionsProps {
  /** Recommendation ID */
  recommendationId: string;
  /** Handler for approve action */
  onApprove?: (id: string, notes?: string) => void;
  /** Handler for reject action */
  onReject?: (id: string, reason: string) => void;
  /** Handler for defer action */
  onDefer?: (id: string, deferUntil: string, reason?: string) => void;
  /** Whether actions are disabled (e.g., loading) */
  disabled?: boolean;
  /** Whether to show compact view */
  compact?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * Approval Actions - action buttons for recommendation workflow.
 * 
 * This component captures user intent and delegates to handlers.
 * It does NOT make API calls directly.
 * 
 * IMPORTANT: All write operations go through parent handlers which
 * are responsible for authentication, validation, and audit logging.
 */
export function ApprovalActions({
  recommendationId,
  onApprove,
  onReject,
  onDefer,
  disabled = false,
  compact = false,
}: ApprovalActionsProps) {
  // State for action forms
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'defer' | null>(null);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [deferDate, setDeferDate] = useState('');

  // Reset form state
  const resetForm = () => {
    setActiveAction(null);
    setNotes('');
    setReason('');
    setDeferDate('');
  };

  // Handle approve submission
  const handleApprove = () => {
    if (onApprove) {
      onApprove(recommendationId, notes || undefined);
      resetForm();
    }
  };

  // Handle reject submission
  const handleReject = () => {
    if (onReject && reason.trim().length >= 10) {
      onReject(recommendationId, reason);
      resetForm();
    }
  };

  // Handle defer submission
  const handleDefer = () => {
    if (onDefer && deferDate) {
      onDefer(recommendationId, deferDate, reason || undefined);
      resetForm();
    }
  };

  // Not implemented notice
  const notImplemented = !onApprove && !onReject && !onDefer;

  if (notImplemented) {
    return (
      <div style={notImplementedStyles}>
        <span style={notImplementedTextStyles}>
          Approval workflow not yet implemented.
          Actions will be enabled when backend integration is complete.
        </span>
      </div>
    );
  }

  return (
    <div style={containerStyles}>
      {/* Action buttons */}
      {activeAction === null && (
        <div style={buttonGroupStyles}>
          {onApprove && (
            <button
              style={{ ...buttonStyles, ...approveButtonStyles }}
              onClick={() => setActiveAction('approve')}
              disabled={disabled}
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              style={{ ...buttonStyles, ...rejectButtonStyles }}
              onClick={() => setActiveAction('reject')}
              disabled={disabled}
            >
              Reject
            </button>
          )}
          {onDefer && (
            <button
              style={{ ...buttonStyles, ...deferButtonStyles }}
              onClick={() => setActiveAction('defer')}
              disabled={disabled}
            >
              Defer
            </button>
          )}
        </div>
      )}

      {/* Approve form */}
      {activeAction === 'approve' && (
        <div style={formStyles}>
          <label style={labelStyles}>
            Notes (optional)
            <textarea
              style={textareaStyles}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the audit log..."
              rows={2}
            />
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...approveButtonStyles }}
              onClick={handleApprove}
            >
              Confirm Approval
            </button>
          </div>
        </div>
      )}

      {/* Reject form */}
      {activeAction === 'reject' && (
        <div style={formStyles}>
          <label style={labelStyles}>
            Rejection Reason (required, min 10 characters)
            <textarea
              style={textareaStyles}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this recommendation should be rejected..."
              rows={3}
              required
            />
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...rejectButtonStyles }}
              onClick={handleReject}
              disabled={reason.trim().length < 10}
            >
              Confirm Rejection
            </button>
          </div>
          <p style={helperTextStyles}>
            Rejection reasons help improve future recommendations.
          </p>
        </div>
      )}

      {/* Defer form */}
      {activeAction === 'defer' && (
        <div style={formStyles}>
          <label style={labelStyles}>
            Defer Until (required)
            <input
              type="date"
              style={inputStyles}
              value={deferDate}
              onChange={(e) => setDeferDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </label>
          <label style={labelStyles}>
            Reason (optional)
            <textarea
              style={textareaStyles}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being deferred?"
              rows={2}
            />
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...deferButtonStyles }}
              onClick={handleDefer}
              disabled={!deferDate}
            >
              Confirm Deferral
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
};

const buttonGroupStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['2'],
  flexWrap: 'wrap',
};

const buttonStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  padding: `${space['2']} ${space['4']}`,
  borderRadius: radius.lg,
  border: 'none',
  cursor: 'pointer',
  transition: 'opacity 0.15s ease',
};

const approveButtonStyles: React.CSSProperties = {
  backgroundColor: semantic.success.base,
  color: 'white',
};

const rejectButtonStyles: React.CSSProperties = {
  backgroundColor: semantic.danger.base,
  color: 'white',
};

const deferButtonStyles: React.CSSProperties = {
  backgroundColor: semantic.warning.base,
  color: 'white',
};

const cancelButtonStyles: React.CSSProperties = {
  backgroundColor: background.muted,
  color: text.secondary,
};

const formStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['3'],
  padding: space['4'],
  backgroundColor: background.muted,
  borderRadius: radius.lg,
};

const labelStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: space['1'],
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: text.secondary,
};

const textareaStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: space['3'],
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  resize: 'vertical',
};

const inputStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: space['2'],
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
};

const formButtonsStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['2'],
  justifyContent: 'flex-end',
};

const helperTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: text.muted,
  fontStyle: 'italic',
  margin: 0,
};

const notImplementedStyles: React.CSSProperties = {
  padding: space['4'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.lg,
  border: `1px solid ${semantic.info.base}20`,
};

const notImplementedTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
};

export default ApprovalActions;
