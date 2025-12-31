'use client';

import type { CampaignMetrics, MetricsHistoryEntry } from '../types/campaign';

interface MetricsDisplayProps {
  metrics: CampaignMetrics;
  history?: MetricsHistoryEntry[];
}

export function MetricsDisplay({ metrics, history }: MetricsDisplayProps) {
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
        Campaign Metrics
      </h4>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <MetricCard label="Total Leads" value={metrics.total_leads} />
        <MetricCard label="Emails Sent" value={metrics.emails_sent} />
        <MetricCard label="Emails Opened" value={metrics.emails_opened} suffix={`(${(metrics.open_rate * 100).toFixed(1)}%)`} />
        <MetricCard label="Emails Replied" value={metrics.emails_replied} suffix={`(${(metrics.reply_rate * 100).toFixed(1)}%)`} />
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
        Last updated: {new Date(metrics.last_updated).toLocaleString()}
      </p>

      {history && history.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
            Recent History
          </h5>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>Time</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>Sent</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>Opened</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6b7280', fontWeight: 500 }}>Replied</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((entry, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 12px', color: '#374151' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#374151', textAlign: 'right' }}>{entry.emails_sent}</td>
                    <td style={{ padding: '8px 12px', color: '#374151', textAlign: 'right' }}>{entry.emails_opened}</td>
                    <td style={{ padding: '8px 12px', color: '#374151', textAlign: 'right' }}>{entry.emails_replied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}
    >
      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{label}</p>
      <p style={{ margin: '4px 0 0 0', fontSize: '24px', fontWeight: 600, color: '#111827' }}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: '13px', fontWeight: 400, color: '#6b7280', marginLeft: '6px' }}>{suffix}</span>}
      </p>
    </div>
  );
}
