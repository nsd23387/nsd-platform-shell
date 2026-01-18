/**
 * Monitoring Page
 * 
 * GOVERNANCE NOTE:
 * This UI must NOT compute metrics.
 * All metrics must be sourced from canonical analytics views.
 * Local aggregations and rate calculations are prohibited.
 * 
 * Per SEO Intelligence Metrics Audit (docs/seo/METRICS_AUDIT.md):
 * - Aggregation metrics (totalLeads, totalSent, totalBlocked) have been removed
 * - Rate metrics (successRate, utilizationRate) have been removed
 * - These metrics must be implemented upstream in nsd-ods-api before use
 * 
 * See: analytics.metrics_campaign_execution_daily
 * See: analytics.metrics_campaign_yield_summary
 * See: analytics.metrics_throughput_daily
 */

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

  /**
   * Observed yield values from API.
   * 
   * GOVERNANCE NOTE:
   * These values come DIRECTLY from backend API responses.
   * No aggregations or rate computations are performed in the UI.
   * 
   * Metrics that require aggregation (totalLeads, totalSent, successRate)
   * must be implemented upstream in analytics.metrics_campaign_yield_summary
   * before they can be displayed here.
   * 
   * IMPORTANT: Contacts and leads are distinct; leads are conditionally promoted.
   * - "Leads Attempted" = promoted leads (Tier A/B) that were processed
   * - Tier C/D contacts are never leads and are not included in these counts
   * - Lead counts reflect promoted leads only, not total contacts
   */
  // TODO: Replace with canonical metrics from analytics.metrics_campaign_yield_summary
  // Aggregate metrics (totalLeads, totalSent, successRate) have been removed
  // pending upstream implementation in nsd-ods-api
  const hasRunData = runs.length > 0;

  /**
   * Efficiency metrics from throughput API.
   * 
   * GOVERNANCE NOTE:
   * Only direct backend values are displayed.
   * utilizationRate computation has been removed - must be provided by
   * analytics.metrics_throughput_daily upstream.
   */
  // TODO: Replace utilizationRate with canonical metric from analytics.metrics_throughput_daily
  const efficiencyMetrics = throughput ? {
    // utilizationRate removed - must be computed upstream
    activeCampaigns: throughput.activeCampaigns,
    usedToday: throughput.usedToday,
    dailyLimit: throughput.dailyLimit,
  } : null;

  /**
   * Safety metrics from API.
   * 
   * GOVERNANCE NOTE:
   * Only direct backend values are displayed.
   * totalBlocked aggregation has been removed - must be provided by
   * analytics.metrics_campaign_safety_summary upstream.
   */
  // TODO: Replace totalBlocked with canonical metric from analytics.metrics_campaign_safety_summary
  const safetyMetrics = {
    blockedByThroughput: throughput?.blockedByThroughput || 0,
    // totalBlocked removed - must be computed upstream
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
          {/* 
            GOVERNANCE NOTE:
            All metrics displayed here come directly from API responses.
            No aggregations or rate computations are performed in the UI.
            
            Metrics requiring aggregation must be implemented upstream in nsd-ods-api:
            - analytics.metrics_campaign_yield_summary (totalLeads, totalSent, successRate)
            - analytics.metrics_throughput_daily (utilizationRate)
            - analytics.metrics_campaign_safety_summary (totalBlocked)
          */}
          
          {/* 
            Observed Yield - Currently showing placeholder until upstream metrics available.
            Lead counts do NOT include Tier C/D contacts.
            
            TODO: Replace with canonical metrics from analytics.metrics_campaign_yield_summary
          */}
          {hasRunData && (
            <MetricGroup
              title="Observed Yield"
              icon="chart"
              color="#3730A3"
              metrics={[
                // NOTE: Aggregate metrics removed per governance audit
                // Awaiting upstream implementation in analytics.metrics_campaign_yield_summary
                { label: 'Total Leads Attempted', value: 'Awaiting upstream metric' },
                { label: 'Successfully Sent', value: 'Awaiting upstream metric' },
                { label: 'Recent Runs Observed', value: runs.length },
              ]}
            />
          )}

          {/* 
            Efficiency metrics from throughput API.
            Utilization rate removed - must be computed upstream.
            
            TODO: Replace with canonical metrics from analytics.metrics_throughput_daily
          */}
          <MetricGroup
            title="Efficiency"
            icon="clock"
            color="#692BAA"
            metrics={[
              // NOTE: utilizationRate removed per governance audit - must be computed upstream
              { label: 'Daily Utilization', value: 'Awaiting upstream metric' },
              { label: 'Active Campaigns', value: efficiencyMetrics?.activeCampaigns ?? 'Not observed' },
              { label: 'Throughput Used Today', value: efficiencyMetrics?.usedToday ?? 'Not observed' },
              { label: 'Daily Limit', value: efficiencyMetrics?.dailyLimit ?? 'Not observed' },
            ]}
          />

          {/* 
            Run Quality - Shows count by status from API data.
            This displays individual run statuses, not computed aggregates.
          */}
          {hasRunData && (
            <MetricGroup
              title="Run Outcomes"
              icon="star"
              color="#3730A3"
              metrics={[
                // These are counts of observed run records, not computed metrics
                { label: 'Runs Observed', value: runs.length },
              ]}
            />
          )}

          {/* 
            Safety metrics from API.
            totalBlocked aggregation removed - must be computed upstream.
            
            TODO: Replace with canonical metrics from analytics.metrics_campaign_safety_summary
          */}
          <MetricGroup
            title="Safety"
            icon="shield"
            color="#991B1B"
            metrics={[
              { label: 'Blocked by Throughput', value: safetyMetrics.blockedByThroughput },
              // NOTE: totalBlocked removed per governance audit - must be computed upstream
              { label: 'Total Leads Blocked', value: 'Awaiting upstream metric' },
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
                          backgroundColor: run.status === 'COMPLETED' ? '#E0E7FF' : run.status === 'FAILED' ? '#FEE2E2' : '#FEF3C7',
                          color: run.status === 'COMPLETED' ? '#3730A3' : run.status === 'FAILED' ? '#991B1B' : '#92400E',
                          border: `1px solid ${run.status === 'COMPLETED' ? '#A5B4FC' : run.status === 'FAILED' ? '#FECACA' : '#FCD34D'}`,
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
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#3730A3', fontWeight: 500 }}>
                      {run.leadsSent}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.leadsBlocked > 0 ? '#991B1B' : '#6b7280' }}>
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
