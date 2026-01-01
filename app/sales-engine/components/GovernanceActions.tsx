'use client';

import { useState } from 'react';
import type { CampaignDetail } from '../types/campaign';
import { isReadOnly, getDisabledMessage, guardRuntimeAction, canRuntimeExecute } from '../../../config/appConfig';

interface GovernanceActionsProps {
  campaign: CampaignDetail;
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
}

export function GovernanceActions({ campaign, onSubmit, onApprove }: GovernanceActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'submit' | 'approve' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // M67.9-01: All actions disabled in read-only mode (unless runtime permitted)
  const runtimePermitted = canRuntimeExecute();
  const actionsDisabled = isReadOnly && !runtimePermitted;

  async function handleSubmit() {
    // M68-02: Defensive guard - prevent any bypass
    const guardError = guardRuntimeAction('submit campaign');
    if (guardError) {
      setErrorMessage(guardError);
      return;
    }
    if (actionsDisabled) return;
    
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await onSubmit();
      setConfirmAction(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    // M68-02: Defensive guard - prevent any bypass
    const guardError = guardRuntimeAction('approve campaign');
    if (guardError) {
      setErrorMessage(guardError);
      return;
    }
    if (actionsDisabled) return;
    
    setErrorMessage(null);
    setIsApproving(true);
    try {
      await onApprove();
      setConfirmAction(null);
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <h4
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
        }}
      >
        Campaign Actions
      </h4>

      {/* M68-02: Error message from defensive guard */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEE2E2',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#991B1B',
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* M67.9-01: Read-only mode notice */}
      {actionsDisabled && !errorMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF3C7',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400E',
          }}
        >
          {getDisabledMessage('general')}
        </div>
      )}

      {confirmAction === 'submit' && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fffbeb',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#92400e' }}>
            Are you sure you want to submit this campaign for review? It will no longer be editable.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmAction === 'approve' && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#ecfdf5',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#065f46' }}>
            Are you sure you want to approve this campaign? It will transition to RUNNABLE state.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isApproving ? 'not-allowed' : 'pointer',
              }}
            >
              {isApproving ? 'Approving...' : 'Confirm Approve'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={isApproving}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#fff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => !actionsDisabled && setConfirmAction('submit')}
          disabled={actionsDisabled || !campaign.canSubmit || isSubmitting}
          title={actionsDisabled ? getDisabledMessage('submit') : (!campaign.canSubmit ? 'Cannot submit in current state' : 'Submit for review')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: !actionsDisabled && campaign.canSubmit ? '#f59e0b' : '#e5e7eb',
            color: !actionsDisabled && campaign.canSubmit ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: !actionsDisabled && campaign.canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Submit for Review
        </button>

        <button
          onClick={() => !actionsDisabled && setConfirmAction('approve')}
          disabled={actionsDisabled || !campaign.canApprove || isApproving}
          title={actionsDisabled ? getDisabledMessage('approve') : (!campaign.canApprove ? 'Cannot approve in current state' : 'Approve campaign')}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: !actionsDisabled && campaign.canApprove ? '#10b981' : '#e5e7eb',
            color: !actionsDisabled && campaign.canApprove ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: !actionsDisabled && campaign.canApprove ? 'pointer' : 'not-allowed',
          }}
        >
          Approve Campaign
        </button>
      </div>

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#6b7280' }}>
        <p style={{ margin: 0 }}>
          Governance Flags: canEdit={String(campaign.canEdit)}, canSubmit={String(campaign.canSubmit)}, canApprove={String(campaign.canApprove)}, isRunnable={String(campaign.isRunnable)}
        </p>
      </div>
    </div>
  );
}
