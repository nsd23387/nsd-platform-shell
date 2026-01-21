/**
 * CampaignProgressCard Component
 * 
 * Top-level campaign progress summary showing overall completion.
 * Displays progress per stage derived from entity state counts.
 * 
 * GOVERNANCE:
 * - Read-only: No execution controls
 * - Progress derived from entity states, not run status
 * - Runs are bounded work units, not progress indicators
 * - No retry/override/force buttons
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { StageProgressBar } from './StageProgressBar';
import { LastUpdatedTimestamp } from '../ui/LastUpdatedTimestamp';
import { WhyPausedExplainer } from './WhyPausedExplainer';
import type { CampaignProgressState } from '../../hooks/useCampaignProgress';

export interface CampaignProgressCardProps {
  /** Campaign progress state from useCampaignProgress hook */
  progress: CampaignProgressState;
  /** Whether polling is active */
  isPolling?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Show throughput indicators */
  showThroughput?: boolean;
}

/**
 * Get status badge configuration based on progress state
 */
function getStatusBadge(state: CampaignProgressState['state']): {
  label: string;
  bg: string;
  text: string;
  icon: 'clock' | 'refresh' | 'check' | 'warning' | 'info';
} {
  switch (state) {
    case 'not_started':
      return {
        label: 'Not Started',
        ...NSD_COLORS.semantic.muted,
        icon: 'clock',
      };
    case 'in_progress':
      return {
        label: 'Processing',
        ...NSD_COLORS.semantic.active,
        icon: 'refresh',
      };
    case 'paused':
      return {
        label: 'Paused',
        ...NSD_COLORS.semantic.attention,
        icon: 'info',
      };
    case 'exhausted':
      return {
        label: 'Complete',
        ...NSD_COLORS.semantic.positive,
        icon: 'check',
      };
    default:
      return {
        label: 'Unknown',
        ...NSD_COLORS.semantic.muted,
        icon: 'info',
      };
  }
}

export function CampaignProgressCard({
  progress,
  isPolling = false,
  isLoading = false,
  compact = false,
  showThroughput = false,
}: CampaignProgressCardProps) {
  const statusBadge = getStatusBadge(progress.state);
  const isActive = progress.state === 'in_progress';
  const isPaused = progress.state === 'paused';
  const isComplete = progress.state === 'exhausted';
  const isNotStarted = progress.state === 'not_started';
  
  // Check if this is an incomplete run (termination_reason = unprocessed_work_remaining)
  const isIncompleteRun = progress.latestRun.status?.toLowerCase() === 'failed' &&
    progress.latestRun.terminationReason?.toLowerCase() === 'unprocessed_work_remaining';
  
  // Check for edge states
  const hasNoContacts = progress.stages.every(s => s.total === 0);
  const allContactsProcessed = !progress.hasRemainingWork && progress.stages.some(s => s.processed > 0);
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
        ...(isActive && {
          boxShadow: `0 0 0 1px ${NSD_COLORS.cta}30`,
        }),
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '12px 16px' : '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="chart" size={18} color={NSD_COLORS.info} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Campaign Progress
          </h4>
          
          {/* Status Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              backgroundColor: statusBadge.bg,
              color: statusBadge.text,
              borderRadius: NSD_RADIUS.full,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            {isActive && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusBadge.text,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            )}
            {statusBadge.label}
          </span>
        </div>
        
        {/* Last Updated */}
        <LastUpdatedTimestamp
          timestamp={progress.lastUpdatedAt}
          isPolling={isPolling}
        />
      </div>
      
      {/* Progress Bars */}
      <div style={{ padding: compact ? '16px' : '20px' }}>
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              color: NSD_COLORS.text.muted,
              fontSize: '13px',
            }}
          >
            Loading progress...
          </div>
        ) : hasNoContacts && isNotStarted ? (
          /* Empty State: No contacts yet */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: NSD_COLORS.surface,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Icon name="users" size={24} color={NSD_COLORS.text.muted} />
            </div>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: 500,
                color: NSD_COLORS.text.primary,
              }}
            >
              No processable contacts yet
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: NSD_COLORS.text.muted,
                maxWidth: '280px',
              }}
            >
              Progress will appear here once organization sourcing and contact discovery begin.
            </p>
          </div>
        ) : (
          <>
            {progress.stages.map((stage, index) => (
              <StageProgressBar
                key={stage.stage}
                label={stage.label}
                processed={stage.processed}
                total={stage.total}
                confidence={stage.confidence}
                isActive={isActive && index === progress.stages.findIndex(s => s.remaining > 0)}
                compact={compact}
              />
            ))}
          </>
        )}
      </div>
      
      {/* Status Message */}
      <div
        style={{
          padding: compact ? '12px 16px' : '14px 20px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: isPaused 
            ? NSD_COLORS.semantic.attention.bg 
            : isComplete
            ? NSD_COLORS.semantic.positive.bg
            : NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Icon
            name={statusBadge.icon}
            size={16}
            color={isPaused 
              ? NSD_COLORS.semantic.attention.text 
              : isComplete
              ? NSD_COLORS.semantic.positive.text
              : NSD_COLORS.text.secondary}
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: isPaused
                  ? NSD_COLORS.semantic.attention.text
                  : isComplete
                  ? NSD_COLORS.semantic.positive.text
                  : NSD_COLORS.text.secondary,
                lineHeight: 1.5,
              }}
            >
              {progress.statusMessage}
            </p>
            
            {/* Why Paused Explainer - shown when paused/incomplete */}
            <WhyPausedExplainer
              show={isPaused}
              remainingCount={progress.remainingCount}
              isIncompleteRun={isIncompleteRun}
              compact={compact}
            />
          </div>
        </div>
      </div>
      
      {/* Completion Celebration (subtle) */}
      {isComplete && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${NSD_COLORS.semantic.positive.border}`,
            backgroundColor: `${NSD_COLORS.semantic.positive.text}05`,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: NSD_COLORS.semantic.positive.text,
              fontWeight: 500,
            }}
          >
            All contacts have been processed. Campaign pipeline complete.
          </p>
        </div>
      )}
      
      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default CampaignProgressCard;
