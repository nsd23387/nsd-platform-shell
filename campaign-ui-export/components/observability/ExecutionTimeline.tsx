/**
 * ExecutionTimeline
 * 
 * A read-only component that renders a deterministic, outcome-oriented timeline
 * explaining what happened during campaign execution.
 * 
 * CRITICAL REQUIREMENTS:
 * - Must answer: Did execution do work? Was nothing happening intentional? Is it waiting or finished?
 * - Must NOT rely on raw labels like "running", "queued", or "idle" alone
 * - Must include a plain-language outcome statement at the end
 * - Must explicitly state when no external services were contacted
 * 
 * READ-ONLY: Derived entirely from existing data. Never implies backend failure.
 * Explicitly explains "nothing happened" as a valid state.
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, NSD_SPACING } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { ExecutionState, TimelineEvent } from '../../lib/execution-state-mapping';

interface ExecutionTimelineProps {
  executionState: ExecutionState;
  showOutcomeStatement?: boolean;
  compact?: boolean;
}

function getEventStyle(type: TimelineEvent['type']) {
  switch (type) {
    case 'success':
      return {
        color: NSD_COLORS.semantic.positive.text,
        bg: NSD_COLORS.semantic.positive.bg,
        border: NSD_COLORS.semantic.positive.border,
        icon: 'check' as const,
      };
    case 'warning':
      return {
        color: NSD_COLORS.semantic.attention.text,
        bg: NSD_COLORS.semantic.attention.bg,
        border: NSD_COLORS.semantic.attention.border,
        icon: 'info' as const,
      };
    case 'error':
      return {
        color: NSD_COLORS.semantic.critical.text,
        bg: NSD_COLORS.semantic.critical.bg,
        border: NSD_COLORS.semantic.critical.border,
        icon: 'warning' as const,
      };
    case 'info':
    default:
      return {
        color: NSD_COLORS.semantic.muted.text,
        bg: NSD_COLORS.semantic.muted.bg,
        border: NSD_COLORS.semantic.muted.border,
        icon: 'info' as const,
      };
  }
}

function TimelineEventItem({ 
  event, 
  isLast, 
  compact 
}: { 
  event: TimelineEvent; 
  isLast: boolean;
  compact: boolean;
}) {
  const style = getEventStyle(event.type);
  const iconSize = compact ? 14 : 16;
  const nodeSize = compact ? 24 : 28;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: compact ? '10px' : '14px',
        position: 'relative',
      }}
    >
      {/* Timeline node */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: nodeSize,
            height: nodeSize,
            borderRadius: '50%',
            backgroundColor: event.isCompleted ? style.bg : NSD_COLORS.surface,
            border: `2px solid ${event.isCompleted ? style.border : NSD_COLORS.border.default}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon 
            name={style.icon} 
            size={iconSize} 
            color={event.isCompleted ? style.color : NSD_COLORS.text.muted} 
          />
        </div>
        {/* Connecting line */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              height: compact ? '16px' : '20px',
              backgroundColor: NSD_COLORS.border.light,
              marginTop: '4px',
            }}
          />
        )}
      </div>

      {/* Event content */}
      <div
        style={{
          flex: 1,
          paddingBottom: isLast ? 0 : compact ? '8px' : '12px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: compact ? '13px' : '14px',
            fontWeight: event.isCompleted ? 500 : 400,
            fontFamily: NSD_TYPOGRAPHY.fontBody,
            color: event.isCompleted ? style.color : NSD_COLORS.text.muted,
            lineHeight: 1.4,
          }}
        >
          {event.label}
        </p>
      </div>
    </div>
  );
}

export function ExecutionTimeline({
  executionState,
  showOutcomeStatement = true,
  compact = false,
}: ExecutionTimelineProps) {
  const { timeline, outcomeStatement } = executionState;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '12px' : '16px',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Icon name="clock" size={16} color={NSD_COLORS.text.secondary} />
        <h4
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.secondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Execution Timeline
        </h4>
      </div>

      {/* Timeline events */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {timeline.map((event, index) => (
          <TimelineEventItem
            key={event.id}
            event={event}
            isLast={index === timeline.length - 1}
            compact={compact}
          />
        ))}
      </div>

      {/* Outcome statement */}
      {showOutcomeStatement && (
        <div
          style={{
            padding: compact ? '10px 12px' : '12px 16px',
            backgroundColor: NSD_COLORS.surface,
            borderRadius: NSD_RADIUS.md,
            borderLeft: `3px solid ${NSD_COLORS.primary}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: compact ? '12px' : '13px',
              fontWeight: 500,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
              color: NSD_COLORS.text.primary,
              lineHeight: 1.5,
            }}
          >
            {outcomeStatement}
          </p>

          {/* 
           * NOTE: We do not show "No external data providers were contacted" message
           * because we cannot determine this from the current API data.
           * The LatestRun model does not include explicit fields for external service contact.
           * This messaging should only be added when the backend provides explicit signals.
           */}
        </div>
      )}
    </div>
  );
}

export default ExecutionTimeline;
