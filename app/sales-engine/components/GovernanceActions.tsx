'use client';

import { useState } from 'react';
import type { CampaignDetail } from '../types/campaign';

interface GovernanceActionsProps {
  campaign: CampaignDetail;
  onSubmit: () => Promise<void>;
  onApprove: () => Promise<void>;
}

/**
 * Campaign Actions Component
 * 
 * Displays action buttons for campaign management.
 * Actions execute immediately when clicked.
 */
export function GovernanceActions({ campaign, onSubmit, onApprove }: GovernanceActionsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const isArchived = campaign.status === 'ARCHIVED';

  async function handleSubmit() {
    if (isArchived) return;
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove() {
    if (isArchived) return;
    setIsApproving(true);
    try {
      await onApprove();
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

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSubmit}
          disabled={isArchived || !campaign.canSubmit || isSubmitting}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: campaign.canSubmit && !isArchived ? '#692BAA' : '#e5e7eb',
            color: campaign.canSubmit && !isArchived ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: campaign.canSubmit && !isArchived ? 'pointer' : 'not-allowed',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </button>

        <button
          onClick={handleApprove}
          disabled={isArchived || !campaign.canApprove || isApproving}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: campaign.canApprove && !isArchived ? '#3730A3' : '#e5e7eb',
            color: campaign.canApprove && !isArchived ? '#fff' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: campaign.canApprove && !isArchived ? 'pointer' : 'not-allowed',
          }}
        >
          {isApproving ? 'Approving...' : 'Approve Campaign'}
        </button>
      </div>
    </div>
  );
}
