/**
 * DecisionSummaryPanel Component
 * 
 * DECISION-FIRST UX:
 * This card answers the question: "Should I act right now?"
 * 
 * PRINCIPLES:
 * - Only ONE primary CTA is allowed
 * - Secondary actions are visually de-emphasized
 * - If no action is possible, the UI feels "complete", not blocked
 * - No backend jargon exposed to operators
 * 
 * REQUIRED FIELDS:
 * - Governance approval status
 * - Execution readiness
 * - Safety checks
 * - Execution mode
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignPhase } from './PrimaryCampaignStatusBanner';
import type { RunIntent } from '../../lib/api';

interface DecisionCheck {
  label: string;
  status: 'pass' | 'pending' | 'fail' | 'not_applicable';
  detail?: string;
}

interface DecisionSummaryPanelProps {
  /** Current campaign phase */
  phase: CampaignPhase;
  /** Governance approval status */
  isApproved: boolean;
  /** Is the campaign ready to execute */
  isExecutionReady: boolean;
  /** Safety checks pass/fail */
  safetyChecksPassed: boolean;
  /** Current execution mode (planning only, executable) */
  isPlanningOnly: boolean;
  /** Whether a run is currently in progress */
  isRunning: boolean;
  /** Optional: Current run intent */
  runIntent?: RunIntent;
  /** Handler for run campaign action */
  onRunCampaign?: () => void;
  /** Handler for edit action */
  onEdit?: () => void;
  /** Handler for duplicate action */
  onDuplicate?: () => void;
  /** Is a run being requested */
  isRunRequesting?: boolean;
  /** Is duplicate in progress */
  isDuplicating?: boolean;
  /** Optional message about run request */
  runRequestMessage?: string | null;
}

function CheckItem({ check }: { check: DecisionCheck }) {
  const getStatusConfig = (status: DecisionCheck['status']) => {
    switch (status) {
      case 'pass':
        return { icon: 'check', color: NSD_COLORS.semantic.positive.text, bg: NSD_COLORS.semantic.positive.bg };
      case 'pending':
        return { icon: 'clock', color: NSD_COLORS.semantic.attention.text, bg: NSD_COLORS.semantic.attention.bg };
      case 'fail':
        return { icon: 'warning', color: NSD_COLORS.semantic.critical.text, bg: NSD_COLORS.semantic.critical.bg };
      case 'not_applicable':
        return { icon: 'minus', color: NSD_COLORS.text.muted, bg: NSD_COLORS.semantic.muted.bg };
    }
  };

  const config = getStatusConfig(check.status);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: config.bg,
      borderRadius: NSD_RADIUS.md,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Icon name={config.icon as any} size={16} color={config.color} />
        <span style={{
          fontSize: '14px',
          fontWeight: 500,
          color: NSD_COLORS.text.primary,
        }}>
          {check.label}
        </span>
      </div>
      {check.detail && (
        <span style={{
          fontSize: '12px',
          color: config.color,
          fontWeight: 500,
        }}>
          {check.detail}
        </span>
      )}
    </div>
  );
}

export function DecisionSummaryPanel({
  phase,
  isApproved,
  isExecutionReady,
  safetyChecksPassed,
  isPlanningOnly,
  isRunning,
  runIntent,
  onRunCampaign,
  onEdit,
  onDuplicate,
  isRunRequesting = false,
  isDuplicating = false,
  runRequestMessage,
}: DecisionSummaryPanelProps) {
  // Determine checks
  const checks: DecisionCheck[] = [
    {
      label: 'Governance Approval',
      status: isApproved ? 'pass' : 'pending',
      detail: isApproved ? 'Approved' : 'Pending',
    },
    {
      label: 'Execution Readiness',
      status: isRunning ? 'pass' : (isExecutionReady ? 'pass' : 'fail'),
      detail: isRunning ? 'In Progress' : (isExecutionReady ? 'Ready' : 'Blocked'),
    },
    {
      label: 'Safety Checks',
      status: safetyChecksPassed ? 'pass' : (phase === 'draft' ? 'not_applicable' : 'fail'),
      detail: safetyChecksPassed ? 'Pass' : (phase === 'draft' ? 'N/A' : 'Review Required'),
    },
    {
      label: 'Execution Mode',
      status: isPlanningOnly ? 'pending' : 'pass',
      detail: isPlanningOnly ? 'Planning Only' : 'Executable',
    },
  ];

  // Determine primary action
  const canRunCampaign = isApproved && isExecutionReady && !isRunning && !isPlanningOnly && onRunCampaign;
  const needsApproval = !isApproved && phase !== 'draft';
  const isComplete = phase === 'completed';
  const isFailed = phase === 'failed';

  // Action button configuration
  let primaryActionLabel: string | null = null;
  let primaryActionHandler: (() => void) | undefined = undefined;
  let primaryActionDisabled = false;

  if (canRunCampaign && !isRunRequesting) {
    primaryActionLabel = runIntent === 'HARVEST_ONLY' ? 'Run (Harvest Only)' : 'Run Campaign';
    primaryActionHandler = onRunCampaign;
  } else if (isRunRequesting) {
    primaryActionLabel = 'Starting...';
    primaryActionDisabled = true;
  }

  // Status message for no-action states
  let statusMessage: string | null = null;
  if (isComplete) {
    statusMessage = 'This campaign has completed. Review results below.';
  } else if (isRunning) {
    statusMessage = 'Execution is in progress. Results will appear as stages complete.';
  } else if (needsApproval) {
    statusMessage = 'Awaiting governance approval before execution can proceed.';
  } else if (isPlanningOnly) {
    statusMessage = 'Campaign is in planning mode. Disable planning-only mode to enable execution.';
  } else if (isFailed) {
    statusMessage = 'Execution encountered an issue. Review the results and consider re-running.';
  }

  return (
    <div style={{
      backgroundColor: NSD_COLORS.background,
      borderRadius: NSD_RADIUS.lg,
      border: `1px solid ${NSD_COLORS.border.light}`,
      padding: '24px',
      marginBottom: '24px',
      boxShadow: NSD_SHADOWS.sm,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: NSD_RADIUS.md,
          backgroundColor: NSD_COLORS.semantic.info.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name="campaigns" size={18} color={NSD_COLORS.semantic.info.text} />
        </div>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: NSD_COLORS.text.primary,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          }}>
            Decision Summary
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
          }}>
            Should I act right now?
          </p>
        </div>
      </div>

      {/* Checks Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '20px',
      }}>
        {checks.map((check, index) => (
          <CheckItem key={index} check={check} />
        ))}
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: NSD_COLORS.semantic.muted.bg,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
          }}>
            {statusMessage}
          </p>
        </div>
      )}

      {/* Run Request Message */}
      {runRequestMessage && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: runRequestMessage.includes('success') || runRequestMessage.includes('started') 
            ? NSD_COLORS.semantic.positive.bg 
            : NSD_COLORS.semantic.critical.bg,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: runRequestMessage.includes('success') || runRequestMessage.includes('started')
              ? NSD_COLORS.semantic.positive.text
              : NSD_COLORS.semantic.critical.text,
          }}>
            {runRequestMessage}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Primary Action */}
        {primaryActionLabel && (
          <button
            onClick={primaryActionHandler}
            disabled={primaryActionDisabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: primaryActionDisabled ? NSD_COLORS.text.muted : NSD_COLORS.primary,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: NSD_RADIUS.md,
              cursor: primaryActionDisabled ? 'not-allowed' : 'pointer',
              opacity: primaryActionDisabled ? 0.6 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Icon name={primaryActionDisabled ? 'clock' : 'play'} size={16} color="#FFFFFF" />
            {primaryActionLabel}
          </button>
        )}

        {/* Secondary Actions (de-emphasized) */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: NSD_COLORS.text.secondary,
                border: `1px solid ${NSD_COLORS.border.default}`,
                borderRadius: NSD_RADIUS.md,
                cursor: 'pointer',
              }}
            >
              <Icon name="edit" size={14} color={NSD_COLORS.text.secondary} />
              Edit
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={onDuplicate}
              disabled={isDuplicating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: NSD_COLORS.text.secondary,
                border: `1px solid ${NSD_COLORS.border.default}`,
                borderRadius: NSD_RADIUS.md,
                cursor: isDuplicating ? 'not-allowed' : 'pointer',
                opacity: isDuplicating ? 0.6 : 1,
              }}
            >
              <Icon name="duplicate" size={14} color={NSD_COLORS.text.secondary} />
              {isDuplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DecisionSummaryPanel;
