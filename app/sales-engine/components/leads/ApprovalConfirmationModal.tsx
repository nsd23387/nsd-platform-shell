/**
 * ApprovalConfirmationModal Component
 * 
 * Confirmation modal for lead approval/rejection actions.
 * 
 * GOVERNANCE REQUIREMENTS:
 * - Confirmation modal required for all approval actions
 * - Shows clear action description
 * - No auto-approval - user must explicitly confirm
 * - Backend semantics win - UI reflects, does not control
 */

'use client';

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import type { LeadApprovalAction } from '../../types/campaign';

export interface ApprovalConfirmationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** The action being confirmed */
  action: LeadApprovalAction;
  /** Number of leads being affected (for bulk actions) */
  leadCount: number;
  /** Lead name/email for single lead actions */
  leadIdentifier?: string;
  /** Whether the action is in progress */
  isLoading?: boolean;
  /** Callback when user confirms the action */
  onConfirm: () => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Get modal content based on action type.
 */
function getActionContent(action: LeadApprovalAction, leadCount: number, leadIdentifier?: string): {
  title: string;
  description: string;
  confirmLabel: string;
  icon: string;
  iconColor: string;
  variant: 'primary' | 'danger';
} {
  const isBulk = leadCount > 1;
  const target = isBulk ? `${leadCount} leads` : (leadIdentifier || 'this lead');

  if (action === 'approve') {
    return {
      title: isBulk ? 'Approve Leads' : 'Approve Lead',
      description: `You are about to approve ${target} for outreach. Approved leads become eligible for campaign execution.`,
      confirmLabel: isBulk ? `Approve ${leadCount} Leads` : 'Approve Lead',
      icon: 'check',
      iconColor: NSD_COLORS.success,
      variant: 'primary',
    };
  } else {
    return {
      title: isBulk ? 'Reject Leads' : 'Reject Lead',
      description: `You are about to reject ${target}. Rejected leads will not be included in campaign outreach.`,
      confirmLabel: isBulk ? `Reject ${leadCount} Leads` : 'Reject Lead',
      icon: 'close',
      iconColor: NSD_COLORS.error,
      variant: 'danger',
    };
  }
}

/**
 * ApprovalConfirmationModal - Requires explicit user confirmation.
 * 
 * Rules:
 * - Always shown before approve/reject actions
 * - Clear description of what will happen
 * - Distinct styling for approve vs reject
 * - Loading state during action execution
 */
export function ApprovalConfirmationModal({
  isOpen,
  action,
  leadCount,
  leadIdentifier,
  isLoading = false,
  onConfirm,
  onCancel,
}: ApprovalConfirmationModalProps) {
  if (!isOpen) return null;

  const content = getActionContent(action, leadCount, leadIdentifier);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={isLoading ? undefined : onCancel}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: NSD_COLORS.background,
            borderRadius: NSD_RADIUS.lg,
            padding: '32px',
            maxWidth: '420px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: action === 'approve' ? '#D1FAE5' : '#FEE2E2',
              margin: '0 auto 20px',
            }}
          >
            <Icon name={content.icon as any} size={28} color={content.iconColor} />
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 12px 0',
              fontSize: '20px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
              textAlign: 'center',
            }}
          >
            {content.title}
          </h2>

          {/* Description */}
          <p
            style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: NSD_COLORS.text.secondary,
              textAlign: 'center',
              lineHeight: 1.6,
            }}
          >
            {content.description}
          </p>

          {/* Info notice */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
              <Icon name="info" size={16} color={NSD_COLORS.info} />
            </span>
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: NSD_COLORS.text.secondary,
                lineHeight: 1.5,
              }}
            >
              This action is recorded in the governance audit log. 
              Approval decisions are managed by backend systems.
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={content.variant}
              onClick={onConfirm}
              loading={isLoading}
              disabled={isLoading}
            >
              {content.confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
