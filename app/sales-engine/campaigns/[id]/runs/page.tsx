'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignRun } from '../../../types/campaign';
import { getCampaignRuns, getLatestRun } from '../../../lib/api';

const statusColors: Record<CampaignRun['status'], { bg: string; text: string }> = {
  COMPLETED: { bg: '#166534', text: '#86efac' },
  FAILED: { bg: '#991b1b', text: '#fecaca' },
  PARTIAL: { bg: '#92400e', text: '#fde68a' },
  IN_PROGRESS: { bg: '#1e40af', text: '#93c5fd' },
};

export default function CampaignRunsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [runs, setRuns] = useState<CampaignRun[]>([]);
  const [latestRun, setLatestRun] = useState<CampaignRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [runsData, latestData] = await Promise.all([
          getCampaignRuns(campaignId),
          getLatestRun(campaignId),
        ]);
        setRuns(runsData);
        setLatestRun(latestData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load runs');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading runs...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: '#e879f9', textDecoration: 'none', fontSize: '14px' }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 600, color: '#fff' }}>
          📜 Run History
        </h1>

        <div style={{
          padding: '16px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          marginBottom: '32px',
          border: '1px solid #333',
        }}>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px' }}>
            Run entries are immutable ledger records. No edit, retry, or delete actions are available.
          </p>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        {latestRun && (
          <div style={{
            padding: '24px',
            backgroundColor: '#0c4a6e',
            borderRadius: '12px',
            marginBottom: '32px',
            border: '1px solid #0ea5e9',
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7dd3fc', fontSize: '16px' }}>Latest Run</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7dd3fc' }}>Status</p>
                <StatusBadge status={latestRun.status} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7dd3fc' }}>Started</p>
                <p style={{ margin: '4px 0 0 0', color: '#fff', fontWeight: 500 }}>
                  {new Date(latestRun.started_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7dd3fc' }}>Leads</p>
                <p style={{ margin: '4px 0 0 0', color: '#fff', fontWeight: 500 }}>{latestRun.leads_processed}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7dd3fc' }}>Sent</p>
                <p style={{ margin: '4px 0 0 0', color: '#fff', fontWeight: 500 }}>{latestRun.emails_sent}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7dd3fc' }}>Errors</p>
                <p style={{ margin: '4px 0 0 0', color: latestRun.errors > 0 ? '#f87171' : '#fff', fontWeight: 500 }}>
                  {latestRun.errors}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '20px' }}>All Runs</h2>

          {runs.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '48px' }}>No runs recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Run ID</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Started</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Leads</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Errors</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px', color: '#d1d5db', fontFamily: 'monospace', fontSize: '12px' }}>
                        {run.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={run.status} />
                      </td>
                      <td style={{ padding: '12px', color: '#d1d5db' }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', color: '#d1d5db', textAlign: 'right' }}>{run.leads_processed}</td>
                      <td style={{ padding: '12px', color: '#d1d5db', textAlign: 'right' }}>{run.emails_sent}</td>
                      <td style={{ padding: '12px', color: run.errors > 0 ? '#f87171' : '#d1d5db', textAlign: 'right' }}>
                        {run.errors}
                      </td>
                      <td style={{ padding: '12px', color: '#9ca3af', fontSize: '13px' }}>
                        {run.triggered_by || 'System'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CampaignRun['status'] }) {
  const colors = statusColors[status];
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      backgroundColor: colors.bg,
      color: colors.text,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      {status}
    </span>
  );
}
