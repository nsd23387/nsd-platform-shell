/**
 * WhyPausedExplainer Component
 * 
 * Provides contextual explanation when a campaign is in paused/incomplete state.
 * Reduces operator uncertainty ("Is it stuck?") by explaining why processing paused.
 * 
 * GOVERNANCE:
 * - Read-only, informational only
 * - No CTA or action buttons
 * - No suggestion of error
 * - No execution authority
 */

'use client';

import React, { useState } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface WhyPausedExplainerProps {
  /** Whether to show the explainer */
  show: boolean;
  /** Number of remaining items to process */
  remainingCount?: number;
  /** Whether this is due to an intentional pause (batch limit, remaining work, etc.) */
  isIncompleteRun?: boolean;
  /** Whether this is specifically due to execution timeout */
  isTimeout?: boolean;
  /** Compact mode */
  compact?: boolean;
}

export function WhyPausedExplainer({
  show,
  remainingCount = 0,
  isIncompleteRun = false,
  isTimeout = false,
  compact = false,
}: WhyPausedExplainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!show) return null;
  
  // Customize content based on pause reason
  const title = isTimeout 
    ? 'Why did processing pause (timeout)?' 
    : 'Why is processing paused?';
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.semantic.info.bg,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.semantic.info.border}`,
        padding: compact ? '12px 14px' : '14px 16px',
        marginTop: '12px',
      }}
    >
      {/* Header with toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <Icon 
          name="info" 
          size={16} 
          color={NSD_COLORS.semantic.info.text} 
        />
        <span
          style={{
            flex: 1,
            fontSize: '13px',
            fontWeight: 500,
            color: NSD_COLORS.semantic.info.text,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
          }}
        >
          {title}
        </span>
        {/* Expand/collapse indicator */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        >
          <path
            d="M3.5 5.25L7 8.75L10.5 5.25"
            stroke={NSD_COLORS.semantic.info.text}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      
      {/* Expanded explanation */}
      {isExpanded && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${NSD_COLORS.semantic.info.border}`,
          }}
        >
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '13px',
              color: NSD_COLORS.text.primary,
              lineHeight: 1.6,
            }}
          >
            {isTimeout 
              ? 'The run reached its maximum execution time. All completed work has been saved.'
              : 'Campaign runs are intentionally bounded for safety and reliability.'}
          </p>
          
          <ul
            style={{
              margin: '0 0 12px 0',
              paddingLeft: '20px',
              fontSize: '12px',
              color: NSD_COLORS.text.secondary,
              lineHeight: 1.7,
            }}
          >
            {isTimeout ? (
              <>
                <li>Partial progress from this run is fully preserved</li>
                <li>Contacts processed before timeout are reflected in progress</li>
                <li>Remaining contacts will be processed on the next run</li>
              </>
            ) : (
              <>
                <li>Processing pauses when a run reaches its safe execution limit</li>
                <li>This ensures data integrity and prevents incomplete records</li>
                <li>Progress resumes automatically when the next run executes</li>
              </>
            )}
          </ul>
          
          {remainingCount > 0 && (
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: NSD_COLORS.semantic.info.text,
                fontWeight: 500,
              }}
            >
              {remainingCount.toLocaleString()} contacts are queued for the next run.
            </p>
          )}
          
          {(isIncompleteRun || isTimeout) && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 12px',
                backgroundColor: `${NSD_COLORS.semantic.info.text}08`,
                borderRadius: NSD_RADIUS.sm,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: NSD_COLORS.text.muted,
                  fontStyle: 'italic',
                }}
              >
                {isTimeout 
                  ? 'This is normal behavior for large campaigns. Progress shown is accurate and will continue on next run.'
                  : 'This is normal system behavior, not an error. The campaign will continue processing when backend execution resumes.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default WhyPausedExplainer;
