'use client';

import { useState } from 'react';
import type { CampaignDetail } from '../types/campaign';

interface GovernanceActionsProps {
  campaign: CampaignDetail;
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
}

export function GovernanceActions({ campaign, onSubmit, onApprove }: GovernanceActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'submit' | 'approve' | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      await onSubmit();
      setConfirmAction(null);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
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
          onClick={() => setConfirmAction('submit')}
          disabled={!campaign.canSubmit || isSubmitting}
          title={!campaign.canSubmit ? 'Cannot submit in current state' : 'Submit for review'}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: campaign.canSubmit ? '#f59e0b' : '#e5e7eb',
            color: campaign.canSubmit ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: campaign.canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          Submit for Review
        </button>

        <button
          onClick={() => setConfirmAction('approve')}
          disabled={!campaign.canApprove || isApproving}
          title={!campaign.canApprove ? 'Cannot approve in current state' : 'Approve campaign'}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: campaign.canApprove ? '#10b981' : '#e5e7eb',
            color: campaign.canApprove ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: campaign.canApprove ? 'pointer' : 'not-allowed',
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
