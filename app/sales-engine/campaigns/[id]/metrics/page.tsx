'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { CampaignMetrics, MetricsHistoryEntry } from '../../../types/campaign';
import { getCampaignMetrics, getCampaignMetricsHistory } from '../../../lib/api';

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
      <div style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#9ca3af' }}>Loading metrics...</p>
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

        <h1 style={{ margin: '0 0 32px 0', fontSize: '28px', fontWeight: 600, color: '#fff' }}>
          📊 Campaign Metrics
        </h1>

        {error && (
          <div style={{ padding: '16px', backgroundColor: '#7f1d1d', borderRadius: '8px', marginBottom: '24px', color: '#fecaca' }}>
            {error}
          </div>
        )}

        {metrics && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard label="Total Leads" value={metrics.total_leads} color="#8b5cf6" />
              <MetricCard label="Emails Sent" value={metrics.emails_sent} color="#3b82f6" />
              <MetricCard label="Emails Opened" value={metrics.emails_opened} suffix={`${(metrics.open_rate * 100).toFixed(1)}%`} color="#22c55e" />
              <MetricCard label="Emails Replied" value={metrics.emails_replied} suffix={`${(metrics.reply_rate * 100).toFixed(1)}%`} color="#e879f9" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '32px' }}>
              <MetricCard label="Bounced" value={metrics.emails_bounced || 0} suffix={`${((metrics.bounce_rate || 0) * 100).toFixed(1)}%`} color="#ef4444" />
              <MetricCard label="Unsubscribed" value={metrics.emails_unsubscribed || 0} color="#f59e0b" />
            </div>

            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>
              Last updated: {new Date(metrics.last_updated).toLocaleString()}
            </p>
          </>
        )}

        <div style={{ backgroundColor: '#1a1a1a', borderRadius: '16px', padding: '32px', border: '1px solid #333' }}>
          <h2 style={{ margin: '0 0 24px 0', color: '#fff', fontSize: '20px' }}>Metrics History</h2>
          
          {history.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>No history available</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #333' }}>
                    <th style={{ textAlign: 'left', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Date</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Sent</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Opened</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Replied</th>
                    <th style={{ textAlign: 'right', padding: '12px', color: '#9ca3af', fontWeight: 500 }}>Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px', color: '#d1d5db' }}>{new Date(entry.timestamp).toLocaleDateString()}</td>
                      <td style={{ padding: '12px', color: '#d1d5db', textAlign: 'right' }}>{entry.emails_sent}</td>
                      <td style={{ padding: '12px', color: '#22c55e', textAlign: 'right' }}>{entry.emails_opened}</td>
                      <td style={{ padding: '12px', color: '#e879f9', textAlign: 'right' }}>{entry.emails_replied}</td>
                      <td style={{ padding: '12px', color: '#ef4444', textAlign: 'right' }}>{entry.emails_bounced || 0}</td>
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
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      border: `1px solid ${color}33`,
    }}>
      <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>{label}</p>
      <p style={{ margin: '8px 0 0 0', fontSize: '32px', fontWeight: 700, color }}>
        {value.toLocaleString()}
        {suffix && <span style={{ fontSize: '16px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>{suffix}</span>}
      </p>
    </div>
  );
}
