/**
 * ExecutionTimeline Component
 * 
 * DECISION-FIRST UX:
 * Timeline-based execution skeleton showing campaign stages.
 * Replaces empty pipeline funnels with a clear sequence view.
 * 
 * PRINCIPLES:
 * - Future stages render as "Not started" (not as warnings)
 * - No warnings for zero activity before execution
 * - Communicates sequence, not metrics
 * - No backend jargon
 * 
 * POST-EXECUTION ENHANCEMENTS:
 * - Visually compress completed stages
 * - Highlight terminal stage (Completed / Stopped / Failed)
 * - Show per-stage duration if available
 * - Maintain neutral tone; no red styling unless truly exceptional
 * 
 * STAGES:
 * 1. Approval
 * 2. Organization Sourcing
 * 3. Contact Discovery
 * 4. Lead Promotion
 * 5. Outreach
 * 6. Outcomes
 */

'use client';

import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export type ExecutionStageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'terminal';

export interface ExecutionStage {
  id: string;
  label: string;
  description: string;
  status: ExecutionStageStatus;
  icon: string;
  /** Optional: Count of items processed at this stage */
  count?: number;
  /** Optional: Timestamp when stage completed */
  completedAt?: string;
  /** Optional: Duration in seconds */
  durationSeconds?: number;
}

interface ExecutionTimelineProps {
  /** Current campaign phase - controls what is shown */
  hasStartedExecution: boolean;
  /** Is execution complete (allows retrospective view) */
  isExecutionComplete?: boolean;
  /** Terminal outcome: 'completed' | 'stopped' | 'failed' */
  terminalOutcome?: 'completed' | 'stopped' | 'failed';
  /** Terminal reason (for stopped/failed) */
  terminalReason?: string;
  /** Custom stages override (optional) */
  stages?: ExecutionStage[];
  /** Current active stage ID (optional) */
  currentStageId?: string;
  /** Whether to show compact view */
  compact?: boolean;
}

// Default stage configuration
const DEFAULT_STAGES: Omit<ExecutionStage, 'status'>[] = [
  {
    id: 'approval',
    label: 'Approval',
    description: 'Governance approval for campaign execution',
    icon: 'check',
  },
  {
    id: 'sourcing',
    label: 'Organization Sourcing',
    description: 'Identifying target organizations from market',
    icon: 'building',
  },
  {
    id: 'discovery',
    label: 'Contact Discovery',
    description: 'Finding contacts within target organizations',
    icon: 'users',
  },
  {
    id: 'promotion',
    label: 'Lead Promotion',
    description: 'Qualifying contacts as actionable leads',
    icon: 'trending',
  },
  {
    id: 'outreach',
    label: 'Outreach',
    description: 'Engaging leads with personalized messaging',
    icon: 'mail',
  },
  {
    id: 'outcomes',
    label: 'Outcomes',
    description: 'Tracking responses and conversions',
    icon: 'chart',
  },
];

function getStatusConfig(status: ExecutionStageStatus, terminalOutcome?: string) {
  switch (status) {
    case 'completed':
      return {
        bgColor: NSD_COLORS.semantic.positive.bg,
        borderColor: NSD_COLORS.semantic.positive.border,
        iconColor: NSD_COLORS.semantic.positive.text,
        textColor: NSD_COLORS.text.primary,
        statusLabel: 'Complete',
      };
    case 'in_progress':
      return {
        bgColor: NSD_COLORS.semantic.active.bg,
        borderColor: NSD_COLORS.semantic.active.border,
        iconColor: NSD_COLORS.semantic.active.text,
        textColor: NSD_COLORS.text.primary,
        statusLabel: 'In Progress',
      };
    case 'skipped':
      return {
        bgColor: NSD_COLORS.semantic.muted.bg,
        borderColor: NSD_COLORS.semantic.muted.border,
        iconColor: NSD_COLORS.text.muted,
        textColor: NSD_COLORS.text.muted,
        statusLabel: 'Skipped',
      };
    case 'terminal':
      // Terminal stage styling based on outcome
      if (terminalOutcome === 'stopped') {
        return {
          bgColor: NSD_COLORS.semantic.attention.bg,
          borderColor: NSD_COLORS.semantic.attention.border,
          iconColor: NSD_COLORS.semantic.attention.text,
          textColor: NSD_COLORS.semantic.attention.text,
          statusLabel: 'Stopped',
        };
      } else if (terminalOutcome === 'failed') {
        return {
          bgColor: NSD_COLORS.semantic.critical.bg,
          borderColor: NSD_COLORS.semantic.critical.border,
          iconColor: NSD_COLORS.semantic.critical.text,
          textColor: NSD_COLORS.semantic.critical.text,
          statusLabel: 'Failed',
        };
      }
      return {
        bgColor: NSD_COLORS.semantic.positive.bg,
        borderColor: NSD_COLORS.semantic.positive.border,
        iconColor: NSD_COLORS.semantic.positive.text,
        textColor: NSD_COLORS.semantic.positive.text,
        statusLabel: 'Completed',
      };
    case 'not_started':
    default:
      return {
        bgColor: NSD_COLORS.surface,
        borderColor: NSD_COLORS.border.light,
        iconColor: NSD_COLORS.text.muted,
        textColor: NSD_COLORS.text.muted,
        statusLabel: 'Not Started',
      };
  }
}

/**
 * Format duration for display
 */
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function TimelineStage({ 
  stage, 
  isLast, 
  compact,
  isRetrospective,
  terminalOutcome,
}: { 
  stage: ExecutionStage; 
  isLast: boolean;
  compact: boolean;
  isRetrospective: boolean;
  terminalOutcome?: string;
}) {
  const config = getStatusConfig(stage.status, terminalOutcome);
  const duration = formatDuration(stage.durationSeconds);
  
  // In retrospective view, compress completed stages
  const isCompressed = isRetrospective && stage.status === 'completed' && !isLast;
  const effectiveCompact = compact || isCompressed;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Timeline connector */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginRight: '16px',
      }}>
        {/* Stage Icon Circle */}
        <div style={{
          width: effectiveCompact ? '32px' : '40px',
          height: effectiveCompact ? '32px' : '40px',
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          // Highlight terminal stage
          boxShadow: stage.status === 'terminal' ? `0 0 0 3px ${config.borderColor}40` : undefined,
        }}>
          <Icon 
            name={stage.status === 'completed' ? 'check' : 
                  stage.status === 'terminal' && terminalOutcome === 'stopped' ? 'warning' :
                  stage.status === 'terminal' && terminalOutcome === 'failed' ? 'warning' :
                  stage.status === 'terminal' ? 'check' :
                  (stage.icon as any)} 
            size={effectiveCompact ? 14 : 18} 
            color={config.iconColor} 
          />
        </div>
        {/* Connector Line */}
        {!isLast && (
          <div style={{
            width: '2px',
            height: effectiveCompact ? '16px' : '32px',
            backgroundColor: stage.status === 'completed' || stage.status === 'terminal'
              ? NSD_COLORS.semantic.positive.border 
              : NSD_COLORS.border.light,
          }} />
        )}
      </div>

      {/* Stage Content */}
      <div style={{ 
        flex: 1, 
        paddingBottom: isLast ? 0 : (effectiveCompact ? '8px' : '24px'),
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: effectiveCompact ? '0' : '4px',
        }}>
          <h4 style={{
            margin: 0,
            fontSize: effectiveCompact ? '13px' : '14px',
            fontWeight: stage.status === 'terminal' ? 700 : 600,
            color: config.textColor,
          }}>
            {stage.label}
          </h4>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {/* Duration (retrospective) */}
            {duration && isRetrospective && (
              <span style={{
                fontSize: '11px',
                color: NSD_COLORS.text.muted,
              }}>
                {duration}
              </span>
            )}
            {stage.count !== undefined && stage.count > 0 && (
              <span style={{
                fontSize: '12px',
                fontWeight: 600,
                color: NSD_COLORS.primary,
              }}>
                {stage.count.toLocaleString()}
              </span>
            )}
            <span style={{
              fontSize: '11px',
              fontWeight: 500,
              color: config.iconColor,
              padding: '2px 8px',
              backgroundColor: config.bgColor,
              borderRadius: NSD_RADIUS.full,
            }}>
              {config.statusLabel}
            </span>
          </div>
        </div>
        {!effectiveCompact && (
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.muted,
          }}>
            {stage.description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ExecutionTimeline({
  hasStartedExecution,
  isExecutionComplete = false,
  terminalOutcome,
  terminalReason,
  stages,
  currentStageId,
  compact = false,
}: ExecutionTimelineProps) {
  // Determine if we're in retrospective view (execution complete)
  const isRetrospective = isExecutionComplete;

  // Use provided stages or generate defaults
  const displayStages: ExecutionStage[] = stages || DEFAULT_STAGES.map((s, index) => {
    let status: ExecutionStageStatus = 'not_started';
    
    if (hasStartedExecution) {
      // If execution has started, mark approval as completed
      if (s.id === 'approval') {
        status = 'completed';
      } else if (isExecutionComplete) {
        // In retrospective view, mark all stages as completed
        // except the last one which is terminal
        if (index === DEFAULT_STAGES.length - 1) {
          status = 'terminal';
        } else {
          status = 'completed';
        }
      } else if (currentStageId) {
        const currentIndex = DEFAULT_STAGES.findIndex(ds => ds.id === currentStageId);
        const stageIndex = index;
        if (stageIndex < currentIndex) {
          status = 'completed';
        } else if (stageIndex === currentIndex) {
          status = 'in_progress';
        }
      }
    }
    
    return { ...s, status };
  });

  // Get header styling based on outcome
  const getHeaderConfig = () => {
    if (!isExecutionComplete) {
      return {
        bg: NSD_COLORS.semantic.info.bg,
        text: NSD_COLORS.semantic.info.text,
        subtitle: hasStartedExecution 
          ? 'Campaign execution progress' 
          : 'Stages that will execute when campaign runs',
      };
    }
    switch (terminalOutcome) {
      case 'stopped':
        return {
          bg: NSD_COLORS.semantic.attention.bg,
          text: NSD_COLORS.semantic.attention.text,
          subtitle: 'Execution was stopped before completion',
        };
      case 'failed':
        return {
          bg: NSD_COLORS.semantic.critical.bg,
          text: NSD_COLORS.semantic.critical.text,
          subtitle: 'Execution encountered an error',
        };
      default:
        return {
          bg: NSD_COLORS.semantic.positive.bg,
          text: NSD_COLORS.semantic.positive.text,
          subtitle: 'Execution completed successfully',
        };
    }
  };

  const headerConfig = getHeaderConfig();

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
        justifyContent: 'space-between',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: NSD_RADIUS.md,
            backgroundColor: headerConfig.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="timeline" size={18} color={headerConfig.text} />
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}>
              Execution Timeline
            </h3>
            <p style={{
              margin: '2px 0 0 0',
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}>
              {headerConfig.subtitle}
            </p>
          </div>
        </div>
        {/* Retrospective badge */}
        {isRetrospective && (
          <span style={{
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: headerConfig.bg,
            color: headerConfig.text,
            borderRadius: NSD_RADIUS.full,
          }}>
            {terminalOutcome === 'stopped' ? 'Stopped' : 
             terminalOutcome === 'failed' ? 'Failed' : 'Completed'}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div>
        {displayStages.map((stage, index) => (
          <TimelineStage
            key={stage.id}
            stage={stage}
            isLast={index === displayStages.length - 1}
            compact={compact}
            isRetrospective={isRetrospective}
            terminalOutcome={terminalOutcome}
          />
        ))}
      </div>

      {/* Terminal reason (if stopped/failed) */}
      {isRetrospective && terminalReason && (terminalOutcome === 'stopped' || terminalOutcome === 'failed') && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: terminalOutcome === 'failed' 
            ? NSD_COLORS.semantic.critical.bg 
            : NSD_COLORS.semantic.attention.bg,
          borderRadius: NSD_RADIUS.md,
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: terminalOutcome === 'failed' 
              ? NSD_COLORS.semantic.critical.text 
              : NSD_COLORS.semantic.attention.text,
          }}>
            <strong>Reason:</strong> {terminalReason}
          </p>
        </div>
      )}

      {/* Pre-execution message */}
      {!hasStartedExecution && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          backgroundColor: NSD_COLORS.semantic.muted.bg,
          borderRadius: NSD_RADIUS.md,
        }}>
          <p style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.text.secondary,
            textAlign: 'center',
          }}>
            This timeline will update as the campaign executes through each stage.
          </p>
        </div>
      )}
    </div>
  );
}

export default ExecutionTimeline;
