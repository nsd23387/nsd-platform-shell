'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignMetrics, MetricsHistoryEntry } from '../../../../../../sales-engine/types/campaign';
import { getCampaignMetrics, getCampaignMetricsHistory } from '../../../../../../sales-engine/lib/api';
import { Icon } from '../../../../../../../design/components/Icon';
import { background, text, border, violet, semantic } from '../../../../../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../../../../../design/tokens/typography';

export default function CampaignMetricsPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const basePath = `/command-center/sales-engine/campaigns/${campaignId}`;

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
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fontFamily.body }}>
        <p style={{ color: text.muted }}>Loading metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 32px', fontFamily: fontFamily.body }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: violet[50],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="metrics" size={24} color={violet[600]} />
          </div>
          <h1 style={{ margin: 0, fontSize: fontSize['4xl'], fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.display }}>
            Campaign Metrics
          </h1>
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

        {metrics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <MetricCard label="Total Leads" value={metrics.total_leads} color={violet[500]} />
              <MetricCard label="Emails Sent" value={metrics.emails_sent} color={semantic.info.base} />
              <MetricCard label="Emails Opened" value={metrics.emails_opened} suffix={`${(metrics.open_rate * 100).toFixed(1)}%`} color={semantic.success.base} />
              <MetricCard label="Emails Replied" value={metrics.emails_replied} suffix={`${(metrics.reply_rate * 100).toFixed(1)}%`} color={violet[400]} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <MetricCard label="Bounced" value={metrics.emails_bounced || 0} suffix={`${((metrics.bounce_rate || 0) * 100).toFixed(1)}%`} color={semantic.danger.base} />
              <MetricCard label="Unsubscribed" value={metrics.emails_unsubscribed || 0} color={semantic.warning.base} />
            </div>

            <p style={{ color: text.muted, fontSize: fontSize.sm, marginBottom: '40px', fontFamily: fontFamily.body }}>
              Last updated: {new Date(metrics.last_updated).toLocaleString()}
            </p>
          </>
        )}

        <div style={{ backgroundColor: background.surface, borderRadius: '20px', padding: '32px', border: `1px solid ${border.subtle}` }}>
          <h2 style={{ margin: '0 0 28px 0', color: text.primary, fontSize: fontSize.xl, fontFamily: fontFamily.display, fontWeight: fontWeight.medium }}>
            Metrics History
          </h2>
          
          {history.length === 0 ? (
            <p style={{ color: text.muted, textAlign: 'center', padding: '48px', fontFamily: fontFamily.body }}>No history available</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border.default}` }}>
                    <th style={{ textAlign: 'left', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Opened</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Replied</th>
                    <th style={{ textAlign: 'right', padding: '14px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${border.subtle}` }}>
                      <td style={{ padding: '14px', color: text.secondary, fontFamily: fontFamily.body }}>{new Date(entry.timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '14px', color: text.secondary, textAlign: 'right', fontFamily: fontFamily.body }}>{entry.emails_sent}</td>
                      <td style={{ padding: '14px', color: semantic.success.dark, textAlign: 'right', fontFamily: fontFamily.body }}>{entry.emails_opened}</td>
                      <td style={{ padding: '14px', color: violet[600], textAlign: 'right', fontFamily: fontFamily.body }}>{entry.emails_replied}</td>
                      <td style={{ padding: '14px', color: semantic.danger.base, textAlign: 'right', fontFamily: fontFamily.body }}>{entry.emails_bounced || 0}</td>
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
      padding: '28px',
      backgroundColor: background.surface,
      borderRadius: '16px',
      border: `1px solid ${border.subtle}`,
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ margin: 0, fontSize: fontSize.sm, color: text.muted, fontFamily: fontFamily.body }}>{label}</p>
      <p style={{ margin: '10px 0 0 0', fontSize: '32px', fontWeight: fontWeight.semibold, color: text.primary, fontFamily: fontFamily.display }}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.normal, color: text.muted, marginLeft: '10px', fontFamily: fontFamily.body }}>{suffix}</span>}
      </p>
    </div>
  );
}
