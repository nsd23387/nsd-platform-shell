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

export type ExecutionStageStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

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
}

interface ExecutionTimelineProps {
  /** Current campaign phase - controls what is shown */
  hasStartedExecution: boolean;
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

function getStatusConfig(status: ExecutionStageStatus) {
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

function TimelineStage({ 
  stage, 
  isLast, 
  compact 
}: { 
  stage: ExecutionStage; 
  isLast: boolean;
  compact: boolean;
}) {
  const config = getStatusConfig(stage.status);

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
          width: compact ? '32px' : '40px',
          height: compact ? '32px' : '40px',
          borderRadius: '50%',
          backgroundColor: config.bgColor,
          border: `2px solid ${config.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon 
            name={stage.status === 'completed' ? 'check' : (stage.icon as any)} 
            size={compact ? 14 : 18} 
            color={config.iconColor} 
          />
        </div>
        {/* Connector Line */}
        {!isLast && (
          <div style={{
            width: '2px',
            height: compact ? '24px' : '32px',
            backgroundColor: stage.status === 'completed' 
              ? NSD_COLORS.semantic.positive.border 
              : NSD_COLORS.border.light,
          }} />
        )}
      </div>

      {/* Stage Content */}
      <div style={{ 
        flex: 1, 
        paddingBottom: isLast ? 0 : (compact ? '16px' : '24px'),
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px',
        }}>
          <h4 style={{
            margin: 0,
            fontSize: compact ? '13px' : '14px',
            fontWeight: 600,
            color: config.textColor,
          }}>
            {stage.label}
          </h4>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
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
        {!compact && (
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
  stages,
  currentStageId,
  compact = false,
}: ExecutionTimelineProps) {
  // Use provided stages or generate defaults
  const displayStages: ExecutionStage[] = stages || DEFAULT_STAGES.map((s, index) => {
    let status: ExecutionStageStatus = 'not_started';
    
    if (hasStartedExecution) {
      // If execution has started, mark approval as completed
      if (s.id === 'approval') {
        status = 'completed';
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
            backgroundColor: NSD_COLORS.semantic.info.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="timeline" size={18} color={NSD_COLORS.semantic.info.text} />
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
              {hasStartedExecution 
                ? 'Campaign execution progress' 
                : 'Stages that will execute when campaign runs'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        {displayStages.map((stage, index) => (
          <TimelineStage
            key={stage.id}
            stage={stage}
            isLast={index === displayStages.length - 1}
            compact={compact}
          />
        ))}
      </div>

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
