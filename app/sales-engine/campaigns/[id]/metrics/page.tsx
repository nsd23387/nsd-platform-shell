'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignMetrics, MetricsHistoryEntry } from '../../../types/campaign';
import { getCampaignMetrics, getCampaignMetricsHistory } from '../../../lib/api';
import { background, text, border, violet, semantic } from '../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../design/tokens/typography';

export default function CampaignMetricsPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [history, setHistory] = useState<MetricsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [metricsData, historyData] = await Promise.all([
          getCampaignMetrics(campaignId),
          getCampaignMetricsHistory(campaignId),
        ]);
        setMetrics(metricsData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [campaignId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: background.page, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading metrics...</p>
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

        <h1 style={{ margin: '0 0 32px 0', fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.heading }}>
          📊 Campaign Metrics
        </h1>

        {error && (
          <div style={{ padding: '16px', backgroundColor: semantic.danger.light, border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '24px', color: semantic.danger.dark }}>
            {error}
          </div>
        )}

        {metrics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard label="Total Leads" value={metrics.total_leads} color={violet[500]} />
              <MetricCard label="Emails Sent" value={metrics.emails_sent} color={semantic.info.base} />
              <MetricCard label="Emails Opened" value={metrics.emails_opened} suffix={`${(metrics.open_rate * 100).toFixed(1)}%`} color={semantic.success.base} />
              <MetricCard label="Emails Replied" value={metrics.emails_replied} suffix={`${(metrics.reply_rate * 100).toFixed(1)}%`} color={violet[400]} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard label="Bounced" value={metrics.emails_bounced || 0} suffix={`${((metrics.bounce_rate || 0) * 100).toFixed(1)}%`} color={semantic.danger.base} />
              <MetricCard label="Unsubscribed" value={metrics.emails_unsubscribed || 0} color={semantic.warning.base} />
            </div>

            <p style={{ color: text.muted, fontSize: fontSize.sm, marginBottom: '32px' }}>
              Last updated: {new Date(metrics.last_updated).toLocaleString()}
            </p>
          </>
        )}

        <div style={{ backgroundColor: background.surface, borderRadius: '16px', padding: '32px', border: `1px solid ${border.default}` }}>
          <h2 style={{ margin: '0 0 24px 0', color: text.primary, fontSize: fontSize.xl }}>Metrics History</h2>
          
          {history.length === 0 ? (
            <p style={{ color: text.muted, textAlign: 'center', padding: '24px' }}>No history available</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border.default}` }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Opened</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Replied</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium }}>Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border.subtle}` }}>
                      <td style={{ padding: '12px', color: text.secondary }}>{new Date(entry.timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', color: text.secondary, textAlign: 'right' }}>{entry.emails_sent}</td>
                      <td style={{ padding: '12px', color: semantic.success.dark, textAlign: 'right' }}>{entry.emails_opened}</td>
                      <td style={{ padding: '12px', color: violet[600], textAlign: 'right' }}>{entry.emails_replied}</td>
                      <td style={{ padding: '12px', color: semantic.danger.base, textAlign: 'right' }}>{entry.emails_bounced || 0}</td>
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

function MetricCard({ label, value, suffix, color }: { label: string; value: number; suffix?: string; color: string }) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: background.surface,
      borderRadius: '12px',
      border: `1px solid ${border.default}`,
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: fontSize.sm, color: text.muted }}>{label}</p>
      <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: fontWeight.bold, color: text.primary }}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.normal, color: text.muted, marginLeft: '8px' }}>{suffix}</span>}
      </p>
    </div>
  );
}
