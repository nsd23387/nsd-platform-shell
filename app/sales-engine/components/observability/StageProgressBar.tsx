/**
 * StageProgressBar Component
 * 
 * Displays progress for a single pipeline stage with count labels.
 * 
 * GOVERNANCE:
 * - Pure presentational component
 * - No side effects or mutations
 * - Percentage capped at 100%
 * - Read-only display only
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';

export interface StageProgressBarProps {
  /** Stage label */
  label: string;
  /** Number of items processed */
  processed: number;
  /** Total items to process */
  total: number;
  /** Confidence level of the data */
  confidence?: 'observed' | 'estimated';
  /** Optional stage icon */
  icon?: React.ReactNode;
  /** Whether this stage is currently active */
  isActive?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
}

export function StageProgressBar({
  label,
  processed,
  total,
  confidence = 'observed',
  icon,
  isActive = false,
  compact = false,
}: StageProgressBarProps) {
  // Calculate percentage (capped at 100%)
  const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const remaining = Math.max(0, total - processed);
  
  // Determine bar color based on progress
  const getBarColor = () => {
    if (isActive) return NSD_COLORS.cta;
    if (percent === 100) return NSD_COLORS.semantic.positive.text;
    if (percent > 0) return NSD_COLORS.secondary;
    return NSD_COLORS.border.default;
  };
  
  const barColor = getBarColor();
  
  return (
    <div
      style={{
        marginBottom: compact ? '12px' : '16px',
      }}
    >
      {/* Header: Label + Counts */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {icon && (
            <span style={{ opacity: 0.7 }}>{icon}</span>
          )}
          <span
            style={{
              fontSize: compact ? '12px' : '13px',
              fontWeight: 500,
              color: isActive ? NSD_COLORS.primary : NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            {label}
          </span>
          {isActive && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: `${NSD_COLORS.cta}15`,
                borderRadius: NSD_RADIUS.sm,
                fontSize: '10px',
                fontWeight: 600,
                color: NSD_COLORS.cta,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: NSD_COLORS.cta,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              Active
            </span>
          )}
        </div>
        
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
          }}
        >
          <span
            style={{
              fontSize: compact ? '13px' : '14px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            }}
          >
            {processed.toLocaleString()}
          </span>
          {total > 0 && total !== processed && (
            <span
              style={{
                fontSize: compact ? '11px' : '12px',
                color: NSD_COLORS.text.muted,
              }}
            >
              / {total.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div
        style={{
          height: compact ? '6px' : '8px',
          backgroundColor: NSD_COLORS.border.light,
          borderRadius: NSD_RADIUS.full,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background track */}
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            backgroundColor: barColor,
            borderRadius: NSD_RADIUS.full,
            transition: 'width 0.5s ease-out, background-color 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer effect when active */}
          {isActive && percent > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(
                  90deg,
                  transparent 0%,
                  rgba(255,255,255,0.3) 50%,
                  transparent 100%
                )`,
                animation: 'shimmer 2s ease-in-out infinite',
              }}
            />
          )}
        </div>
      </div>
      
      {/* Footer: Percentage + Remaining */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '4px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}
        >
          {percent}%
          {confidence === 'estimated' && (
            <span style={{ marginLeft: '4px', fontStyle: 'italic' }}>(est.)</span>
          )}
        </span>
        
        {remaining > 0 && (
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            {remaining.toLocaleString()} remaining
          </span>
        )}
      </div>
      
      {/* Inline keyframes */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export default StageProgressBar;
