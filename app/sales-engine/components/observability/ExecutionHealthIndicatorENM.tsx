'use client';

/**
 * ExecutionHealthIndicatorENM Component
 * 
 * ENM-GOVERNED: Single sentence health line derived from ExecutionNarrative only.
 * 
 * GOVERNANCE LOCK:
 * - This component consumes ONLY ExecutionNarrative output
 * - NO access to raw campaign_runs, status, timestamps, or events
 * - NO state derivation or interpretation logic
 * - Pure presentation of ENM-provided data
 * 
 * This component replaces ExecutionHealthIndicator for ENM-compliant usage.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ExecutionNarrative } from '../../lib/execution-narrative-mapper';
import { 
  narrativeToHealthLevel, 
  type HealthLevel,
  type ExecutionNarrativeConsumerProps 
} from '../../lib/execution-narrative-governance';

interface ExecutionHealthIndicatorENMProps extends ExecutionNarrativeConsumerProps {
  compact?: boolean;
}

function getHealthStyles(level: HealthLevel): { bg: string; text: string; icon: string } {
  switch (level) {
    case 'success':
      return {
        bg: NSD_COLORS.semantic.positive.bg,
        text: NSD_COLORS.semantic.positive.text,
        icon: 'check',
      };
    case 'warning':
      return {
        bg: NSD_COLORS.semantic.attention.bg,
        text: NSD_COLORS.semantic.attention.text,
        icon: 'alert',
      };
    case 'error':
      return {
        bg: NSD_COLORS.semantic.critical.bg,
        text: NSD_COLORS.semantic.critical.text,
        icon: 'error',
      };
    case 'info':
      return {
        bg: NSD_COLORS.semantic.info.bg,
        text: NSD_COLORS.semantic.info.text,
        icon: 'info',
      };
    default:
      return {
        bg: NSD_COLORS.semantic.muted.bg,
        text: NSD_COLORS.semantic.muted.text,
        icon: 'circle',
      };
  }
}

function HealthIcon({ level }: { level: HealthLevel }) {
  const color = getHealthStyles(level).text;
  const size = 16;

  if (level === 'success') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <path d="M5 8L7 10L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (level === 'warning') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <path d="M8 2L14 13H2L8 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 6V9M8 11V11.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (level === 'error') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <path d="M5 5L11 11M11 5L5 11" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (level === 'info') {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
        <circle cx="8" cy="8" r="3" fill={color} />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
    </svg>
  );
}

/**
 * ExecutionHealthIndicatorENM
 * 
 * Displays execution health using ONLY ExecutionNarrative.
 * The headline from ENM is the single source of truth.
 */
export function ExecutionHealthIndicatorENM({
  narrative,
  compact = false,
}: ExecutionHealthIndicatorENMProps) {
  const level = narrativeToHealthLevel(narrative);
  const styles = getHealthStyles(level);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: compact ? '6px 10px' : '8px 14px',
        backgroundColor: styles.bg,
        borderRadius: NSD_RADIUS.md,
      }}
    >
      <HealthIcon level={level} />
      <span
        style={{
          fontSize: compact ? '13px' : '14px',
          fontWeight: 500,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          color: styles.text,
        }}
      >
        {narrative.headline}
      </span>
    </div>
  );
}

export default ExecutionHealthIndicatorENM;
