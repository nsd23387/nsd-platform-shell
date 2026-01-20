/**
 * ExecutionNarrativeCard Component
 * 
 * Displays the canonical execution narrative from the ENM.
 * This component replaces CampaignExecutionStatusCard for truthful,
 * event-driven execution storytelling.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - All state derived from ExecutionNarrative
 * - No local inference or heuristics
 * - Trust accelerator copy for user clarity
 * 
 * HARD UI RULES (Non-Negotiable):
 * - NEVER show "No organizations found" while execution is running
 * - NEVER show "Execution idle" if run.started exists
 * - NEVER show "Not yet executed" if any run exists
 * - NEVER infer execution state from funnel counts alone
 */

'use client';

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { Button } from '../ui/Button';
import { useExecutionStatus } from '../../../../hooks/useExecutionStatus';
import {
  type ExecutionNarrative,
  getNarrativeBadgeStyle,
  getNarrativeIcon,
  isActiveExecution,
  formatStageDetails,
} from '../../lib/execution-narrative-mapper';
import { formatEt } from '../../lib/time';

export interface ExecutionNarrativeCardProps {
  narrative: ExecutionNarrative;
  activeRunId?: string;
  onRunCampaign?: () => void;
  canRun?: boolean;
  isRunning?: boolean;
  isPlanningOnly?: boolean;
}

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

export function ExecutionNarrativeCard({
  narrative,
  activeRunId,
  onRunCampaign,
  canRun = false,
  isRunning = false,
  isPlanningOnly = false,
}: ExecutionNarrativeCardProps) {
  const badgeStyle = getNarrativeBadgeStyle(narrative);
  const iconName = getNarrativeIcon(narrative);
  const isActive = isActiveExecution(narrative);
  const isIdle = narrative.mode === 'idle';
  const isQueued = narrative.mode === 'queued';
  const isRunningMode = narrative.mode === 'running' && !narrative.isStalled;
  const isStalled = narrative.isStalled === true;
  const isTerminal = narrative.mode === 'terminal';

  const { executionSupported, loading: executionStatusLoading } = useExecutionStatus();
  const effectiveCanRun = canRun && !isPlanningOnly && executionSupported;

  const [relativeTime, setRelativeTime] = useState(
    narrative.lastEventAt ? getRelativeTime(narrative.lastEventAt) : ''
  );
  const [secondsSinceQueued, setSecondsSinceQueued] = useState(0);

  useEffect(() => {
    if (!isActive || !narrative.lastEventAt) return;

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(narrative.lastEventAt!));
      if (isQueued) {
        const diff = Math.floor(
          (Date.now() - new Date(narrative.lastEventAt!).getTime()) / 1000
        );
        setSecondsSinceQueued(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isQueued, narrative.lastEventAt]);

  const showQueuedHelperText = isQueued && secondsSinceQueued >= 60;
  const showPulse = isActive || isStalled;

  return (
    <div
      style={{
        backgroundColor: badgeStyle.bg,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${badgeStyle.border}`,
        padding: '20px 24px',
        ...(showPulse &&
          !isStalled && {
            animation: 'cardPulse 2s ease-in-out infinite',
          }),
      }}
    >
      <style jsx>{`
        @keyframes cardPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 transparent;
          }
          50% {
            box-shadow: 0 0 0 3px ${badgeStyle.border}40;
          }
        }
        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}
          >
            {showPulse && !isStalled && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: badgeStyle.text,
                  animation: 'pulseGlow 1.5s ease-in-out infinite',
                }}
              />
            )}
            {isStalled && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#FFC107',
                }}
              />
            )}
            <Icon name={iconName} size={20} color={badgeStyle.text} />
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: NSD_TYPOGRAPHY.fontDisplay,
                color: badgeStyle.text,
              }}
            >
              Execution Status
            </h3>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: badgeStyle.text,
              fontWeight: 500,
            }}
          >
            {narrative.headline}
          </p>

          {narrative.subheadline && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '13px',
                color: badgeStyle.text,
                opacity: 0.9,
              }}
            >
              {narrative.subheadline}
            </p>
          )}

          {narrative.stage && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: `${badgeStyle.text}10`,
                borderRadius: NSD_RADIUS.sm,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    color: badgeStyle.text,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Stage:
                </span>
                <span style={{ color: badgeStyle.text }}>{narrative.stage.name}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: `${badgeStyle.text}20`,
                    borderRadius: NSD_RADIUS.sm,
                    fontSize: '11px',
                    fontWeight: 500,
                    color: badgeStyle.text,
                  }}
                >
                  {narrative.stage.status}
                </span>
              </div>
              {narrative.stage.details && Object.keys(narrative.stage.details).length > 0 && (
                <p
                  style={{
                    margin: '6px 0 0 0',
                    fontSize: '12px',
                    color: badgeStyle.text,
                    opacity: 0.8,
                  }}
                >
                  {formatStageDetails(narrative.stage)}
                </p>
              )}
            </div>
          )}

          {activeRunId && isActive && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.8,
              }}
            >
              Run ID:{' '}
              <code style={{ fontFamily: 'monospace' }}>
                {activeRunId.slice(0, 8)}...
              </code>
            </p>
          )}

          {isActive && narrative.lastEventAt && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.8,
              }}
            >
              {isQueued ? 'Queued' : 'Started'} {relativeTime}
            </p>
          )}

          {showQueuedHelperText && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.9,
                fontStyle: 'italic',
              }}
            >
              Execution starts within ~1 minute. The system processes runs in batches.
            </p>
          )}

          {isTerminal && narrative.terminal?.status === 'failed' && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: `${NSD_COLORS.semantic.critical.text}08`,
                borderRadius: NSD_RADIUS.sm,
                border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Icon
                  name="warning"
                  size={14}
                  color={NSD_COLORS.semantic.critical.text}
                />
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: NSD_COLORS.semantic.critical.text,
                      marginBottom: '4px',
                    }}
                  >
                    Failure Reason
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: NSD_COLORS.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    {narrative.terminal.reason || 'Unknown failure'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* INCOMPLETE RUN: Invariant enforcement (not an error) */}
          {isTerminal && narrative.terminal?.status === 'skipped' && narrative.terminal?.reason?.includes('Invariant') && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: `${NSD_COLORS.semantic.attention.text}08`,
                borderRadius: NSD_RADIUS.sm,
                border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <Icon
                  name="info"
                  size={14}
                  color={NSD_COLORS.semantic.attention.text}
                />
                <div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: NSD_COLORS.semantic.attention.text,
                      marginBottom: '4px',
                    }}
                  >
                    Invariant Enforced
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: NSD_COLORS.text.primary,
                      lineHeight: 1.5,
                    }}
                  >
                    {narrative.terminal.reason}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isTerminal && narrative.terminal?.completedAt && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.7,
              }}
            >
              Completed: {formatEt(narrative.terminal.completedAt)}
            </p>
          )}

          {!isActive && !isTerminal && narrative.lastEventAt && (
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.7,
              }}
            >
              Last observed: {formatEt(narrative.lastEventAt)}
            </p>
          )}
        </div>

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
          </div>
        )}
      </div>

      {narrative.trustNote && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: `1px solid ${badgeStyle.border}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon name="info" size={14} color={badgeStyle.text} />
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: badgeStyle.text,
                opacity: 0.8,
                fontStyle: 'italic',
              }}
            >
              {narrative.trustNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExecutionNarrativeCard;
