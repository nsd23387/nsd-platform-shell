'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../../../design/components/Icon';
import {
  getDashboardThroughput,
  getSystemNotices,
  getRecentRuns,
} from '../lib/api';
import type {
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
} from '../types/campaign';

interface SalesEngineDashboardProps {
  onStatusFilter?: (status: string | null) => void;
}

/**
 * SalesEngineDashboard - Main dashboard component.
 * 
 * Updated for target-state architecture:
 * - Governance-first terminology (no "run/start/launch")
 * - Read-only observability focus
 * - Promoted leads terminology (not "contacts")
 * 
 * CRITICAL SEMANTIC DISTINCTION:
 * - Contacts and leads are distinct; leads are conditionally promoted.
 * - Lead counts reflect promoted leads only (Tier A/B).
 * - Tier C/D contacts are never leads.
 * - Promotion requires ICP fit AND real (non-placeholder) email.
 */
export function SalesEngineDashboard({ onStatusFilter }: SalesEngineDashboardProps) {
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRunOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [throughputData, noticesData, runsData] = await Promise.all([
          getDashboardThroughput(),
          getSystemNotices(),
          getRecentRuns(),
        ]);
        setThroughput(throughputData);
        setNotices(noticesData);
        setRecentRuns(runsData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#b91c1c', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  const activeNotice = notices.find((n) => n.active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
      {/* System notices */}
      {activeNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: '#fefce8',
            borderRadius: '12px',
            border: '1px solid #fde047',
          }}
        >
          <Icon name="warning" size={20} color="#ca8a04" />
          <span style={{ flex: 1, fontSize: '14px', color: '#854d0e', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
            {activeNotice.message}
          </span>
          <span style={{ fontSize: '12px', color: '#a16207' }}>
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Throughput Snapshot */}
        {throughput && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <Icon name="clock" size={20} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e1e4a', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
                Throughput Observability
              </h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Daily Capacity</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e1e4a' }}>
                  {throughput.usedToday} / {throughput.dailyLimit}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(throughput.usedToday / throughput.dailyLimit) * 100}%`,
                    height: '100%',
                    backgroundColor: '#10b981',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {throughput.dailyLimit - throughput.usedToday} remaining today
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Approved Campaigns</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#10b981' }}>{throughput.activeCampaigns}</div>
              </div>
              <div style={{ flex: 1, padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Blocked by Throughput</div>
                <div style={{ fontSize: '20px', fontWeight: 600, color: '#ef4444' }}>{throughput.blockedByThroughput}</div>
              </div>
            </div>

            <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#1e40af' }}>
                Throughput is managed by backend systems. This view is observational only.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Execution Outcomes (Observed) */}
      {recentRuns.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Icon name="runs" size={20} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e1e4a', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Recent Execution Outcomes
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Campaign</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                  {/* Lead count = promoted leads only, not total contacts */}
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Promoted Leads Attempted</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Sent</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Blocked</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.runId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#1e1e4a' }}>{run.campaignName}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          backgroundColor: run.status === 'COMPLETED' ? '#d1fae5' : run.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                          color: run.status === 'COMPLETED' ? '#065f46' : run.status === 'FAILED' ? '#991b1b' : '#92400e',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#6b7280' }}>{run.leadsAttempted}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#10b981' }}>{run.leadsSent}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#ef4444' }}>{run.leadsBlocked}</td>
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
