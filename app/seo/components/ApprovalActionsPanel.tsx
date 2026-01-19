/**
 * SEO Intelligence - Approval Actions Panel
 * 
 * Interactive component for taking approval actions on recommendations.
 * This is the ONLY interactive mutation surface in the SEO UI.
 * 
 * Integrates with POST /api/seo/approvals to submit approval decisions.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - All implementation occurs externally (e.g., website repo via PR)
 * - Approving a recommendation only changes its status, not the website
 * ============================================================
 */

'use client';

import React, { useState } from 'react';
import {
  background,
  text,
  border,
  semantic,
} from '../../../design/tokens/colors';
import {
  fontFamily,
  fontSize,
  fontWeight,
} from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import type { SeoRecommendation, RecommendationStatus, ApprovalDecision } from '../../../lib/seo/types';
import { validateApprovalActionInput, type SeoApprovalActionInput } from '../../../lib/seo/ui-contracts';

// ============================================
// Types
// ============================================

export interface ApprovalActionsPanelProps {
  /** Recommendation ID */
  recommendationId: string;
  /** Current recommendation status */
  currentStatus: RecommendationStatus;
  /** Callback when action succeeds */
  onSuccess?: (updatedRecommendation: SeoRecommendation) => void;
  /** Callback when action fails */
  onError?: (error: string) => void;
}

type ActionState = 'idle' | 'approve' | 'reject' | 'defer';

// ============================================
// Terminal Status Check
// ============================================

function isTerminalStatus(status: RecommendationStatus): boolean {
  return ['implemented', 'rolled_back'].includes(status);
}

function canTakeAction(status: RecommendationStatus): boolean {
  return ['pending', 'deferred'].includes(status);
}

// ============================================
// Component
// ============================================

/**
 * ApprovalActionsPanel - Interactive approval controls
 * 
 * This component is the ONLY interactive mutation surface for SEO recommendations.
 * It submits approval decisions via POST /api/seo/approvals.
 * 
 * IMPORTANT: Approving a recommendation does NOT deploy any changes.
 * It only updates the recommendation status in ODS.
 * All implementation occurs externally via separate PR to website repository.
 */
export function ApprovalActionsPanel({
  recommendationId,
  currentStatus,
  onSuccess,
  onError,
}: ApprovalActionsPanelProps) {
  // State
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [deferDate, setDeferDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form state
  const resetForm = () => {
    setActionState('idle');
    setNotes('');
    setReason('');
    setDeferDate('');
    setError(null);
  };

  // Submit approval action
  const submitAction = async (action: ApprovalDecision) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Build action input
    const input: SeoApprovalActionInput = {
      action,
      recommendationId,
      notes: action === 'approve' ? (notes || undefined) : undefined,
      reason: action === 'reject' ? reason : undefined,
      deferUntil: action === 'defer' ? new Date(deferDate).toISOString() : undefined,
    };

    // Validate client-side
    const validation = validateApprovalActionInput(input);
    if (!validation.valid) {
      setError(validation.errors.join('. '));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/seo/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} recommendation`);
      }

      // Success
      const actionLabels = {
        approve: 'approved',
        reject: 'rejected',
        defer: 'deferred',
      };
      setSuccess(`Recommendation ${actionLabels[action]} successfully.`);
      resetForm();

      if (onSuccess && data.recommendation) {
        onSuccess(data.recommendation);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      if (onError) {
        onError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form submissions
  const handleApprove = () => submitAction('approve');
  const handleReject = () => submitAction('reject');
  const handleDefer = () => submitAction('defer');

  // Terminal status - no actions available
  if (isTerminalStatus(currentStatus)) {
    return (
      <div style={terminalStateStyles}>
        <div style={terminalIconStyles}>
          {currentStatus === 'implemented' ? '✓' : '↩'}
        </div>
        <div style={terminalTextStyles}>
          This recommendation has been{' '}
          <strong>{currentStatus === 'implemented' ? 'implemented' : 'rolled back'}</strong>.
          No further actions are available.
        </div>
      </div>
    );
  }

  // Already decided but can re-act (approved/rejected can be re-evaluated in some cases)
  const isAlreadyDecided = ['approved', 'rejected'].includes(currentStatus);
  const actionsDisabled = !canTakeAction(currentStatus) || loading;

  return (
    <div style={containerStyles}>
      {/* Status Message */}
      {isAlreadyDecided && (
        <div style={statusMessageStyles}>
          <span style={statusIconStyles}>ℹ</span>
          This recommendation has already been{' '}
          <strong>{currentStatus}</strong>.
          {currentStatus === 'approved' && ' Awaiting implementation.'}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={successMessageStyles}>
          <span style={successIconStyles}>✓</span>
          {success}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={errorMessageStyles}>
          <span style={errorIconStyles}>⚠</span>
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {actionState === 'idle' && (
        <div style={buttonGroupStyles}>
          <button
            style={{ ...buttonStyles, ...approveButtonStyles }}
            onClick={() => setActionState('approve')}
            disabled={actionsDisabled}
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
          <button
            style={{ ...buttonStyles, ...rejectButtonStyles }}
            onClick={() => setActionState('reject')}
            disabled={actionsDisabled}
          >
            Reject
          </button>
          <button
            style={{ ...buttonStyles, ...deferButtonStyles }}
            onClick={() => setActionState('defer')}
            disabled={actionsDisabled}
          >
            Defer
          </button>
        </div>
      )}

      {/* Approve Form */}
      {actionState === 'approve' && (
        <div style={formStyles}>
          <h4 style={formTitleStyles}>Approve Recommendation</h4>
          <p style={formDescStyles}>
            Approving this recommendation marks it ready for implementation.
            Implementation occurs via separate PR to the website repository.
          </p>
          <label style={labelStyles}>
            Notes (optional)
            <textarea
              style={textareaStyles}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for the audit log..."
              rows={2}
              disabled={loading}
            />
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...approveButtonStyles }}
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {actionState === 'reject' && (
        <div style={formStyles}>
          <h4 style={formTitleStyles}>Reject Recommendation</h4>
          <p style={formDescStyles}>
            Rejecting this recommendation removes it from the approval queue.
            A reason is required to improve future recommendations.
          </p>
          <label style={labelStyles}>
            Rejection Reason <span style={requiredStyles}>*</span>
            <textarea
              style={textareaStyles}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this recommendation should be rejected (min 10 characters)..."
              rows={3}
              required
              disabled={loading}
            />
            <span style={charCountStyles}>{reason.length} / 10+ characters</span>
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...rejectButtonStyles }}
              onClick={handleReject}
              disabled={loading || reason.trim().length < 10}
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      )}

      {/* Defer Form */}
      {actionState === 'defer' && (
        <div style={formStyles}>
          <h4 style={formTitleStyles}>Defer Recommendation</h4>
          <p style={formDescStyles}>
            Deferring postpones review until the specified date.
            The recommendation will reappear in the queue after that date.
          </p>
          <label style={labelStyles}>
            Defer Until <span style={requiredStyles}>*</span>
            <input
              type="date"
              style={inputStyles}
              value={deferDate}
              onChange={(e) => setDeferDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              max={(() => {
                const d = new Date();
                d.setDate(d.getDate() + 90);
                return d.toISOString().split('T')[0];
              })()}
              required
              disabled={loading}
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
              disabled={loading}
            />
          </label>
          <div style={formButtonsStyles}>
            <button
              style={{ ...buttonStyles, ...cancelButtonStyles }}
              onClick={resetForm}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              style={{ ...buttonStyles, ...deferButtonStyles }}
              onClick={handleDefer}
              disabled={loading || !deferDate}
            >
              {loading ? 'Deferring...' : 'Confirm Deferral'}
            </button>
          </div>
        </div>
      )}

      {/* Governance Notice */}
      <div style={governanceNoticeStyles}>
        <strong>Important:</strong> Approval actions only change the recommendation status.
        They do NOT deploy any website changes.
      </div>
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

const terminalStateStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: space['3'],
  padding: space['4'],
  backgroundColor: background.muted,
  borderRadius: radius.lg,
};

const terminalIconStyles: React.CSSProperties = {
  fontSize: fontSize.xl,
  color: text.muted,
};

const terminalTextStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
};

const statusMessageStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: space['2'],
  padding: space['3'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.md,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.info.dark,
};

const statusIconStyles: React.CSSProperties = {
  flexShrink: 0,
};

const successMessageStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: space['2'],
  padding: space['3'],
  backgroundColor: semantic.success.light,
  borderRadius: radius.md,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.success.dark,
};

const successIconStyles: React.CSSProperties = {
  flexShrink: 0,
};

const errorMessageStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: space['2'],
  padding: space['3'],
  backgroundColor: semantic.danger.light,
  borderRadius: radius.md,
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: semantic.danger.dark,
};

const errorIconStyles: React.CSSProperties = {
  flexShrink: 0,
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

const formTitleStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.base,
  fontWeight: fontWeight.semibold,
  color: text.primary,
  margin: 0,
};

const formDescStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  color: text.muted,
  margin: 0,
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

const requiredStyles: React.CSSProperties = {
  color: semantic.danger.base,
};

const textareaStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: space['3'],
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  resize: 'vertical',
  backgroundColor: background.surface,
};

const inputStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  fontSize: fontSize.sm,
  padding: space['2'],
  borderRadius: radius.md,
  border: `1px solid ${border.default}`,
  backgroundColor: background.surface,
};

const charCountStyles: React.CSSProperties = {
  fontFamily: fontFamily.mono,
  fontSize: fontSize.xs,
  color: text.muted,
  alignSelf: 'flex-end',
};

const formButtonsStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['2'],
  justifyContent: 'flex-end',
};

const governanceNoticeStyles: React.CSSProperties = {
  padding: space['3'],
  backgroundColor: semantic.info.light,
  borderRadius: radius.md,
  fontFamily: fontFamily.body,
  fontSize: fontSize.xs,
  color: semantic.info.dark,
};

export default ApprovalActionsPanel;
