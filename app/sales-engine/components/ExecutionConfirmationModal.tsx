'use client';

/**
 * ExecutionConfirmationModal - M68-03 Execution Confirmation
 * 
 * A blocking modal that requires explicit user confirmation before any runtime action.
 * 
 * HARD CONSTRAINTS:
 * - Must be blocking (no dismissal without explicit choice)
 * - Requires explicit user action to confirm
 * - Clearly states that execution will occur
 * - Confirmation state is local only (no persistence)
 * - Kill switch prevents confirmation from proceeding
 * - No actual execution logic - just confirmation gate
 */

import { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';
import { isRuntimeKillSwitchActive, KILL_SWITCH_MESSAGE } from '../../../config/appConfig';

export interface ExecutionConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Name of the action being confirmed */
  actionName: string;
  /** Description of what will happen */
  actionDescription: string;
  /** Callback when user confirms */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
  /** Whether an action is in progress */
  isLoading?: boolean;
}

/**
 * Blocking modal for execution confirmation.
 * Prevents any runtime action without explicit user confirmation.
 */
export function ExecutionConfirmationModal({
  isOpen,
  actionName,
  actionDescription,
  onConfirm,
  onCancel,
  isLoading = false,
}: ExecutionConfirmationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  
  // Don't render if not open
  if (!isOpen) {
    return null;
  }
  
  // M68-03: Kill switch blocks confirmation entirely
  const killSwitchActive = isRuntimeKillSwitchActive;
  
  const handleConfirm = () => {
    if (killSwitchActive || !acknowledged || isLoading) {
      return;
    }
    onConfirm();
  };
  
  const handleCancel = () => {
    setAcknowledged(false);
    onCancel();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          padding: '32px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              backgroundColor: killSwitchActive ? '#FEE2E2' : '#FEF3C7',
              borderRadius: '50%',
              marginBottom: '16px',
            }}
          >
            {killSwitchActive ? (
              <StopIcon />
            ) : (
              <WarningIcon />
            )}
          </div>
          
          <h2
            id="confirmation-title"
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: killSwitchActive ? '#991B1B' : NSD_COLORS.text.primary,
            }}
          >
            {killSwitchActive ? 'Action Blocked' : `Confirm: ${actionName}`}
          </h2>
        </div>

        {/* Kill switch message */}
        {killSwitchActive && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#FEE2E2',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '24px',
              border: '1px solid #FECACA',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#991B1B',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              {KILL_SWITCH_MESSAGE}
            </p>
          </div>
        )}

        {/* Action description */}
        {!killSwitchActive && (
          <>
            <div
              style={{
                padding: '16px',
                backgroundColor: '#FEF3C7',
                borderRadius: NSD_RADIUS.md,
                marginBottom: '24px',
                border: '1px solid #FCD34D',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#92400E',
                  lineHeight: 1.6,
                }}
              >
                <strong>Warning:</strong> {actionDescription}
              </p>
            </div>

            {/* Acknowledgment checkbox */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                marginBottom: '24px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{
                  width: '20px',
                  height: '20px',
                  marginTop: '2px',
                  cursor: 'pointer',
                }}
              />
              <span
                style={{
                  fontSize: '14px',
                  color: NSD_COLORS.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                I understand that this action will initiate execution and cannot be undone.
              </span>
            </label>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              backgroundColor: NSD_COLORS.background,
              color: NSD_COLORS.text.primary,
              border: `1px solid ${NSD_COLORS.border.default}`,
              borderRadius: NSD_RADIUS.md,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          
          {!killSwitchActive && (
            <button
              onClick={handleConfirm}
              disabled={!acknowledged || isLoading}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: acknowledged ? NSD_COLORS.cta : '#E5E7EB',
                color: acknowledged ? NSD_COLORS.text.inverse : '#9CA3AF',
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: acknowledged && !isLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {isLoading ? 'Processing...' : 'Confirm Execution'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#92400E"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#991B1B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

export default ExecutionConfirmationModal;
