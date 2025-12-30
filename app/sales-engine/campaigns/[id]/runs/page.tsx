'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignRun } from '../../../types/campaign';
import { getCampaignRuns, getLatestRun } from '../../../lib/api';
import { Icon } from '../../../../../design/components/Icon';
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
  const basePath = `/sales-engine/campaigns/${campaignId}`;

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
    <div style={{ padding: '48px 32px', fontFamily: fontFamily.body, minHeight: '100vh', backgroundColor: background.page }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <Link
            href={basePath}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: text.secondary, textDecoration: 'none', fontSize: fontSize.sm }}
          >
            <Icon name="arrow-left" size={16} color={text.secondary} />
            Back to Campaign
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: violet[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="runs" size={24} color={violet[600]} />
          </div>
          <h1 style={{ margin: 0, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.display }}>
            Run History
          </h1>
        </div>

        <div style={{
          padding: '20px 24px',
          backgroundColor: background.muted,
          borderRadius: '12px',
          marginBottom: '40px',
          border: `1px solid ${border.subtle}`,
        }}>
          <p style={{ margin: 0, color: text.muted, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
            Run entries are immutable ledger records. No edit, retry, or delete actions are available.
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: semantic.danger.light,
            border: '1px solid #fecaca',
            borderRadius: '12px',
            marginBottom: '32px',
            color: semantic.danger.dark,
          }}>
            <Icon name="alert" size={20} color={semantic.danger.base} />
            {error}
          </div>
        )}

        {latestRun && (
          <div style={{
            padding: '28px',
            backgroundColor: semantic.info.light,
            borderRadius: '16px',
            marginBottom: '40px',
            border: `1px solid ${semantic.info.base}`,
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: semantic.info.dark, fontSize: fontSize.base, fontFamily: fontFamily.body, fontWeight: fontWeight.semibold }}>
              Latest Run
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px' }}>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark, fontFamily: fontFamily.body }}>Status</p>
                <StatusBadge status={latestRun.status} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark, fontFamily: fontFamily.body }}>Started</p>
                <p style={{ margin: '6px 0 0 0', color: text.primary, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>
                  {new Date(latestRun.started_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark, fontFamily: fontFamily.body }}>Leads</p>
                <p style={{ margin: '6px 0 0 0', color: text.primary, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>{latestRun.leads_processed}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark, fontFamily: fontFamily.body }}>Sent</p>
                <p style={{ margin: '6px 0 0 0', color: text.primary, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>{latestRun.emails_sent}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: fontSize.xs, color: semantic.info.dark, fontFamily: fontFamily.body }}>Errors</p>
                <p style={{ margin: '6px 0 0 0', color: latestRun.errors > 0 ? semantic.danger.base : text.primary, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>
                  {latestRun.errors}
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: background.surface, borderRadius: '20px', padding: '32px', border: `1px solid ${border.subtle}` }}>
          <h2 style={{ margin: '0 0 28px 0', color: text.primary, fontSize: fontSize.xl, fontFamily: fontFamily.display, fontWeight: fontWeight.medium }}>
            All Runs
          </h2>

          {runs.length === 0 ? (
            <p style={{ color: text.muted, textAlign: 'center', padding: '48px', fontFamily: fontFamily.body }}>No runs recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border.default}` }}>
                    <th style={{ textAlign: 'left', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Run ID</th>
                    <th style={{ textAlign: 'left', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Started</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Leads</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Errors</th>
                    <th style={{ textAlign: 'left', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Triggered By</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} style={{ borderBottom: `1px solid ${border.subtle}` }}>
                      <td style={{ padding: '14px', color: text.secondary, fontFamily: 'monospace', fontSize: fontSize.xs }}>
                        {run.id.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '14px' }}>
                        <StatusBadge status={run.status} />
                      </td>
                      <td style={{ padding: '14px', color: text.secondary, fontFamily: fontFamily.body }}>
                        {new Date(run.started_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px', color: text.secondary, textAlign: 'right', fontFamily: fontFamily.body }}>{run.leads_processed}</td>
                      <td style={{ padding: '14px', color: text.secondary, textAlign: 'right', fontFamily: fontFamily.body }}>{run.emails_sent}</td>
                      <td style={{ padding: '14px', color: run.errors > 0 ? semantic.danger.base : text.secondary, textAlign: 'right', fontFamily: fontFamily.body }}>
                        {run.errors}
                      </td>
                      <td style={{ padding: '14px', color: text.muted, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
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
      padding: '6px 12px',
      backgroundColor: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: '6px',
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      fontFamily: fontFamily.body,
    }}>
      {status}
    </span>
  );
}
