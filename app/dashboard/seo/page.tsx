'use client';

// =============================================================================
// SEO Command Center — Overview (reconciled)
//
// Keeps main's redesigned shell (GSC organic-clicks timeline + competitor
// leaderboard) and fixes the part that made the dashboard feel dead: the
// action queue and findings now read the POPULATED analytics tables via
// /api/proxy/seo/summary (proposed changes, ranking decay, cannibalization,
// backlink targets) instead of the near-empty seo_action pipeline.
//
// Governance: read-first. The only write is approve/reject of a proposed
// change, which goes through decideSeoCandidate() in lib/seoApi.ts (the
// whitelisted write path) — no inline POST in this page.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import { decideSeoCandidate } from '../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Palette + helpers (carried over from main's redesign)
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
type TC = ReturnType<typeof useThemeColors>;
type ToneKey = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

function toneStyle(tone: ToneKey, tc: TC) {
  switch (tone) {
    case 'good': return { bg: PALETTE.goodSoft, fg: PALETTE.good };
    case 'bad': return { bg: PALETTE.badSoft, fg: PALETTE.bad };
    case 'warn': return { bg: PALETTE.warnSoft, fg: PALETTE.warn };
    case 'info': return { bg: PALETTE.infoSoft, fg: PALETTE.info };
    case 'violet': return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
    default: return { bg: tc.background.muted, fg: tc.text.muted };
  }
}
function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: TC }) {
  const s = toneStyle(tone, tc);
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: fontWeight.medium, background: s.bg, color: s.fg, fontFamily: fontFamily.body }}>
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Types (local — keeps this page self-contained and independent of seoApi
// type exports so it compiles regardless of merge order)
// -----------------------------------------------------------------------------
interface GateEvidence {
  source?: { url?: string; entity?: string; intent?: string };
  target?: { url?: string; entity?: string; intent?: string };
  signals?: { hierarchy_proximity?: number; embedding_cosine?: number; shared_attributes?: number };
  why?: string;
  anchor_context?: string;
  implementation?: string;
}
interface ProposedChange {
  id: string; page: string; mutation_type: string; target_field: string | null;
  original_value: string | null; proposed_value: string | null;
  evidence_summary: string | null; opportunity_score: number | null; state: string | null;
  relevance_score: number | null; evidence: GateEvidence | null; gate_status: string | null;
}
interface DecayRow { id: string; page: string; keyword: string; position_30d_ago: number; position_now: number; position_delta: number; traffic_delta_pct: number; decay_score: number; }
interface CannibalRow { id: string; keyword: string; page_a: string; page_b: string; overlap_score: number; suggested_canonical: string; canonical_confidence: string; }
interface BacklinkRow { id: string; referring_domain: string; domain_rank: number; backlinks_count: number; spam_score: number; gap_competitor: string; }
interface SummaryData {
  counts: Record<string, number>;
  proposedChanges: ProposedChange[];
  decay: DecayRow[];
  cannibalization: CannibalRow[];
  backlinks: BacklinkRow[];
  generated_at: string;
}
interface TimeseriesPoint { date: string; clicks: number; impressions?: number; }
interface TimeseriesResp { series: TimeseriesPoint[]; summary: { total_clicks: number; half_over_half_delta_pct: number | null }; range_days: number; }
interface CompetitorGap {
  id: string; competitor_url?: string; competitor_ranking_position?: number | null;
  our_ranking_position?: number | null; opportunity_score?: number | null;
  keyword?: string; cluster_keyword?: string;
}

const MUTATION_LABEL: Record<string, string> = {
  meta_description_update: 'Meta description', meta_description: 'Meta description',
  title_tag_refinement: 'Title tag', title_tag: 'Title tag',
  internal_link_insertion: 'Internal link',
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  } catch {
    return null;
  }
}

// =============================================================================
// Timeline chart (carried from main — GSC organic clicks)
// =============================================================================
type TimelineRange = '30' | '60' | '90';

function TimelineChart({ tc, data }: { tc: TC; data: TimeseriesResp | null }) {
  if (!data || !data.series || data.series.length === 0) {
    return <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>No Search Console data for this range.</div>;
  }
  const w = 760, h = 200, pad = { l: 36, r: 12, t: 12, b: 24 };
  const series = data.series;
  const maxC = Math.max(...series.map((d) => d.clicks));
  const max = (maxC === 0 ? 1 : maxC) * 1.15;
  const xStep = (w - pad.l - pad.r) / Math.max(1, series.length - 1);
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
  const linePts = series.map((d, i) => `${pad.l + i * xStep},${y(d.clicks)}`).join(' ');
  const areaPts = `${pad.l},${h - pad.b} ${linePts} ${pad.l + (series.length - 1) * xStep},${h - pad.b}`;
  const ticks = [0, 1, 2, 3].map((i) => (max / 3) * i);
  const labelEvery = Math.max(1, Math.floor(series.length / 6));
  const total = data.summary?.total_clicks ?? 0;
  const deltaPct = data.summary?.half_over_half_delta_pct ?? 0;
  const deltaColor = deltaPct >= 0 ? PALETTE.good : PALETTE.bad;
  return (
    <div>
      <div style={{ marginBottom: space['3'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Organic clicks · last {data.range_days} days
        </div>
        <div style={{ display: 'flex', gap: space['3'], alignItems: 'baseline', marginTop: space['1'] }}>
          <span style={{ fontFamily: fontFamily.display, fontSize: '36px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>{total.toLocaleString()}</span>
          <span style={{ fontFamily: fontFamily.body, fontSize: '13px', color: deltaColor, fontWeight: fontWeight.medium }}>
            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% half-over-half
          </span>
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
          <text key={i} x={pad.l + i * xStep} y={h - 6} textAnchor="middle" fontSize="10" fill={tc.text.muted}>{d.date.slice(5)}</text>
        ))}
        <polygon points={areaPts} fill="url(#seo-timeline-grad)" />
        <polyline points={linePts} fill="none" stroke={PALETTE.violet} strokeWidth={2} />
      </svg>
    </div>
  );
}

function RangeBtn({ tc, active, onClick, children }: { tc: TC; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ padding: '6px 12px', background: active ? PALETTE.violet : tc.background.surface, color: active ? '#fff' : tc.text.primary, border: `1px solid ${active ? PALETTE.violet : tc.border.default}`, borderRadius: radius.md, fontSize: '12px', fontWeight: active ? fontWeight.semibold : fontWeight.medium, cursor: 'pointer', fontFamily: fontFamily.body }}>
      {children}
    </button>
  );
}

// =============================================================================
// Competitor leaderboard (carried from main — cluster-engine sourced)
// =============================================================================
function CompetitorGapsPanel({ tc, gaps }: { tc: TC; gaps: CompetitorGap[] }) {
  const leaderboard = useMemo(() => {
    const m = new Map<string, { domain: string; count: number }>();
    for (const g of gaps) {
      const dom = (g.competitor_url || '').replace(/^https?:\/\//, '').split('/')[0];
      if (!dom) continue;
      const cur = m.get(dom) ?? { domain: dom, count: 0 };
      cur.count += 1;
      m.set(dom, cur);
    }
    const rows = Array.from(m.values()).sort((a, b) => b.count - a.count);
    const totalGaps = rows.reduce((s, r) => s + r.count, 0) || 1;
    return rows.slice(0, 6).map((r) => ({ ...r, sov: (r.count / totalGaps) * 100 }));
  }, [gaps]);
  const topGaps = useMemo(() => [...gaps].sort((a, b) => (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0)).slice(0, 6), [gaps]);
  if (gaps.length === 0) {
    return <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>No competitor gaps detected in the last sweep.</div>;
  }
  const maxSov = Math.max(1, ...leaderboard.map((r) => r.sov));
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: space['4'] }}>
      <div style={{ overflow: 'hidden', border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${tc.border.subtle}`, backgroundColor: tc.background.muted }}>
              {['Competitor', 'Share of voice', 'Gap kw'].map((hh, i) => (
                <th key={hh} style={{ padding: '10px 12px', fontWeight: fontWeight.semibold, color: tc.text.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 0 ? 'left' : 'right' }}>{hh}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((c2) => (
              <tr key={c2.domain} style={{ borderBottom: `1px solid ${tc.border.subtle}` }}>
                <td style={{ padding: '10px 12px', fontWeight: fontWeight.medium, color: tc.text.primary }}>{c2.domain}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <span style={{ fontFamily: monoStack }}>{c2.sov.toFixed(1)}%</span>
                    <span style={{ display: 'inline-block', width: 80, height: 4, background: tc.border.subtle, borderRadius: 2 }}>
                      <span style={{ display: 'block', width: `${(c2.sov / maxSov) * 100}%`, height: '100%', background: PALETTE.violet, borderRadius: 2 }} />
                    </span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{c2.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, backgroundColor: tc.background.muted, display: 'flex', justifyContent: 'space-between', gap: space['3'], flexWrap: 'wrap' }}>
          <span>Share of voice = % of tracked gap keywords each competitor ranks for.</span>
          <a href="/dashboard/seo/competitive" style={{ color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none' }}>Full SERP analysis →</a>
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Top competitor gaps</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['3'] }}>Queries competitors rank for, you don&rsquo;t</div>
        {topGaps.map((g, i) => {
          const dom = (g.competitor_url || '').replace(/^https?:\/\//, '').split('/')[0];
          return (
            <div key={g.id ?? i} style={{ padding: `${space['2.5']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px', gap: space['2'] }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary, wordBreak: 'break-word' }}>{g.keyword || g.cluster_keyword || '—'}</span>
                {g.opportunity_score != null && <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, whiteSpace: 'nowrap' }}>{g.opportunity_score.toFixed(2)}</span>}
              </div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
                <span style={{ color: PALETTE.bad }}>{dom || '—'}</span>{' · '}you&rsquo;re{' '}
                <span style={{ fontFamily: monoStack }}>{g.our_ranking_position ? `pos ${g.our_ranking_position}` : 'unranked'}</span>
              </div>
            </div>
          );
        })}
        <a href="/dashboard/seo/competitive" style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.violet, fontWeight: fontWeight.medium, marginTop: space['3'], display: 'inline-block', textDecoration: 'none' }}>View all gaps →</a>
      </div>
    </div>
  );
}

// =============================================================================
// Review queue — the actual proposed changes (before -> after)
// =============================================================================
function relevanceTone(score: number): ToneKey {
  if (score >= 0.5) return 'good';
  if (score >= 0.3) return 'violet';
  return 'warn';
}
// Grounded gate signals → human chips (hierarchy adjacency, similarity, shared attrs).
function GateSignals({ tc, ev }: { tc: TC; ev: GateEvidence | null }) {
  const s = ev?.signals;
  if (!s) return null;
  const chips: React.ReactNode[] = [];
  if (typeof s.hierarchy_proximity === 'number' && s.hierarchy_proximity > 0) {
    chips.push(<Pill key="h" tone="good" tc={tc}>{s.hierarchy_proximity >= 1 ? 'directly adjacent' : 'related'}</Pill>);
  }
  if (typeof s.embedding_cosine === 'number') {
    chips.push(<Pill key="c" tone="info" tc={tc}>similarity {s.embedding_cosine.toFixed(2)}</Pill>);
  }
  if (typeof s.shared_attributes === 'number' && s.shared_attributes > 0) {
    chips.push(<Pill key="a" tone="violet" tc={tc}>{s.shared_attributes} shared attribute{s.shared_attributes === 1 ? '' : 's'}</Pill>);
  }
  if (!chips.length) return null;
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{chips}</div>;
}
function ChangeRow({ tc, change, busy, onDecide }: { tc: TC; change: ProposedChange; busy: boolean; onDecide: (c: ProposedChange, a: 'approve' | 'reject') => void; }) {
  const label = MUTATION_LABEL[change.mutation_type] || change.mutation_type;
  const isLink = change.mutation_type.includes('internal_link');
  const why = change.evidence?.why || change.evidence_summary;
  const srcEntity = change.evidence?.source?.entity;
  const tgtEntity = change.evidence?.target?.entity;
  return (
    <div style={{ padding: space['4'], borderBottom: `1px solid ${tc.border.subtle}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Pill tone="violet" tc={tc}>{label}</Pill>
          <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>{change.page || '/'}</span>
          {change.relevance_score != null ? (
            <Pill tone={relevanceTone(change.relevance_score)} tc={tc}>relevance {change.relevance_score.toFixed(2)}</Pill>
          ) : change.opportunity_score != null ? (
            <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>score {change.opportunity_score}</span>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onDecide(change, 'reject')} disabled={busy} style={{ fontSize: 12, padding: '6px 14px', borderRadius: radius.md, border: `1px solid ${tc.border.strong}`, background: tc.background.surface, color: tc.text.secondary, cursor: busy ? 'wait' : 'pointer', fontFamily: fontFamily.body }}>Reject</button>
          <button onClick={() => onDecide(change, 'approve')} disabled={busy} style={{ fontSize: 12, fontWeight: fontWeight.semibold, padding: '6px 16px', borderRadius: radius.md, border: 'none', background: PALETTE.violet, color: '#fff', cursor: busy ? 'wait' : 'pointer', fontFamily: fontFamily.body }}>{busy ? '…' : 'Approve'}</button>
        </div>
      </div>
      {isLink ? (
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary }}>
          {srcEntity && tgtEntity ? (
            <span><strong style={{ color: tc.text.primary }}>{srcEntity}</strong> → <strong style={{ color: tc.text.primary }}>{tgtEntity}</strong> · anchor “<strong style={{ color: tc.text.primary }}>{change.proposed_value}</strong>”</span>
          ) : (
            <span>Insert internal-link anchor: <strong style={{ color: tc.text.primary }}>{change.proposed_value}</strong></span>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <BeforeAfter tc={tc} label="Current" value={change.original_value} muted />
          <BeforeAfter tc={tc} label="Proposed" value={change.proposed_value} />
        </div>
      )}
      <GateSignals tc={tc} ev={change.evidence} />
      {why && (
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: 10 }}>{why}</div>
      )}
      {isLink && (
        <div style={{ marginTop: 10, padding: '8px 10px', background: tc.background.muted, borderRadius: radius.md, fontSize: 12, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
          <div style={{ fontFamily: monoStack, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: tc.text.muted, marginBottom: 3 }}>Implementation</div>
          {change.evidence?.implementation
            || `On approval: inserts a link in the “${srcEntity || 'source page'}” page, wrapping the existing text “${change.proposed_value}” → ${change.evidence?.target?.url || tgtEntity || 'target page'}. Saved as a WordPress draft for your review — not published.`}
          {change.evidence?.anchor_context && (
            <div style={{ marginTop: 6, fontStyle: 'italic', color: tc.text.muted }}>“{change.evidence.anchor_context}”</div>
          )}
        </div>
      )}
    </div>
  );
}
function BeforeAfter({ tc, label, value, muted }: { tc: TC; label: string; value: string | null; muted?: boolean }) {
  return (
    <div style={{ background: muted ? tc.background.muted : PALETTE.violetSoft, borderRadius: radius.md, padding: '8px 10px' }}>
      <div style={{ fontFamily: fontFamily.body, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: tc.text.muted, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: 13, color: tc.text.primary, lineHeight: lineHeight.relaxed }}>{value || <em style={{ color: tc.text.muted }}>none set</em>}</div>
    </div>
  );
}

// Findings panels --------------------------------------------------------------
function Panel({ tc, title, href, hrefLabel, children }: { tc: TC; title: string; href: string; hrefLabel: string; children: React.ReactNode }) {
  return (
    <div style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['5'] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>{title}</h3>
        <a href={href} style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.violet, textDecoration: 'none' }}>{hrefLabel} →</a>
      </div>
      {children}
    </div>
  );
}
function MiniRow({ tc, main, sub, right }: { tc: TC; main: string; sub: string; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${tc.border.subtle}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{main}</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================
function SeoOverviewContent() {
  const tc = useThemeColors();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResp | null>(null);
  const [gaps, setGaps] = useState<CompetitorGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimelineRange>('30');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadCore = useCallback(async () => {
    const [s, g] = await Promise.all([
      getJson<SummaryData>('/api/proxy/seo/summary'),
      getJson<CompetitorGap[]>('/api/proxy/seo/competitor-gaps'),
    ]);
    setSummary(s);
    setGaps(Array.isArray(g) ? g : []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCore(); }, [loadCore]);
  useEffect(() => {
    let cancelled = false;
    getJson<TimeseriesResp>(`/api/proxy/seo/timeseries?days=${range}`).then((r) => { if (!cancelled) setTimeseries(r); });
    return () => { cancelled = true; };
  }, [range]);

  const decide = useCallback(async (change: ProposedChange, action: 'approve' | 'reject') => {
    setBusyId(change.id);
    try {
      await decideSeoCandidate(change.id, action);
      setSummary((prev) => prev ? {
        ...prev,
        proposedChanges: prev.proposedChanges.filter((x) => x.id !== change.id),
        counts: { ...prev.counts, proposed_changes: Math.max(0, (prev.counts.proposed_changes || 1) - 1) },
      } : prev);
      setToast(`${action === 'approve' ? 'Approved' : 'Rejected'}: ${change.page}`);
    } catch {
      setToast('Action failed — please retry.');
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 2600);
    }
  }, []);

  const counts = summary?.counts ?? {};
  const proposed = summary?.proposedChanges ?? [];
  const subtitle = loading
    ? 'Loading findings…'
    : `${counts.proposed_changes ?? 0} proposed changes awaiting review · ${counts.decay ?? 0} decay · ${counts.cannibalization ?? 0} cannibalization · ${counts.backlinks ?? 0} backlink targets`;

  const cardBase: React.CSSProperties = { backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['5'] };

  if (loading) {
    return <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading SEO Command Center…</div>;
  }

  return (
    <div style={{ padding: space['6'], maxWidth: 1280, margin: '0 auto', fontFamily: fontFamily.body, color: tc.text.primary }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['7'], gap: space['4'], flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, margin: 0, color: tc.text.primary, lineHeight: lineHeight.snug }}>SEO Command Center</h1>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: space['1'] }}>{subtitle}</div>
        </div>
        <button onClick={() => { setLoading(true); loadCore(); }} style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.strong}`, borderRadius: radius.md, fontSize: '13px', cursor: 'pointer', color: tc.text.primary, fontFamily: fontFamily.body }}>Refresh</button>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'], marginBottom: space['7'] }}>
        {[
          { k: 'proposed_changes', label: 'Proposed changes', href: '/dashboard/seo/actions' },
          { k: 'decay', label: 'Ranking decay', href: '/dashboard/seo/signals' },
          { k: 'cannibalization', label: 'Cannibalization', href: '/dashboard/seo/signals' },
          { k: 'backlinks', label: 'Backlink targets', href: '/dashboard/seo/backlinks' },
          { k: 'competitor_gaps', label: 'Competitor gaps', href: '/dashboard/seo/competitive' },
          { k: 'suppressed', label: 'Suppressed', href: '/dashboard/seo/suppressed' },
        ].map((t) => (
          <a key={t.k} href={t.href} style={{ ...cardBase, padding: space['4'], textDecoration: 'none', borderLeft: `3px solid ${PALETTE.violet}` }}>
            <div style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>{counts[t.k] ?? 0}</div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{t.label}</div>
          </a>
        ))}
      </div>

      {/* Hero: timeline */}
      <div style={{ ...cardBase, background: `linear-gradient(135deg, ${PALETTE.violetSoft} 0%, ${tc.background.surface} 60%)`, marginBottom: space['7'] }}>
        <div style={{ display: 'flex', gap: space['2'], marginBottom: space['3'] }}>
          {(['30', '60', '90'] as TimelineRange[]).map((r) => (
            <RangeBtn key={r} tc={tc} active={range === r} onClick={() => setRange(r)}>{r}d</RangeBtn>
          ))}
        </div>
        <TimelineChart tc={tc} data={timeseries} />
      </div>

      {/* Review queue */}
      <div style={{ marginBottom: space['3'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Review queue — proposed changes</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>The actual change the engine wants to make. Approve to draft it in WordPress.</div>
      </div>
      <div style={{ ...cardBase, padding: 0, marginBottom: space['7'] }}>
        {proposed.length === 0 ? (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>No proposed changes are currently awaiting review.</div>
        ) : proposed.map((change) => (
          <ChangeRow key={change.id} tc={tc} change={change} busy={busyId === change.id} onDecide={decide} />
        ))}
      </div>

      {/* Detected problems */}
      <div style={{ marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Detected problems</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: space['4'], marginBottom: space['7'] }}>
        <Panel tc={tc} title="Ranking decay" href="/dashboard/seo/signals" hrefLabel="All signals">
          {summary?.decay.length ? summary.decay.map((d) => (
            <MiniRow key={d.id} tc={tc} main={d.keyword} sub={d.page} right={<Pill tone="bad" tc={tc}>#{d.position_30d_ago} → #{d.position_now}</Pill>} />
          )) : <div style={{ fontFamily: fontFamily.body, fontSize: 13, color: tc.text.muted, padding: '8px 0' }}>No active decay signals.</div>}
        </Panel>
        <Panel tc={tc} title="Keyword cannibalization" href="/dashboard/seo/signals" hrefLabel="All signals">
          {summary?.cannibalization.length ? summary.cannibalization.map((x) => (
            <MiniRow key={x.id} tc={tc} main={x.keyword || 'Overlapping pages'} sub={`${x.page_a}  ⟷  ${x.page_b}`} right={<Pill tone="warn" tc={tc}>{Math.round(x.overlap_score * 100)}%</Pill>} />
          )) : <div style={{ fontFamily: fontFamily.body, fontSize: 13, color: tc.text.muted, padding: '8px 0' }}>No cannibalization detected.</div>}
        </Panel>
        <Panel tc={tc} title="Backlink targets (off-page)" href="/dashboard/seo/backlinks" hrefLabel="All backlinks">
          {summary?.backlinks.length ? summary.backlinks.map((b) => (
            <MiniRow key={b.id} tc={tc} main={b.referring_domain} sub={`links to ${b.gap_competitor} · ${b.backlinks_count.toLocaleString()} backlinks`} right={<Pill tone="info" tc={tc}>DR {b.domain_rank}</Pill>} />
          )) : <div style={{ fontFamily: fontFamily.body, fontSize: 13, color: tc.text.muted, padding: '8px 0' }}>No new backlink opportunities.</div>}
        </Panel>
      </div>

      {/* Competitor intelligence */}
      <div style={{ marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Competitor intelligence</div>
      <div style={cardBase}>
        <CompetitorGapsPanel tc={tc} gaps={gaps} />
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: tc.text.primary, color: tc.text.inverse, padding: '10px 18px', borderRadius: radius.md, fontSize: 13, fontFamily: fontFamily.body, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 50 }}>{toast}</div>
      )}
    </div>
  );
}

export default function SeoOverviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <SeoOverviewContent />
    </DashboardGuard>
  );
}
