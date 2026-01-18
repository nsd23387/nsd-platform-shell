'use client';

/**
 * ActiveStageFocusPanelENM Component
 * 
 * ENM-GOVERNED: Live-updating panel that answers "What is the system doing right now?"
 * 
 * GOVERNANCE LOCK:
 * - This component consumes ONLY ExecutionNarrative output
 * - NO access to raw campaign_runs, status, timestamps, or events
 * - NO state derivation or interpretation logic
 * - Pure presentation of ENM-provided data
 * 
 * This component replaces ActiveStageFocusPanel for ENM-compliant usage.
 */

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import type { ExecutionNarrative } from '../../lib/execution-narrative-mapper';
import { 
  isNarrativeActive,
  type ExecutionNarrativeConsumerProps 
} from '../../lib/execution-narrative-governance';

interface ActiveStageFocusPanelENMProps extends ExecutionNarrativeConsumerProps {
  isPolling?: boolean;
}

/**
 * ActiveStageFocusPanelENM
 * 
 * Displays active stage focus using ONLY ExecutionNarrative.
 * The headline, subheadline, and stage from ENM are the single source of truth.
 */
export function ActiveStageFocusPanelENM({
  narrative,
  isPolling = false,
}: ActiveStageFocusPanelENMProps) {
  const isActive = isNarrativeActive(narrative);
  const isStalled = narrative.isStalled === true;
  const isIdle = narrative.mode === 'idle';

  const bgColor = isStalled
    ? NSD_COLORS.semantic.attention.bg
    : isActive
    ? NSD_COLORS.semantic.active.bg
    : isIdle
    ? NSD_COLORS.semantic.muted.bg
    : NSD_COLORS.semantic.positive.bg;

  const borderColor = isStalled
    ? NSD_COLORS.semantic.attention.border
    : isActive
    ? NSD_COLORS.semantic.active.border
    : isIdle
    ? NSD_COLORS.semantic.muted.border
    : NSD_COLORS.semantic.positive.border;

  const textColor = isStalled
    ? NSD_COLORS.semantic.attention.text
    : isActive
    ? NSD_COLORS.semantic.active.text
    : isIdle
    ? NSD_COLORS.semantic.muted.text
    : NSD_COLORS.semantic.positive.text;

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: bgColor,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {isActive && !isStalled && (
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: textColor,
            animation: 'pulse 1.5s ease-in-out infinite',
            flexShrink: 0,
          }}
        />
      )}
      
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: textColor,
            }}
          >
            {narrative.headline}
          </h4>
          {isPolling && isActive && !isStalled && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                backgroundColor: `${textColor}20`,
                borderRadius: '4px',
                color: textColor,
                fontFamily: NSD_TYPOGRAPHY.fontBody,
              }}
            >
              live
            </span>
          )}
        </div>
        {narrative.subheadline && (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: textColor,
              opacity: 0.9,
            }}
          >
            {narrative.subheadline}
          </p>
        )}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default ActiveStageFocusPanelENM;
