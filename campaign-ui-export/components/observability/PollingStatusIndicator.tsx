'use client';

/**
 * PollingStatusIndicator Component
 * 
 * Shows polling status with clear visibility:
 * - "Auto-refreshing every 7s" while execution is active
 * - "Execution idle" when terminal state reached
 * - Manual "Refresh now" button available
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Never freeze silently
 * - Polling interval visible
 * - Read-only display
 */

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

interface PollingStatusIndicatorProps {
  isPolling: boolean;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  pollingInterval?: number;
  onRefresh: () => void;
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  return `${diffHours}h ago`;
}

export function PollingStatusIndicator({
  isPolling,
  isRefreshing,
  lastUpdatedAt,
  pollingInterval = 7000,
  onRefresh,
}: PollingStatusIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  useEffect(() => {
    if (!lastUpdatedAt) return;

    const updateRelativeTime = () => {
      setRelativeTime(getRelativeTime(lastUpdatedAt));
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 5000);

    return () => clearInterval(interval);
  }, [lastUpdatedAt]);

  const pollingSeconds = Math.round(pollingInterval / 1000);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isPolling ? (
          <>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: NSD_COLORS.semantic.active.text,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                color: NSD_COLORS.semantic.active.text,
              }}
            >
              Auto-refreshing every {pollingSeconds}s
            </span>
          </>
        ) : (
          <>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: NSD_COLORS.text.muted,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontFamily: NSD_TYPOGRAPHY.fontBody,
                color: NSD_COLORS.text.muted,
              }}
            >
              Execution idle
            </span>
          </>
        )}

        {lastUpdatedAt && (
          <span
            style={{
              fontSize: '11px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.text.muted,
              marginLeft: '8px',
            }}
          >
            Last updated {relativeTime}
          </span>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 500,
          fontFamily: NSD_TYPOGRAPHY.fontBody,
          backgroundColor: 'transparent',
          color: isRefreshing ? NSD_COLORS.text.muted : NSD_COLORS.secondary,
          border: `1px solid ${isRefreshing ? NSD_COLORS.border.light : NSD_COLORS.secondary}`,
          borderRadius: NSD_RADIUS.sm,
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          opacity: isRefreshing ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isRefreshing ? (
          <>
            <div
              style={{
                width: 12,
                height: 12,
                border: `2px solid ${NSD_COLORS.border.light}`,
                borderTopColor: NSD_COLORS.secondary,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Refreshing...
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 6C1 3.23858 3.23858 1 6 1C8.21949 1 10.0909 2.40294 10.743 4.36082M11 6C11 8.76142 8.76142 11 6 11C3.78051 11 1.90912 9.59706 1.25699 7.63918"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M10 1.5V4.5H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10.5V7.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Refresh now
          </>
        )}
      </button>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PollingStatusIndicator;
