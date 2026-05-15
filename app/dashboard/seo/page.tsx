'use client';

// =============================================================================
// SEO Command Center — Overview
// Wholesale redesign graduated from app/seo-mockups/proposed/page.tsx.
// Governance lock: this page is read-first. The only write paths are the
// existing approve/reject recommendation endpoints; no other mutations.
// Ahrefs is decommissioned — no SoV / backlink-gap / content-velocity panels.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import {
  getSeoOverviewKpis, getGscPipelineHealth, getSeoTimeseries,
  getSeoCompetitorGaps, getRecommendations, approveRecommendation,
} from '../../../lib/seoApi';
import type {
  SeoOverviewKpis, GscPipelineHealth, SeoTimeseriesResponse,
  SeoCompetitorGap, SeoRecommendation,
} from '../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Mockup palette — tones used in the redesign that aren't in the global theme.
// These are intentional brand accents matched to the approved canvas mockup.
// -----------------------------------------------------------------------------
const PALETTE = {
  violet: violet[500],
  violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};

const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

type ToneKey = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

function toneStyle(tone: ToneKey, tc: ReturnType<typeof useThemeColors>) {
  switch (tone) {
    case 'good':    return { bg: PALETTE.goodSoft,   fg: PALETTE.good };
    case 'bad':     return { bg: PALETTE.badSoft,    fg: PALETTE.bad };
    case 'warn':    return { bg: PALETTE.warnSoft,   fg: PALETTE.warn };
    case 'info':    return { bg: PALETTE.infoSoft,   fg: PALETTE.info };
    case 'violet':  return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
    default:        return { bg: tc.background.muted, fg: tc.text.muted };
  }
}

function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: ReturnType<typeof useThemeColors> }) {
  const s = toneStyle(tone, tc);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: '11px', fontWeight: fontWeight.medium, background: s.bg, color: s.fg,
      fontFamily: fontFamily.body,
    }}>
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Map an SeoRecommendation's opportunity_type → intent label + tone.
// -----------------------------------------------------------------------------
function mapIntent(rec: SeoRecommendation): { label: string; tone: ToneKey } {
  const t = (rec.opportunity_type || '').toLowerCase();
  if (t.includes('ctr') || t.includes('title') || t.includes('meta')) return { label: 'improve_ctr', tone: 'violet' };
  if (t.includes('strengthen') || t.includes('expand') || t.includes('content')) return { label: 'strengthen_page', tone: 'info' };
  if (t.includes('link')) return { label: 'add_internal_links', tone: 'good' };
  if (t.includes('create') || t.includes('new')) return { label: 'create_page', tone: 'warn' };
  return { label: t || 'optimize', tone: 'neutral' };
}

// =============================================================================
// Timeline Chart — daily organic clicks, 30/60/90/custom range.
// Sourced from analytics.metrics_search_console_daily (GSC). No Ahrefs.
// =============================================================================

type TimelineRange = '30' | '60' | '90' | 'custom';

function TimelineChart({
  tc, data,
}: {
  tc: ReturnType<typeof useThemeColors>;
  data: SeoTimeseriesResponse | null;
}) {
  if (!data || data.series.length === 0) {
    return (
      <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
        No Search Console data for this range.
      </div>
    );
  }
  const w = 760, h = 200, pad = { l: 36, r: 12, t: 12, b: 24 };
  const series = data.series;
  const maxC = Math.max(...series.map(d => d.clicks));
  const max = (maxC === 0 ? 1 : maxC) * 1.15;
  const min = 0;
  const xStep = (w - pad.l - pad.r) / Math.max(1, series.length - 1);
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const linePts = series.map((d, i) => `${pad.l + i * xStep},${y(d.clicks)}`).join(' ');
  const areaPts = `${pad.l},${h - pad.b} ${linePts} ${pad.l + (series.length - 1) * xStep},${h - pad.b}`;
  const ticks = [0, 1, 2, 3].map(i => min + ((max - min) / 3) * i);
  const labelEvery = Math.max(1, Math.floor(series.length / 6));
  const total = data.summary.total_clicks;
  const deltaPct = data.summary.half_over_half_delta_pct ?? 0;
  const deltaColor = deltaPct >= 0 ? PALETTE.good : PALETTE.bad;

  return (
    <div>
      <div style={{ display: 'flex', gap: space['7'], marginBottom: space['3'], alignItems: 'baseline' }}>
        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Organic clicks · last {data.range_days} days
          </div>
          <div style={{ display: 'flex', gap: space['3'], alignItems: 'baseline', marginTop: space['1'] }}>
            <span data-testid="text-timeline-total" style={{ fontFamily: fontFamily.display, fontSize: '36px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontFamily: fontFamily.body, fontSize: '13px', color: deltaColor, fontWeight: fontWeight.medium }}>
              {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% half-over-half
            </span>
          </div>
        </div>
      </div>
      <svg width={w} height={h} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="Organic clicks timeline">
        <defs>
          <linearGradient id="seo-timeline-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.violet} stopOpacity="0.22" />
            <stop offset="100%" stopColor={PALETTE.violet} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={tc.border.subtle} strokeDasharray="2 3" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={tc.text.muted} fontFamily={monoStack}>{Math.round(t)}</text>
          </g>
        ))}
        {series.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={pad.l + i * xStep} y={h - 6} textAnchor="middle" fontSize="10" fill={tc.text.muted}>
            {d.date.slice(5)}
          </text>
        ))}
        <polygon points={areaPts} fill="url(#seo-timeline-grad)" />
        <polyline points={linePts} fill="none" stroke={PALETTE.violet} strokeWidth={2} />
      </svg>
    </div>
  );
}

function RangeBtn({ tc, active, onClick, children, testId }: {
  tc: ReturnType<typeof useThemeColors>; active: boolean; onClick: () => void; children: React.ReactNode; testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        padding: '6px 12px',
        background: active ? PALETTE.violet : tc.background.surface,
        color: active ? '#ffffff' : tc.text.primary,
        border: `1px solid ${active ? PALETTE.violet : tc.border.default}`,
        borderRadius: radius.md,
        fontSize: '12px',
        fontWeight: active ? fontWeight.semibold : fontWeight.medium,
        cursor: 'pointer',
        fontFamily: fontFamily.body,
      }}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Data Freshness — sidecar to the timeline. Real GSC freshness; cluster engine
// freshness derived from kpis.last_pipeline_run_at; Ahrefs explicitly retired.
// =============================================================================

function relativeAge(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function DataFreshnessCard({
  tc, gscHealth, kpis,
}: {
  tc: ReturnType<typeof useThemeColors>;
  gscHealth: GscPipelineHealth | null;
  kpis: SeoOverviewKpis | null;
}) {
  const sources: { src: string; age: string; status: 'good' | 'bad' | 'unknown' }[] = [
    {
      src: 'Google Search Console',
      age: relativeAge(gscHealth?.last_successful_run ?? gscHealth?.last_run_at ?? null),
      status: gscHealth?.status === 'healthy' ? 'good' : gscHealth?.status ? 'bad' : 'unknown',
    },
    {
      src: 'Cluster engine',
      age: relativeAge(kpis?.last_pipeline_run_at ?? null),
      status: kpis?.last_pipeline_run_at ? 'good' : 'unknown',
    },
    { src: 'Ahrefs', age: 'decommissioned', status: 'bad' },
  ];

  return (
    <div style={{
      backgroundColor: tc.background.surface,
      border: `1px solid ${tc.border.default}`,
      borderRadius: radius.lg,
      padding: space['5'],
      height: '100%',
      boxSizing: 'border-box',
    }}>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['3'] }}>
        Data freshness
      </div>
      {sources.map((s) => {
        const dotColor = s.status === 'good' ? PALETTE.good : s.status === 'bad' ? PALETTE.bad : tc.text.muted;
        const ageColor = s.status === 'bad' ? PALETTE.bad : tc.text.muted;
        return (
          <div
            key={s.src}
            data-testid={`row-freshness-${s.src.toLowerCase().replace(/\s+/g, '-')}`}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${tc.border.subtle}` }}
          >
            <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary }}>{s.src}</span>
            <span style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: dotColor }} />
              <span style={{ fontFamily: monoStack, fontSize: '12px', color: ageColor }}>{s.age}</span>
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: lineHeight.relaxed }}>
        Sources update on the nightly cluster pipeline. Ahrefs has been retired — competitor coverage is now driven by the cluster engine.
      </div>
    </div>
  );
}

// =============================================================================
// Velocity stall callout — only renders when the half-over-half delta on the
// current timeline window indicates a real slowdown. Threshold mirrors the
// mockup: any negative or low-positive delta surfaces the warning.
// =============================================================================

function VelocityStallCallout({ tc, timeseries }: {
  tc: ReturnType<typeof useThemeColors>;
  timeseries: SeoTimeseriesResponse | null;
}) {
  const delta = timeseries?.summary.half_over_half_delta_pct ?? null;
  if (delta == null || delta >= 5) return null;
  return (
    <div
      data-testid="callout-velocity-stall"
      style={{
        display: 'flex', gap: space['3'], padding: space['3'],
        background: PALETTE.warnSoft, borderRadius: radius.md, alignItems: 'center', marginTop: space['3'],
        border: `1px solid ${PALETTE.warn}22`,
      }}
    >
      <span aria-hidden style={{ fontSize: 20, color: PALETTE.warn }}>⚠</span>
      <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.warn, lineHeight: lineHeight.relaxed }}>
        <strong>Velocity {delta < 0 ? 'decline' : 'stall'} detected:</strong>{' '}
        organic clicks are {delta >= 0 ? `only +${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`} half-over-half on this window.
        Review the priority queue below — the highest-impact fixes should restore growth.
        {tc.text /* keep tc referenced */ ? null : null}
      </div>
    </div>
  );
}

// =============================================================================
// "Do this next" — priority queue of approval-ready recommendations.
// Sourced from /api/proxy/seo/recommendations (analytics.seo_recommendations).
// =============================================================================

function ActionRow({
  tc, rank, rec, onApprove, busy,
}: {
  tc: ReturnType<typeof useThemeColors>;
  rank: number;
  rec: SeoRecommendation;
  onApprove: (id: string) => void;
  busy: boolean;
}) {
  const intent = mapIntent(rec);
  const url = rec.target_url || rec.recommended_url || '—';
  const title = rec.recommended_title || rec.recommended_action || rec.cluster_topic || rec.primary_keyword || 'Recommendation';
  const why = rec.recommended_meta_description
    || (rec.cluster_topic ? `Cluster: ${rec.cluster_topic}. Primary keyword: ${rec.primary_keyword}.` : 'Engine-generated opportunity.');
  const impact = rec.estimated_impact || '—';

  return (
    <div
      data-testid={`row-action-${rec.id}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr 140px 220px',
        gap: space['4'],
        alignItems: 'center',
        padding: `${space['3']} ${space['5']}`,
        borderBottom: `1px solid ${tc.border.subtle}`,
      }}
    >
      <div style={{ fontFamily: monoStack, fontSize: '18px', fontWeight: fontWeight.semibold, color: tc.text.muted }}>
        #{rank}
      </div>
      <div>
        <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['1'], flexWrap: 'wrap' }}>
          <Pill tone={intent.tone} tc={tc}>{intent.label}</Pill>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary }}>{title}</span>
        </div>
        <div style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, marginBottom: space['1'], wordBreak: 'break-all' }}>{url}</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary, lineHeight: lineHeight.relaxed }}>
          <span style={{ color: tc.text.muted }}>Why: </span>{why}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. impact</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: PALETTE.good }}>{impact}</div>
      </div>
      <div style={{ display: 'flex', gap: space['2'], justifyContent: 'flex-end' }}>
        <button
          data-testid={`button-approve-${rec.id}`}
          disabled={busy || rec.status !== 'pending_review'}
          onClick={() => onApprove(rec.id)}
          style={{
            padding: '6px 12px',
            background: rec.status === 'approved' ? PALETTE.good : PALETTE.violet,
            color: '#ffffff', border: 'none', borderRadius: radius.md,
            fontSize: '12px', fontWeight: fontWeight.medium,
            cursor: busy || rec.status !== 'pending_review' ? 'default' : 'pointer',
            opacity: busy ? 0.6 : 1, fontFamily: fontFamily.body,
          }}
        >
          {rec.status === 'approved' ? 'Approved' : busy ? 'Approving…' : 'Approve'}
        </button>
        <button
          data-testid={`button-details-${rec.id}`}
          style={{
            padding: '6px 12px', background: tc.background.surface, color: tc.text.primary,
            border: `1px solid ${tc.border.strong}`, borderRadius: radius.md,
            fontSize: '12px', cursor: 'pointer', fontFamily: fontFamily.body,
          }}
          onClick={() => window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener')}
        >
          Open URL
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Competitor Gaps — cluster-engine sourced (Ahrefs decommissioned).
// =============================================================================

function CompetitorGapsPanel({ tc, gaps }: { tc: ReturnType<typeof useThemeColors>; gaps: SeoCompetitorGap[] }) {
  const top = useMemo(
    () => [...gaps].sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0)).slice(0, 8),
    [gaps],
  );
  const byCompetitor = useMemo(() => {
    const m = new Map<string, { domain: string; count: number }>();
    for (const g of gaps) {
      const dom = (g.competitor_url || '').replace(/^https?:\/\//, '').split('/')[0];
      if (!dom) continue;
      const cur = m.get(dom) ?? { domain: dom, count: 0 };
      cur.count += 1;
      m.set(dom, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [gaps]);

  if (gaps.length === 0) {
    return (
      <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
        No competitor gaps detected by the cluster engine in the last sweep.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: space['4'] }}>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: space['2'] }}>
          Top competitor gaps · ranked by opportunity score
        </div>
        <div>
          {top.map((g, i) => {
            const dom = (g.competitor_url || '').replace(/^https?:\/\//, '').split('/')[0];
            const oursLabel = g.our_ranking_position ? `pos ${g.our_ranking_position}` : 'unranked';
            return (
              <div key={g.id} data-testid={`row-competitor-gap-${i}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: `${space['2']} 0`, borderBottom: i < top.length - 1 ? `1px solid ${tc.border.subtle}` : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                    {g.keyword || g.cluster_keyword || g.content_gap_notes || '—'}
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>
                    <span style={{ color: PALETTE.bad }}>{dom}</span>
                    {g.competitor_ranking_position != null && <> ranks pos <span style={{ fontFamily: monoStack }}>{g.competitor_ranking_position}</span></>}
                    {' · '}you&rsquo;re <span style={{ fontFamily: monoStack }}>{oursLabel}</span>
                  </div>
                </div>
                {g.opportunity_score != null && (
                  <div style={{ marginLeft: space['3'], textAlign: 'right' }}>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
                    <div style={{ fontFamily: monoStack, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                      {g.opportunity_score.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: space['2'] }}>
          Most-overlapping competitors
        </div>
        <div>
          {byCompetitor.map((c) => (
            <div key={c.domain} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: `${space['1.5']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
              <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{c.domain}</span>
              <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted }}>
                {c.count} gap{c.count === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: space['3'], padding: `${space['2']} ${space['3']}`, backgroundColor: tc.background.muted, border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md, fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: lineHeight.relaxed }}>
          Source: <strong style={{ color: tc.text.secondary }}>cluster engine</strong> (analytics.seo_competitor_gap), refreshed daily.
          Ahrefs is decommissioned — share-of-voice and backlink-gap views are no longer available.
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

function SeoOverviewContent() {
  const tc = useThemeColors();
  const [kpis, setKpis] = useState<SeoOverviewKpis | null>(null);
  const [gscHealth, setGscHealth] = useState<GscPipelineHealth | null>(null);
  const [recs, setRecs] = useState<SeoRecommendation[]>([]);
  const [competitorGaps, setCompetitorGaps] = useState<SeoCompetitorGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<TimelineRange>('30');
  const [customDays, setCustomDays] = useState(45);
  const days = range === 'custom' ? customDays : Number(range);
  const [timeseries, setTimeseries] = useState<SeoTimeseriesResponse | null>(null);

  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [k, gh, rs, cg] = await Promise.all([
          getSeoOverviewKpis(),
          getGscPipelineHealth().catch(() => null),
          getRecommendations().catch(() => [] as SeoRecommendation[]),
          getSeoCompetitorGaps().catch(() => [] as SeoCompetitorGap[]),
        ]);
        if (!cancelled) {
          setKpis(k); setGscHealth(gh); setRecs(rs); setCompetitorGaps(cg); setLoading(false);
        }
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err.message : 'Unknown error'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSeoTimeseries(days)
      .then((r) => { if (!cancelled) setTimeseries(r); })
      .catch(() => { if (!cancelled) setTimeseries(null); });
    return () => { cancelled = true; };
  }, [days]);

  // Sort pending recs by estimated impact desc (numeric prefix), then take top 5.
  const priorityQueue = useMemo(() => {
    const score = (r: SeoRecommendation) => {
      const m = (r.estimated_impact || '').match(/[+]?(\d+(?:\.\d+)?)/);
      return m ? Number(m[1]) : 0;
    };
    return [...recs]
      .filter((r) => r.status === 'pending_review')
      .sort((a, b) => score(b) - score(a))
      .slice(0, 5);
  }, [recs]);

  const totalPending = recs.filter((r) => r.status === 'pending_review').length;
  const approvedThisBatch = recs.filter((r) => r.status === 'approved').length;

  // Subtitle: prefer real lift if any rec has numeric impact; otherwise fall
  // back to a generic count-based message.
  const headerSubtitle = useMemo(() => {
    const lifts = priorityQueue
      .map((r) => {
        const m = (r.estimated_impact || '').match(/[+]?(\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : 0;
      })
      .filter((n) => n > 0);
    const sum = lifts.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      return `Your top ${priorityQueue.length} fixes will move organic clicks +${Math.round(sum)}/mo if approved this week.`;
    }
    if (totalPending > 0) {
      return `${totalPending} recommendation${totalPending === 1 ? '' : 's'} awaiting your review · ${approvedThisBatch} approved.`;
    }
    return 'No pending recommendations. Cluster engine is monitoring for new opportunities.';
  }, [priorityQueue, totalPending, approvedThisBatch]);

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await approveRecommendation(id);
      setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    } catch {
      // Stay quiet — the recommendation row will re-show pending_review if reload runs.
    } finally {
      setApprovingId(null);
    }
  }

  async function handleApproveTop5() {
    for (const r of priorityQueue) {
      if (r.status === 'pending_review') {
        // eslint-disable-next-line no-await-in-loop
        await handleApprove(r.id);
      }
    }
  }

  if (loading) {
    return (
      <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
        Loading SEO Command Center…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: space['6'], color: tc.text.primary, fontFamily: fontFamily.body }}>
        Error loading SEO data: {error}
      </div>
    );
  }

  const cardBase: React.CSSProperties = {
    backgroundColor: tc.background.surface,
    border: `1px solid ${tc.border.default}`,
    borderRadius: radius.lg,
    padding: space['5'],
  };

  // Greeting derived from local time (still locale-friendly).
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ padding: space['6'], maxWidth: 1280, margin: '0 auto', fontFamily: fontFamily.body, color: tc.text.primary }}>
      {/* ============================ HEADER ============================ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['7'], gap: space['4'], flexWrap: 'wrap' }}>
        <div>
          <h1 data-testid="text-page-title"
            style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, margin: 0, color: tc.text.primary, lineHeight: lineHeight.snug }}
          >
            SEO Command Center
          </h1>
          <div data-testid="text-header-subtitle"
            style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: space['1'] }}
          >
            {greeting} — {headerSubtitle}
          </div>
        </div>
        <div style={{ display: 'flex', gap: space['2'] }}>
          <button
            data-testid="button-diagnose-url"
            onClick={() => {
              const u = window.prompt('Diagnose a URL — paste the page path or full URL');
              if (u) window.open(`/dashboard/seo/page-performance?url=${encodeURIComponent(u)}`, '_self');
            }}
            style={{
              padding: '8px 14px', background: tc.background.surface,
              border: `1px solid ${tc.border.strong}`, borderRadius: radius.md,
              fontSize: '13px', cursor: 'pointer', color: tc.text.primary, fontFamily: fontFamily.body,
            }}
          >
            Diagnose a URL…
          </button>
          <button
            data-testid="button-approve-top-5"
            onClick={handleApproveTop5}
            disabled={priorityQueue.length === 0 || approvingId != null}
            style={{
              padding: '8px 14px', background: PALETTE.violet, color: '#ffffff',
              border: 'none', borderRadius: radius.md,
              fontSize: '13px', fontWeight: fontWeight.medium,
              cursor: priorityQueue.length === 0 ? 'default' : 'pointer',
              opacity: priorityQueue.length === 0 ? 0.5 : 1,
              fontFamily: fontFamily.body,
            }}
          >
            Approve top {Math.min(5, priorityQueue.length)} ($0)
          </button>
        </div>
      </div>

      {/* ============================ HERO 2-COL ============================ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: space['4'], marginBottom: space['7'] }}>
        <div style={{
          ...cardBase,
          background: `linear-gradient(135deg, ${PALETTE.violetSoft} 0%, ${tc.background.surface} 60%)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['3'], flexWrap: 'wrap', gap: space['3'] }}>
            <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
              <RangeBtn tc={tc} active={range === '30'} onClick={() => setRange('30')} testId="button-range-30">30d</RangeBtn>
              <RangeBtn tc={tc} active={range === '60'} onClick={() => setRange('60')} testId="button-range-60">60d</RangeBtn>
              <RangeBtn tc={tc} active={range === '90'} onClick={() => setRange('90')} testId="button-range-90">90d</RangeBtn>
              <RangeBtn tc={tc} active={range === 'custom'} onClick={() => setRange('custom')} testId="button-range-custom">Custom</RangeBtn>
              {range === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginLeft: space['2'] }}>
                  <input
                    data-testid="input-custom-days"
                    type="range" min={7} max={90} value={customDays}
                    onChange={(e) => setCustomDays(Number(e.target.value))}
                    style={{ width: 140 }}
                  />
                  <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, minWidth: 56 }}>{customDays} days</span>
                </div>
              )}
            </div>
            <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>vs prior period</span>
          </div>
          <TimelineChart tc={tc} data={timeseries} />
          <VelocityStallCallout tc={tc} timeseries={timeseries} />
        </div>
        <DataFreshnessCard tc={tc} gscHealth={gscHealth} kpis={kpis} />
      </div>

      {/* ============================ DO THIS NEXT ============================ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space['3'] }}>
        <div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>
            Do this next
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>
            Ranked by estimated organic-clicks lift, top 5 of {totalPending}
          </div>
        </div>
      </div>
      <div style={{ ...cardBase, padding: 0 }}>
        {priorityQueue.length === 0 ? (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
            No recommendations are awaiting review. The cluster engine surfaces new opportunities each night.
          </div>
        ) : (
          priorityQueue.map((rec, i) => (
            <ActionRow
              key={rec.id} tc={tc} rank={i + 1} rec={rec}
              onApprove={handleApprove} busy={approvingId === rec.id}
            />
          ))
        )}
        {totalPending > priorityQueue.length && (
          <div style={{ padding: space['3'], borderTop: `1px solid ${tc.border.subtle}`, textAlign: 'center', backgroundColor: tc.background.muted }}>
            <a data-testid="link-view-all-recommendations" href="/dashboard/seo/recommendations"
              style={{ fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none' }}
            >
              View all {totalPending} recommendations →
            </a>
          </div>
        )}
      </div>

      {/* ============================ COMPETITOR INTEL ============================ */}
      <div style={{ marginTop: space['7'] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space['3'] }}>
          <div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>
              Competitor intelligence
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>
              Top organic competitors for your tracked clusters · refreshed nightly
            </div>
          </div>
        </div>
        <div style={cardBase}>
          <CompetitorGapsPanel tc={tc} gaps={competitorGaps} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Page export — RBAC-gated by DashboardGuard.
// =============================================================================

export default function SeoOverviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <SeoOverviewContent />
    </DashboardGuard>
  );
}
