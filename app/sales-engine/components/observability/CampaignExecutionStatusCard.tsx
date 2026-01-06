/**
 * CampaignExecutionStatusCard Component
 * 
 * Displays dynamic execution state for a campaign.
 * Replaces static success banner with real-time pipeline status.
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No execution control (except Run Campaign button when idle)
 * - Status comes from /observability endpoint
 * - UI reflects backend truth, never infers
 * 
 * Status copy examples:
 * - 🟡 "Run in progress — Contact discovery"
 * - 🟢 "Run completed — Awaiting lead approvals"
 * - 🔴 "Run failed — See run history"
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import type { CampaignExecutionStatus, ExecutionStatusDisplay } from '../../types/campaign';

export interface CampaignExecutionStatusCardProps {
  /** Current execution status */
  status: CampaignExecutionStatus;
  /** Active run ID (if running) */
  activeRunId?: string;
  /** Current pipeline stage (if running) */
  currentStage?: string;
  /** Last observed event timestamp */
  lastObservedAt: string;
  /** Number of leads awaiting approval */
  leadsAwaitingApproval?: number;
  /** Callback when Run Campaign is clicked */
  onRunCampaign?: () => void;
  /** Whether the campaign can be run */
  canRun?: boolean;
  /** Whether the Run action is loading */
  isRunning?: boolean;
}

/**
 * Get display configuration for execution status.
 */
function getStatusDisplay(
  status: CampaignExecutionStatus,
  currentStage?: string,
  leadsAwaitingApproval?: number
): ExecutionStatusDisplay {
  switch (status) {
    case 'idle':
      return {
        emoji: '⚪',
        copy: 'Ready for execution',
        bg: NSD_COLORS.surface,
        text: NSD_COLORS.text.secondary,
        border: NSD_COLORS.border.light,
      };
    case 'running':
      return {
        emoji: '🟡',
        copy: `Run in progress${currentStage ? ` — ${formatStageName(currentStage)}` : ''}`,
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FCD34D',
      };
    case 'completed':
      const awaitingCopy = leadsAwaitingApproval && leadsAwaitingApproval > 0
        ? ` — ${leadsAwaitingApproval} leads awaiting approval`
        : ' — Awaiting lead approvals';
      return {
        emoji: '🟢',
        copy: `Run completed${awaitingCopy}`,
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#6EE7B7',
      };
    case 'failed':
      return {
        emoji: '🔴',
        copy: 'Run failed — See run history',
        bg: '#FEE2E2',
        text: '#991B1B',
        border: '#FECACA',
      };
    case 'partial':
      return {
        emoji: '🟠',
        copy: 'Run partially completed — See run history',
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FCD34D',
      };
    default:
      return {
        emoji: '⚪',
        copy: 'Status unknown',
        bg: NSD_COLORS.surface,
        text: NSD_COLORS.text.muted,
        border: NSD_COLORS.border.light,
      };
  }
}

/**
 * Format stage name for display.
 */
function formatStageName(stage: string): string {
  const stageLabels: Record<string, string> = {
    orgs_sourced: 'Sourcing organizations',
    contacts_discovered: 'Discovering contacts',
    contacts_evaluated: 'Evaluating contacts',
    leads_promoted: 'Promoting leads',
    leads_awaiting_approval: 'Awaiting approvals',
    leads_approved: 'Processing approvals',
    emails_sent: 'Sending emails',
    replies: 'Processing replies',
  };
  return stageLabels[stage] || stage.replace(/_/g, ' ');
}

/**
 * CampaignExecutionStatusCard - Dynamic execution state display.
 * 
 * Observability reflects pipeline state; execution is delegated.
 */
export function CampaignExecutionStatusCard({
  status,
  activeRunId,
  currentStage,
  lastObservedAt,
  leadsAwaitingApproval,
  onRunCampaign,
  canRun = false,
  isRunning = false,
}: CampaignExecutionStatusCardProps) {
  const display = getStatusDisplay(status, currentStage, leadsAwaitingApproval);
  const isIdle = status === 'idle';
  const isActiveRun = status === 'running';

  return (
    <div
      style={{
        backgroundColor: display.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${display.border}`,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        {/* Status info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>{display.emoji}</span>
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: display.text,
              }}
            >
              Execution Status
            </h3>
          </div>
          
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: display.text,
              fontWeight: 500,
            }}
          >
            {display.copy}
          </p>

          {/* Active run ID */}
          {activeRunId && isActiveRun && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: display.text,
                opacity: 0.8,
              }}
            >
              Run ID: <code style={{ fontFamily: 'monospace' }}>{activeRunId.slice(0, 8)}...</code>
            </p>
          )}

          {/* Last observed */}
          <p
            style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: display.text,
              opacity: 0.7,
            }}
          >
            Last observed: {new Date(lastObservedAt).toLocaleString()}
          </p>
        </div>

        {/* Run Campaign button - only shown when idle */}
        {onRunCampaign && (
          <div style={{ flexShrink: 0 }}>
            <Button
              variant="primary"
              icon="play"
              onClick={onRunCampaign}
              disabled={!isIdle || !canRun || isRunning}
              loading={isRunning}
              title={
                !isIdle
                  ? 'Execution already in progress'
                  : !canRun
                  ? 'Campaign not ready for execution'
                  : 'Start campaign execution'
              }
            >
              Run Campaign
            </Button>
            
            {/* Tooltip for disabled state */}
            {!isIdle && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  color: display.text,
                  opacity: 0.7,
                  textAlign: 'right',
                }}
              >
                Execution already in progress
              </p>
            )}
          </div>
        )}
      </div>

      {/* Governance note */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: `1px solid ${display.border}`,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: display.text,
            opacity: 0.6,
            fontStyle: 'italic',
          }}
        >
          Observability reflects pipeline state; execution is delegated to backend systems.
        </p>
      </div>
    </div>
  );
}
