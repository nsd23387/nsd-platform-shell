'use client';

import type { CampaignRun } from '../types/campaign';

interface RunsDisplayProps {
  runs: CampaignRun[];
  latestRun?: CampaignRun | null;
}

const statusColors: Record<CampaignRun['status'], { bg: string; text: string }> = {
  COMPLETED: { bg: '#d1fae5', text: '#065f46' },
  FAILED: { bg: '#fef2f2', text: '#b91c1c' },
  PARTIAL: { bg: '#fef3c7', text: '#92400e' },
};

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
      <h4
        style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
        }}
      >
        Run History (Read-Only)
      </h4>

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
        Run entries are immutable ledger records. No edit, retry, or delete actions are available.
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
          <h5 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>
            Latest Run
          </h5>
          <RunRow run={latestRun} />
        </div>
      )}

      {runs.length === 0 ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No runs recorded yet.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Run ID</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Started</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Leads</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Sent</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: '#6b7280', fontWeight: 500 }}>Errors</th>
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
        <p style={{ margin: 0, fontSize: '11px', color: '#6b7280' }}>Leads Processed</p>
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
