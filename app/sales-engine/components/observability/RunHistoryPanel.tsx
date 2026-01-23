/**
 * RunHistoryPanel
 * 
 * EXECUTION AUTHORITY CONTRACT:
 * - Sales-engine is the SOLE source of run history
 * - This component displays what sales-engine provides
 * - NO inference, grouping, or reconstruction
 * - NO fallback to legacy endpoints
 * 
 * Data Source: GET /api/v1/campaigns/:id/run-history (via proxy)
 * 
 * Behavior:
 * - If endpoint unavailable: Show "Run history not available yet"
 * - If no runs: Show "No execution runs observed"
 * - If runs exist: Display exactly what backend provides
 */

'use client';

import React, { useState, useEffect } from 'react';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../../lib/design-tokens';
import { Icon } from '../../../../design/components/Icon';
import { getRunHistory, type HistoricalRun, type RunHistoryResponse } from '../../lib/api';

interface RunHistoryPanelProps {
  campaignId: string;
}

/**
 * Format a date string for display.
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Get status display configuration.
 */
function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  const normalized = status.toLowerCase();
  
  switch (normalized) {
    case 'completed':
    case 'success':
      return NSD_COLORS.semantic.positive;
    case 'failed':
    case 'error':
      return NSD_COLORS.semantic.critical;
    case 'running':
    case 'in_progress':
      return NSD_COLORS.semantic.active;
    case 'partial':
      return NSD_COLORS.semantic.attention;
    default:
      return NSD_COLORS.semantic.muted;
  }
}

/**
 * Single run row component.
 */
function RunRow({ run }: { run: HistoricalRun }) {
  const statusStyle = getStatusStyle(run.status);
  
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 120px 120px',
        gap: '12px',
        padding: '12px 16px',
        borderBottom: `1px solid ${NSD_COLORS.border.light}`,
        alignItems: 'center',
      }}
    >
      {/* Status */}
      <div>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            borderRadius: NSD_RADIUS.sm,
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
          }}
        >
          {run.status}
        </span>
      </div>
      
      {/* Run ID */}
      <div>
        <span
          style={{
            fontSize: '13px',
            fontFamily: 'monospace',
            color: NSD_COLORS.text.secondary,
          }}
        >
          {run.id.slice(0, 8)}...
        </span>
        {run.terminationReason && (
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
            }}
          >
            ({run.terminationReason})
          </span>
        )}
      </div>
      
      {/* Started */}
      <div
        style={{
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
        }}
      >
        {formatDate(run.startedAt)}
      </div>
      
      {/* Summary */}
      <div
        style={{
          fontSize: '12px',
          color: NSD_COLORS.text.muted,
          textAlign: 'right',
        }}
      >
        {run.summary ? (
          <span>
            {run.summary.leadsPromoted ?? 0} leads
          </span>
        ) : (
          '—'
        )}
      </div>
    </div>
  );
}

/**
 * Empty state when no runs exist.
 */
function NoRunsState() {
  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: NSD_COLORS.text.muted,
      }}
    >
      <Icon name="runs" size={24} color={NSD_COLORS.text.muted} />
      <p style={{ margin: '12px 0 0', fontSize: '14px' }}>
        No execution runs observed.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
        Run history will appear after the campaign is executed.
      </p>
    </div>
  );
}

/**
 * Not available state when endpoint is unavailable.
 * 
 * EXECUTION AUTHORITY: Do NOT fallback to legacy endpoints.
 */
function NotAvailableState() {
  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: NSD_COLORS.text.muted,
      }}
    >
      <Icon name="info" size={24} color={NSD_COLORS.text.muted} />
      <p style={{ margin: '12px 0 0', fontSize: '14px' }}>
        Run history not available yet.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: '12px' }}>
        This feature is being rolled out. Check back soon.
      </p>
    </div>
  );
}

/**
 * Loading state.
 */
function LoadingState() {
  return (
    <div
      style={{
        padding: '32px 24px',
        textAlign: 'center',
        color: NSD_COLORS.text.muted,
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          margin: '0 auto 12px',
          borderRadius: '50%',
          border: `2px solid ${NSD_COLORS.border.light}`,
          borderTopColor: NSD_COLORS.secondary,
          animation: 'spin 1s linear infinite',
        }}
      />
      <p style={{ margin: 0, fontSize: '14px' }}>
        Loading run history...
      </p>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * RunHistoryPanel - Main component.
 * 
 * EXECUTION AUTHORITY CONTRACT:
 * - Fetches from sales-engine via proxy
 * - Displays exactly what backend provides
 * - NO inference or reconstruction
 * - Shows honest message if unavailable
 */
export function RunHistoryPanel({ campaignId }: RunHistoryPanelProps) {
  const [history, setHistory] = useState<RunHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchHistory() {
      setLoading(true);
      try {
        const data = await getRunHistory(campaignId);
        if (mounted) {
          setHistory(data);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [campaignId]);

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
          gap: '10px',
          padding: '16px 20px',
          borderBottom: `1px solid ${NSD_COLORS.border.light}`,
          backgroundColor: NSD_COLORS.surface,
        }}
      >
        <Icon name="runs" size={18} color={NSD_COLORS.text.secondary} />
        <h3
          style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: NSD_TYPOGRAPHY.fontDisplay,
            color: NSD_COLORS.text.primary,
          }}
        >
          Run History
        </h3>
        {history?.available && history.runs.length > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '12px',
              color: NSD_COLORS.text.muted,
            }}
          >
            {history.runs.length} run{history.runs.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : !history?.available ? (
        <NotAvailableState />
      ) : history.runs.length === 0 ? (
        <NoRunsState />
      ) : (
        <div>
          {/* Column headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr 120px 120px',
              gap: '12px',
              padding: '8px 16px',
              backgroundColor: NSD_COLORS.surface,
              borderBottom: `1px solid ${NSD_COLORS.border.light}`,
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: NSD_COLORS.text.muted,
            }}
          >
            <div>Status</div>
            <div>Run ID</div>
            <div>Started</div>
            <div style={{ textAlign: 'right' }}>Results</div>
          </div>

          {/* Run rows */}
          {history.runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
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
          {/* EXECUTION AUTHORITY CONTRACT: Execution truth comes only from sales-engine */}
          Data from sales-engine. No inference or reconstruction.
        </p>
      </div>
    </div>
  );
}

export default RunHistoryPanel;
