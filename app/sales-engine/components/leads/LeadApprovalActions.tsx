/**
 * LeadApprovalActions Component
 * 
 * Displays approve/reject buttons for a lead in detail view.
 * 
 * GOVERNANCE REQUIREMENTS:
 * - Show only when status === 'pending_approval'
 * - Disabled once approved or rejected
 * - Confirmation modal required before action
 * - Promotion rationale remains read-only (no scoring controls)
 * - No send/export buttons here
 * 
 * BACKEND ENFORCEMENT:
 * - Leads start as pending_approval
 * - Only approved leads can be sent/exported
 * - Approval/rejection are explicit actions
 */

'use client';

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import { ApprovalConfirmationModal } from './ApprovalConfirmationModal';
import type { LeadApprovalStatus, LeadApprovalAction } from '../../types/campaign';

export interface LeadApprovalActionsProps {
  /** Lead ID */
  leadId: string;
  /** Current approval status */
  status: LeadApprovalStatus;
  /** Lead identifier for display (email or name) */
  leadIdentifier: string;
  /** Callback when approval action is performed */
  onApprovalAction: (leadId: string, action: LeadApprovalAction) => Promise<void>;
  /** When the status was last updated */
  statusUpdatedAt?: string;
  /** Who updated the status */
  statusUpdatedBy?: string;
}

/**
 * LeadApprovalActions - Action buttons for lead approval workflow.
 * 
 * Rules:
 * - Approve/Reject buttons visible only for pending_approval status
 * - Once approved or rejected, buttons are replaced with status display
 * - Confirmation modal required for all actions
 * - No scoring controls or send buttons
 */
export function LeadApprovalActions({
  leadId,
  status,
  leadIdentifier,
  onApprovalAction,
  statusUpdatedAt,
  statusUpdatedBy,
}: LeadApprovalActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<LeadApprovalAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPending = status === 'pending_approval';
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';

  const handleActionClick = (action: LeadApprovalAction) => {
    setError(null);
    setPendingAction(action);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    setIsLoading(true);
    setError(null);

    try {
      await onApprovalAction(leadId, pendingAction);
      setPendingAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPendingAction(null);
    setError(null);
  };

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
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.primary,
          }}
        >
          Lead Approval
        </h4>
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {/* Error display */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Icon name="warning" size={16} color={NSD_COLORS.semantic.critical.text} />
            <span style={{ fontSize: '13px', color: NSD_COLORS.semantic.critical.text }}>{error}</span>
          </div>
        )}

        {/* Pending status - show action buttons */}
        {isPending && (
          <>
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: NSD_COLORS.semantic.attention.bg,
                borderRadius: NSD_RADIUS.md,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
              <Icon name="clock" size={18} color={NSD_COLORS.semantic.attention.text} />
            </span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: 500,
                    color: NSD_COLORS.semantic.attention.text,
                  }}
                >
                  Awaiting Approval
                </p>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: '13px',
                    color: NSD_COLORS.semantic.attention.text,
                    opacity: 0.9,
                  }}
                >
                  This lead requires explicit approval before it can be included in outreach.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="primary"
                icon="check"
                onClick={() => handleActionClick('approve')}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                icon="close"
                onClick={() => handleActionClick('reject')}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                Reject
              </Button>
            </div>

            {/* Governance note */}
            <p
              style={{
                margin: '16px 0 0 0',
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
                textAlign: 'center',
              }}
            >
              Approval decisions are recorded in the governance audit log.
            </p>
          </>
        )}

        {/* Approved status */}
        {isApproved && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: NSD_COLORS.semantic.positive.bg,
              borderRadius: NSD_RADIUS.md,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
              <Icon name="check" size={18} color={NSD_COLORS.semantic.positive.text} />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: NSD_COLORS.semantic.positive.text,
                }}
              >
                Approved for Outreach
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: NSD_COLORS.semantic.positive.text,
                  opacity: 0.9,
                }}
              >
                This lead is eligible for campaign execution.
                {statusUpdatedAt && (
                  <> Approved {new Date(statusUpdatedAt).toLocaleString()}</>
                )}
                {statusUpdatedBy && <> by {statusUpdatedBy}</>}
              </p>
            </div>
          </div>
        )}

        {/* Rejected status */}
        {isRejected && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              borderRadius: NSD_RADIUS.md,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
              <Icon name="close" size={18} color={NSD_COLORS.semantic.critical.text} />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: NSD_COLORS.semantic.critical.text,
                }}
              >
                Rejected
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: NSD_COLORS.semantic.critical.text,
                  opacity: 0.9,
                }}
              >
                This lead will not be included in campaign outreach.
                {statusUpdatedAt && (
                  <> Rejected {new Date(statusUpdatedAt).toLocaleString()}</>
                )}
                {statusUpdatedBy && <> by {statusUpdatedBy}</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ApprovalConfirmationModal
        isOpen={pendingAction !== null}
        action={pendingAction || 'approve'}
        leadCount={1}
        leadIdentifier={leadIdentifier}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
