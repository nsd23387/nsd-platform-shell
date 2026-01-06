'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { isTestCampaign, handleTestCampaignAction } from '../../lib/test-campaign';

interface GovernanceActionsPanelProps {
  campaignId: string;
  governanceState: string;
  canSubmit?: boolean;
  canApprove?: boolean;
  onSubmitForApproval?: () => void;
  submitting?: boolean;
  runsCount?: number;
}

/**
 * Campaign Actions Panel
 * 
 * Displays action buttons for campaign management.
 * Actions execute immediately when clicked.
 */
export function GovernanceActionsPanel({
  campaignId,
  governanceState,
  canSubmit = true,
  canApprove = true,
  onSubmitForApproval,
  submitting = false,
  runsCount = 0,
}: GovernanceActionsPanelProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isTest = isTestCampaign(campaignId);
  const isArchived = governanceState === 'ARCHIVED';

  async function handleAction(action: 'submit' | 'approve' | 'run') {
    if (isArchived) return;
    
    setSuccessMessage(null);
    
    if (isTest) {
      setActionLoading(true);
      const result = await handleTestCampaignAction(campaignId, action);
      setActionLoading(false);
      if (result.success) {
        setSuccessMessage(result.message);
      }
      return;
    }
    
    // Handle real campaign actions via API
    setActionLoading(true);
    try {
      let endpoint = '';
      let successMsg = '';
      
      switch (action) {
        case 'submit':
          endpoint = `/api/v1/campaigns/${campaignId}/submit`;
          successMsg = 'Campaign submitted for approval';
          break;
        case 'approve':
          endpoint = `/api/v1/campaigns/${campaignId}/approve`;
          successMsg = 'Campaign approved';
          break;
        case 'run':
          // Run action would go to a different endpoint
          endpoint = `/api/v1/campaigns/${campaignId}/run`;
          successMsg = 'Campaign run initiated';
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (response.ok) {
        setSuccessMessage(successMsg);
        // Refresh the page to show updated status
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      } else {
        const data = await response.json();
        setSuccessMessage(`Error: ${data.error || 'Action failed'}`);
      }
    } catch (error) {
      console.error('Action error:', error);
      setSuccessMessage('Error: Failed to complete action');
    } finally {
      setActionLoading(false);
    }
    
    // Also call the callback if provided (for backwards compatibility)
    if (action === 'submit') {
      onSubmitForApproval?.();
    }
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.primary,
          }}
        >
          Campaign Actions
        </h4>
      </div>

      <div style={{ padding: '20px' }}>
        {successMessage && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#DCFCE7',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              fontSize: '13px',
              color: '#166534',
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {governanceState === 'DRAFT' && (
            <button
              onClick={() => handleAction('submit')}
              disabled={submitting || actionLoading || isArchived}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: NSD_COLORS.secondary,
                color: NSD_COLORS.text.inverse,
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: (submitting || actionLoading || isArchived) ? 'not-allowed' : 'pointer',
                opacity: (submitting || actionLoading || isArchived) ? 0.7 : 1,
              }}
            >
              {submitting || actionLoading ? 'Processing...' : 'Submit for Approval'}
            </button>
          )}

          {(governanceState === 'PENDING_REVIEW' || governanceState === 'PENDING_APPROVAL') && (
            <button
              onClick={() => handleAction('approve')}
              disabled={actionLoading || isArchived}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: '#16A34A',
                color: NSD_COLORS.text.inverse,
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: (actionLoading || isArchived) ? 'not-allowed' : 'pointer',
                opacity: (actionLoading || isArchived) ? 0.7 : 1,
              }}
            >
              {actionLoading ? 'Processing...' : 'Approve Campaign'}
            </button>
          )}

          {(governanceState === 'RUNNABLE' || governanceState === 'APPROVED_READY') && (
            <button
              onClick={() => handleAction('run')}
              disabled={actionLoading || isArchived}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                backgroundColor: NSD_COLORS.primary,
                color: NSD_COLORS.text.inverse,
                border: 'none',
                borderRadius: NSD_RADIUS.md,
                cursor: (actionLoading || isArchived) ? 'not-allowed' : 'pointer',
                opacity: (actionLoading || isArchived) ? 0.7 : 1,
              }}
            >
              {actionLoading ? 'Processing...' : 'Run Campaign'}
            </button>
          )}
        </div>

        {/* View Run History link */}
        {runsCount > 0 && (
          <Link
            href={`/sales-engine/campaigns/${campaignId}?tab=monitoring`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              textDecoration: 'none',
              marginTop: '16px',
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: NSD_COLORS.text.primary,
                }}
              >
                View Run History
              </p>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                }}
              >
                {runsCount} recorded {runsCount === 1 ? 'run' : 'runs'}
              </p>
            </div>
            <span style={{ fontSize: '16px', color: NSD_COLORS.secondary }}>→</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default GovernanceActionsPanel;
