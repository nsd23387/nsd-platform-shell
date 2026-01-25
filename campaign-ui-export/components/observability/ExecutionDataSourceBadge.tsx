'use client';

/**
 * ExecutionDataSourceBadge Component
 * 
 * Small, non-intrusive indicator showing where execution numbers come from.
 * This is a TRUST UX element that prevents confusion between:
 * - Live DB state (organizations, contacts, leads tables)
 * - ODS events (historical event stream)
 * - ENM narratives (execution narrative machine)
 * 
 * DESIGN:
 * - Appears near funnel or execution summary
 * - Static text, minimal logic
 * - Non-intrusive (caption/tooltip/badge style)
 */

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface ExecutionDataSourceBadgeProps {
  /** Timestamp of last data fetch */
  lastUpdatedAt?: string | null;
  /** Whether the data source is real-time (from DB tables) vs cached/events */
  isRealTime?: boolean;
  /** Compact mode - shows just the icon with tooltip */
  compact?: boolean;
}

export function ExecutionDataSourceBadge({
  lastUpdatedAt,
  isRealTime = true,
  compact = false,
}: ExecutionDataSourceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const badgeText = isRealTime
    ? 'Live data from execution tables'
    : 'Data from event stream';

  const tooltipText = isRealTime
    ? 'Counts shown from live execution tables (organizations, contacts, leads).'
    : 'Counts derived from historical event stream. May have slight delay.';

  if (compact) {
    return (
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: isRealTime 
              ? NSD_COLORS.semantic.info.bg 
              : NSD_COLORS.semantic.muted.bg,
            borderRadius: NSD_RADIUS.sm,
            border: `1px solid ${isRealTime 
              ? NSD_COLORS.semantic.info.border 
              : NSD_COLORS.semantic.muted.border}`,
            cursor: 'help',
          }}
        >
          <Icon 
            name="chart" 
            size={12} 
            color={isRealTime 
              ? NSD_COLORS.semantic.info.text 
              : NSD_COLORS.semantic.muted.text} 
          />
          {isRealTime && (
            <div
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: NSD_COLORS.semantic.info.text,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: '8px',
              padding: '8px 12px',
              backgroundColor: NSD_COLORS.text.primary,
              color: NSD_COLORS.text.inverse,
              borderRadius: NSD_RADIUS.md,
              fontSize: '12px',
              fontWeight: 400,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            {tooltipText}
            {lastUpdatedAt && (
              <span style={{ display: 'block', marginTop: '4px', opacity: 0.7, fontSize: '11px' }}>
                Updated: {formatTimestamp(lastUpdatedAt)}
              </span>
            )}
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '8px',
                height: '8px',
                backgroundColor: NSD_COLORS.text.primary,
              }}
            />
          </div>
        )}

        {/* Inline keyframes for pulse animation */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  // Full badge mode
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        backgroundColor: isRealTime 
          ? NSD_COLORS.semantic.info.bg 
          : NSD_COLORS.semantic.muted.bg,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${isRealTime 
          ? NSD_COLORS.semantic.info.border 
          : NSD_COLORS.semantic.muted.border}`,
      }}
    >
      <Icon 
        name="chart" 
        size={14} 
        color={isRealTime 
          ? NSD_COLORS.semantic.info.text 
          : NSD_COLORS.semantic.muted.text} 
      />
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: isRealTime 
            ? NSD_COLORS.semantic.info.text 
            : NSD_COLORS.semantic.muted.text,
        }}
      >
        {badgeText}
      </span>
      {isRealTime && (
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: NSD_COLORS.semantic.info.text,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Inline keyframes for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/**
 * Format timestamp for display.
 */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

export default ExecutionDataSourceBadge;
