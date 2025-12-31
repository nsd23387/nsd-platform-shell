'use client';

import Link from 'next/link';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { CampaignGovernanceState } from '../../lib/campaign-state';
import { getPrimaryAction, getGovernanceStateLabel } from '../../lib/campaign-state';
import { READ_ONLY_MESSAGE } from '../../lib/read-only-guard';
import { CampaignStateBadge } from './CampaignStateBadge';

interface GovernanceActionsPanelProps {
  campaignId: string;
  governanceState: CampaignGovernanceState;
  canSubmit?: boolean;
  canApprove?: boolean;
  onSubmitForApproval?: () => void;
  submitting?: boolean;
  runsCount?: number;
}

/**
 * GovernanceActionsPanel - Displays governance-gated actions.
 * 
 * Per target-state constraints:
 * - No "Run/Start/Launch" buttons
 * - Primary action is "Submit for Approval" when in DRAFT
 * - Other states show read-only status with explanations
 * - Execution is observed, not initiated
 */
export function GovernanceActionsPanel({
  campaignId,
  governanceState,
  canSubmit = false,
  canApprove = false,
  onSubmitForApproval,
  submitting = false,
  runsCount = 0,
}: GovernanceActionsPanelProps) {
  const primaryAction = getPrimaryAction(governanceState, canSubmit, canApprove);

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
        <CampaignStateBadge state={governanceState} size="sm" />
      </div>

      <div style={{ padding: '20px' }}>
        {/* Primary action area */}
        <div
          style={{
            padding: '16px',
            backgroundColor: NSD_COLORS.surface,
            borderRadius: NSD_RADIUS.md,
            marginBottom: '16px',
          }}
        >
          {governanceState === 'DRAFT' && canSubmit ? (
            <>
              <button
                onClick={onSubmitForApproval}
                disabled={submitting}
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
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
              <p
                style={{
                  margin: '10px 0 0 0',
                  fontSize: '12px',
                  color: NSD_COLORS.text.muted,
                  textAlign: 'center',
                }}
              >
                {primaryAction.explanation}
              </p>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: primaryAction.disabled ? NSD_COLORS.text.muted : NSD_COLORS.text.primary,
                }}
              >
                {primaryAction.label}
              </p>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13px',
                  color: NSD_COLORS.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                {primaryAction.explanation}
              </p>
            </div>
          )}
        </div>

        {/* State-specific content */}
        {governanceState === 'PENDING_APPROVAL' && (
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: '#DBEAFE',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              border: '1px solid #93C5FD',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>⏳</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#1E40AF' }}>
                  Awaiting Governance Review
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#1E40AF', opacity: 0.9, lineHeight: 1.5 }}>
                  This campaign has been submitted for approval. You will be notified when a decision is made.
                  No actions are available until the review is complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {governanceState === 'BLOCKED' && (
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: '#FEE2E2',
              borderRadius: NSD_RADIUS.md,
              marginBottom: '16px',
              border: '1px solid #FECACA',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>⊘</span>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#991B1B' }}>
                  Campaign Blocked
                </p>
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#991B1B', opacity: 0.9, lineHeight: 1.5 }}>
                  This campaign cannot proceed due to governance or readiness issues.
                  Review the blocking reasons and resolve them before resubmitting.
                </p>
              </div>
            </div>
          </div>
        )}

        {(governanceState === 'APPROVED_READY' || governanceState === 'EXECUTED_READ_ONLY') && (
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
              marginBottom: '16px',
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

        {/* Read-only notice */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#EFF6FF',
            borderRadius: NSD_RADIUS.md,
            border: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '14px' }}>ℹ️</span>
          <div>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#1E40AF' }}>
              Read-Only UI
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#1E40AF', opacity: 0.9, lineHeight: 1.5 }}>
              {READ_ONLY_MESSAGE}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GovernanceActionsPanel;
