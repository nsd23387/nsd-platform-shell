'use client';

import type { CampaignRun } from '../types/campaign';
import { ProvenancePill } from './governance';
import { deriveProvenance } from '../lib/campaign-state';
import { NSD_COLORS, NSD_RADIUS, NSD_TYPOGRAPHY } from '../lib/design-tokens';

interface RunsDisplayProps {
  runs: CampaignRun[];
  latestRun?: CampaignRun | null;
}

const statusColors: Record<CampaignRun['status'], { bg: string; text: string }> = {
  COMPLETED: { bg: '#d1fae5', text: '#065f46' },
  FAILED: { bg: '#fef2f2', text: '#b91c1c' },
  PARTIAL: { bg: '#fef3c7', text: '#92400e' },
};

/**
 * RunsDisplay - Execution run history (Read-Only).
 * 
 * Updated for target-state architecture:
 * - Uses "Qualified Leads Processed" terminology
 * - Includes provenance indicators
 * - Emphasizes read-only observability
 */
export function RunsDisplay({ runs, latestRun }: RunsDisplayProps) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
          }}
        >
          Execution History (Observed)
        </h4>
        <span
          style={{
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 500,
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: NSD_RADIUS.sm,
            textTransform: 'uppercase',
          }}
        >
          Read-Only
        </span>
      </div>

      <p
        style={{
          margin: '0 0 16px 0',
          padding: '12px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        Execution entries are immutable observability records. No edit, retry, or delete actions are available from this UI.
      </p>

      {latestRun && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #bae6fd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>
              Latest Execution
            </h5>
            <ProvenancePill provenance={deriveProvenance(latestRun)} />
          </div>
          <RunRow run={latestRun} />
        </div>
      )}

      {runs.length === 0 ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No execution runs observed yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Execution ID</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Observed At</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Qualified Leads</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Sent</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Errors</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Provenance</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>
                    {run.id.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151', textAlign: 'right' }}>
                    {run.leads_processed}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#374151', textAlign: 'right' }}>
                    {run.emails_sent}
                  </td>
                  <td style={{ padding: '10px 12px', color: run.errors > 0 ? '#b91c1c' : '#374151', textAlign: 'right' }}>
                    {run.errors}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <ProvenancePill provenance={deriveProvenance(run)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RunRow({ run }: { run: CampaignRun }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Status</p>
        <RunStatusBadge status={run.status} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Qualified Leads Processed</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{run.leads_processed}</p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Emails Sent</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 500, color: '#111827' }}>{run.emails_sent}</p>
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Errors</p>
        <p style={{ margin: '4px 0 0 0', fontSize: '14px', fontWeight: 500, color: run.errors > 0 ? '#b91c1c' : '#111827' }}>{run.errors}</p>
      </div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: CampaignRun['status'] }) {
  const colors = statusColors[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {status}
    </span>
  );
}
