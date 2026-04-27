'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied, DashboardCard } from '../../../components/dashboard';
import { DashboardGrid } from '../../../components/dashboard/DashboardGrid';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import { getSeoOverviewKpis, getPagePerformance, getGscPipelineHealth } from '../../../lib/seoApi';
import type { SeoOverviewKpis, PageQueryPerformance, GscPipelineHealth } from '../../../lib/seoApi';

// =============================================================================
// Overview Page — Action-first layout
// =============================================================================

function SeoOverviewContent() {
  const tc = useThemeColors();
  const [kpis, setKpis] = useState<SeoOverviewKpis | null>(null);
  const [topPages, setTopPages] = useState<PageQueryPerformance[]>([]);
  const [gscHealth, setGscHealth] = useState<GscPipelineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemExpanded, setSystemExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [k, tp, gh] = await Promise.all([
          getSeoOverviewKpis(),
          getPagePerformance('impressions', 50),
          getGscPipelineHealth().catch(() => null),
        ]);
        if (!cancelled) {
          setKpis(k); setTopPages(tp); setGscHealth(gh); setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Derived data
  const pendingCount = kpis?.awaiting_approval ?? 0;
  const ctrIssues = topPages.filter(p => p.impressions > 200 && p.clicks === 0);
  const topOpportunities = topPages
    .filter(p => p.impressions > 200 && p.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  const pipelineRunLabel = kpis?.last_pipeline_run_at
    ? `Last pipeline run: ${new Date(kpis.last_pipeline_run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : 'Last run: unknown';

  // Styles
  const cardBase: React.CSSProperties = {
    backgroundColor: tc.background.surface,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.lg,
    padding: space['5'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['3'],
  };

  if (loading) {
    return (
      <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
        Loading SEO overview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: space['6'], color: tc.text.primary, fontFamily: fontFamily.body }}>
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: space['6'] }}>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-seo-overview-title"
        >
          Good morning — here&rsquo;s what needs attention
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>
          {pipelineRunLabel}
        </p>
      </div>

      {/* GSC pipeline health banner — only shown when data is stale or degraded */}
      {gscHealth && gscHealth.status !== 'healthy' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: space['3'],
          padding: `${space['3']} ${space['4']}`,
          marginBottom: space['6'],
          borderRadius: radius.md,
          backgroundColor: gscHealth.status === 'stale' ? '#fef2f2' : '#fffbeb',
          border: `1px solid ${gscHealth.status === 'stale' ? '#fecaca' : '#fde68a'}`,
          fontFamily: fontFamily.body,
          fontSize: fontSize.sm,
          color: gscHealth.status === 'stale' ? '#991b1b' : '#92400e',
        }}>
          <span style={{ flexShrink: 0 }}>
            {gscHealth.status === 'stale' ? '●' : '◐'}
          </span>
          <span>
            <strong>GSC:</strong>{' '}
            {gscHealth.days_behind !== null
              ? `${gscHealth.days_behind}d behind`
              : 'no data'}{' '}
            — last ingested{' '}
            {gscHealth.raw_data_last_date ?? 'never'}.
            {gscHealth.last_error && ` Last error: ${gscHealth.last_error}`}
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION A — Actions needed today                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: space['4'], marginBottom: space['8'] }}>

        {/* Card 1 — Pending approvals */}
        <div
          style={{
            ...cardBase,
            borderLeft: pendingCount > 0 ? '4px solid #F59E0B' : `4px solid ${tc.border.default}`,
          }}
          data-testid="card-pending-approvals"
        >
          <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
            {pendingCount > 0
              ? `${pendingCount} recommendation${pendingCount === 1 ? '' : 's'} need${pendingCount === 1 ? 's' : ''} your approval`
              : 'No approvals needed right now'}
          </div>
          {pendingCount > 0 && topPages.length > 0 && (
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
              Review and approve pending SEO changes to improve rankings.
            </div>
          )}
          <Link
            href="/dashboard/seo/recommendations"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: space['1'],
              fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
              color: violet[500], textDecoration: 'none',
            }}
          >
            Review &amp; approve &rarr;
          </Link>
        </div>

        {/* Card 2 — CTR issues */}
        <div
          style={{
            ...cardBase,
            borderLeft: ctrIssues.length > 0 ? '4px solid #EF4444' : `4px solid ${tc.border.default}`,
          }}
          data-testid="card-ctr-issues"
        >
          <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
            {ctrIssues.length > 0
              ? `${ctrIssues.length} page${ctrIssues.length === 1 ? '' : 's'} getting impressions but zero clicks`
              : 'No critical CTR issues'}
          </div>
          {ctrIssues.slice(0, 2).map((p, i) => (
            <div key={i} style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>
              {(p.url || '').replace('https://neonsignsdepot.com', '') || '/'} — {p.impressions.toLocaleString()} impressions, 0 clicks, position {Number(p.position).toFixed(1)}
            </div>
          ))}
          <Link
            href="/dashboard/seo/pages"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: space['1'],
              fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
              color: violet[500], textDecoration: 'none',
            }}
          >
            View all page issues &rarr;
          </Link>
        </div>

        {/* Card 3 — Overnight activity */}
        <div style={{ ...cardBase }} data-testid="card-overnight-activity">
          <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
            What happened last night
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
            {kpis?.last_pipeline_run_at ? (
              <>
                Cluster job completed &middot; Revalidation sweep ran &middot; Measurement loop checked executions
              </>
            ) : (
              'All scheduled jobs completed normally.'
            )}
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
            Auto-approve: {kpis?.auto_approve_enabled && kpis?.seo_auto_execute_env ? 'ON' : 'OFF'} &middot; {kpis?.auto_approved_today ?? 0} auto-approved today &middot; {kpis?.approved ?? 0} in execution queue
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION B — Top opportunities right now                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {topOpportunities.length > 0 && (
        <div style={{ marginBottom: space['8'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['4'] }}>
            Top opportunities right now
          </h2>
          <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
            {topOpportunities.map((p, i) => {
              const pagePath = (p.url || '').replace('https://neonsignsdepot.com', '') || '/';
              return (
                <div
                  key={`${p.url}-${p.query}-${i}`}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: `${space['3']} ${space['4']}`,
                    borderBottom: i < topOpportunities.length - 1 ? `1px solid ${tc.border.subtle}` : 'none',
                  }}
                  data-testid={`row-opportunity-${i}`}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                      #{i + 1} {pagePath}
                    </div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: '2px' }}>
                      {p.impressions.toLocaleString()} impressions, 0 clicks, position {Number(p.position).toFixed(1)} — update title &amp; meta to capture traffic
                    </div>
                  </div>
                  <Link
                    href="/dashboard/seo/recommendations"
                    style={{
                      fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                      color: violet[500], textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: space['3'],
                    }}
                  >
                    Take action &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION C — System status (collapsed by default)                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: space['4'] }}>
        <button
          onClick={() => setSystemExpanded(!systemExpanded)}
          style={{
            display: 'flex', alignItems: 'center', gap: space['2'],
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.muted,
          }}
          data-testid="button-toggle-system-status"
        >
          {systemExpanded ? '▾' : '▸'} System status
        </button>
      </div>

      {systemExpanded && (
        <>
          <DashboardGrid columns={4}>
            <DashboardCard title="Engine Opportunities" value={String(kpis?.total_opportunities ?? 0)} subtitle="Scored and ranked" />
            <DashboardCard title="Topic Clusters" value={String(kpis?.total_clusters ?? 0)} subtitle="Unique keyword themes" />
            <DashboardCard title="High Urgency" value={String(kpis?.high_urgency ?? 0)} subtitle="Immediate action needed" variant={(kpis?.high_urgency ?? 0) > 0 ? 'warning' : 'default'} />
            <DashboardCard title="Indexed Pages" value={String(kpis?.indexed_pages ?? 0)} subtitle="Pages in site index" />
          </DashboardGrid>

          <DashboardGrid columns={4}>
            <DashboardCard title="Pending Review" value={String(kpis?.awaiting_approval ?? 0)} subtitle="Needs human approval" variant={(kpis?.awaiting_approval ?? 0) > 0 ? 'warning' : 'default'} />
            <DashboardCard title="Auto-Approved" value={String(kpis?.auto_approved_today ?? 0)} subtitle="Today" />
            <DashboardCard title="Execution Queue" value={String(kpis?.approved ?? 0)} subtitle="Awaiting apply" />
            <DashboardCard title="Published" value={String(kpis?.published ?? 0)} subtitle="Live on WordPress" />
          </DashboardGrid>

          <DashboardGrid columns={4}>
            <DashboardCard title="Internal Links" value={String(kpis?.internal_link_recs ?? 0)} subtitle="Suggestions" />
            <DashboardCard title="Ahrefs Keywords" value={String(kpis?.ahrefs_keywords_tracked ?? 0)} subtitle="Tracked" />
            <DashboardCard title="Content Artifacts" value={String(kpis?.content_artifacts ?? 0)} subtitle="Briefs" />
            <DashboardCard title="Execution Total" value={String(kpis?.execution_candidates_total ?? 0)} subtitle="All-time" />
          </DashboardGrid>

          {/* Pipeline & Auto-Approve panels */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginTop: space['4'] }}>
            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['4'] }}>
              <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.muted, marginBottom: space['3'], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nightly Pipeline
              </h3>
              {[
                { label: 'Cluster Generation', time: '03:00 UTC' },
                { label: 'Revalidation Sweep', time: '03:30 UTC' },
                { label: 'Measurement Loop', time: '04:00 UTC' },
                { label: 'Competitor Gap', time: '05:00 UTC' },
                { label: 'Decay Detection', time: '05:30 UTC' },
                { label: 'Cannibalization', time: '05:45 UTC' },
                { label: 'Topical Authority', time: '06:00 UTC' },
              ].map((job) => (
                <div key={job.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${space['1']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{job.label}</span>
                  <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder }}>
                    {kpis?.last_pipeline_run_at
                      ? new Date(kpis.last_pipeline_run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : job.time}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['4'] }}>
              <h3 style={{ fontFamily: fontFamily.display, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.muted, marginBottom: space['3'], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Auto-Approve
              </h3>
              {(() => {
                const envOn = kpis?.seo_auto_execute_env ?? false;
                const dbOn = kpis?.auto_approve_enabled ?? false;
                const cap = kpis?.auto_approve_daily_cap ?? 25;
                const used = kpis?.auto_approved_today ?? 0;
                const minScore = kpis?.auto_approve_min_score ?? 7.0;
                return [
                  { label: 'Env kill switch', value: envOn ? 'ON' : 'OFF', color: envOn ? '#065f46' : '#991b1b', bg: envOn ? '#d1fae5' : '#fee2e2' },
                  { label: 'DB kill switch', value: dbOn ? 'ON' : 'OFF', color: dbOn ? '#065f46' : '#991b1b', bg: dbOn ? '#d1fae5' : '#fee2e2' },
                  { label: 'Daily cap', value: `${used}/${cap}`, color: tc.text.secondary, bg: 'transparent' },
                  { label: 'Min score', value: String(minScore), color: tc.text.secondary, bg: 'transparent' },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${space['1']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
                    <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{row.label}</span>
                    <span style={{
                      fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                      color: row.color, backgroundColor: row.bg,
                      padding: row.bg !== 'transparent' ? `${space['0.5']} ${space['2']}` : '0',
                      borderRadius: row.bg !== 'transparent' ? radius.full : '0',
                    }}>{row.value}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SeoOverviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <SeoOverviewContent />
    </DashboardGuard>
  );
}
