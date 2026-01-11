/**
 * ExecutionTimelineFeed Component
 * 
 * Displays a timeline/activity feed of execution events.
 * Events are grouped by runId and ordered by occurred_at.
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - Events are the source of truth
 * - Blocked/skipped events are clearly labeled
 * - No execution controls or mutations
 * 
 * EVENT TYPES (queued → cron execution model):
 * - run.queued: Run has been queued for execution
 * - campaign.run.started / run.started: Execution has begun
 * - apollo.org.search.started: Organization sourcing started
 * - apollo.org.search.completed: Organization sourcing completed
 * - lead.promoted: Lead has been promoted from contact
 * - lead.blocked: Lead was blocked (with reason)
 * - personalization.generated: Email personalization generated
 * - personalization.blocked: Personalization was blocked
 * - campaign.run.completed / run.completed: Execution completed
 * - campaign.run.failed / run.failed: Execution failed
 * 
 * Data source: ODS /api/v1/activity/events and /api/v1/activity/runs
 */

'use client';

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, getSemanticStatusStyle } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

/**
 * Execution event type from ODS observability.
 */
export interface ExecutionEvent {
  /** Unique event ID */
  id: string;
  /** Event type (e.g., 'campaign.run.started', 'campaign.run.completed') */
  event_type: string;
  /** Run ID this event belongs to */
  run_id?: string;
  /** Campaign ID */
  campaign_id: string;
  /** When the event occurred */
  occurred_at: string;
  /** Event outcome/status */
  outcome?: 'success' | 'blocked' | 'skipped' | 'failed' | 'partial';
  /** Human-readable reason for blocked/skipped events */
  reason?: string;
  /** Additional event details */
  details?: Record<string, unknown>;
}

export interface ExecutionTimelineFeedProps {
  /** Execution events to display */
  events: ExecutionEvent[];
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Maximum number of events to show (default: all) */
  maxEvents?: number;
}

/**
 * Map event type to display configuration.
 * 
 * EVENT TYPES (queued → cron execution model):
 * - run.queued: Run has been queued for execution
 * - campaign.run.started / run.started: Execution has begun
 * - apollo.org.search.started/completed: Organization sourcing
 * - lead.promoted / lead.blocked: Lead promotion outcomes
 * - personalization.generated / blocked: Personalization outcomes
 * - campaign.run.completed / failed: Execution outcomes
 */
function getEventTypeDisplay(eventType: string): {
  label: string;
  icon: 'runs' | 'check' | 'warning' | 'close' | 'clock' | 'info';
  category: 'lifecycle' | 'pipeline' | 'outcome';
} {
  const eventDisplayMap: Record<string, { label: string; icon: 'runs' | 'check' | 'warning' | 'close' | 'clock' | 'info'; category: 'lifecycle' | 'pipeline' | 'outcome' }> = {
    // Lifecycle events (queued → cron model)
    'run.queued': { label: 'Run Queued', icon: 'clock', category: 'lifecycle' },
    'run.started': { label: 'Run Started', icon: 'runs', category: 'lifecycle' },
    'run.running': { label: 'Run In Progress', icon: 'runs', category: 'lifecycle' },
    'run.completed': { label: 'Run Completed', icon: 'check', category: 'lifecycle' },
    'run.failed': { label: 'Run Failed', icon: 'warning', category: 'lifecycle' },
    
    // Legacy lifecycle events (for backwards compatibility)
    'campaign.approved': { label: 'Campaign Approved', icon: 'check', category: 'lifecycle' },
    'campaign.run.started': { label: 'Run Started', icon: 'runs', category: 'lifecycle' },
    'campaign.run.completed': { label: 'Run Completed', icon: 'check', category: 'lifecycle' },
    'campaign.run.failed': { label: 'Run Failed', icon: 'warning', category: 'lifecycle' },
    'campaign.run.partial': { label: 'Run Partially Completed', icon: 'info', category: 'lifecycle' },
    
    // Apollo adapter events
    'apollo.org.search.started': { label: 'Organization Search Started', icon: 'runs', category: 'pipeline' },
    'apollo.org.search.completed': { label: 'Organization Search Completed', icon: 'check', category: 'pipeline' },
    'apollo.contact.search.started': { label: 'Contact Search Started', icon: 'runs', category: 'pipeline' },
    'apollo.contact.search.completed': { label: 'Contact Search Completed', icon: 'check', category: 'pipeline' },
    
    // Pipeline events
    'pipeline.orgs_sourced': { label: 'Organizations Sourced', icon: 'runs', category: 'pipeline' },
    'pipeline.contacts_discovered': { label: 'Contacts Discovered', icon: 'runs', category: 'pipeline' },
    'pipeline.contacts_evaluated': { label: 'Contacts Evaluated', icon: 'runs', category: 'pipeline' },
    'pipeline.leads_promoted': { label: 'Leads Promoted', icon: 'runs', category: 'pipeline' },
    'pipeline.leads_approved': { label: 'Leads Approved', icon: 'check', category: 'pipeline' },
    'pipeline.emails_sent': { label: 'Emails Sent', icon: 'check', category: 'pipeline' },
    
    // Lead promotion events
    'lead.promoted': { label: 'Lead Promoted', icon: 'check', category: 'pipeline' },
    'lead.blocked': { label: 'Lead Blocked', icon: 'close', category: 'outcome' },
    
    // Personalization events
    'personalization.generated': { label: 'Personalization Generated', icon: 'check', category: 'pipeline' },
    'personalization.blocked': { label: 'Personalization Blocked', icon: 'close', category: 'outcome' },
    
    // Blocked/skipped events
    'pipeline.blocked': { label: 'Pipeline Blocked', icon: 'close', category: 'outcome' },
    'pipeline.skipped': { label: 'Stage Skipped', icon: 'info', category: 'outcome' },
    'execution.blocked': { label: 'Execution Blocked', icon: 'close', category: 'outcome' },
  };
  
  return eventDisplayMap[eventType] || {
    label: formatEventType(eventType),
    icon: 'info',
    category: 'pipeline',
  };
}

/**
 * Format unknown event type to readable label.
 */
function formatEventType(eventType: string): string {
  return eventType
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get outcome badge styling.
 */
function getOutcomeBadgeStyle(outcome?: string): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (outcome) {
    case 'success':
      return { ...NSD_COLORS.semantic.positive, label: 'Success' };
    case 'blocked':
      return { ...NSD_COLORS.semantic.critical, label: 'Blocked' };
    case 'skipped':
      return { ...NSD_COLORS.semantic.attention, label: 'Skipped' };
    case 'failed':
      return { ...NSD_COLORS.semantic.critical, label: 'Failed' };
    case 'partial':
      return { ...NSD_COLORS.semantic.attention, label: 'Partial' };
    default:
      return { ...NSD_COLORS.semantic.muted, label: '' };
  }
}

/**
 * Format timestamp for display with relative time.
 * Returns both relative and absolute time for clarity.
 */
function formatTimestamp(timestamp: string): { relative: string; absolute: string } {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  let relative: string;
  if (diffSeconds < 5) {
    relative = 'just now';
  } else if (diffSeconds < 60) {
    relative = `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    relative = `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else {
    relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  
  const absolute = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  
  return { relative, absolute };
}

/**
 * Legacy timestamp format (returns string for backwards compatibility).
 */
function formatTimestampString(timestamp: string): string {
  return formatTimestamp(timestamp).absolute;
}

/**
 * Group events by run ID.
 */
function groupEventsByRun(events: ExecutionEvent[]): Record<string, ExecutionEvent[]> {
  const grouped: Record<string, ExecutionEvent[]> = {};
  
  for (const event of events) {
    const runId = event.run_id || 'no-run';
    if (!grouped[runId]) {
      grouped[runId] = [];
    }
    grouped[runId].push(event);
  }
  
  // Sort each group by occurred_at
  for (const runId of Object.keys(grouped)) {
    grouped[runId] = grouped[runId].sort(
      (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
    );
  }
  
  return grouped;
}

/**
 * TimelineEvent - Individual event display.
 * 
 * Features:
 * - Shows relative timestamp ("12s ago") with absolute time on hover
 * - Highlights queued events with pulse indicator
 * - Clearly displays blocked/skipped reasons
 */
function TimelineEvent({ event, isLast }: { event: ExecutionEvent; isLast: boolean }) {
  const display = getEventTypeDisplay(event.event_type);
  const outcomeBadge = event.outcome ? getOutcomeBadgeStyle(event.outcome) : null;
  const isBlocked = event.outcome === 'blocked' || event.outcome === 'skipped';
  const isQueued = event.event_type === 'run.queued';
  
  // Get icon color based on outcome
  const iconColor = isBlocked
    ? NSD_COLORS.semantic.critical.text
    : event.outcome === 'success'
    ? NSD_COLORS.semantic.positive.text
    : isQueued
    ? NSD_COLORS.semantic.info.text
    : NSD_COLORS.text.secondary;
  
  // Get formatted timestamp
  const timestamp = formatTimestamp(event.occurred_at);
  
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        position: 'relative',
      }}
    >
      {/* Timeline connector */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '24px',
          flexShrink: 0,
        }}
      >
        {/* Event icon */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: isBlocked 
              ? NSD_COLORS.semantic.critical.bg 
              : isQueued 
              ? NSD_COLORS.semantic.info.bg 
              : NSD_COLORS.surface,
            border: `2px solid ${
              isBlocked 
                ? NSD_COLORS.semantic.critical.border 
                : isQueued 
                ? NSD_COLORS.semantic.info.border 
                : NSD_COLORS.border.default
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={display.icon} size={12} color={iconColor} />
        </div>
        
        {/* Connector line */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
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
          paddingBottom: isLast ? 0 : '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: NSD_COLORS.text.primary,
              }}
            >
              {display.label}
            </span>
            {outcomeBadge && outcomeBadge.label && (
              <span
                style={{
                  marginLeft: '8px',
                  display: 'inline-flex',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: outcomeBadge.bg,
                  color: outcomeBadge.text,
                  border: `1px solid ${outcomeBadge.border}`,
                  borderRadius: NSD_RADIUS.sm,
                }}
              >
                {outcomeBadge.label}
              </span>
            )}
          </div>
          {/* Relative timestamp with absolute time on hover */}
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
              whiteSpace: 'nowrap',
              cursor: 'help',
            }}
            title={timestamp.absolute}
          >
            {timestamp.relative}
          </span>
        </div>
        
        {/* Reason for blocked/skipped events - CRITICAL for UX */}
        {isBlocked && event.reason && (
          <div
            style={{
              marginTop: '8px',
              padding: '10px 12px',
              backgroundColor: NSD_COLORS.semantic.critical.bg,
              borderRadius: NSD_RADIUS.sm,
              border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: NSD_COLORS.semantic.critical.text,
                lineHeight: 1.5,
              }}
            >
              <strong>Reason:</strong> {event.reason}
            </p>
          </div>
        )}
        
        {/* Details for other events */}
        {!isBlocked && event.details && Object.keys(event.details).length > 0 && (
          <div
            style={{
              marginTop: '6px',
              fontSize: '12px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            {event.details.count !== undefined && (
              <span>Count: {(event.details.count as number).toLocaleString()}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * RunGroup - Events grouped by run ID.
 */
function RunGroup({
  runId,
  events,
  isExpanded,
  onToggle,
}: {
  runId: string;
  events: ExecutionEvent[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const hasBlockedEvents = events.some(e => e.outcome === 'blocked' || e.outcome === 'skipped');
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${hasBlockedEvents ? NSD_COLORS.semantic.attention.border : NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Run header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: hasBlockedEvents ? NSD_COLORS.semantic.attention.bg : NSD_COLORS.surface,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-block',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <Icon
              name="arrow-right"
              size={14}
              color={NSD_COLORS.text.secondary}
            />
          </span>
          <span
            style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: NSD_COLORS.text.secondary,
            }}
          >
            {runId === 'no-run' ? 'Pre-Run Events' : `Run: ${runId.slice(0, 8)}...`}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: NSD_COLORS.text.muted,
            }}
          >
            ({events.length} event{events.length !== 1 ? 's' : ''})
          </span>
          {hasBlockedEvents && (
            <span
              style={{
                display: 'inline-flex',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: NSD_COLORS.semantic.attention.bg,
                color: NSD_COLORS.semantic.attention.text,
                border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
                borderRadius: NSD_RADIUS.sm,
              }}
            >
              Contains blocked events
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '11px',
            color: NSD_COLORS.text.muted,
          }}
        >
          {formatTimestampString(firstEvent.occurred_at)}
        </span>
      </button>
      
      {/* Events list */}
      {isExpanded && (
        <div style={{ padding: '16px' }}>
          {events.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * ExecutionTimelineFeed - Activity feed showing execution events.
 * 
 * Features:
 * - Groups events by runId
 * - Orders by occurred_at
 * - Clearly labels blocked/skipped events
 * - Displays human-readable reasons for blocked states
 * 
 * Observability reflects pipeline state; execution is delegated.
 */
export function ExecutionTimelineFeed({
  events,
  loading = false,
  error = null,
  maxEvents,
}: ExecutionTimelineFeedProps) {
  const [expandedRuns, setExpandedRuns] = React.useState<Set<string>>(new Set());
  
  // Group events by run ID
  const groupedEvents = groupEventsByRun(events);
  const runIds = Object.keys(groupedEvents).sort((a: string, b: string) => {
    // Sort by first event timestamp, descending (newest first)
    const aFirst = groupedEvents[a]?.[0];
    const bFirst = groupedEvents[b]?.[0];
    if (!aFirst || !bFirst) return 0;
    return new Date(bFirst.occurred_at).getTime() - new Date(aFirst.occurred_at).getTime();
  });
  
  // Toggle run expansion
  const toggleRun = (runId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };
  
  // Auto-expand first run on mount
  React.useEffect(() => {
    if (runIds.length > 0 && expandedRuns.size === 0) {
      setExpandedRuns(new Set([runIds[0]]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIds.length]);

  if (loading) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading activity feed...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          backgroundColor: NSD_COLORS.semantic.critical.bg,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.semantic.critical.border}`,
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon name="warning" size={20} color={NSD_COLORS.semantic.critical.text} />
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>
          {error}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icon name="clock" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Execution Timeline
          </h4>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}
        >
          {events.length} event{events.length !== 1 ? 's' : ''} • {runIds.length} run{runIds.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state */}
      {events.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              backgroundColor: NSD_COLORS.surface,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="clock" size={24} color={NSD_COLORS.text.muted} />
          </div>
          <h5
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
            }}
          >
            No execution events observed
          </h5>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
              maxWidth: '320px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Execution events will appear here when campaign runs are initiated.
            Events show the full lifecycle including any blocked or skipped stages.
          </p>
        </div>
      ) : (
        /* Event groups */
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {runIds.map(runId => {
            const runEvents = groupedEvents[runId] || [];
            return (
              <RunGroup
                key={runId}
                runId={runId}
                events={runEvents}
                isExpanded={expandedRuns.has(runId)}
                onToggle={() => toggleRun(runId)}
              />
            );
          })}
        </div>
      )}

      {/* Governance note */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
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
          Events are read-only projections from the activity spine.
          Blocked and skipped stages are explicitly documented with reasons.
        </p>
      </div>
    </div>
  );
}
