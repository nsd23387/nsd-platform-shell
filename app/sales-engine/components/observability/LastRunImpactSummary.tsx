/**
 * LastRunImpactSummary Component
 * 
 * Shows what the last run accomplished (delta from previous state).
 * 
 * GOVERNANCE:
 * - Read-only display
 * - No execution controls
 * - Delta is informational only
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface LastRunImpactSummaryProps {
  /** Run ID (truncated for display) */
  runId: string | null;
  /** Run status */
  status: string | null;
  /** Termination reason (for incomplete runs) */
  terminationReason?: string | null;
  /** Delta counts from this run */
  delta: {
    orgsAdded: number;
    contactsDiscovered: number;
    leadsPromoted: number;
  } | null;
  /** Run started timestamp */
  startedAt: string | null;
  /** Run completed timestamp */
  completedAt: string | null;
  /** Compact mode */
  compact?: boolean;
}

function formatDuration(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt) return '—';
  if (!completedAt) return 'In progress';
  
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const durationMs = end - start;
  
  if (durationMs < 0) return '—';
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return '';
  
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getStatusStyle(status: string | null, terminationReason: string | null): {
  bg: string;
  text: string;
  label: string;
} {
  if (!status) {
    return { ...NSD_COLORS.semantic.muted, label: 'No runs' };
  }
  
  const normalized = status.toLowerCase();
  
  // Check for incomplete run (not an error)
  if (normalized === 'failed' && terminationReason?.toLowerCase() === 'unprocessed_work_remaining') {
    return { ...NSD_COLORS.semantic.attention, label: 'Incomplete' };
  }
  
  switch (normalized) {
    case 'completed':
    case 'success':
      return { ...NSD_COLORS.semantic.positive, label: 'Completed' };
    case 'running':
    case 'in_progress':
      return { ...NSD_COLORS.semantic.active, label: 'Running' };
    case 'queued':
      return { ...NSD_COLORS.semantic.info, label: 'Queued' };
    case 'failed':
      return { ...NSD_COLORS.semantic.critical, label: 'Failed' };
    default:
      return { ...NSD_COLORS.semantic.muted, label: status };
  }
}

export function LastRunImpactSummary({
  runId,
  status,
  terminationReason,
  delta,
  startedAt,
  completedAt,
  compact = false,
}: LastRunImpactSummaryProps) {
  const statusStyle = getStatusStyle(status, terminationReason ?? null);
  const duration = formatDuration(startedAt, completedAt);
  const timeAgo = getRelativeTime(completedAt || startedAt);
  
  // Check if there's any delta to show
  const hasDelta = delta && (delta.orgsAdded > 0 || delta.contactsDiscovered > 0 || delta.leadsPromoted > 0);
  
  if (!runId && !status) {
    return null;
  }
  
  return (
    <div
      style={{
        backgroundColor: NSD_COLORS.background,
        borderRadius: NSD_RADIUS.lg,
        border: `1px solid ${NSD_COLORS.border.light}`,
        padding: compact ? '12px 16px' : '16px 20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icon name="runs" size={16} color={NSD_COLORS.text.secondary} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: NSD_COLORS.text.primary,
              fontFamily: NSD_TYPOGRAPHY.fontBody,
            }}
          >
            Last Run
          </span>
          {timeAgo && (
            <span
              style={{
                fontSize: '12px',
                color: NSD_COLORS.text.muted,
              }}
            >
              ({timeAgo})
            </span>
          )}
        </div>
        
        {/* Status Badge */}
        <span
          style={{
            padding: '3px 10px',
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            borderRadius: NSD_RADIUS.sm,
            fontSize: '11px',
            fontWeight: 500,
          }}
        >
          {statusStyle.label}
        </span>
      </div>
      
      {/* Delta Summary */}
      {hasDelta && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
          }}
        >
          {delta.orgsAdded > 0 && (
            <DeltaItem label="orgs sourced" value={delta.orgsAdded} />
          )}
          {delta.contactsDiscovered > 0 && (
            <DeltaItem label="contacts discovered" value={delta.contactsDiscovered} />
          )}
          {delta.leadsPromoted > 0 && (
            <DeltaItem label="leads promoted" value={delta.leadsPromoted} />
          )}
        </div>
      )}
      
      {/* Run Details */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
        }}
      >
        {runId && (
          <span>
            ID: <code style={{ fontFamily: 'monospace' }}>{runId.slice(0, 8)}...</code>
          </span>
        )}
        <span>Duration: {duration}</span>
      </div>
      
      {/* Incomplete Run Message */}
      {terminationReason?.toLowerCase() === 'unprocessed_work_remaining' && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            backgroundColor: NSD_COLORS.semantic.attention.bg,
            borderRadius: NSD_RADIUS.sm,
            border: `1px solid ${NSD_COLORS.semantic.attention.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <Icon name="info" size={14} color={NSD_COLORS.semantic.attention.text} />
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                color: NSD_COLORS.semantic.attention.text,
                lineHeight: 1.5,
              }}
            >
              Processing paused with remaining work. This is intentional — progress continues when the next run executes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaItem({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: NSD_COLORS.semantic.positive.text,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
        }}
      >
        +{value.toLocaleString()}
      </span>
      <span
        style={{
          fontSize: '12px',
          color: NSD_COLORS.text.secondary,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default LastRunImpactSummary;
