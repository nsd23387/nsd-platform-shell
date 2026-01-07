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
 * Brand-compliant status indicators use icons, not emojis.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, getSemanticStatusStyle } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import type { CampaignExecutionStatus } from '../../types/campaign';

/** Status display configuration - brand-aligned (no emojis) */
interface StatusDisplayConfig {
  icon: 'clock' | 'refresh' | 'runs' | 'check' | 'warning' | 'info';
  copy: string;
  bg: string;
  text: string;
  border: string;
}

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
 * Uses brand-aligned colors and proper icons (no emojis).
 * 
 * STATUS COPY (governance-aligned):
 * - idle: "Ready for execution"
 * - run_requested: "Execution requested — Awaiting events"
 * - running: "Run in progress — [stage name]"
 * - awaiting_approvals: "Run completed — Awaiting lead approvals"
 * - completed: "Run completed"
 * - failed: "Run failed — See run history"
 * - partial: "Run partially completed — See run history"
 */
function getStatusDisplay(
  status: CampaignExecutionStatus,
  currentStage?: string,
  leadsAwaitingApproval?: number
): StatusDisplayConfig {
  const semanticStyle = getSemanticStatusStyle(status);
  
  switch (status) {
    case 'idle':
      return {
        icon: 'clock',
        copy: 'Ready for execution',
        ...NSD_COLORS.semantic.muted,
      };
    case 'run_requested':
      return {
        icon: 'info',
        copy: 'Execution requested — Awaiting events',
        ...NSD_COLORS.semantic.info,
      };
    case 'running':
      return {
        icon: 'refresh',
        copy: `Run in progress${currentStage ? ` — ${formatStageName(currentStage)}` : ''}`,
        ...NSD_COLORS.semantic.active,
      };
    case 'awaiting_approvals': {
      const awaitingCount = leadsAwaitingApproval && leadsAwaitingApproval > 0
        ? ` (${leadsAwaitingApproval} leads)`
        : '';
      return {
        icon: 'check',
        copy: `Run completed — Awaiting lead approvals${awaitingCount}`,
        ...NSD_COLORS.semantic.attention,
      };
    }
    case 'completed':
      return {
        icon: 'check',
        copy: 'Run completed',
        ...NSD_COLORS.semantic.positive,
      };
    case 'failed':
      return {
        icon: 'warning',
        copy: 'Run failed — See run history',
        ...NSD_COLORS.semantic.critical,
      };
    case 'partial':
      return {
        icon: 'warning',
        copy: 'Run partially completed — See run history',
        ...NSD_COLORS.semantic.attention,
      };
    default:
      return {
        icon: 'clock',
        copy: 'Awaiting events',
        ...NSD_COLORS.semantic.muted,
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
            <Icon name={display.icon} size={20} color={display.text} />
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
          Read-only projection from activity events.
        </p>
      </div>
    </div>
  );
}
