'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { NavBar, PageHeader } from '../components/ui';
import { getRecentRuns, getDashboardThroughput } from '../lib/api';
import type { RecentRunOutcome, DashboardThroughput } from '../types/campaign';

export default function MonitoringPage() {
  const [runs, setRuns] = useState<RecentRunOutcome[]>([]);
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [runsData, throughputData] = await Promise.all([
          getRecentRuns(),
          getDashboardThroughput(),
        ]);
        setRuns(runsData);
        setThroughput(throughputData);
      } catch (err) {
        console.error('Failed to load monitoring data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const yieldMetrics = runs.length > 0 ? {
    totalLeads: runs.reduce((sum, r) => sum + r.leadsAttempted, 0),
    totalSent: runs.reduce((sum, r) => sum + r.leadsSent, 0),
    successRate: runs.length > 0 ? Math.round((runs.filter(r => r.status === 'COMPLETED').length / runs.length) * 100) : 0,
  } : null;

  const efficiencyMetrics = throughput ? {
    utilizationRate: Math.round((throughput.usedToday / throughput.dailyLimit) * 100),
    activeCampaigns: throughput.activeCampaigns,
  } : null;

  const safetyMetrics = {
    blockedByThroughput: throughput?.blockedByThroughput || 0,
    totalBlocked: runs.reduce((sum, r) => sum + r.leadsBlocked, 0),
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Loading monitoring data...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px' }}>
        <PageHeader
          title="Monitoring"
          description="Performance metrics and execution visibility"
        />

        <NavBar active="monitoring" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <MetricGroup
            title="Yield"
            icon="chart"
            color="#10b981"
            metrics={[
              { label: 'Total Leads Attempted', value: yieldMetrics?.totalLeads || 0 },
              { label: 'Successfully Sent', value: yieldMetrics?.totalSent || 0 },
              { label: 'Success Rate', value: `${yieldMetrics?.successRate || 0}%` },
            ]}
          />

          <MetricGroup
            title="Efficiency"
            icon="clock"
            color="#8b5cf6"
            metrics={[
              { label: 'Daily Utilization', value: `${efficiencyMetrics?.utilizationRate || 0}%` },
              { label: 'Active Campaigns', value: efficiencyMetrics?.activeCampaigns || 0 },
              { label: 'Throughput Used', value: throughput?.usedToday || 0 },
            ]}
          />

          <MetricGroup
            title="Quality"
            icon="star"
            color="#f59e0b"
            metrics={[
              { label: 'Completed Runs', value: runs.filter(r => r.status === 'COMPLETED').length },
              { label: 'Partial Runs', value: runs.filter(r => r.status === 'PARTIAL').length },
              { label: 'Failed Runs', value: runs.filter(r => r.status === 'FAILED').length },
            ]}
          />

          <MetricGroup
            title="Safety"
            icon="shield"
            color="#ef4444"
            metrics={[
              { label: 'Blocked by Throughput', value: safetyMetrics.blockedByThroughput },
              { label: 'Leads Blocked (Recent)', value: safetyMetrics.totalBlocked },
            ]}
          />
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Icon name="runs" size={20} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Run History
            </h3>
          </div>

          {runs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                No recent runs to display.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Campaign</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Attempted</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Sent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Blocked</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Completed</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.runId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>
                      {run.campaignName}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          backgroundColor: run.status === 'COMPLETED' ? '#d1fae5' : run.status === 'FAILED' ? '#fef2f2' : '#fef3c7',
                          color: run.status === 'COMPLETED' ? '#065f46' : run.status === 'FAILED' ? '#991b1b' : '#92400e',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>
                      {run.leadsAttempted}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#10b981', fontWeight: 500 }}>
                      {run.leadsSent}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.leadsBlocked > 0 ? '#ef4444' : '#6b7280' }}>
                      {run.leadsBlocked}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>
                      {new Date(run.completedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricGroup({ title, icon, color, metrics }: { title: string; icon: string; color: string; metrics: { label: string; value: string | number }[] }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Icon name={icon as any} size={20} color={color} />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
          {title}
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>{metric.label}</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color }}>{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
