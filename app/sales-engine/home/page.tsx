'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../design/components/Icon';
import { PageHeader, SectionCard, StatCard, StatusChip, Button, NavBar } from '../components/ui';
import { NSD_COLORS, NSD_TYPOGRAPHY, NSD_RADIUS } from '../lib/design-tokens';
import {
  getDashboardThroughput,
  getSystemNotices,
  getRecentRuns,
  getNeedsAttention,
} from '../lib/api';
import type {
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
  NeedsAttentionItem,
} from '../types/campaign';
import { isApiDisabled, featureFlags } from '../../../config/appConfig';

export default function SalesEngineHomePage() {
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRunOutcome[]>([]);
  const [attention, setAttention] = useState<NeedsAttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [throughputData, noticesData, runsData, attentionData] = await Promise.all([
          getDashboardThroughput(),
          getSystemNotices(),
          getRecentRuns(),
          getNeedsAttention(),
        ]);
        setThroughput(throughputData);
        setNotices(noticesData);
        setRecentRuns(runsData);
        setAttention(attentionData);
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
      <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: `3px solid ${NSD_COLORS.border.light}`, borderTopColor: NSD_COLORS.secondary, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: NSD_COLORS.text.secondary, fontSize: '14px' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const activeNotice = notices.find((n) => n.active);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: NSD_COLORS.surface }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 32px' }}>
        <PageHeader
          title="Sales Engine"
          description="Command center for campaign lifecycle management"
          actions={
            featureFlags.canCreateCampaign ? (
              <Link href="/sales-engine/campaigns/new" style={{ textDecoration: 'none' }}>
                <Button variant="cta" icon="plus">
                  New Campaign
                </Button>
              </Link>
            ) : (
              <Button 
                variant="cta" 
                icon="plus" 
                disabled 
                title="Campaign creation is disabled when API mode is disabled"
              >
                New Campaign
              </Button>
            )
          }
        />

        <NavBar active="dashboard" />

        {activeNotice && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 24px',
              backgroundColor: activeNotice.type === 'warning' ? '#fefce8' : activeNotice.type === 'error' ? '#fef2f2' : '#eff6ff',
              borderRadius: NSD_RADIUS.lg,
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <SectionCard title="Needs Attention" icon="warning" iconColor="#F59E0B">
            {attention.length === 0 ? (
              <p style={{ color: NSD_COLORS.text.muted, fontSize: '14px', textAlign: 'center', padding: '24px' }}>
                No items require attention
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {attention.slice(0, 5).map((item) => (
                  <AttentionRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </SectionCard>

          {throughput && (
            <SectionCard title="Today's Capacity" icon="chart" iconColor={NSD_COLORS.secondary}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: NSD_COLORS.text.secondary }}>Daily Usage</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: NSD_COLORS.text.primary }}>
                    {throughput.usedToday} / {throughput.dailyLimit}
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: NSD_COLORS.border.light, borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min((throughput.usedToday / throughput.dailyLimit) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: throughput.usedToday > throughput.dailyLimit * 0.9 ? NSD_COLORS.error : NSD_COLORS.success,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <p style={{ fontSize: '13px', color: NSD_COLORS.text.muted, marginTop: '8px' }}>
                  {throughput.dailyLimit - throughput.usedToday} remaining today
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
                  <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Active Campaigns</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: NSD_COLORS.success }}>{throughput.activeCampaigns}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: NSD_COLORS.surface, borderRadius: NSD_RADIUS.md }}>
                  <div style={{ fontSize: '12px', color: NSD_COLORS.text.muted, marginBottom: '4px' }}>Blocked</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: throughput.blockedByThroughput > 0 ? NSD_COLORS.error : NSD_COLORS.text.muted }}>{throughput.blockedByThroughput}</div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {recentRuns.length > 0 && (
          <SectionCard
            title="Recent Runs"
            icon="runs"
            iconColor={NSD_COLORS.secondary}
            headerAction={
              <Link href="/sales-engine/monitoring" style={{ fontSize: '13px', color: NSD_COLORS.secondary, textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                View all
                <Icon name="arrow-right" size={14} color={NSD_COLORS.secondary} />
              </Link>
            }
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sent</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: NSD_COLORS.text.muted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blocked</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.runId} style={{ borderBottom: `1px solid ${NSD_COLORS.border.light}` }}>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: NSD_COLORS.text.primary, fontWeight: 500 }}>
                      <Link href={`/sales-engine/campaigns/${run.campaignId}?tab=monitoring`} style={{ color: NSD_COLORS.text.primary, textDecoration: 'none' }}>
                        {run.campaignName}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusChip status={run.status} size="sm" />
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: NSD_COLORS.success, fontWeight: 500 }}>{run.leadsSent}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', color: run.leadsBlocked > 0 ? NSD_COLORS.error : NSD_COLORS.text.muted }}>{run.leadsBlocked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

/**
 * AttentionRow - Displays a campaign needing attention.
 * 
 * IMPORTANT: Copy must be governance-safe.
 * - No "Ready to start" (implies execution initiation)
 * - No "Auto-qualified" (leads require explicit promotion)
 * - Use "Pending" or "Awaiting" terminology
 */
function AttentionRow({ item }: { item: NeedsAttentionItem }) {
  // Governance-safe reason labels (no execution-first terminology)
  const reasonLabels: Record<string, string> = {
    in_review_stale: 'Awaiting review',
    pending_approval_stale: 'Awaiting review',
    approved_not_started: 'Approved – awaiting execution',
    approved_not_observed: 'Approved – not yet observed',
    run_failed: 'Execution failed',
    execution_failed: 'Execution failed',
    blocked: 'Blocked',
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 16px',
        backgroundColor: NSD_COLORS.surface,
        borderRadius: NSD_RADIUS.md,
        border: `1px solid ${NSD_COLORS.border.light}`,
      }}
    >
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: NSD_COLORS.text.primary, marginBottom: '4px' }}>
          {item.campaignName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusChip status={item.status} size="sm" />
          <span style={{ fontSize: '12px', color: NSD_COLORS.text.muted }}>
            {reasonLabels[item.reason] || item.reason}
          </span>
        </div>
      </div>
      <Link href={item.primaryAction.href} style={{ textDecoration: 'none' }}>
        <Button variant="secondary" size="sm">
          {item.primaryAction.label}
        </Button>
      </Link>
    </div>
  );
}
