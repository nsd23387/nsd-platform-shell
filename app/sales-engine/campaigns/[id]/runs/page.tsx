'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignRun } from '../../../types/campaign';
import { getCampaignRuns, getLatestRun } from '../../../lib/api';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

const statusColors: Record<CampaignRun['status'], { bg: string; text: string; border: string }> = {
  COMPLETED: { bg: semantic.success.light, text: semantic.success.dark, border: semantic.success.base },
  FAILED: { bg: semantic.danger.light, text: semantic.danger.dark, border: semantic.danger.base },
  PARTIAL: { bg: semantic.warning.light, text: semantic.warning.dark, border: semantic.warning.base },
  IN_PROGRESS: { bg: semantic.info.light, text: semantic.info.dark, border: semantic.info.base },
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
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading runs...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: background.page, fontFamily: fontFamily.body }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Link href={`/sales-engine/campaigns/${campaignId}`} style={{ color: violet[500], textDecoration: 'none', fontSize: fontSize.sm }}>
            ← Back to Campaign
          </Link>
        </div>

        <h1 style={{ margin: '0 0 16px 0', fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
          📜 Run History
        </h1>

        <div style={{
          padding: '16px',
          backgroundColor: background.muted,
          borderRadius: '8px',
          marginBottom: '32px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{ margin: 0, color: text.muted, fontSize: fontSize.sm }}>
            Run entries are immutable ledger records. No edit, retry, or delete actions are available.
          </p>
        </div>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
            {error}
          </div>
        )}

        {latestRun && (
          <div style={{
            padding: '24px',
            backgroundColor: semantic.info.light,
            borderRadius: '12px',
            marginBottom: '32px',
            border: `1px solid ${semantic.info.base}`,
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: semantic.info.dark, fontSize: fontSize.base }}>Latest Run</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark }}>Status</p>
                <StatusBadge status={latestRun.status} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark }}>Started</p>
                <p style={{ margin: '4px 0 0 0', color: text.primary, fontWeight: fontWeight.medium }}>
                  {new Date(latestRun.started_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark }}>Leads</p>
                <p style={{ margin: '4px 0 0 0', color: text.primary, fontWeight: fontWeight.medium }}>{latestRun.leads_processed}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark }}>Sent</p>
                <p style={{ margin: '4px 0 0 0', color: text.primary, fontWeight: fontWeight.medium }}>{latestRun.emails_sent}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark }}>Errors</p>
                <p style={{ margin: '4px 0 0 0', color: latestRun.errors > 0 ? semantic.danger.base : text.primary, fontWeight: fontWeight.medium }}>
                  {latestRun.errors}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}` }}>
          <h2 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.xl }}>All Runs</h2>

          {runs.length === 0 ? (
            <p style={{ color: text.muted, textAlign: 'center', padding: '48px' }}>No runs recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border.default}` }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Run ID</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Started</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Leads</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Errors</th>
                    <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ borderBottom: `1px solid ${border.subtle}` }}>
                      <td style={{ padding: '12px', color: text.secondary, fontFamily: 'monospace', fontSize: fontSize.xs }}>
                        {run.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px' }}>
                        <StatusBadge status={run.status} />
                      </td>
                      <td style={{ padding: '12px', color: text.secondary }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px', color: text.secondary, textAlign: 'right' }}>{run.leads_processed}</td>
                      <td style={{ padding: '12px', color: text.secondary, textAlign: 'right' }}>{run.emails_sent}</td>
                      <td style={{ padding: '12px', color: run.errors > 0 ? semantic.danger.base : text.secondary, textAlign: 'right' }}>
                        {run.errors}
                      </td>
                      <td style={{ padding: '12px', color: text.muted, fontSize: fontSize.sm }}>
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
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 500,
    }}>
      {status}
    </span>
  );
}
