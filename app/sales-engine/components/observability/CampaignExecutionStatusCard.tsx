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
 * STATUS MAPPING (queued → cron execution model):
 * - queued: "Queued – execution will start shortly"
 * - running: "Running – sourcing organizations"
 * - completed: "Completed – results available"
 * - failed: "Failed – see timeline for details"
 * - blocked: "Blocked – see reason"
 * 
 * Brand-compliant status indicators use icons, not emojis.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, getSemanticStatusStyle, getExecutionStatusLabel } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import { useExecutionStatus } from '../../../../hooks/useExecutionStatus';
import type { CampaignExecutionStatus } from '../../types/campaign';

/** Extended execution status to include queued state */
type ExtendedExecutionStatus = CampaignExecutionStatus | 'queued' | 'blocked';

/** Status display configuration - brand-aligned (no emojis) */
interface StatusDisplayConfig {
  icon: 'clock' | 'refresh' | 'runs' | 'check' | 'warning' | 'info';
  copy: string;
  bg: string;
  text: string;
  border: string;
  showPulse?: boolean;
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
  /** Blocking reason (if status is blocked) */
  blockingReason?: string;
  /** If true, this is a planning-only campaign that cannot be executed */
  isPlanningOnly?: boolean;
}

/**
 * Calculate relative time string from timestamp.
 * Returns human-readable string like "started 12s ago" or "2 minutes ago".
 */
function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return then.toLocaleString();
}

/**
 * Get display configuration for execution status.
 * Uses brand-aligned colors and proper icons (no emojis).
 * 
 * STATUS COPY (queued → cron execution model):
 * - idle: "Ready for execution"
 * - queued/run_requested: "Queued – execution will start shortly"
 * - running: "Running – sourcing organizations" (or current stage)
 * - awaiting_approvals: "Completed – awaiting lead approvals"
 * - completed: "Completed – results available"
 * - failed: "Failed – see timeline for details"
 * - partial: "Partially completed – see timeline for details"
 * - blocked: "Blocked – see reason"
 */
function getStatusDisplay(
  status: ExtendedExecutionStatus,
  currentStage?: string,
  leadsAwaitingApproval?: number
): StatusDisplayConfig {
  switch (status) {
    case 'idle':
      return {
        icon: 'clock',
        copy: 'Ready for execution',
        ...NSD_COLORS.semantic.muted,
      };
    case 'queued':
    case 'run_requested':
      return {
        icon: 'clock',
        copy: 'Queued – execution will start shortly',
        ...NSD_COLORS.semantic.info,
        showPulse: true,
      };
    case 'running':
      return {
        icon: 'refresh',
        copy: `Running – ${formatStageName(currentStage || 'sourcing organizations')}`,
        ...NSD_COLORS.semantic.active,
        showPulse: true,
      };
    case 'awaiting_approvals': {
      const awaitingCount = leadsAwaitingApproval && leadsAwaitingApproval > 0
        ? ` (${leadsAwaitingApproval} leads)`
        : '';
      return {
        icon: 'check',
        copy: `Completed – awaiting lead approvals${awaitingCount}`,
        ...NSD_COLORS.semantic.attention,
      };
    }
    case 'completed':
      return {
        icon: 'check',
        copy: 'Completed – results available',
        ...NSD_COLORS.semantic.positive,
      };
    case 'failed':
      return {
        icon: 'warning',
        copy: 'Failed – see timeline for details',
        ...NSD_COLORS.semantic.critical,
      };
    case 'partial':
      return {
        icon: 'warning',
        copy: 'Partially completed – see timeline for details',
        ...NSD_COLORS.semantic.attention,
      };
    case 'blocked':
      return {
        icon: 'warning',
        copy: 'Blocked – see reason',
        ...NSD_COLORS.semantic.critical,
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
    orgs_sourced: 'sourcing organizations',
    contacts_discovered: 'discovering contacts',
    contacts_evaluated: 'evaluating contacts',
    leads_promoted: 'promoting leads',
    leads_awaiting_approval: 'awaiting approvals',
    leads_approved: 'processing approvals',
    emails_sent: 'sending emails',
    replies: 'processing replies',
  };
  return stageLabels[stage] || stage.replace(/_/g, ' ');
}

/**
 * CampaignExecutionStatusCard - Dynamic execution state display.
 * 
 * Features:
 * - Explicit status labels for queued → cron execution model
 * - Relative timestamps ("started 12s ago")
 * - Pulse animation for queued/running states
 * - Helper text after 60s when still queued
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
  blockingReason,
  isPlanningOnly = false,
}: CampaignExecutionStatusCardProps) {
  const display = getStatusDisplay(status as ExtendedExecutionStatus, currentStage, leadsAwaitingApproval);
  const isIdle = status === 'idle';
  const isActiveRun = status === 'running';
  const isQueued = status === 'run_requested' || (status as string) === 'queued';
  
  // EXECUTION CONTRACT: Check if Sales Engine supports queue-first execution
  const { executionSupported, loading: executionStatusLoading } = useExecutionStatus();
  
  // Effective canRun - disable if planning-only or execution not supported
  const effectiveCanRun = canRun && !isPlanningOnly && executionSupported;
  
  // Track time since queued for helper text
  const [secondsSinceQueued, setSecondsSinceQueued] = useState(0);
  const [relativeTime, setRelativeTime] = useState(getRelativeTime(lastObservedAt));
  
  // Update relative time every second for active states
  useEffect(() => {
    const shouldUpdate = isQueued || isActiveRun;
    if (!shouldUpdate) return;
    
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(lastObservedAt));
      if (isQueued) {
        const diff = Math.floor((Date.now() - new Date(lastObservedAt).getTime()) / 1000);
        setSecondsSinceQueued(diff);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isQueued, isActiveRun, lastObservedAt]);

  // Show helper text if queued for more than 60 seconds
  const showQueuedHelperText = isQueued && secondsSinceQueued >= 60;

  return (
    <div
      style={{
        backgroundColor: display.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${display.border}`,
        padding: '20px 24px',
        // Subtle pulse animation for queued/running states
        ...(display.showPulse && {
          animation: 'cardPulse 2s ease-in-out infinite',
        }),
      }}
    >
      <style jsx>{`
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; }
          50% { box-shadow: 0 0 0 3px ${display.border}40; }
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        {/* Status info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            {/* Pulse indicator for active states */}
            {display.showPulse && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: display.text,
                  animation: 'pulseGlow 1.5s ease-in-out infinite',
                }}
              />
            )}
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
          {activeRunId && (isActiveRun || isQueued) && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: display.text,
                opacity: 0.8,
              }}
            >
              {/* Runtime safety: activeRunId may be missing/invalid depending on backend observability projection */}
              Run ID:{' '}
              <code style={{ fontFamily: 'monospace' }}>
                {typeof activeRunId === 'string' && activeRunId.length > 0
                  ? `${activeRunId.slice(0, 8)}...`
                  : '—'}
              </code>
            </p>
          )}

          {/* Relative timestamp for active states */}
          {(isQueued || isActiveRun) && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: display.text,
                opacity: 0.8,
              }}
            >
              {isQueued ? 'Queued' : 'Started'} {relativeTime}
            </p>
          )}

          {/* Helper text for long queue times */}
          {showQueuedHelperText && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: display.text,
                opacity: 0.9,
                fontStyle: 'italic',
              }}
            >
              Execution starts within ~1 minute. The system processes runs in batches.
            </p>
          )}

          {/* Blocking reason - show for failed status or when blockingReason is provided */}
          {(status === 'failed' || blockingReason) && blockingReason && (
            <p
              style={{
                margin: '12px 0 0 0',
                padding: '8px 12px',
                backgroundColor: `${display.text}10`,
                borderRadius: NSD_RADIUS.sm,
                fontSize: '12px',
                color: display.text,
              }}
            >
              <strong>Reason:</strong> {blockingReason}
            </p>
          )}

          {/* Last observed for completed/failed states */}
          {!isQueued && !isActiveRun && (
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
          )}
        </div>

        {/* Run Campaign button - only shown when idle */}
        {onRunCampaign && (
          <div style={{ flexShrink: 0 }}>
            <Button
              variant="primary"
              icon="play"
              onClick={onRunCampaign}
              disabled={!isIdle || !effectiveCanRun || isRunning || executionStatusLoading}
              loading={isRunning || executionStatusLoading}
              title={
                !executionSupported
                  ? 'Execution unavailable — Sales Engine execution contract not detected.'
                  : isPlanningOnly
                  ? 'Execution disabled — Planning-only campaign'
                  : isQueued
                  ? 'Execution is queued'
                  : !isIdle
                  ? 'Execution already in progress'
                  : !effectiveCanRun
                  ? 'Campaign not ready for execution'
                  : 'Start campaign execution'
              }
            >
              {executionStatusLoading ? 'Checking...' : 'Run Campaign'}
            </Button>
            
            {/* Execution unavailable notice */}
            {!executionSupported && !executionStatusLoading && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  color: NSD_COLORS.semantic.attention.text,
                  textAlign: 'right',
                }}
              >
                Execution unavailable
              </p>
            )}
            
            {/* Planning-only notice */}
            {isPlanningOnly && executionSupported && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  color: NSD_COLORS.semantic.attention.text,
                  textAlign: 'right',
                }}
              >
                Planning-only campaign
              </p>
            )}
            
            {/* Tooltip for disabled state */}
            {executionSupported && !isPlanningOnly && (isQueued || (!isIdle && !isQueued)) && (
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '11px',
                  color: display.text,
                  opacity: 0.7,
                  textAlign: 'right',
                }}
              >
                {isQueued ? 'Execution queued' : 'Execution in progress'}
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
          Read-only projection from activity events. All data from ODS observability APIs.
        </p>
      </div>
      
      <style jsx>{`
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
