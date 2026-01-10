/**
 * ApprovalAwarenessPanel Component
 * 
 * Displays approval status awareness - shows "Not Approved" state
 * when no campaign.approved event exists.
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - Does NOT add approval buttons or CTAs
 * - Uses existing empty-state patterns
 * - Provides explanatory copy only
 * 
 * This is an AWARENESS component, not an ACTION component.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface ApprovalAwarenessState {
  /** Whether the campaign has been approved */
  isApproved: boolean;
  /** When the campaign was approved (if approved) */
  approvedAt?: string;
  /** Who approved the campaign (if approved) */
  approvedBy?: string;
  /** Current campaign status */
  status: 'DRAFT' | 'PENDING_REVIEW' | 'RUNNABLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';
  /** Whether the campaign has any runs */
  hasRuns: boolean;
  /** Reason for blocking (if blocked) */
  blockingReason?: string;
}

export interface ApprovalAwarenessPanelProps {
  /** Approval state derived from campaign and events */
  approvalState: ApprovalAwarenessState;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Derive execution state from approval state for display.
 * 
 * States:
 * - Draft: No submission yet
 * - Pending: Submitted, awaiting approval
 * - Approved: Approved, awaiting first run (or no runs yet)
 * - Running: Active run in progress
 * - Completed: Has completed runs
 * - Failed: Latest run failed
 * - Blocked: Cannot proceed due to blocking reason
 */
function deriveExecutionDisplayState(state: ApprovalAwarenessState): {
  label: string;
  description: string;
  icon: 'clock' | 'check' | 'warning' | 'info' | 'runs' | 'close';
  bg: string;
  text: string;
  border: string;
  showApprovalInfo: boolean;
} {
  // Draft - not yet submitted
  if (state.status === 'DRAFT') {
    return {
      label: 'Draft',
      description: 'This campaign is in draft status and has not been submitted for approval.',
      icon: 'clock',
      ...NSD_COLORS.semantic.muted,
      showApprovalInfo: false,
    };
  }
  
  // Pending review - awaiting approval
  if (state.status === 'PENDING_REVIEW') {
    return {
      label: 'Pending Approval',
      description: 'This campaign has been submitted and is awaiting governance approval. Execution cannot begin until approved.',
      icon: 'clock',
      ...NSD_COLORS.semantic.info,
      showApprovalInfo: false,
    };
  }
  
  // Check for blocking reason
  if (state.blockingReason) {
    return {
      label: 'Blocked',
      description: state.blockingReason,
      icon: 'close',
      ...NSD_COLORS.semantic.critical,
      showApprovalInfo: state.isApproved,
    };
  }
  
  // Approved but no runs yet
  if (state.isApproved && !state.hasRuns && state.status === 'RUNNABLE') {
    return {
      label: 'Approved — Awaiting Execution',
      description: 'This campaign is approved and ready for execution. Runs will appear here when the execution lifecycle begins.',
      icon: 'check',
      ...NSD_COLORS.semantic.positive,
      showApprovalInfo: true,
    };
  }
  
  // Running
  if (state.status === 'RUNNING') {
    return {
      label: 'Running',
      description: 'A run is currently in progress. Check the Run History for live updates.',
      icon: 'runs',
      ...NSD_COLORS.semantic.active,
      showApprovalInfo: true,
    };
  }
  
  // Completed
  if (state.status === 'COMPLETED') {
    return {
      label: 'Completed',
      description: 'The latest run has completed successfully. See Run History for details.',
      icon: 'check',
      ...NSD_COLORS.semantic.positive,
      showApprovalInfo: true,
    };
  }
  
  // Failed
  if (state.status === 'FAILED') {
    return {
      label: 'Failed',
      description: 'The latest run failed. See Run History for error details.',
      icon: 'warning',
      ...NSD_COLORS.semantic.critical,
      showApprovalInfo: true,
    };
  }
  
  // Archived
  if (state.status === 'ARCHIVED') {
    return {
      label: 'Archived',
      description: 'This campaign has been archived and is in read-only observability mode.',
      icon: 'info',
      ...NSD_COLORS.semantic.muted,
      showApprovalInfo: state.isApproved,
    };
  }
  
  // Fallback - not approved
  if (!state.isApproved) {
    return {
      label: 'Not Approved',
      description: 'This campaign has not been approved for execution. Approval is required before runs can begin.',
      icon: 'clock',
      ...NSD_COLORS.semantic.attention,
      showApprovalInfo: false,
    };
  }
  
  // Default approved state
  return {
    label: 'Approved',
    description: 'This campaign is approved for execution.',
    icon: 'check',
    ...NSD_COLORS.semantic.positive,
    showApprovalInfo: true,
  };
}

/**
 * ApprovalAwarenessPanel - Shows campaign approval and execution state.
 * 
 * This component provides awareness without action capabilities.
 * It displays:
 * - Current approval status
 * - When/who approved (if approved)
 * - Explanation of what the current state means
 * - Any blocking reasons
 * 
 * It does NOT:
 * - Add approval buttons
 * - Allow mutations
 * - Bypass approval requirements
 */
export function ApprovalAwarenessPanel({
  approvalState,
  loading = false,
}: ApprovalAwarenessPanelProps) {
  const displayState = deriveExecutionDisplayState(approvalState);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: NSD_COLORS.surface,
            }}
          />
          <span style={{ fontSize: '14px', color: NSD_COLORS.text.muted }}>
            Loading approval status...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: displayState.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${displayState.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Status header */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={displayState.icon} size={18} color={displayState.text} />
        </div>
        
        <div style={{ flex: 1 }}>
          <h4
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: displayState.text,
            }}
          >
            {displayState.label}
          </h4>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '13px',
              color: displayState.text,
              opacity: 0.9,
              lineHeight: 1.5,
            }}
          >
            {displayState.description}
          </p>
        </div>
      </div>
      
      {/* Approval info (if approved) */}
      {displayState.showApprovalInfo && approvalState.isApproved && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${displayState.border}`,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              fontSize: '12px',
              color: displayState.text,
            }}
          >
            <span>
              <strong>Approved:</strong>{' '}
              {approvalState.approvedAt
                ? new Date(approvalState.approvedAt).toLocaleString()
                : 'Yes'}
            </span>
            {approvalState.approvedBy && (
              <span>
                <strong>By:</strong> {approvalState.approvedBy}
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Not approved explanation */}
      {!approvalState.isApproved && approvalState.status !== 'DRAFT' && approvalState.status !== 'PENDING_REVIEW' && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${displayState.border}`,
            backgroundColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: displayState.text,
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon name="info" size={12} color={displayState.text} />
            <span>
              No <code style={{ fontSize: '11px', backgroundColor: 'rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: '3px' }}>campaign.approved</code> event has been observed.
            </span>
          </p>
        </div>
      )}
      
      {/* Read-only notice */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: `1px solid ${displayState.border}`,
          backgroundColor: 'rgba(0,0,0,0.03)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: displayState.text,
            opacity: 0.6,
            fontStyle: 'italic',
          }}
        >
          Read-only status derived from execution events.
        </p>
      </div>
    </div>
  );
}
