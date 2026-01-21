/**
 * LastUpdatedTimestamp Component
 * 
 * Displays data freshness with auto-updating relative time.
 * 
 * GOVERNANCE:
 * - Pure presentational component
 * - Auto-updates every second when polling
 * - No side effects
 */

'use client';

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS } from '../../lib/design-tokens';

export interface LastUpdatedTimestampProps {
  /** ISO timestamp of last update */
  timestamp: string;
  /** Whether polling is active */
  isPolling?: boolean;
  /** Compact mode */
  compact?: boolean;
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleString();
}

export function LastUpdatedTimestamp({
  timestamp,
  isPolling = false,
  compact = false,
}: LastUpdatedTimestampProps) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(timestamp));
  
  // Update relative time every second when polling, every 10s otherwise
  useEffect(() => {
    setRelativeTime(getRelativeTime(timestamp));
    
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(timestamp));
    }, isPolling ? 1000 : 10000);
    
    return () => clearInterval(interval);
  }, [timestamp, isPolling]);
  
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '2px 6px' : '4px 10px',
        backgroundColor: isPolling ? `${NSD_COLORS.cta}10` : NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.sm,
        border: `1px solid ${isPolling ? `${NSD_COLORS.cta}30` : NSD_COLORS.border.light}`,
      }}
    >
      {isPolling && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: NSD_COLORS.cta,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      <span
        style={{
          fontSize: compact ? '10px' : '11px',
          color: isPolling ? NSD_COLORS.cta : NSD_COLORS.text.muted,
          fontWeight: isPolling ? 500 : 400,
        }}
      >
        {isPolling ? 'Live' : `Updated ${relativeTime}`}
      </span>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default LastUpdatedTimestamp;
