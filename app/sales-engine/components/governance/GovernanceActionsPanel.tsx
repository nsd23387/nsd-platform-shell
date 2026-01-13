'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { isTestCampaign, handleTestCampaignAction } from '../../lib/test-campaign';

/**
 * Sales Engine Execution URL
 * 
 * NOTE:
 * Campaign execution is owned by nsd-sales-engine.
 * platform-shell must never execute or simulate runs.
 * This call submits execution intent only.
 */
const SALES_ENGINE_URL = process.env.NEXT_PUBLIC_SALES_ENGINE_URL || '';

interface GovernanceActionsPanelProps {
  campaignId: string;
  governanceState: string;
  canSubmit?: boolean;
  canApprove?: boolean;
  onSubmitForApproval?: () => void;
  submitting?: boolean;
  runsCount?: number;
  /** If true, this is a planning-only campaign that cannot be executed */
  isPlanningOnly?: boolean;
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
  isPlanningOnly = false,
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
      let isSalesEngineRequest = false;
      
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
          /**
           * NOTE:
           * Campaign execution is owned by nsd-sales-engine.
           * platform-shell must never execute or simulate runs.
           * This call submits execution intent only.
           */
          if (!SALES_ENGINE_URL) {
            setSuccessMessage('Error: Sales Engine URL not configured. Cannot execute campaigns.');
            setActionLoading(false);
            return;
          }
          endpoint = `${SALES_ENGINE_URL}/api/campaigns/${campaignId}/start`;
          successMsg = 'Execution request sent to Sales Engine';
          isSalesEngineRequest = true;
          break;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      // For Sales Engine: 202 Accepted = success
      // For local endpoints: 200/201 = success
      const isSuccess = isSalesEngineRequest 
        ? response.status === 202 || response.ok
        : response.ok;
      
      if (isSuccess) {
        setSuccessMessage(successMsg);
        
        // For run action, show message and refresh to get server state
        if (action === 'run') {
          setSuccessMessage(`${successMsg}. Check the Observability tab for progress.`);
          // Force server-truth refresh after short delay to allow backend processing
          setTimeout(() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }, 1000);
        } else {
          // Status changed - refresh to show updated state
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
      } else {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Provide user-friendly error messages for specific codes
        if (response.status === 409) {
          if (data.error === 'PLANNING_ONLY_CAMPAIGN') {
            setSuccessMessage('Execution disabled — this campaign is planning-only.');
          } else if (data.error === 'CAMPAIGN_NOT_RUNNABLE') {
            setSuccessMessage('Campaign is not in a runnable state.');
          } else {
            setSuccessMessage(`Error: ${data.reason || data.error || 'Campaign not in correct state'}`);
          }
        } else if (response.status >= 500) {
          setSuccessMessage('Execution service unavailable. Please try again.');
        } else if (response.status === 503) {
          setSuccessMessage(`Error: ${data.message || 'Service unavailable'}`);
        } else {
          setSuccessMessage(`Error: ${data.error || 'Action failed'}`);
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      setSuccessMessage('Execution service unavailable. Please try again.');
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
              backgroundColor: NSD_COLORS.semantic.positive.bg,
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              fontSize: '13px',
              color: NSD_COLORS.semantic.positive.text,
              border: `1px solid ${NSD_COLORS.semantic.positive.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="check" size={16} color={NSD_COLORS.semantic.positive.text} />
            {successMessage}
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
            <>
              {/* Planning-only notice */}
              {isPlanningOnly && (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: NSD_COLORS.semantic.attention.bg,
                    borderRadius: NSD_RADIUS.md,
                    marginBottom: '12px',
                    fontSize: '13px',
                    color: NSD_COLORS.semantic.attention.text,
                    border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icon name="info" size={16} color={NSD_COLORS.semantic.attention.text} />
                  Execution disabled — Planning-only campaign
                </div>
              )}
              <button
                onClick={() => handleAction('run')}
                disabled={actionLoading || isArchived || isPlanningOnly}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  backgroundColor: (actionLoading || isArchived || isPlanningOnly) ? NSD_COLORS.text.muted : NSD_COLORS.primary,
                  color: NSD_COLORS.text.inverse,
                  border: 'none',
                  borderRadius: NSD_RADIUS.md,
                  cursor: (actionLoading || isArchived || isPlanningOnly) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || isArchived || isPlanningOnly) ? 0.7 : 1,
                }}
              >
                {actionLoading ? 'Processing...' : 'Run Campaign'}
              </button>
            </>
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
