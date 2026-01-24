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
  /** Whether the campaign can be re-run (failed/stopped state) */
  canRerun?: boolean;
  /** Whether the campaign can be run right now */
  canRun?: boolean;
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
  /** Is revert to draft in progress */
  isReverting?: boolean;
  /** Optional message about run request */
  runRequestMessage?: string | null;
  /** Show "Edit Configuration" instead of "Edit" (for non-draft campaigns) */
  showEditConfiguration?: boolean;
}

function CheckItem({ check }: { check: DecisionCheck }) {
  const [showExplanation, setShowExplanation] = useState(false);
  
  const getStatusConfig = (status: DecisionCheck['status']) => {
    switch (status) {
      case 'pass':
        return { icon: 'check', color: NSD_COLORS.semantic.positive.text, borderColor: NSD_COLORS.semantic.positive.text };
      case 'pending':
        return { icon: 'clock', color: NSD_COLORS.semantic.attention.text, borderColor: NSD_COLORS.semantic.attention.text };
      case 'fail':
        return { icon: 'warning', color: NSD_COLORS.semantic.critical.text, borderColor: NSD_COLORS.semantic.critical.text };
      case 'not_applicable':
        return { icon: 'minus', color: NSD_COLORS.text.muted, borderColor: NSD_COLORS.border.light };
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
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderLeft: `3px solid ${config.borderColor}`,
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
          backgroundColor: '#F9FAFB',
          borderRadius: `0 0 ${NSD_RADIUS.md} ${NSD_RADIUS.md}`,
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          borderLeft: `3px solid ${config.borderColor}`,
        }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            color: NSD_COLORS.text.secondary,
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
  canRerun = false,
  canRun = false,
  runIntent,
  outcomeType,
  onRunCampaign,
  onEdit,
  onDuplicate,
  isRunRequesting = false,
  isDuplicating = false,
  isReverting = false,
  runRequestMessage,
  showEditConfiguration = false,
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

  // Determine primary action state
  const isComplete = phase === 'completed';
  const isStopped = phase === 'stopped';
  const isFailed = phase === 'failed';

  // Determine why the button might be disabled
  const getDisabledReason = (): string | null => {
    if (isRunRequesting) return 'Starting campaign...';
    if (isRunning) return 'Campaign is currently running';
    if (isComplete && !canRerun) return 'Campaign completed successfully';
    // For failed/stopped/cancelled, we allow re-run so don't show as disabled reason
    if (hasRun && !canRerun) return 'Campaign has already been executed';
    if (!isApproved) return 'Awaiting governance approval';
    if (!isExecutionReady) return 'Campaign not ready for execution';
    if (isPlanningOnly) return 'Planning-only mode - disable to execute';
    return null;
  };

  const disabledReason = getDisabledReason();
  
  // Always show run button for approved campaigns (visible but may be disabled)
  const showRunButton = isApproved && onRunCampaign;
  const isRunDisabled = !canRun || isRunRequesting;
  
  // Update button label for re-run scenario
  const getRunButtonLabel = () => {
    if (isRunRequesting) return 'Starting...';
    if (canRerun) return runIntent === 'HARVEST_ONLY' ? 'Re-run (Harvest Only)' : 'Re-run Campaign';
    return runIntent === 'HARVEST_ONLY' ? 'Run (Harvest Only)' : 'Run Campaign';
  };
  const runButtonLabel = getRunButtonLabel();

  // Use decision context for status message
  const statusMessage = decisionContext.reason;
  const nextStep = decisionContext.nextStep;

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: NSD_RADIUS.lg,
      border: '1px solid #E5E7EB',
      borderLeft: `4px solid ${NSD_COLORS.magenta.base}`,
      padding: 'clamp(16px, 4vw, 24px)',
      marginBottom: '24px',
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
          backgroundColor: '#F9FAFB',
          border: `1px solid ${NSD_COLORS.primary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon name="campaigns" size={18} color={NSD_COLORS.primary} />
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

      {/* Checks Grid - stacks on mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderLeft: `3px solid ${decisionContext.isBlocked ? NSD_COLORS.magenta.base : NSD_COLORS.border.default}`,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.primary,
          }}>
            {statusMessage}
          </p>
          {nextStep && (
            <p style={{
              margin: '6px 0 0 0',
              fontSize: '12px',
              color: decisionContext.isBlocked 
                ? NSD_COLORS.magenta.base 
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
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderLeft: `3px solid ${runRequestMessage.includes('success') || runRequestMessage.includes('started') 
            ? NSD_COLORS.violet.base 
            : NSD_COLORS.magenta.base}`,
          borderRadius: NSD_RADIUS.md,
          marginBottom: '16px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.primary,
          }}>
            {runRequestMessage}
          </p>
        </div>
      )}

      {/* Actions - wraps on mobile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        {/* Primary Action - Run Campaign Button */}
        {showRunButton && (
          <button
            onClick={canRun ? onRunCampaign : undefined}
            disabled={isRunDisabled}
            title={disabledReason || 'Click to run campaign'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              backgroundColor: isRunDisabled ? '#9CA3AF' : NSD_COLORS.magenta.base,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: NSD_RADIUS.md,
              cursor: isRunDisabled ? 'not-allowed' : 'pointer',
              opacity: isRunDisabled ? 0.7 : 1,
              transition: 'all 0.15s ease',
              boxShadow: isRunDisabled ? 'none' : '0 2px 8px rgba(190, 24, 93, 0.3)',
            }}
          >
            <Icon name={isRunRequesting ? 'clock' : 'play'} size={18} color="#FFFFFF" />
            {runButtonLabel}
          </button>
        )}
        
        {/* Show disabled reason inline when button is disabled */}
        {showRunButton && isRunDisabled && disabledReason && (
          <span style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
            fontStyle: 'italic',
          }}>
            {disabledReason}
          </span>
        )}

        {/* Secondary Actions (de-emphasized) */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {onEdit && (
            <button
              onClick={onEdit}
              disabled={isReverting}
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
                cursor: isReverting ? 'not-allowed' : 'pointer',
                opacity: isReverting ? 0.6 : 1,
              }}
            >
              <Icon name="edit" size={14} color={NSD_COLORS.text.secondary} />
              {isReverting ? 'Preparing...' : (showEditConfiguration ? 'Edit Configuration' : 'Edit')}
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
