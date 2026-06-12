'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { DashboardSection } from '../../../../components/dashboard/DashboardSection';
import { DashboardGrid } from '../../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { Icon } from '../../../../design/components/Icon';
import { DrilldownBreadcrumb } from '../components/adminto/DrilldownBreadcrumb';

// ─── Types ──────────────────────────────────────────────────────────────────

interface OutreachSummary {
  window: string;
  contactsSourced: number;
  leadsPushed: number;
  emailsSent: number;
  emailsBounced: number;
  emailsOpened: number;
  totalReplies: number;
  positiveReplies: number;
  negativeReplies: number;
  neutralReplies: number;
  optOutReplies: number;
  deliverabilityRate: number;
  replyRate: number;
  positiveReplyRate: number;
  openRate: number;
  /** Latest write into the ODS snapshot store backing this summary (ISO). */
  asOf?: string | null;
  _source: 'live' | 'default';
  _sourceName?: string;
}

type TimeWindow = '7d' | '14d' | '30d' | '90d';

/** D-16: snapshots older than this are flagged as stale. */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function parseAsOf(asOf: string | null | undefined): Date | null {
  if (!asOf) return null;
  const d = new Date(asOf);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatAsOf(d: Date): string {
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function staleDays(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  subtitle,
  format = 'number',
}: {
  label: string;
  value: number | null;
  subtitle?: string;
  format?: 'number' | 'percent' | 'rate';
}) {
  const tc = useThemeColors();

  let display = '—';
  if (value !== null && value !== undefined) {
    if (format === 'percent' || format === 'rate') {
      display = `${(value * 100).toFixed(1)}%`;
    } else {
      display = value.toLocaleString();
    }
  }

  return (
    <div
      style={{
        padding: space['5'],
        border: `1px solid ${tc.border.subtle}`,
        borderRadius: radius.lg,
        backgroundColor: tc.background.surface,
      }}
    >
      <p
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.semibold,
          color: value !== null ? tc.text.primary : tc.text.disabled,
          margin: 0,
        }}
      >
        {display}
      </p>
      <p
        style={{
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          color: tc.text.muted,
          marginTop: space['1'],
          margin: `${space['1']} 0 0 0`,
        }}
      >
        {label}
      </p>
      {subtitle && (
        <p
          style={{
            fontFamily: fontFamily.body,
            fontSize: fontSize.xs,
            color: tc.text.placeholder,
            marginTop: space['1'],
            margin: `${space['1']} 0 0 0`,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ─── Engagement Breakdown ───────────────────────────────────────────────────

function EngagementRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const tc = useThemeColors();
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space['3'], marginBottom: space['2'] }}>
      <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, width: 140, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 8, backgroundColor: tc.background.muted, borderRadius: radius.full, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: color, borderRadius: radius.full }} />
      </div>
      <span style={{ fontFamily: fontFamily.mono, fontSize: fontSize.sm, color: tc.text.muted, width: 60, textAlign: 'right' as const }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ColdOutreachPage() {
  const tc = useThemeColors();
  const [window, setWindow] = useState<TimeWindow>('30d');
  const [data, setData] = useState<OutreachSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proxy/cold-outreach-summary?window=${window}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [window]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isLive = data?._source === 'live';
  const hasData = data !== null && data.emailsSent > 0;

  // D-16: freshness of the ODS snapshot store backing this summary.
  const asOfDate = parseAsOf(data?.asOf);
  const isStale = asOfDate !== null && Date.now() - asOfDate.getTime() > STALE_THRESHOLD_MS;

  return (
    <DashboardGuard dashboard="marketing" fallback={<AccessDenied />}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: `${space['6']} ${space['4']}` }}>
        <DrilldownBreadcrumb items={[{ label: 'Marketing', href: '/dashboard/marketing' }, { label: 'Engines' }, { label: 'Cold Outreach' }]} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['6'] }}>
          <div>
            <h1
              style={{
                fontFamily: fontFamily.display,
                fontSize: fontSize['3xl'],
                fontWeight: fontWeight.semibold,
                color: tc.text.primary,
                marginBottom: space['1'],
                lineHeight: lineHeight.snug,
              }}
              data-testid="text-page-title"
            >
              Cold Outreach
            </h1>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
              Email sequences, reply rates, and pipeline from outbound campaigns.
            </p>
          </div>

          {/* Time window selector */}
          <div style={{ display: 'flex', gap: space['1'], backgroundColor: tc.background.muted, borderRadius: radius.md, padding: space['1'] }}>
            {(['7d', '14d', '30d', '90d'] as TimeWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                style={{
                  padding: `${space['1.5']} ${space['3']}`,
                  fontFamily: fontFamily.body,
                  fontSize: fontSize.sm,
                  fontWeight: window === w ? fontWeight.medium : fontWeight.normal,
                  color: window === w ? tc.text.primary : tc.text.muted,
                  backgroundColor: window === w ? tc.background.surface : 'transparent',
                  border: window === w ? `1px solid ${tc.border.subtle}` : '1px solid transparent',
                  borderRadius: radius.md,
                  cursor: 'pointer',
                }}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Connection status + provenance (D-16): this summary is served from
            ODS campaign metric snapshots written by scheduled syncs, not a
            live Smartlead read — name the source and show how fresh it is. */}
        {!loading && (
          <div
            data-testid="banner-outreach-provenance"
            style={{
              marginBottom: space['4'],
              padding: `${space['2']} ${space['3']}`,
              borderRadius: radius.md,
              backgroundColor: isLive && !isStale ? '#ECFDF5' : '#FEF3C7',
              fontSize: fontSize.sm,
              fontFamily: fontFamily.body,
              color: isLive && !isStale ? '#065F46' : '#92400E',
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: space['2'],
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isLive && !isStale ? '#10B981' : '#F59E0B', flexShrink: 0 }} />
            {!isLive ? (
              'Sales Engine unavailable — showing defaults'
            ) : (
              <>
                <span>
                  Connected to Sales Engine — data from ODS campaign snapshots (synced periodically, not a live Smartlead feed)
                </span>
                <span data-testid="text-outreach-as-of" style={{ opacity: 0.85 }}>
                  {asOfDate
                    ? `· snapshots as of ${formatAsOf(asOfDate)}`
                    : '· last snapshot time unavailable'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Staleness warning (D-16): snapshots older than 48h */}
        {!loading && isLive && isStale && asOfDate && (
          <div
            data-testid="banner-outreach-stale"
            style={{
              marginBottom: space['4'],
              padding: `${space['2']} ${space['3']}`,
              borderRadius: radius.md,
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              fontSize: fontSize.sm,
              fontFamily: fontFamily.body,
              color: '#991B1B',
              display: 'flex',
              alignItems: 'center',
              gap: space['2'],
            }}
          >
            <Icon name="warning" size={14} color="#991B1B" />
            Snapshot data is {staleDays(asOfDate)} day{staleDays(asOfDate) === 1 ? '' : 's'} old (last sync {formatAsOf(asOfDate)}). Metrics below may not reflect current campaign activity.
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: space['12'], color: tc.text.muted }}>
            <Icon name="refresh" size={24} color={tc.text.muted} />
            <p style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm }}>Loading outreach metrics...</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted }}>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base }}>Failed to load: {error}</p>
            <button onClick={fetchData} style={{ marginTop: space['3'], cursor: 'pointer', color: tc.text.primary, background: 'none', textDecoration: 'underline', border: 'none', fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
              Retry
            </button>
          </div>
        )}

        {/* KPIs */}
        {!loading && !error && data && (
          <>
            <DashboardSection title="Outreach KPIs" description={`${window} window`} index={0}>
              <DashboardGrid columns={{ sm: 2, md: 4, lg: 4 }}>
                <KpiCard label="Contacts Sourced" value={data.contactsSourced} />
                <KpiCard label="Leads Pushed" value={data.leadsPushed} subtitle="Exported to Smartlead" />
                <KpiCard label="Emails Sent" value={data.emailsSent} />
                <KpiCard label="Deliverability Rate" value={data.deliverabilityRate} format="rate" />
                <KpiCard label="Open Rate" value={data.openRate} format="rate" />
                <KpiCard label="Reply Rate" value={data.replyRate} format="rate" />
                <KpiCard label="Positive Reply Rate" value={data.positiveReplyRate} format="rate" />
                <KpiCard label="Total Replies" value={data.totalReplies} />
              </DashboardGrid>
            </DashboardSection>

            {/* Engagement Breakdown */}
            {hasData && (
              <DashboardSection title="Engagement Breakdown" description="Reply classification and delivery" index={1}>
                <div style={{ padding: space['5'], border: `1px solid ${tc.border.subtle}`, borderRadius: radius.lg, backgroundColor: tc.background.surface }}>
                  <EngagementRow label="Emails Opened" value={data.emailsOpened} total={data.emailsSent} color="#3B82F6" />
                  <EngagementRow label="Positive Replies" value={data.positiveReplies} total={data.totalReplies || 1} color="#10B981" />
                  <EngagementRow label="Neutral Replies" value={data.neutralReplies} total={data.totalReplies || 1} color="#F59E0B" />
                  <EngagementRow label="Negative Replies" value={data.negativeReplies} total={data.totalReplies || 1} color="#EF4444" />
                  <EngagementRow label="Opt-outs" value={data.optOutReplies} total={data.totalReplies || 1} color="#6B7280" />
                  <EngagementRow label="Bounced" value={data.emailsBounced} total={data.emailsSent} color="#9CA3AF" />
                </div>
              </DashboardSection>
            )}

            {/* Empty state */}
            {!hasData && isLive && (
              <DashboardSection title="No Outreach Data Yet" description="Data will appear here once campaigns start sending emails." index={1}>
                <div style={{ textAlign: 'center', padding: space['8'], color: tc.text.muted }}>
                  <Icon name="send" size={32} color={tc.text.placeholder} />
                  <p style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.base }}>
                    No emails have been sent in the selected time window. Run a campaign to see metrics here.
                  </p>
                </div>
              </DashboardSection>
            )}
          </>
        )}
      </div>
    </DashboardGuard>
  );
}
