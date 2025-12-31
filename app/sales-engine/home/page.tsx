'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { StatusBadge } from '../components/StatusBadge';
import {
  getDashboardReadiness,
  getDashboardThroughput,
  getSystemNotices,
  getRecentRuns,
  listCampaigns,
} from '../lib/api';
import type {
  DashboardReadiness,
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
  Campaign,
} from '../types/campaign';

export default function SalesEngineHomePage() {
  const [readiness, setReadiness] = useState<DashboardReadiness | null>(null);
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRunOutcome[]>([]);
  const [attentionCampaigns, setAttentionCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [readinessData, throughputData, noticesData, runsData, campaignsData] = await Promise.all([
          getDashboardReadiness(),
          getDashboardThroughput(),
          getSystemNotices(),
          getRecentRuns(),
          listCampaigns('PENDING_REVIEW'),
        ]);
        setReadiness(readinessData);
        setThroughput(throughputData);
        setNotices(noticesData);
        setRecentRuns(runsData);
        setAttentionCampaigns(campaignsData.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeNotice = notices.find((n) => n.active);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
              Sales Engine
            </h1>
            <p style={{ margin: '8px 0 0 0', fontSize: '15px', color: '#6b7280', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
              Command center for campaign lifecycle management
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/sales-engine"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#fff',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                textDecoration: 'none',
              }}
            >
              <Icon name="campaigns" size={16} color="#6b7280" />
              All Campaigns
            </Link>
            <Link
              href="/sales-engine/campaigns/new"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#4f46e5',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '8px',
                textDecoration: 'none',
              }}
            >
              <Icon name="plus" size={16} color="#fff" />
              New Campaign
            </Link>
          </div>
        </div>

        {activeNotice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 24px',
              backgroundColor: activeNotice.type === 'warning' ? '#fefce8' : activeNotice.type === 'error' ? '#fef2f2' : '#eff6ff',
              borderRadius: '12px',
              border: `1px solid ${activeNotice.type === 'warning' ? '#fde047' : activeNotice.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
              marginBottom: '32px',
            }}
          >
            <Icon name="info" size={20} color={activeNotice.type === 'warning' ? '#ca8a04' : activeNotice.type === 'error' ? '#dc2626' : '#2563eb'} />
            <span style={{ flex: 1, fontSize: '14px', color: activeNotice.type === 'warning' ? '#854d0e' : activeNotice.type === 'error' ? '#991b1b' : '#1e40af' }}>
              {activeNotice.message}
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
          {readiness && (
            <>
              <MetricCard label="Total Campaigns" value={readiness.total} color="#8b5cf6" icon="campaigns" />
              <MetricCard label="Draft" value={readiness.draft} color="#f59e0b" icon="draft" />
              <MetricCard label="Pending Review" value={readiness.pendingReview} color="#3b82f6" icon="review" />
              <MetricCard label="Approved & Ready" value={readiness.runnable} color="#10b981" icon="check" />
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          {attentionCampaigns.length > 0 && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Icon name="warning" size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
                  Attention Required
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attentionCampaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/sales-engine/campaigns/${campaign.id}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500 }}>{campaign.name}</span>
                    <StatusBadge status={campaign.status} size="sm" />
                  </Link>
                ))}
              </div>
              <Link
                href="/sales-engine/approvals"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                  fontSize: '13px',
                  color: '#4f46e5',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                View all pending approvals
                <Icon name="arrow-right" size={14} color="#4f46e5" />
              </Link>
            </div>
          )}

          {throughput && (
            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <Icon name="chart" size={20} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
                  Today's Throughput
                </h3>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Daily Capacity</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {throughput.usedToday} / {throughput.dailyLimit}
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min((throughput.usedToday / throughput.dailyLimit) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: throughput.usedToday > throughput.dailyLimit * 0.9 ? '#ef4444' : '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                  {throughput.dailyLimit - throughput.usedToday} remaining today
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Active Campaigns</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>{throughput.activeCampaigns}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Blocked</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: throughput.blockedByThroughput > 0 ? '#ef4444' : '#6b7280' }}>{throughput.blockedByThroughput}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {recentRuns.length > 0 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Icon name="runs" size={20} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827', fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
                  Recent Activity
                </h3>
              </div>
              <Link
                href="/sales-engine/monitoring"
                style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                View all
                <Icon name="arrow-right" size={14} color="#4f46e5" />
              </Link>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Campaign</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Leads Sent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Blocked</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.runId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>{run.campaignName}</td>
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
                        {run.status === 'COMPLETED' ? 'Completed' : run.status === 'FAILED' ? 'Failed' : 'Partial'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: '#10b981', fontWeight: 500 }}>{run.leadsSent}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.leadsBlocked > 0 ? '#ef4444' : '#6b7280' }}>{run.leadsBlocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Icon name={icon as any} size={18} color={color} />
        <span style={{ fontSize: '13px', color: '#6b7280', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '36px', fontWeight: 700, color, fontFamily: 'var(--font-display, Poppins, sans-serif)' }}>
        {value}
      </div>
    </div>
  );
}
