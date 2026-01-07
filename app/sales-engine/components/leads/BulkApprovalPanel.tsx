/**
 * BulkApprovalPanel Component
 * 
 * Panel for bulk approval of pending leads in a campaign.
 * 
 * GOVERNANCE REQUIREMENTS:
 * - "Approve all pending leads" button
 * - Visible only if pending leads exist
 * - Shows before/after counts
 * - Confirmation modal required
 * - No send/export buttons here
 * 
 * BACKEND ENFORCEMENT:
 * - Leads start as pending_approval
 * - Only approved leads can be sent/exported
 * - Bulk approval is an explicit action
 */

'use client';

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import { ApprovalConfirmationModal } from './ApprovalConfirmationModal';
import type { LeadApprovalCounts, LeadApprovalAction } from '../../types/campaign';

export interface BulkApprovalPanelProps {
  /** Campaign ID */
  campaignId: string;
  /** Current lead counts by approval status */
  counts: LeadApprovalCounts;
  /** Callback when bulk approval is performed */
  onBulkApproval: (campaignId: string, action: LeadApprovalAction) => Promise<{ processed: number; failed: number }>;
  /** Whether the panel is in a compact mode */
  compact?: boolean;
}

/**
 * BulkApprovalPanel - Bulk approval actions for campaign leads.
 * 
 * Rules:
 * - Only visible when pending_approval count > 0
 * - Shows current counts (pending, approved, rejected)
 * - "Approve all pending" button with confirmation
 * - Shows result after bulk action (success/failure counts)
 * - No scoring controls or send buttons
 */
export function BulkApprovalPanel({
  campaignId,
  counts,
  onBulkApproval,
  compact = false,
}: BulkApprovalPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasPendingLeads = counts.pending_approval > 0;

  const handleApproveAllClick = () => {
    setError(null);
    setResult(null);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await onBulkApproval(campaignId, 'approve');
      setResult(response);
      setShowConfirmation(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk approval failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  // Don't render if no pending leads
  if (!hasPendingLeads && !result) {
    return null;
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
          padding: compact ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="users" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: compact ? '13px' : '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Lead Approval
          </h4>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: compact ? '16px' : '20px' }}>
        {/* Error display */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Icon name="warning" size={16} color="#991B1B" />
            <span style={{ fontSize: '13px', color: '#991B1B' }}>{error}</span>
          </div>
        )}

        {/* Success result */}
        {result && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: result.failed === 0 ? '#D1FAE5' : '#FEF3C7',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex' }}>
              <Icon 
                name={result.failed === 0 ? 'check' : 'warning'} 
                size={18} 
                color={result.failed === 0 ? '#065F46' : '#92400E'} 
              />
            </span>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 500,
                  color: result.failed === 0 ? '#065F46' : '#92400E',
                }}
              >
                Bulk Approval Complete
              </p>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: result.failed === 0 ? '#065F46' : '#92400E',
                  opacity: 0.9,
                }}
              >
                {result.processed} lead{result.processed !== 1 ? 's' : ''} approved
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
            </div>
          </div>
        )}

        {/* Counts grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            marginBottom: hasPendingLeads ? '20px' : '0',
          }}
        >
          {/* Pending count */}
          <div
            style={{
              padding: '14px',
              backgroundColor: counts.pending_approval > 0 ? '#FEF3C7' : NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: counts.pending_approval > 0 ? '#92400E' : NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '4px',
              }}
            >
              Awaiting Approval
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: counts.pending_approval > 0 ? '#92400E' : NSD_COLORS.text.muted,
              }}
            >
              {counts.pending_approval}
            </span>
          </div>

          {/* Approved count */}
          <div
            style={{
              padding: '14px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '4px',
              }}
            >
              Approved
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: NSD_COLORS.semantic.positive.text,
              }}
            >
              {counts.approved}
            </span>
          </div>

          {/* Rejected count */}
          <div
            style={{
              padding: '14px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              textAlign: 'center',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 500,
                color: NSD_COLORS.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                marginBottom: '4px',
              }}
            >
              Rejected
            </span>
            <span
              style={{
                fontSize: '24px',
                fontWeight: 700,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: counts.rejected > 0 ? NSD_COLORS.semantic.critical.text : NSD_COLORS.text.muted,
              }}
            >
              {counts.rejected}
            </span>
          </div>
        </div>

        {/* Bulk approve button - only shown if pending leads exist */}
        {hasPendingLeads && (
          <>
            <Button
              variant="primary"
              icon="check"
              onClick={handleApproveAllClick}
              disabled={isLoading}
              style={{ width: '100%' }}
            >
              Approve All Pending Leads ({counts.pending_approval})
            </Button>

            {/* Governance note */}
            <p
              style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
                textAlign: 'center',
              }}
            >
              All {counts.pending_approval} pending leads will be approved for outreach.
            </p>
          </>
        )}

        {/* No pending leads message */}
        {!hasPendingLeads && !result && (
          <div
            style={{
              padding: '16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: NSD_RADIUS.md,
              textAlign: 'center',
            }}
          >
            <Icon name="check" size={24} color={NSD_COLORS.semantic.positive.text} />
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: NSD_COLORS.text.secondary,
              }}
            >
              No leads pending approval
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ApprovalConfirmationModal
        isOpen={showConfirmation}
        action="approve"
        leadCount={counts.pending_approval}
        isLoading={isLoading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
