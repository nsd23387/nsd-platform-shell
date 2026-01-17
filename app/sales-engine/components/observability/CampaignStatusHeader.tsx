'use client';

/**
 * CampaignStatusHeader Component
 * 
 * Above-the-fold context showing campaign status and execution state.
 * Answers: "What governance state is this campaign in?" and "What happened during execution?"
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - No status mutations
 * - Uses governance-first state mapping
 * 
 * Displays:
 * - Campaign name (prominent)
 * - Governance state badge
 * - Execution confidence badge (when applicable)
 * - Quick status summary
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { formatEt, getRelativeTime } from '../../lib/time';
import type { CampaignGovernanceState } from '../../lib/campaign-state';
import type { ExecutionConfidence } from '../../lib/execution-state-mapping';

interface CampaignStatusHeaderProps {
  campaignName: string;
  governanceState: CampaignGovernanceState;
  executionConfidence?: ExecutionConfidence;
  isPlanningOnly?: boolean;
  lastUpdatedAt?: string | null;
  isPolling?: boolean;
}

function getGovernanceDisplay(state: CampaignGovernanceState): {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (state) {
    case 'DRAFT':
      return {
        label: 'Draft',
        ...NSD_COLORS.semantic.muted,
        icon: 'edit',
      };
    case 'PENDING_APPROVAL':
      return {
        label: 'Pending Approval',
        ...NSD_COLORS.semantic.attention,
        icon: 'clock',
      };
    case 'APPROVED_READY':
      return {
        label: 'Approved',
        ...NSD_COLORS.semantic.positive,
        icon: 'check',
      };
    case 'BLOCKED':
      return {
        label: 'Blocked',
        ...NSD_COLORS.semantic.critical,
        icon: 'close',
      };
    case 'EXECUTED':
      return {
        label: 'Executed',
        ...NSD_COLORS.semantic.active,
        icon: 'play',
      };
    default:
      return {
        label: 'Unknown',
        ...NSD_COLORS.semantic.muted,
        icon: 'info',
      };
  }
}

function getExecutionDisplay(confidence: ExecutionConfidence): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (confidence) {
    case 'completed':
      return {
        label: 'Execution Completed',
        ...NSD_COLORS.semantic.positive,
      };
    case 'completed_no_steps_observed':
      return {
        label: 'Completed (No Steps Observed)',
        ...NSD_COLORS.semantic.muted,
      };
    case 'in_progress':
      return {
        label: 'Execution In Progress',
        ...NSD_COLORS.semantic.active,
      };
    case 'queued':
      return {
        label: 'Execution Queued',
        ...NSD_COLORS.semantic.attention,
      };
    case 'failed':
      return {
        label: 'Execution Failed',
        ...NSD_COLORS.semantic.critical,
      };
    case 'not_executed':
      return {
        label: 'Not Yet Executed',
        ...NSD_COLORS.semantic.muted,
      };
    default:
      return {
        label: 'Unknown',
        ...NSD_COLORS.semantic.muted,
      };
  }
}

function StatusBadge({
  label,
  bg,
  text,
  border,
  icon,
}: {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon?: string;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        borderRadius: NSD_RADIUS.full,
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      {icon && <Icon name={icon as any} size={14} color={text} />}
      {label}
    </span>
  );
}

export function CampaignStatusHeader({
  campaignName,
  governanceState,
  executionConfidence,
  isPlanningOnly = false,
  lastUpdatedAt,
  isPolling = false,
}: CampaignStatusHeaderProps) {
  const governanceDisplay = getGovernanceDisplay(governanceState);
  const executionDisplay = executionConfidence
    ? getExecutionDisplay(executionConfidence)
    : null;

  const isActive = executionConfidence === 'queued' || executionConfidence === 'in_progress';

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: '20px 24px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <Icon name="campaigns" size={24} color={NSD_COLORS.primary} />
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: NSD_COLORS.primary,
              }}
            >
              {campaignName}
            </h2>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <StatusBadge
              label={governanceDisplay.label}
              bg={governanceDisplay.bg}
              text={governanceDisplay.text}
              border={governanceDisplay.border}
              icon={governanceDisplay.icon}
            />

            {executionDisplay && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  backgroundColor: executionDisplay.bg,
                  color: executionDisplay.text,
                  border: `1px solid ${executionDisplay.border}`,
                  borderRadius: NSD_RADIUS.full,
                  fontSize: '12px',
                  fontWeight: 500,
                  animation: isActive ? 'statusPulse 2s ease-in-out infinite' : undefined,
                }}
              >
                {executionDisplay.label}
              </span>
            )}

            {isPlanningOnly && (
              <StatusBadge
                label="Planning Only"
                bg={NSD_COLORS.semantic.attention.bg}
                text={NSD_COLORS.semantic.attention.text}
                border={NSD_COLORS.semantic.attention.border}
                icon="info"
              />
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
              fontStyle: 'italic',
            }}
          >
            Read-only view
          </span>
          {lastUpdatedAt && (
            <span
              style={{
                fontSize: '10px',
                color: isPolling ? NSD_COLORS.semantic.info.text : NSD_COLORS.text.muted,
              }}
              title={formatEt(lastUpdatedAt)}
            >
              {getRelativeTime(lastUpdatedAt)}
              {isPolling && ' (auto-refreshing)'}
            </span>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes statusPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}
