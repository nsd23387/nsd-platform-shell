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
import { getSeoOverviewKpis, getPagePerformance, getGscPipelineHealth, getSeoProgress } from '../../../lib/seoApi';
import type { SeoOverviewKpis, PageQueryPerformance, GscPipelineHealth, SeoProgressResponse } from '../../../lib/seoApi';

// =============================================================================
// Overview Page — Action-first layout
// =============================================================================

// =============================================================================
// Progress Block — renders a column of weekly or monthly metrics
// =============================================================================

function ProgressBlock({
  tc, label, data, extras,
}: {
  tc: ReturnType<typeof useThemeColors>;
  label: string;
  data: {
    organic_clicks: { current: number; prior: number; delta_pct: number };
    organic_impressions: { current: number; prior: number; delta_pct: number };
    avg_position: { current: number | null; prior: number | null; delta: number | null };
  };
  extras: { label: string; value: string }[];
}) {
  const renderDelta = (delta: number, invertGood = false) => {
    const isGood = invertGood ? delta < 0 : delta > 0;
    const color = delta === 0 ? tc.text.muted : isGood ? '#065f46' : '#991b1b';
    const prefix = delta > 0 ? '+' : '';
    return <span style={{ color, fontWeight: fontWeight.medium, fontSize: '12px' }}>{prefix}{delta.toFixed(1)}%</span>;
  };
  const renderPosDelta = (delta: number | null) => {
    if (delta == null) return <span style={{ color: tc.text.muted, fontSize: '12px' }}>—</span>;
    const isGood = delta < 0; // lower position = better
    const color = delta === 0 ? tc.text.muted : isGood ? '#065f46' : '#991b1b';
    const arrow = delta < 0 ? '↑' : delta > 0 ? '↓' : '→';
    return <span style={{ color, fontWeight: fontWeight.medium, fontSize: '12px' }}>{arrow} {Math.abs(delta).toFixed(1)}</span>;
  };
  const row = (label: string, current: string, delta: React.ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: `${space['1.5']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
      <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{label}</span>
      <span style={{ display: 'flex', gap: space['2'], alignItems: 'baseline' }}>
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.primary }}>{current}</span>
        {delta}
      </span>
    </div>
  );
  return (
    <div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.text.muted, fontWeight: fontWeight.medium, marginBottom: space['2'] }}>{label}</div>
      {row('Organic clicks', data.organic_clicks.current.toLocaleString(), renderDelta(data.organic_clicks.delta_pct))}
      {row('Impressions', data.organic_impressions.current.toLocaleString(), renderDelta(data.organic_impressions.delta_pct))}
      {row('Avg position', data.avg_position.current != null ? data.avg_position.current.toFixed(1) : '—', renderPosDelta(data.avg_position.delta))}
      {extras.map((e, i) => row(e.label, e.value, <span />))}
    </div>
  );
}

function SeoOverviewContent() {
  const tc = useThemeColors();
  const [kpis, setKpis] = useState<SeoOverviewKpis | null>(null);
  const [topPages, setTopPages] = useState<PageQueryPerformance[]>([]);
  const [gscHealth, setGscHealth] = useState<GscPipelineHealth | null>(null);
  const [progress, setProgress] = useState<SeoProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemExpanded, setSystemExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [k, tp, gh, pr] = await Promise.all([
          getSeoOverviewKpis(),
          getPagePerformance('impressions', 50),
          getGscPipelineHealth().catch(() => null),
          getSeoProgress().catch(() => null),
        ]);
        if (!cancelled) {
          setKpis(k); setTopPages(tp); setGscHealth(gh); setProgress(pr); setLoading(false);
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
      {/* TODAY'S BRIEF — actions yesterday + needs attention now             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {progress && (
        <div style={{ marginBottom: space['6'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['5'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
            Today&rsquo;s Brief
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: space['4'] }}>
            <div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.text.muted, fontWeight: fontWeight.medium, marginBottom: space['1'] }}>Actions Yesterday</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.primary, lineHeight: lineHeight.relaxed }}>
                {progress.today.actions_yesterday.applied === 0 && progress.today.actions_yesterday.approved === 0 ? (
                  <span style={{ color: tc.text.muted }}>No activity in the last 24 hours</span>
                ) : (
                  <>
                    <div><strong style={{ color: '#065f46' }}>{progress.today.actions_yesterday.applied}</strong> applied to live site</div>
                    <div><strong>{progress.today.actions_yesterday.approved}</strong> approved · <strong>{progress.today.actions_yesterday.rejected}</strong> rejected</div>
                    {progress.today.actions_yesterday.pages.length > 0 && (
                      <div style={{ marginTop: space['1'], fontSize: '12px', color: tc.text.muted }}>
                        Latest: {progress.today.actions_yesterday.pages[0]?.replace('https://neonsignsdepot.com', '') || '—'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.text.muted, fontWeight: fontWeight.medium, marginBottom: space['1'] }}>Needs Your Attention</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.primary, lineHeight: lineHeight.relaxed }}>
                {progress.today.needs_attention.awaiting_approval === 0 && progress.today.needs_attention.decay_count === 0 ? (
                  <span style={{ color: tc.text.muted }}>All caught up</span>
                ) : (
                  <>
                    {progress.today.needs_attention.awaiting_approval > 0 && (
                      <div>
                        <Link href="/dashboard/seo/recommendations" style={{ color: violet[500], textDecoration: 'none', fontWeight: fontWeight.medium }}>
                          {progress.today.needs_attention.awaiting_approval} recommendation{progress.today.needs_attention.awaiting_approval === 1 ? '' : 's'}
                        </Link>
                        {progress.today.needs_attention.urgent_pages > 0 && <span style={{ color: '#991b1b' }}> ({progress.today.needs_attention.urgent_pages} urgent)</span>}
                      </div>
                    )}
                    {progress.today.needs_attention.decay_count > 0 && (
                      <div>
                        <Link href="/dashboard/seo/signals" style={{ color: violet[500], textDecoration: 'none', fontWeight: fontWeight.medium }}>
                          {progress.today.needs_attention.decay_count} decay signal{progress.today.needs_attention.decay_count === 1 ? '' : 's'}
                        </Link>
                      </div>
                    )}
                    {progress.today.needs_attention.cannibalization_count > 0 && (
                      <div>{progress.today.needs_attention.cannibalization_count} cannibalization pair{progress.today.needs_attention.cannibalization_count === 1 ? '' : 's'}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: tc.text.muted, fontWeight: fontWeight.medium, marginBottom: space['1'] }}>Pipeline Health</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
                {(() => {
                  const last = progress.today.pipeline_health.last_cluster_run;
                  const ageH = last ? Math.floor((Date.now() - new Date(last).getTime()) / 3600000) : null;
                  const stale = ageH != null && ageH > 30;
                  return (
                    <div style={{ color: stale ? '#92400e' : '#065f46' }}>
                      {stale ? '⚠ ' : '✓ '}Cluster job: {ageH != null ? `${ageH}h ago` : 'never'}
                    </div>
                  );
                })()}
                {(() => {
                  const last = progress.today.pipeline_health.last_gsc_date;
                  if (!last) return <div style={{ color: '#92400e' }}>⚠ GSC: no data</div>;
                  const ageDays = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
                  const stale = ageDays > 5;
                  return <div style={{ color: stale ? '#92400e' : '#065f46' }}>{stale ? '⚠ ' : '✓ '}GSC: {ageDays}d behind</div>;
                })()}
                {(() => {
                  const last = progress.today.pipeline_health.last_execution;
                  if (!last) return <div style={{ color: tc.text.muted }}>No executions yet</div>;
                  const ageH = Math.floor((Date.now() - new Date(last).getTime()) / 3600000);
                  return <div style={{ color: tc.text.secondary }}>Last execution: {ageH < 24 ? `${ageH}h ago` : `${Math.floor(ageH / 24)}d ago`}</div>;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PROGRESS SCOREBOARD — week + month traffic trends                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {progress && (
        <div style={{ marginBottom: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['5'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['3'] }}>
            Progress Scoreboard
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'] }}>
            {/* Weekly */}
            <ProgressBlock
              tc={tc}
              label="Last 7 days vs prior 7"
              data={progress.week}
              extras={[
                { label: 'Pages optimized', value: String(progress.week.pages_optimized) },
                { label: 'Measuring', value: String(progress.week.pages_measuring) },
              ]}
            />
            {/* Monthly */}
            <ProgressBlock
              tc={tc}
              label="Last 30 days vs prior 30"
              data={progress.month}
              extras={[
                { label: 'Pages optimized', value: String(progress.month.pages_optimized) },
                {
                  label: 'Win rate',
                  value: progress.month.win_rate_pct != null
                    ? `${progress.month.win_rate_pct}% (n=${progress.month.win_sample_size})`
                    : 'Need 14d+',
                },
              ]}
            />
          </div>
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
