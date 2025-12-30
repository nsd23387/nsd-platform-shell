'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type {
  DashboardReadiness,
  DashboardThroughput,
  SystemNotice,
  RecentRunOutcome,
  CampaignStatus,
  BlockingReason,
} from '../types/campaign';
import {
  getDashboardReadiness,
  getDashboardThroughput,
  getSystemNotices,
  getRecentRuns,
} from '../lib/api';
import { Icon } from '../../../design/components/Icon';
import { background, text, border, violet, magenta, semantic } from '../../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight } from '../../../design/tokens/typography';

interface SalesEngineDashboardProps {
  onStatusFilter?: (status: CampaignStatus | 'ALL') => void;
}

export function SalesEngineDashboard({ onStatusFilter }: SalesEngineDashboardProps) {
  const [readiness, setReadiness] = useState<DashboardReadiness | null>(null);
  const [throughput, setThroughput] = useState<DashboardThroughput | null>(null);
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRunOutcome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [readinessData, throughputData, noticesData, runsData] = await Promise.all([
          getDashboardReadiness(),
          getDashboardThroughput(),
          getSystemNotices(),
          getRecentRuns(),
        ]);
        setReadiness(readinessData);
        setThroughput(throughputData);
        setNotices(noticesData);
        setRecentRuns(runsData);
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
      <div style={{
        padding: '32px',
        backgroundColor: background.surface,
        borderRadius: '20px',
        border: `1px solid ${border.subtle}`,
        marginBottom: '40px',
        textAlign: 'center',
      }}>
        <p style={{ color: text.muted, fontFamily: fontFamily.body }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '48px' }}>
      {notices.length > 0 && <SystemNoticesPanel notices={notices} />}
      
      {readiness && (
        <CampaignHealthPanel readiness={readiness} onStatusFilter={onStatusFilter} />
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
        {readiness && <ReadinessBlockersPanel readiness={readiness} />}
        {throughput && <ThroughputSnapshotPanel throughput={throughput} />}
      </div>
      
      {recentRuns.length > 0 && <RecentRunsPanel runs={recentRuns} />}
    </div>
  );
}

function SystemNoticesPanel({ notices }: { notices: SystemNotice[] }) {
  const noticeColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    INFO: { bg: semantic.info.light, border: semantic.info.base, text: semantic.info.dark, icon: semantic.info.base },
    WARNING: { bg: semantic.warning.light, border: semantic.warning.base, text: semantic.warning.dark, icon: semantic.warning.base },
    ERROR: { bg: semantic.danger.light, border: semantic.danger.base, text: semantic.danger.dark, icon: semantic.danger.base },
  };

  return (
    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {notices.map((notice) => {
        const colors = noticeColors[notice.type] || noticeColors.INFO;
        return (
          <div
            key={notice.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px 20px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
            }}
          >
            <Icon name="alert" size={18} color={colors.icon} />
            <span style={{ color: colors.text, fontSize: fontSize.sm, fontFamily: fontFamily.body, flex: 1 }}>
              {notice.message}
            </span>
            <span style={{ color: colors.text, fontSize: fontSize.xs, fontFamily: fontFamily.body, opacity: 0.7 }}>
              {new Date(notice.timestamp).toLocaleTimeString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CampaignHealthPanel({
  readiness,
  onStatusFilter,
}: {
  readiness: DashboardReadiness;
  onStatusFilter?: (status: CampaignStatus | 'ALL') => void;
}) {
  const statusCards: { status: CampaignStatus | 'ALL'; label: string; count: number; color: string }[] = [
    { status: 'ALL', label: 'Total', count: readiness.total_campaigns, color: violet[600] },
    { status: 'DRAFT', label: 'Draft', count: readiness.by_status.DRAFT || 0, color: text.secondary },
    { status: 'PENDING_REVIEW', label: 'Pending Review', count: readiness.by_status.PENDING_REVIEW || 0, color: semantic.warning.base },
    { status: 'RUNNABLE', label: 'Runnable', count: readiness.by_status.RUNNABLE || 0, color: semantic.success.base },
    { status: 'ARCHIVED', label: 'Archived', count: readiness.by_status.ARCHIVED || 0, color: text.muted },
  ];

  return (
    <div style={{
      backgroundColor: background.surface,
      borderRadius: '20px',
      padding: '28px',
      border: `1px solid ${border.subtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Icon name="metrics" size={20} color={violet[600]} />
        <h3 style={{
          margin: 0,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.medium,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Campaign Health
        </h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {statusCards.map((card) => (
          <button
            key={card.status}
            onClick={() => onStatusFilter?.(card.status)}
            style={{
              padding: '20px',
              backgroundColor: background.muted,
              borderRadius: '14px',
              border: `1px solid ${border.subtle}`,
              cursor: onStatusFilter ? 'pointer' : 'default',
              textAlign: 'center',
              transition: 'border-color 0.2s',
            }}
          >
            <p style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: fontWeight.semibold,
              color: card.color,
              fontFamily: fontFamily.body,
            }}>
              {card.count}
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: fontSize.sm,
              color: text.muted,
              fontFamily: fontFamily.body,
            }}>
              {card.label}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadinessBlockersPanel({ readiness }: { readiness: DashboardReadiness }) {
  const blockerLabels: Record<BlockingReason, string> = {
    MISSING_HUMAN_APPROVAL: 'Missing human approval',
    KILL_SWITCH_ENABLED: 'Kill switch active',
    NO_LEADS_PERSISTED: 'No leads persisted',
    PERSISTENCE_ERRORS: 'Persistence errors',
    SMARTLEAD_NOT_CONFIGURED: 'SmartLead not configured',
    INSUFFICIENT_CREDITS: 'Insufficient credits',
  };

  const activeBlockers = Object.entries(readiness.blockers)
    .filter(([, count]) => count > 0)
    .map(([code, count]) => ({
      code: code as BlockingReason,
      label: blockerLabels[code as BlockingReason] || code,
      count,
    }));

  return (
    <div style={{
      backgroundColor: background.surface,
      borderRadius: '20px',
      padding: '28px',
      border: `1px solid ${border.subtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Icon name="shield" size={20} color={semantic.danger.base} />
        <h3 style={{
          margin: 0,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.medium,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Readiness Blockers
        </h3>
      </div>

      {activeBlockers.length === 0 ? (
        <div style={{
          padding: '24px',
          backgroundColor: semantic.success.light,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <Icon name="check" size={18} color={semantic.success.base} />
          <span style={{ color: semantic.success.dark, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
            No active blockers
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeBlockers.map((blocker) => (
            <div
              key={blocker.code}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                backgroundColor: semantic.danger.light,
                borderRadius: '10px',
                border: '1px solid #fecaca',
              }}
            >
              <span style={{
                color: semantic.danger.dark,
                fontSize: fontSize.sm,
                fontFamily: fontFamily.body,
              }}>
                {blocker.label}
              </span>
              <span style={{
                padding: '4px 12px',
                backgroundColor: semantic.danger.base,
                color: text.inverse,
                borderRadius: '20px',
                fontSize: fontSize.xs,
                fontWeight: fontWeight.semibold,
                fontFamily: fontFamily.body,
              }}>
                {blocker.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ThroughputSnapshotPanel({ throughput }: { throughput: DashboardThroughput }) {
  const dailyPercentage = (throughput.daily_used / throughput.daily_limit) * 100;
  const isNearLimit = dailyPercentage > 80;

  return (
    <div style={{
      backgroundColor: background.surface,
      borderRadius: '20px',
      padding: '28px',
      border: `1px solid ${border.subtle}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Icon name="runs" size={20} color={violet[600]} />
        <h3 style={{
          margin: 0,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.medium,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Throughput Snapshot
        </h3>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: text.secondary, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
            Daily Capacity
          </span>
          <span style={{ color: text.primary, fontSize: fontSize.sm, fontWeight: fontWeight.medium, fontFamily: fontFamily.body }}>
            {throughput.daily_used} / {throughput.daily_limit}
          </span>
        </div>
        <div style={{
          height: '8px',
          backgroundColor: border.default,
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(dailyPercentage, 100)}%`,
            height: '100%',
            backgroundColor: isNearLimit ? semantic.warning.base : semantic.success.base,
            transition: 'width 0.3s',
          }} />
        </div>
        <p style={{
          margin: '8px 0 0 0',
          color: text.muted,
          fontSize: fontSize.xs,
          fontFamily: fontFamily.body,
        }}>
          {throughput.daily_remaining} remaining today
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: background.muted,
          borderRadius: '12px',
        }}>
          <p style={{ margin: 0, fontSize: fontSize.xs, color: text.muted, fontFamily: fontFamily.body }}>
            Active Campaigns
          </p>
          <p style={{ margin: '6px 0 0 0', fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: violet[600], fontFamily: fontFamily.body }}>
            {throughput.active_campaigns_count}
          </p>
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: throughput.blocked_by_throughput_count > 0 ? semantic.danger.light : background.muted,
          borderRadius: '12px',
        }}>
          <p style={{ margin: 0, fontSize: fontSize.xs, color: throughput.blocked_by_throughput_count > 0 ? semantic.danger.dark : text.muted, fontFamily: fontFamily.body }}>
            Blocked by Throughput
          </p>
          <p style={{
            margin: '6px 0 0 0',
            fontSize: fontSize.xl,
            fontWeight: fontWeight.semibold,
            color: throughput.blocked_by_throughput_count > 0 ? semantic.danger.base : text.muted,
            fontFamily: fontFamily.body,
          }}>
            {throughput.blocked_by_throughput_count}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecentRunsPanel({ runs }: { runs: RecentRunOutcome[] }) {
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    COMPLETED: { bg: semantic.success.light, text: semantic.success.dark, border: semantic.success.base },
    PARTIAL: { bg: semantic.warning.light, text: semantic.warning.dark, border: semantic.warning.base },
    BLOCKED: { bg: semantic.danger.light, text: semantic.danger.dark, border: semantic.danger.base },
    FAILED: { bg: semantic.danger.light, text: semantic.danger.dark, border: semantic.danger.base },
  };

  return (
    <div style={{
      backgroundColor: background.surface,
      borderRadius: '20px',
      padding: '28px',
      border: `1px solid ${border.subtle}`,
      marginTop: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Icon name="campaign" size={20} color={violet[600]} />
        <h3 style={{
          margin: 0,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.medium,
          color: text.primary,
          fontFamily: fontFamily.display,
        }}>
          Recent Run Outcomes
        </h3>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${border.default}` }}>
              <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Campaign
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
              <th style={{ textAlign: 'left', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Time
              </th>
              <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attempted
              </th>
              <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sent
              </th>
              <th style={{ textAlign: 'right', padding: '12px', color: text.muted, fontWeight: fontWeight.medium, fontSize: fontSize.xs, fontFamily: fontFamily.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blocked
              </th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const colors = statusColors[run.status] || statusColors.COMPLETED;
              return (
                <tr key={run.id} style={{ borderBottom: `1px solid ${border.subtle}` }}>
                  <td style={{ padding: '14px 12px' }}>
                    <Link
                      href={`/sales-engine/campaigns/${run.campaign_id}`}
                      style={{
                        color: violet[600],
                        textDecoration: 'none',
                        fontSize: fontSize.sm,
                        fontFamily: fontFamily.body,
                        fontWeight: fontWeight.medium,
                      }}
                    >
                      {run.campaign_name}
                    </Link>
                  </td>
                  <td style={{ padding: '14px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      backgroundColor: colors.bg,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      fontSize: fontSize.xs,
                      fontWeight: fontWeight.medium,
                      fontFamily: fontFamily.body,
                    }}>
                      {run.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 12px', color: text.secondary, fontSize: fontSize.sm, fontFamily: fontFamily.body }}>
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 12px', color: text.secondary, fontSize: fontSize.sm, fontFamily: fontFamily.body, textAlign: 'right' }}>
                    {run.leads_attempted}
                  </td>
                  <td style={{ padding: '14px 12px', color: semantic.success.dark, fontSize: fontSize.sm, fontFamily: fontFamily.body, textAlign: 'right' }}>
                    {run.leads_sent}
                  </td>
                  <td style={{ padding: '14px 12px', color: run.leads_blocked > 0 ? semantic.danger.base : text.muted, fontSize: fontSize.sm, fontFamily: fontFamily.body, textAlign: 'right' }}>
                    {run.leads_blocked}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
