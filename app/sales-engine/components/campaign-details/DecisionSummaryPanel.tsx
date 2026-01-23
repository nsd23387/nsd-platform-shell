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
 * - Blocked states include subtle "Why?" explanations
 * 
 * REQUIRED FIELDS:
 * - Governance approval status
 * - Execution readiness
 * - Safety checks
 * - Execution mode
 */

'use client';

import { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignPhase } from './PrimaryCampaignStatusBanner';
import type { RunIntent } from '../../lib/api';
import { getDecisionContext, type CampaignStatusKey } from '../../lib/status-copy';

interface DecisionCheck {
  label: string;
  status: 'pass' | 'pending' | 'fail' | 'not_applicable';
  detail?: string;
  /** Plain-English explanation for blocked/pending states */
  explanation?: string;
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
  /** Whether a run has already occurred */
  hasRun?: boolean;
  /** Optional: Current run intent */
  runIntent?: RunIntent;
  /** Optional: Outcome type from completed run */
  outcomeType?: string;
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
  const [showExplanation, setShowExplanation] = useState(false);
  
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
  const hasExplanation = check.explanation && (check.status === 'pending' || check.status === 'fail');

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: config.bg,
        borderRadius: showExplanation ? `${NSD_RADIUS.md} ${NSD_RADIUS.md} 0 0` : NSD_RADIUS.md,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {check.detail && (
            <span style={{
              fontSize: '12px',
              color: config.color,
              fontWeight: 500,
            }}>
              {check.detail}
            </span>
          )}
          {/* Why? affordance for blocked/pending states */}
          {hasExplanation && (
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: 'rgba(255,255,255,0.5)',
                color: config.color,
                border: 'none',
                borderRadius: NSD_RADIUS.sm,
                cursor: 'pointer',
              }}
              title="Why is this blocked?"
            >
              <Icon name="info" size={12} color={config.color} />
              {showExplanation ? 'Hide' : 'Why?'}
            </button>
          )}
        </div>
      </div>
      {/* Explanation panel */}
      {showExplanation && check.explanation && (
        <div style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: `0 0 ${NSD_RADIUS.md} ${NSD_RADIUS.md}`,
          borderTop: `1px solid ${config.color}20`,
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: config.color,
            lineHeight: 1.4,
          }}>
            {check.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Map CampaignPhase to CampaignStatusKey for context lookup.
 */
function phaseToStatusKey(phase: CampaignPhase): CampaignStatusKey {
  const mapping: Record<CampaignPhase, CampaignStatusKey> = {
    draft: 'DRAFT',
    pending_approval: 'PENDING_REVIEW',
    approved: 'RUNNABLE',
    running: 'RUNNING',
    completed: 'COMPLETED',
    stopped: 'STOPPED',
    failed: 'FAILED',
  };
  return mapping[phase] || 'DRAFT';
}

export function DecisionSummaryPanel({
  phase,
  isApproved,
  isExecutionReady,
  safetyChecksPassed,
  isPlanningOnly,
  isRunning,
  hasRun = false,
  runIntent,
  outcomeType,
  onRunCampaign,
  onEdit,
  onDuplicate,
  isRunRequesting = false,
  isDuplicating = false,
  runRequestMessage,
}: DecisionSummaryPanelProps) {
  // Get decision context for explanations
  const statusKey = phaseToStatusKey(phase);
  const decisionContext = getDecisionContext(statusKey, {
    isPlanningOnly,
    isApproved,
    hasRun,
    outcomeType,
  });

  // Determine checks with explanations
  const checks: DecisionCheck[] = [
    {
      label: 'Governance Approval',
      status: isApproved ? 'pass' : 'pending',
      detail: isApproved ? 'Approved' : 'Pending',
      explanation: !isApproved ? 'Campaign requires governance approval before execution can proceed. Contact your admin if approval is delayed.' : undefined,
    },
    {
      label: 'Execution Readiness',
      status: isRunning ? 'pass' : (isExecutionReady ? 'pass' : 'fail'),
      detail: isRunning ? 'In Progress' : (isExecutionReady ? 'Ready' : 'Blocked'),
      explanation: !isExecutionReady && !isRunning 
        ? 'Campaign configuration may be incomplete or requires review before execution.' 
        : undefined,
    },
    {
      label: 'Safety Checks',
      status: safetyChecksPassed ? 'pass' : (phase === 'draft' ? 'not_applicable' : 'fail'),
      detail: safetyChecksPassed ? 'Pass' : (phase === 'draft' ? 'N/A' : 'Review Required'),
      explanation: !safetyChecksPassed && phase !== 'draft' 
        ? 'Safety checks help ensure campaign quality. Review flagged items before proceeding.' 
        : undefined,
    },
    {
      label: 'Execution Mode',
      status: isPlanningOnly ? 'pending' : 'pass',
      detail: isPlanningOnly ? 'Planning Only' : 'Executable',
      explanation: isPlanningOnly 
        ? 'Campaign is in planning-only mode. This is useful for testing configuration without sending emails. Disable planning mode to enable full execution.' 
        : undefined,
    },
  ];

  // Determine primary action
  const canRunCampaign = isApproved && isExecutionReady && !isRunning && !isPlanningOnly && !hasRun && onRunCampaign;
  const isComplete = phase === 'completed';
  const isStopped = phase === 'stopped';
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

  // Use decision context for status message
  const statusMessage = decisionContext.reason;
  const nextStep = decisionContext.nextStep;

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

      {/* Status Message with Next Step */}
      {statusMessage && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: decisionContext.isBlocked 
            ? NSD_COLORS.semantic.attention.bg 
            : NSD_COLORS.semantic.muted.bg,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: decisionContext.isBlocked 
              ? NSD_COLORS.semantic.attention.text 
              : NSD_COLORS.text.secondary,
          }}>
            {statusMessage}
          </p>
          {nextStep && (
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: decisionContext.isBlocked 
                ? NSD_COLORS.semantic.attention.text 
                : NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}>
              Next step: {nextStep}
            </p>
          )}
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
