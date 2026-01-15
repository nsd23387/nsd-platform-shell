/**
 * ExecutionTooltip
 * 
 * Inline "Why?" tooltips for execution terminology.
 * Explains terms like "Queue mode", "Idle", "No work detected" in a calm,
 * non-technical manner.
 * 
 * READ-ONLY: Display only, no actions.
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SHADOWS } from '../../lib/design-tokens';
import { EXECUTION_TOOLTIPS } from '../../lib/execution-state-mapping';

interface ExecutionTooltipProps {
  term: keyof typeof EXECUTION_TOOLTIPS;
  children: React.ReactNode;
  showQuestionMark?: boolean;
}

export function ExecutionTooltip({ 
  term, 
  children, 
  showQuestionMark = true 
}: ExecutionTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipContent = EXECUTION_TOOLTIPS[term];

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      setPosition(spaceAbove > spaceBelow ? 'top' : 'bottom');
    }
  }, [isVisible]);

  if (!tooltipContent) {
    return <>{children}</>;
  }

  return (
    <span
      ref={triggerRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'help',
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
    >
      {children}
      {showQuestionMark && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: NSD_COLORS.border.light,
            fontSize: '10px',
            fontWeight: 600,
            color: NSD_COLORS.text.muted,
          }}
        >
          ?
        </span>
      )}
      
      {/* Tooltip */}
      {isVisible && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...(position === 'top' 
              ? { bottom: 'calc(100% + 8px)' }
              : { top: 'calc(100% + 8px)' }
            ),
            zIndex: 1000,
            width: '280px',
            padding: '12px 14px',
            backgroundColor: NSD_COLORS.background,
            border: `1px solid ${NSD_COLORS.border.default}`,
            borderRadius: NSD_RADIUS.md,
            boxShadow: NSD_SHADOWS.lg,
          }}
          role="tooltip"
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.text.primary,
              lineHeight: 1.5,
            }}
          >
            {tooltipContent}
          </p>
          
          {/* Tooltip arrow */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              ...(position === 'top'
                ? {
                    bottom: '-6px',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `6px solid ${NSD_COLORS.border.default}`,
                  }
                : {
                    top: '-6px',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: `6px solid ${NSD_COLORS.border.default}`,
                  }
              ),
              width: 0,
              height: 0,
            }}
          />
        </div>
      )}
    </span>
  );
}

export default ExecutionTooltip;
