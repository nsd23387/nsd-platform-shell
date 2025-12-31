/**
 * Design Pattern: Timeline
 * 
 * Displays chronological events in a vertical timeline.
 * Used for activity history, status changes, audit logs.
 * 
 * Features:
 * - Vertical timeline with connecting line
 * - Status-colored indicators
 * - Timestamps and descriptions
 * - Read-only display
 */

import React from 'react';
import { background, text, border, statusColors } from '../tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../tokens/typography';
import { space, radius } from '../tokens/spacing';
import type { StatusVariant } from '../components/StatusPill';

// ============================================
// Types
// ============================================

export interface TimelineEvent {
  /** Event identifier */
  id: string;
  /** Event title */
  title: string;
  /** Event description (optional) */
  description?: string;
  /** Timestamp */
  timestamp: string;
  /** Status variant for indicator color */
  status?: StatusVariant;
  /** Actor/user who triggered the event */
  actor?: string;
}

export interface TimelineProps {
  /** Events to display (newest first) */
  events: TimelineEvent[];
  /** Show connector line between events */
  showConnector?: boolean;
  /** Maximum events to show (undefined = all) */
  maxEvents?: number;
  /** Additional styles */
  style?: React.CSSProperties;
}

// ============================================
// Styles
// ============================================

const containerStyles: React.CSSProperties = {
  fontFamily: fontFamily.body,
  position: 'relative',
};

const eventStyles: React.CSSProperties = {
  display: 'flex',
  gap: space['4'],
  paddingBottom: space['6'],
  position: 'relative',
};

const indicatorContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '24px',
  flexShrink: 0,
};

const indicatorStyles = (status: StatusVariant = 'pending'): React.CSSProperties => ({
  width: '12px',
  height: '12px',
  borderRadius: radius.full,
  backgroundColor: statusColors[status].bg,
  border: `2px solid ${statusColors[status].border}`,
  zIndex: 1,
});

const connectorStyles: React.CSSProperties = {
  width: '2px',
  flex: 1,
  backgroundColor: border.subtle,
  marginTop: space['1'],
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  paddingTop: '2px', // Align with indicator
};

const titleStyles: React.CSSProperties = {
  fontSize: fontSize.md,
  fontWeight: fontWeight.medium,
  color: text.primary,
  marginBottom: space['1'],
};

const descriptionStyles: React.CSSProperties = {
  fontSize: fontSize.sm,
  color: text.secondary,
  lineHeight: lineHeight.relaxed,
  marginBottom: space['2'],
};

const metaStyles: React.CSSProperties = {
  fontSize: fontSize.xs,
  color: text.muted,
  display: 'flex',
  gap: space['3'],
};

// ============================================
// Component
// ============================================

export function Timeline({
  events,
  showConnector = true,
  maxEvents,
  style,
}: TimelineProps) {
  const displayEvents = maxEvents ? events.slice(0, maxEvents) : events;
  const hasMore = maxEvents && events.length > maxEvents;

  return (
    <div style={{ ...containerStyles, ...style }}>
      {displayEvents.map((event, index) => {
        const isLast = index === displayEvents.length - 1;
        const showLine = showConnector && !isLast;

        return (
          <div key={event.id} style={eventStyles}>
            {/* Indicator Column */}
            <div style={indicatorContainerStyles}>
              <div style={indicatorStyles(event.status)} />
              {showLine && <div style={connectorStyles} />}
            </div>

            {/* Content Column */}
            <div style={contentStyles}>
              <div style={titleStyles}>{event.title}</div>
              {event.description && (
                <div style={descriptionStyles}>{event.description}</div>
              )}
              <div style={metaStyles}>
                <span>{event.timestamp}</span>
                {event.actor && (
                  <>
                    <span>•</span>
                    <span>{event.actor}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div
          style={{
            fontSize: fontSize.sm,
            color: text.muted,
            paddingLeft: '40px',
          }}
        >
          + {events.length - displayEvents.length} more events
        </div>
      )}
    </div>
  );
}

export default Timeline;
