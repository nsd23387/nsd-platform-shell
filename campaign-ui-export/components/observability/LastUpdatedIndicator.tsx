/**
 * LastUpdatedIndicator Component
 * 
 * Shows "Last updated X seconds ago" with live updates.
 * Provides visual feedback about data freshness during polling.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only display
 * - Timestamps displayed in ET
 * - No data mutations
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getRelativeTime, formatEt } from '../../lib/time';

interface LastUpdatedIndicatorProps {
  lastUpdatedAt: string | null;
  isPolling?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
  compact?: boolean;
}

export function LastUpdatedIndicator({
  lastUpdatedAt,
  isPolling = false,
  isRefreshing = false,
  onRefresh,
  showRefreshButton = true,
  compact = false,
}: LastUpdatedIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>(
    getRelativeTime(lastUpdatedAt)
  );

  const updateRelativeTime = useCallback(() => {
    setRelativeTime(getRelativeTime(lastUpdatedAt));
  }, [lastUpdatedAt]);

  useEffect(() => {
    updateRelativeTime();
    
    const interval = setInterval(updateRelativeTime, 5000);
    
    return () => clearInterval(interval);
  }, [updateRelativeTime]);

  const absoluteTime = lastUpdatedAt ? formatEt(lastUpdatedAt) : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? '8px' : '12px',
        padding: compact ? '6px 10px' : '8px 14px',
        backgroundColor: isPolling ? NSD_COLORS.semantic.info.bg : NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${isPolling ? NSD_COLORS.semantic.info.border : NSD_COLORS.border.light}`,
      }}
      title={absoluteTime || undefined}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
          }}
        >
          <Icon
            name={isRefreshing ? 'refresh' : 'clock'}
            size={compact ? 12 : 14}
            color={isPolling ? NSD_COLORS.semantic.info.text : NSD_COLORS.text.muted}
          />
        </div>
        <span
          style={{
            fontSize: compact ? '11px' : '12px',
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: isPolling ? NSD_COLORS.semantic.info.text : NSD_COLORS.text.secondary,
          }}
        >
          {isRefreshing
            ? 'Updating...'
            : lastUpdatedAt
            ? `Last updated ${relativeTime}`
            : 'Not yet updated'}
        </span>
        {isPolling && !isRefreshing && (
          <span
            style={{
              fontSize: compact ? '10px' : '11px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.semantic.info.text,
              fontStyle: 'italic',
            }}
          >
            (auto-refreshing)
          </span>
        )}
      </div>

      {showRefreshButton && onRefresh && !isRefreshing && (
        <button
          onClick={onRefresh}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: compact ? '4px 8px' : '5px 10px',
            fontSize: compact ? '10px' : '11px',
            fontWeight: 500,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: NSD_COLORS.secondary,
            backgroundColor: 'transparent',
            border: `1px solid ${NSD_COLORS.secondary}`,
            borderRadius: NSD_RADIUS.sm,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Refresh now"
        >
          <Icon name="refresh" size={compact ? 10 : 12} color={NSD_COLORS.secondary} />
          Refresh
        </button>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default LastUpdatedIndicator;
