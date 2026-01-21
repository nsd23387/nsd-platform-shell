/**
 * CampaignRunHistoryTable Component
 * 
 * Displays campaign run history with full pipeline visibility.
 * Fixes broken "View Run History" UX.
 * 
 * Data source: GET /campaigns/{id}/runs
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No retries or re-runs from UI
 * - No stage skipping
 * - Status comes from backend, never inferred
 * 
 * Columns:
 * - Run ID
 * - Status (Completed/Partial/Failed)
 * - Started
 * - Completed
 * - Orgs sourced
 * - Contacts discovered
 * - Leads promoted
 * - Leads approved
 * - Emails sent
 * - Errors
 */

'use client';

import React from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY, getSemanticStatusStyle } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import type { CampaignRunDetailed } from '../../types/campaign';

export interface CampaignRunHistoryTableProps {
  /** Campaign runs */
  runs: CampaignRunDetailed[];
  /** Whether data is loading */
  loading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** ID for scroll-to anchor */
  id?: string;
}

/**
 * Get status badge styling - uses brand-aligned semantic colors.
 * 
 * TARGET-STATE EXECUTION SEMANTICS:
 * Supports "incomplete" and "timeout" statuses for runs that terminated with
 * intentional pause reasons (unprocessed_work_remaining, execution_timeout, etc.)
 * These are NOT errors - displayed with info/warning styling.
 */
function getStatusBadgeStyle(status: string, terminationReason?: string | null): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  // Runtime safety: backend may add statuses or return null-ish values; never crash the table.
  const normalized = typeof status === 'string' ? status.toUpperCase() : 'UNKNOWN';
  const reason = terminationReason?.toLowerCase() || '';
  
  // Check for intentional pause reasons
  const isIntentionalPause = normalized === 'FAILED' && (
    reason === 'unprocessed_work_remaining' ||
    reason === 'execution_timeout' ||
    reason === 'batch_limit_reached' ||
    reason === 'rate_limit_exceeded' ||
    reason.includes('timeout') ||
    reason.includes('limit')
  );
  
  // TIMEOUT: execution time limit reached, partial progress preserved
  if (normalized === 'FAILED' && (reason === 'execution_timeout' || reason.includes('timeout'))) {
    return {
      ...NSD_COLORS.semantic.attention,
      label: 'Timeout',
    };
  }
  
  // INCOMPLETE RUN: other intentional halts
  if (isIntentionalPause) {
    return {
      ...NSD_COLORS.semantic.attention,
      label: 'Incomplete',
    };
  }
  
  const semanticStyle = getSemanticStatusStyle(
    (normalized === 'COMPLETED' || normalized === 'FAILED' || normalized === 'PARTIAL'
      ? (normalized as 'COMPLETED' | 'FAILED' | 'PARTIAL')
      : 'PARTIAL')
  );
  
  const labels: Record<string, string> = {
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    PARTIAL: 'Partial',
    INCOMPLETE: 'Incomplete',
    TIMEOUT: 'Timeout',
  };
  
  return { ...semanticStyle, label: labels[normalized] || (typeof status === 'string' ? status : 'Unknown') };
}

/**
 * RunStatusBadge - Displays run status with brand-aligned styling.
 * 
 * TARGET-STATE EXECUTION SEMANTICS:
 * Accepts optional terminationReason to properly display "Incomplete"
 * for runs with termination_reason = "unprocessed_work_remaining".
 */
function RunStatusBadge({ status, terminationReason }: { status: string; terminationReason?: string | null }) {
  const style = getStatusBadgeStyle(status, terminationReason);

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        borderRadius: NSD_RADIUS.sm,
      }}
    >
      {style.label}
    </span>
  );
}

/**
 * Format date for display.
 */
function formatDate(dateString: unknown): string {
  if (typeof dateString !== 'string' || dateString.length === 0) return '—';
  const d = new Date(dateString);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

/**
 * Calculate and format duration between two timestamps.
 */
function formatDuration(startedAt: unknown, completedAt?: unknown): string {
  if (typeof startedAt !== 'string' || startedAt.length === 0) return '—';
  if (typeof completedAt !== 'string' || completedAt.length === 0) return 'In progress';
  
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  const durationMs = end - start;
  
  if (durationMs < 0) return '—';
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * CampaignRunHistoryTable - Full run history with pipeline visibility.
 * 
 * Fixes "View Run History" broken UX by providing inline table.
 * No dead links - data is displayed directly.
 * 
 * Observability reflects pipeline state; execution is delegated.
 */
export function CampaignRunHistoryTable({
  runs,
  loading = false,
  error = null,
  id = 'run-history',
}: CampaignRunHistoryTableProps) {
  if (loading) {
    return (
      <div
        id={id}
        style={{
          backgroundColor: NSD_COLORS.background,
          borderRadius: NSD_RADIUS.lg,
          border: `1px solid ${NSD_COLORS.border.light}`,
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.text.muted }}>
          Loading run history...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        id={id}
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
        <p style={{ margin: 0, fontSize: '14px', color: NSD_COLORS.semantic.critical.text }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      id={id}
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
          <Icon name="runs" size={18} color={NSD_COLORS.info} />
          <h4
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: NSD_TYPOGRAPHY.fontDisplay,
              color: NSD_COLORS.primary,
            }}
          >
            Run History
          </h4>
        </div>
        <span
          style={{
            fontSize: '12px',
            color: NSD_COLORS.text.muted,
          }}
        >
          {runs.length} run{runs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Empty state - explicit copy per governance requirements */}
      {runs.length === 0 ? (
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
            <Icon name="runs" size={24} color={NSD_COLORS.text.muted} />
          </div>
          <h5
            style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: NSD_COLORS.primary,
            }}
          >
            No runs observed yet
          </h5>
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: NSD_COLORS.text.secondary,
            }}
          >
            Run history will appear here when run.started events are received.
          </p>
        </div>
      ) : (
        /* Table */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1050px' }}>
            <thead>
              <tr style={{ backgroundColor: NSD_COLORS.surface }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Run ID
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Started
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Completed
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Duration
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Orgs
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Contacts
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Leads
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Personalized
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Sent
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Errors
                </th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, index) => (
                // Runtime safety: do not assume run fields exist or are non-null.
                <tr
                  key={typeof run.id === 'string' && run.id.length > 0 ? run.id : `run-${index}`}
                  style={{
                    borderTop: index > 0 ? `1px solid ${NSD_COLORS.border.light}` : undefined,
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: NSD_COLORS.text.secondary }}>
                    {typeof run.id === 'string' && run.id.length > 0 ? `${run.id.slice(0, 8)}...` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <RunStatusBadge 
                      status={typeof run.status === 'string' ? run.status : 'Unknown'} 
                      terminationReason={(run as { termination_reason?: string }).termination_reason}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: NSD_COLORS.text.primary }}>
                    {formatDate(run.started_at)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: NSD_COLORS.text.primary }}>
                    {run.completed_at ? formatDate(run.completed_at) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: NSD_COLORS.text.secondary }}>
                    {formatDuration(run.started_at, run.completed_at)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {typeof run.orgs_sourced === 'number' ? run.orgs_sourced.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {typeof run.contacts_discovered === 'number' ? run.contacts_discovered.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {typeof run.leads_promoted === 'number'
                      ? run.leads_promoted.toLocaleString()
                      : typeof run.leads_processed === 'number'
                      ? run.leads_processed.toLocaleString()
                      : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.semantic.positive.text }}>
                    {typeof run.leads_approved === 'number' ? run.leads_approved.toLocaleString() : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.semantic.positive.text }}>
                    {typeof run.emails_sent === 'number' ? run.emails_sent.toLocaleString() : '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: 500,
                      color:
                        typeof run.errors === 'number' && run.errors > 0
                          ? NSD_COLORS.semantic.critical.text
                          : NSD_COLORS.text.muted,
                    }}
                  >
                    {typeof run.errors === 'number' ? run.errors : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          Run history is immutable and read-only. No retries or re-runs can be initiated from this UI.
          Execution is managed by backend systems.
        </p>
      </div>
    </div>
  );
}
