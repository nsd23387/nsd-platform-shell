/**
 * LastUpdatedTimestamp Component
 * 
 * Displays data freshness with auto-updating relative time.
 * Visual confidence indicator showing polling/live state.
 * 
 * GOVERNANCE:
 * - Pure presentational component
 * - Auto-updates every second when polling
 * - No side effects
 * - Visual signals only (no execution authority)
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
  /** Show "Up to date" when not polling instead of timestamp */
  showUpToDate?: boolean;
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

function isRecent(timestamp: string): boolean {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  return diffMs < 60000; // Less than 1 minute
}

export function LastUpdatedTimestamp({
  timestamp,
  isPolling = false,
  compact = false,
  showUpToDate = false,
}: LastUpdatedTimestampProps) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(timestamp));
  const [recent, setRecent] = useState(() => isRecent(timestamp));
  
  // Update relative time every second when polling, every 10s otherwise
  useEffect(() => {
    setRelativeTime(getRelativeTime(timestamp));
    setRecent(isRecent(timestamp));
    
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(timestamp));
      setRecent(isRecent(timestamp));
    }, isPolling ? 1000 : 10000);
    
    return () => clearInterval(interval);
  }, [timestamp, isPolling]);
  
  // Determine display state
  const displayText = isPolling 
    ? 'Live' 
    : showUpToDate && recent 
    ? 'Up to date'
    : `Updated ${relativeTime}`;
  
  const bgColor = isPolling 
    ? `${NSD_COLORS.cta}10`
    : recent && showUpToDate
    ? `${NSD_COLORS.semantic.positive.text}08`
    : NSD_COLORS.surface;
  
  const borderColor = isPolling
    ? `${NSD_COLORS.cta}30`
    : recent && showUpToDate
    ? `${NSD_COLORS.semantic.positive.text}20`
    : NSD_COLORS.border.light;
  
  const textColor = isPolling
    ? NSD_COLORS.cta
    : recent && showUpToDate
    ? NSD_COLORS.semantic.positive.text
    : NSD_COLORS.text.muted;
  
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: compact ? '2px 6px' : '4px 10px',
        backgroundColor: bgColor,
        borderRadius: NSD_RADIUS.sm,
        border: `1px solid ${borderColor}`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Live indicator dot */}
      {isPolling && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: NSD_COLORS.cta,
            animation: 'livePulse 1.5s ease-in-out infinite',
          }}
        />
      )}
      
      {/* Up to date checkmark */}
      {!isPolling && recent && showUpToDate && (
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <path 
            d="M10 3L4.5 8.5L2 6" 
            stroke={NSD_COLORS.semantic.positive.text}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      
      <span
        style={{
          fontSize: compact ? '10px' : '11px',
          color: textColor,
          fontWeight: isPolling ? 500 : 400,
        }}
      >
        {displayText}
      </span>
      
      <style jsx>{`
        @keyframes livePulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
          }
          50% { 
            opacity: 0.4; 
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

export default LastUpdatedTimestamp;
