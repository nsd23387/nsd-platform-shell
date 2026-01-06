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
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
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
 * Get status badge styling.
 */
function getStatusBadgeStyle(status: 'COMPLETED' | 'FAILED' | 'PARTIAL'): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
    case 'FAILED':
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Failed' };
    case 'PARTIAL':
      return { bg: '#FEF3C7', text: '#92400E', label: 'Partial' };
    default:
      return { bg: NSD_COLORS.surface, text: NSD_COLORS.text.muted, label: status };
  }
}

/**
 * RunStatusBadge - Displays run status with appropriate styling.
 */
function RunStatusBadge({ status }: { status: 'COMPLETED' | 'FAILED' | 'PARTIAL' }) {
  const style = getStatusBadgeStyle(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        padding: '4px 10px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
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
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
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
          backgroundColor: '#FEE2E2',
          borderRadius: NSD_RADIUS.lg,
          border: '1px solid #FECACA',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Icon name="warning" size={20} color="#991B1B" />
        <p style={{ margin: 0, fontSize: '14px', color: '#991B1B' }}>{error}</p>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
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
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Orgs
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Contacts
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Promoted
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', fontWeight: 500, color: NSD_COLORS.text.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Approved
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
                <tr
                  key={run.id}
                  style={{
                    borderTop: index > 0 ? `1px solid ${NSD_COLORS.border.light}` : undefined,
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: NSD_COLORS.text.secondary }}>
                    {run.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: NSD_COLORS.text.primary }}>
                    {formatDate(run.started_at)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: NSD_COLORS.text.primary }}>
                    {run.completed_at ? formatDate(run.completed_at) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {run.orgs_sourced?.toLocaleString() ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {run.contacts_discovered?.toLocaleString() ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary }}>
                    {run.leads_promoted?.toLocaleString() ?? run.leads_processed?.toLocaleString() ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.success }}>
                    {run.leads_approved?.toLocaleString() ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: NSD_COLORS.success }}>
                    {run.emails_sent.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: 500, color: run.errors > 0 ? NSD_COLORS.error : NSD_COLORS.text.muted }}>
                    {run.errors}
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
