/**
 * SendMetricsPanel Component
 * 
 * Displays send metrics (post-approval only) in the Observability tab.
 * 
 * IMPORTANT: Send metrics only apply to approved leads.
 * This section is scoped to post-approval outreach activity.
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - Shows Observed/Conditional confidence badges
 * - No send controls or execution buttons
 * - Metrics come from backend, never computed locally
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';

export interface SendMetricsPanelProps {
  /** Emails sent count */
  emailsSent: number;
  /** Emails opened count */
  emailsOpened: number;
  /** Emails replied count */
  emailsReplied: number;
  /** Open rate (0-1) */
  openRate?: number;
  /** Reply rate (0-1) */
  replyRate?: number;
  /** Confidence level for these metrics */
  confidence: 'observed' | 'conditional';
  /** Last updated timestamp */
  lastUpdated?: string;
  /** Whether data is loading */
  loading?: boolean;
}

/**
 * Get confidence badge styling - uses brand-aligned semantic colors.
 */
function getConfidenceBadgeStyle(confidence: 'observed' | 'conditional'): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  if (confidence === 'observed') {
    return {
      ...NSD_COLORS.semantic.positive,
      label: 'Observed',
    };
  } else {
    return {
      ...NSD_COLORS.semantic.attention,
      label: 'Conditional',
    };
  }
}

/**
 * MetricCard - Individual metric display card.
 */
function MetricCard({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'block',
          fontSize: '11px',
          fontWeight: 500,
          color: NSD_COLORS.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: '6px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '24px',
          fontWeight: 700,
          fontFamily: NSD_TYPOGRAPHY.fontDisplay,
          color: color || NSD_COLORS.primary,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && (
          <span
            style={{
              fontSize: '14px',
              fontWeight: 400,
              color: NSD_COLORS.text.secondary,
              marginLeft: '4px',
            }}
          >
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * SendMetricsPanel - Post-approval send metrics display.
 * 
 * Header: "Send Metrics (Post-Approval)"
 * Explicit note: "Send metrics only apply to approved leads."
 * 
 * Observability reflects pipeline state; execution is delegated.
 */
export function SendMetricsPanel({
  emailsSent,
  emailsOpened,
  emailsReplied,
  openRate,
  replyRate,
  confidence,
  lastUpdated,
  loading = false,
}: SendMetricsPanelProps) {
  const confidenceStyle = getConfidenceBadgeStyle(confidence);

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
          Loading send metrics...
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
          <Icon name="send" size={18} color={NSD_COLORS.secondary} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Send Metrics (Post-Approval)
          </h4>
        </div>
        <span
          style={{
            display: 'inline-flex',
            padding: '3px 8px',
            fontSize: '11px',
            fontWeight: 500,
            backgroundColor: confidenceStyle.bg,
            color: confidenceStyle.text,
            border: `1px solid ${confidenceStyle.border}`,
            borderRadius: NSD_RADIUS.full,
          }}
        >
          {confidenceStyle.label}
        </span>
      </div>

      {/* Explicit scope note */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: NSD_COLORS.semantic.info.bg,
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Icon name="info" size={16} color={NSD_COLORS.semantic.info.text} />
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: NSD_COLORS.semantic.info.text,
          }}
        >
          Send metrics only apply to approved leads.
        </p>
      </div>

      {/* Metrics grid */}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}
        >
          <MetricCard label="Emails Sent" value={emailsSent} color={NSD_COLORS.primary} />
          <MetricCard
            label="Emails Opened"
            value={emailsOpened}
            suffix={openRate !== undefined ? `(${(openRate * 100).toFixed(1)}%)` : undefined}
            color={NSD_COLORS.text.primary}
          />
          <MetricCard
            label="Replies"
            value={emailsReplied}
            suffix={replyRate !== undefined ? `(${(replyRate * 100).toFixed(1)}%)` : undefined}
            color={NSD_COLORS.semantic.positive.text}
          />
          <MetricCard
            label="Reply Rate"
            value={replyRate !== undefined ? `${(replyRate * 100).toFixed(1)}%` : '—'}
            color={NSD_COLORS.semantic.positive.text}
          />
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <p
            style={{
              margin: '16px 0 0 0',
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
            }}
          >
            Last updated: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
      </div>

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
          Metrics are read-only and reflect backend-observed values.
          No send controls are available from this UI.
        </p>
      </div>
    </div>
  );
}
