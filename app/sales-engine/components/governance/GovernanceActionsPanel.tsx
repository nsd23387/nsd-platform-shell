'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { isTestCampaign, handleTestCampaignAction } from '../../lib/test-campaign';
import { useExecutionStatus } from '../../../../hooks/useExecutionStatus';

/**
 * GOVERNANCE EXTENSIBILITY ARCHITECTURE
 * 
 * This interface defines stage-aware actions for future expansion.
 * Actions are currently limited to governance-level operations.
 * 
 * IMPORTANT: This is PLACEHOLDER ARCHITECTURE ONLY.
 * DO NOT add new actions without explicit backend support.
 * 
 * Future stage-aware actions might include:
 * - approve_personalization: Approve personalization batch
 * - resolve_email_coverage: Resolve missing email coverage
 * - connect_outbound: Connect outbound system
 * - resume_sends: Resume paused sends
 * 
 * All future actions must:
 * 1. Have backend API support
 * 2. Be observational until backend confirms capability
 * 3. Not invent new execution semantics
 */
export interface StageAction {
  readonly id: string;
  readonly stageId: string | null;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly visible: boolean;
}

/**
 * Check if a stage-specific action is available
 * 
 * GOVERNANCE CONSTRAINT:
 * This function returns false for all future stage actions.
 * Actions are only enabled when backend explicitly supports them.
 */
function isStageActionAvailable(actionId: string, stageId: string | null): boolean {
  const currentSupportedActions = ['submit', 'approve', 'run'];
  return currentSupportedActions.includes(actionId);
}

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
  /** Current execution phase (for future stage-aware actions) */
  currentPhase?: string | null;
  /** Callback to duplicate the campaign */
  onDuplicate?: () => void;
  /** Whether duplication is in progress */
  duplicating?: boolean;
}

/**
 * Campaign Actions Panel
 * 
 * Displays action buttons for campaign management.
 * Actions execute immediately when clicked.
 * 
 * GOVERNANCE CONSTRAINTS (CRITICAL):
 * - This component is PRESENTATIONAL ONLY for future stage actions.
 * - Current actions: submit, approve, run
 * - Future stage actions are HIDDEN until backend support exists.
 * - DO NOT add new action buttons without explicit backend API.
 * 
 * NOTE: Execution is proxied through /api/execute-campaign
 * to avoid CORS issues. platform-shell never executes campaigns directly.
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
  onDuplicate,
  duplicating = false,
}: GovernanceActionsPanelProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const isTest = isTestCampaign(campaignId);
  const isArchived = governanceState === 'ARCHIVED';
  
  // EXECUTION CONTRACT: Check if Sales Engine supports queue-first execution
  const { executionSupported, loading: executionStatusLoading, reason: executionUnavailableReason } = useExecutionStatus();
  
  // Execution is disabled if:
  // - Planning-only campaign
  // - Sales Engine contract not validated
  const isExecutionDisabled = isPlanningOnly || !executionSupported;

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
      let response: Response;
      let successMsg = '';
      
      switch (action) {
        case 'submit':
          response = await fetch(`/api/v1/campaigns/${campaignId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          successMsg = 'Campaign submitted for approval';
          break;
          
        case 'approve':
          response = await fetch(`/api/v1/campaigns/${campaignId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          successMsg = 'Campaign approved';
          break;
          
        case 'run':
          // Execution is handled exclusively by nsd-sales-engine.
          // platform-shell must never execute campaigns.
          // Use server-side proxy to avoid CORS issues.
          response = await fetch('/api/execute-campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId }),
          });
          successMsg = 'Campaign queued';
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // 202 Accepted or 200/201 = success
      const isSuccess = response.status === 202 || response.ok;
      
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
        if (response.status === 404) {
          // Endpoint not found - likely misconfiguration
          setSuccessMessage('Execution service misconfigured (endpoint not found). Check SALES_ENGINE_URL / SALES_ENGINE_API_BASE_URL.');
        } else if (response.status === 409) {
          if (data.error === 'PLANNING_ONLY_CAMPAIGN') {
            setSuccessMessage('Execution disabled — this campaign is planning-only.');
          } else if (data.error === 'CAMPAIGN_NOT_RUNNABLE') {
            setSuccessMessage('Campaign is not in a runnable state.');
          } else {
            setSuccessMessage(`Error: ${data.reason || data.error || 'Campaign not in correct state'}`);
          }
        } else if (response.status === 504) {
          // Timeout
          setSuccessMessage('Execution service timed out. Please try again.');
        } else if (response.status >= 500) {
          setSuccessMessage('Execution service unavailable. Please try again.');
        } else {
          setSuccessMessage(`Error: ${data.message || data.error || 'Action failed'}`);
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
              {/* Execution unavailable notice - Sales Engine contract not detected */}
              {!executionSupported && !executionStatusLoading && (
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
                  title={executionUnavailableReason || 'Execution contract not validated'}
                >
                  <Icon name="warning" size={16} color={NSD_COLORS.semantic.attention.text} />
                  Execution unavailable — Sales Engine execution contract not detected.
                </div>
              )}
              {/* Planning-only notice */}
              {isPlanningOnly && executionSupported && (
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
                disabled={actionLoading || isArchived || isExecutionDisabled || executionStatusLoading}
                title={
                  !executionSupported
                    ? 'Execution unavailable — Sales Engine execution contract not detected.'
                    : isPlanningOnly
                    ? 'Execution disabled — Planning-only campaign'
                    : undefined
                }
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: NSD_TYPOGRAPHY.fontBody,
                  backgroundColor: (actionLoading || isArchived || isExecutionDisabled || executionStatusLoading) ? NSD_COLORS.text.muted : NSD_COLORS.primary,
                  color: NSD_COLORS.text.inverse,
                  border: 'none',
                  borderRadius: NSD_RADIUS.md,
                  cursor: (actionLoading || isArchived || isExecutionDisabled || executionStatusLoading) ? 'not-allowed' : 'pointer',
                  opacity: (actionLoading || isArchived || isExecutionDisabled || executionStatusLoading) ? 0.7 : 1,
                }}
              >
                {executionStatusLoading ? 'Checking...' : actionLoading ? 'Processing...' : 'Run Campaign'}
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

        {/* Duplicate Campaign button - always visible */}
        <button
          onClick={onDuplicate}
          disabled={duplicating || !onDuplicate}
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            backgroundColor: 'transparent',
            color: NSD_COLORS.secondary,
            border: `1px solid ${NSD_COLORS.secondary}`,
            borderRadius: NSD_RADIUS.md,
            cursor: (duplicating || !onDuplicate) ? 'not-allowed' : 'pointer',
            opacity: (duplicating || !onDuplicate) ? 0.7 : 1,
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Icon name="plus" size={16} color={NSD_COLORS.secondary} />
          {duplicating ? 'Duplicating...' : 'Duplicate Campaign'}
        </button>
      </div>
    </div>
  );
}

export default GovernanceActionsPanel;
