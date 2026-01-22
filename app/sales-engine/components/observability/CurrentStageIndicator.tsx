'use client';

/**
 * CurrentStageIndicator Component
 * 
 * Displays the current execution stage name and elapsed time.
 * 
 * GOVERNANCE CONSTRAINTS (P1 Incremental):
 * - Stage name comes ONLY from execution-state.run.stage
 * - Do NOT infer progress
 * - Do NOT aggregate events
 * - Do NOT compute percentages
 * - Do NOT change polling behavior
 * 
 * UI Behavior:
 * - Show: "Current stage: Contact Sourcing"
 * - Show: "Stage started Xs ago" (uses run start time if stage-specific time unavailable)
 * - Hide completely if stage === null
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

interface CurrentStageIndicatorProps {
  /** Current stage from execution-state.run.stage - ONLY source of truth */
  stage: string | null | undefined;
  /** Run start time - used as approximation for stage timing when stage-specific time unavailable */
  runStartedAt?: string | null;
  /** Whether the run is actively executing */
  isRunning?: boolean;
}

/**
 * Format stage identifier to human-readable label.
 * Examples: "contact_sourcing" -> "Contact Sourcing"
 */
function formatStageName(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Calculate elapsed time string from a timestamp.
 * Returns null if timestamp is invalid or in the future.
 */
function getElapsedTime(startedAt: string | null | undefined): string | null {
  if (!startedAt) return null;
  
  const started = new Date(startedAt);
  if (isNaN(started.getTime())) return null;
  
  const now = new Date();
  const elapsedMs = now.getTime() - started.getTime();
  
  // Don't show negative elapsed time
  if (elapsedMs < 0) return null;
  
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s ago`;
  }
  
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m ago`;
  }
  
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  const remainingMinutes = elapsedMinutes % 60;
  if (elapsedHours < 24) {
    return remainingMinutes > 0 
      ? `${elapsedHours}h ${remainingMinutes}m ago`
      : `${elapsedHours}h ago`;
  }
  
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export function CurrentStageIndicator({
  stage,
  runStartedAt,
  isRunning = false,
}: CurrentStageIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState<string | null>(null);

  // Update elapsed time every 5 seconds when running
  const updateElapsedTime = useCallback(() => {
    if (isRunning && runStartedAt) {
      setElapsedTime(getElapsedTime(runStartedAt));
    } else {
      setElapsedTime(null);
    }
  }, [isRunning, runStartedAt]);

  useEffect(() => {
    updateElapsedTime();
    
    // Only set interval if running and we have a start time
    if (isRunning && runStartedAt) {
      const interval = setInterval(updateElapsedTime, 5000);
      return () => clearInterval(interval);
    }
  }, [isRunning, runStartedAt, updateElapsedTime]);

  // DEFENSIVE GUARD: Hide completely if stage is null/undefined/empty
  if (!stage || stage.trim() === '') {
    return null;
  }

  const formattedStage = formatStageName(stage);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: isRunning 
          ? NSD_COLORS.semantic.info.bg 
          : NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${isRunning 
          ? NSD_COLORS.semantic.info.border 
          : NSD_COLORS.border.light}`,
      }}
    >
      {/* Stage icon with pulse animation when running */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: isRunning 
            ? NSD_COLORS.semantic.info.text + '15'
            : NSD_COLORS.border.light,
          animation: isRunning ? 'stagePulse 2s ease-in-out infinite' : undefined,
        }}
      >
        <Icon
          name={isRunning ? 'runs' : 'clock'}
          size={14}
          color={isRunning 
            ? NSD_COLORS.semantic.info.text 
            : NSD_COLORS.text.muted}
        />
      </div>

      {/* Stage label and timing */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Current stage:
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: isRunning 
                ? NSD_COLORS.semantic.info.text 
                : NSD_COLORS.text.primary,
            }}
          >
            {formattedStage}
          </span>
        </div>

        {/* Elapsed time indicator - only shown when running */}
        {isRunning && elapsedTime && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '12px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.text.muted,
            }}
          >
            Started {elapsedTime}
          </div>
        )}
      </div>

      {/* Pulse animation keyframes */}
      <style jsx global>{`
        @keyframes stagePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

export default CurrentStageIndicator;
