'use client';

// =============================================================================
// SEO Command Center — Screen 1 (overview / "do this next")
// Governance lock: this page is read-first. The ONLY write paths are the
// existing engine candidate approve/reject endpoints (Lane 1), routed through
// approveEngineCandidate / rejectEngineCandidate -> /api/proxy/seo/recommendations.
// Lanes 2 (Rank Math manual) and 3 (off-page) are advisory only — no mutations.
// Ahrefs is decommissioned — keyword value is sourced from DataForSEO via
// analytics.external_query_intelligence. Only canonical_live pages are surfaced
// as optimization targets; lost pages live in the Lost queue; pending pages
// carry a verify flag; excluded pages are never shown.
//
// Data truthfulness: every number on this screen is a live read. We do NOT
// fabricate predicted lift, share-of-voice, or velocity figures. Detection
// "impact" is the target page's real GSC demand (impressions @ position), not a
// modelled click projection.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import {
  getSeoTimeseries, getGscPipelineHealth, getSeoCandidateQueue,
  getSeoPortfolio, getSeoCompetitorGapFeed,
  approveEngineCandidate, rejectEngineCandidate,
  getCompetitiveVelocitySummary, getCompetitiveChanges, getSeoShipped,
} from '../../../lib/seoApi';
import type {
  PortfolioPage, PortfolioBucket, PageDossierCandidate,
  SeoTimeseriesResponse, GscPipelineHealth, SeoCompetitorGap,
  SeoTimeseriesPoint, CompetitiveVelocitySummary, CompetitivePageChange,
  SeoShippedAction, SeoCompetitorGapMeta,
} from '../../../lib/seoApi';
import {
  PALETTE, monoStack, Tc, ToneKey, Pill, toneStyle, BUCKETS, bucketTone,
  fmtInt, fmtPos, pathOf, PageDossierDrawer, actionMeta,
} from './_shared';

// -----------------------------------------------------------------------------
// Section header
// -----------------------------------------------------------------------------
function SectionTitle({ children, sub, right, tc }: { children: React.ReactNode; sub?: string; right?: React.ReactNode; tc: Tc }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: space['3'], gap: space['3'], flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>{children}</div>
        {sub && <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Card({ children, style, tc }: { children: React.ReactNode; style?: React.CSSProperties; tc: Tc }) {
  return (
    <div style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['5'], ...style }}>
      {children}
    </div>
  );
}

// =============================================================================
// Momentum — real GSC click momentum (7d-over-7d, 30d-over-30d)
// Derived entirely from one live /timeseries read. We sum equal-length windows
// of real daily clicks; a delta is only shown when a FULL prior window exists,
// so we never compare against a partial history or fabricate a trend.
// =============================================================================
type MomentumWindow = {
  label: string;
  curSum: number;
  priorSum: number;
  deltaPct: number | null;
  full: boolean;
  haveDays: number;
  needDays: number;
};

function computeMomentum(series: SeoTimeseriesPoint[], n: number, label: string): MomentumWindow {
  const clicks = series.map((p) => p.clicks ?? 0);
  const cur = clicks.slice(-n);
  const prior = clicks.slice(-2 * n, -n);
  const curSum = cur.reduce((a, b) => a + b, 0);
  const priorSum = prior.reduce((a, b) => a + b, 0);
  const full = cur.length === n && prior.length === n;
  const deltaPct = full && priorSum > 0 ? ((curSum - priorSum) / priorSum) * 100 : null;
  return { label, curSum, priorSum, deltaPct, full, haveDays: clicks.length, needDays: 2 * n };
}

function MomentumRow({ w, tc }: { w: MomentumWindow; tc: Tc }) {
  const up = w.deltaPct != null && w.deltaPct >= 0;
  const tone: ToneKey = w.deltaPct == null ? 'neutral' : up ? 'good' : 'bad';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: `${space['3']} 0`, borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`momentum-row-${w.label}`}>
      <div>
        <div style={{ fontFamily: monoStack, fontSize: '24px', color: tc.text.primary, lineHeight: 1.1 }} data-testid={`momentum-clicks-${w.label}`}>{fmtInt(w.curSum)}</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{w.label} clicks</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {w.deltaPct == null ? (
          <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }} data-testid={`momentum-delta-${w.label}`}>
            {w.full ? 'no prior clicks' : `building history (${w.haveDays}/${w.needDays}d)`}
          </span>
        ) : (
          <Pill tone={tone} tc={tc}>
            {up ? '▲' : '▼'} {Math.abs(w.deltaPct).toFixed(0)}% vs prior {w.label}
          </Pill>
        )}
      </div>
    </div>
  );
}

function MomentumCard({ tc }: { tc: Tc }) {
  const [series, setSeries] = useState<SeoTimeseriesPoint[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    getSeoTimeseries(60)
      .then((r) => { if (alive) setSeries(r.series ?? []); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const windows = useMemo(() => {
    if (!series) return null;
    return [computeMomentum(series, 7, '7d'), computeMomentum(series, 30, '30d')];
  }, [series]);

  return (
    <Card tc={tc} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Momentum</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px', marginBottom: space['1'] }}>Real GSC clicks, period over equal prior period</div>
      {err && <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.bad, paddingTop: space['3'] }} data-testid="momentum-error">Timeseries unavailable.</div>}
      {!err && !windows && <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, paddingTop: space['3'] }} data-testid="momentum-loading">Loading momentum…</div>}
      {!err && windows && windows.map((w) => <MomentumRow key={w.label} w={w} tc={tc} />)}
    </Card>
  );
}

// =============================================================================
// Recently approved / shipped — read-only list of real engine actions.
// No fabricated click deltas (only engine-measured deltas are shown) and no
// rollback write — this surface is read-only.
// =============================================================================
function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1mo ago' : `${months}mo ago`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function shippedTone(status: string | null): ToneKey {
  switch (status) {
    case 'published': return 'good';
    case 'measuring': return 'info';
    case 'executing': return 'violet';
    case 'rolled_back': return 'bad';
    case 'approved': return 'warn';
    default: return 'neutral';
  }
}

function ShippedCard({ tc }: { tc: Tc }) {
  const [items, setItems] = useState<SeoShippedAction[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    getSeoShipped(8)
      .then((r) => { if (alive) setItems(r); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  return (
    <Card tc={tc} style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: `${space['5']} ${space['5']} ${space['3']}` }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Recently approved &amp; shipped</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px' }}>Real engine actions — measured deltas only, no projections</div>
      </div>
      {err && <div style={{ padding: `0 ${space['5']} ${space['5']}`, fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.bad }} data-testid="shipped-error">Action feed unavailable.</div>}
      {!err && !items && <div style={{ padding: `0 ${space['5']} ${space['5']}`, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }} data-testid="shipped-loading">Loading…</div>}
      {!err && items && items.length === 0 && (
        <div style={{ padding: `0 ${space['5']} ${space['5']}`, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }} data-testid="shipped-empty">
          No actions approved or shipped yet — approvals from “Do this next” will appear here.
        </div>
      )}
      {!err && items && items.length > 0 && (
        <div>
          {items.map((it) => (
            <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space['3'], padding: `${space['3']} ${space['5']}`, borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`shipped-row-${it.id}`}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, fontWeight: fontWeight.medium }}>{(it.mutation_type ?? 'action').replace(/_/g, ' ')}</div>
                <div style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.target_url ?? ''}>{it.target_url ? pathOf(it.target_url) : '—'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexShrink: 0 }}>
                {it.outcome_clicks_delta != null && (
                  <span style={{ fontFamily: monoStack, fontSize: '12px', color: it.outcome_clicks_delta >= 0 ? PALETTE.good : PALETTE.bad }} data-testid={`shipped-delta-${it.id}`}>
                    {it.outcome_clicks_delta >= 0 ? '+' : ''}{fmtInt(it.outcome_clicks_delta)} clicks
                  </span>
                )}
                <Pill tone={shippedTone(it.status)} tc={tc}>{(it.status ?? 'unknown').replace(/_/g, ' ')}</Pill>
                <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, minWidth: 56, textAlign: 'right' }}>{timeAgo(it.executed_at ?? it.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Competitor content velocity — governed competitive feed (read-only).
// Headline from /summary (defined contract); per-competitor new/refreshed from
// /changes grouped by domain. No fabricated threat scores — only the producer's
// real change_type counts. Honest empty state until the first crawl lands.
// =============================================================================
function CompetitorVelocityCard({ tc }: { tc: Tc }) {
  const [summary, setSummary] = useState<CompetitiveVelocitySummary | null>(null);
  const [changes, setChanges] = useState<CompetitivePageChange[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([getCompetitiveVelocitySummary(), getCompetitiveChanges(200)])
      .then(([s, c]) => { if (alive) { setSummary(s); setChanges(c); } })
      .finally(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const perCompetitor = useMemo(() => {
    if (!changes) return [];
    const map = new Map<string, { name: string; domain: string; added: number; refreshed: number }>();
    for (const ch of changes) {
      const key = ch.competitor_domain || ch.competitor_name || 'unknown';
      const entry = map.get(key) ?? { name: ch.competitor_name || key, domain: ch.competitor_domain || '', added: 0, refreshed: 0 };
      if (ch.change_type === 'new') entry.added += 1;
      else entry.refreshed += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => (b.added + b.refreshed) - (a.added + a.refreshed)).slice(0, 6);
  }, [changes]);

  const stat = (label: string, value: React.ReactNode) => (
    <div style={{ flex: '1 1 120px' }}>
      <div style={{ fontFamily: monoStack, fontSize: '22px', color: tc.text.primary }}>{value}</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{label}</div>
    </div>
  );

  const notConfigured = loaded && summary === null;

  return (
    <Card tc={tc} style={{ padding: 0 }}>
      <div style={{ padding: space['5'] }}>
        {!loaded && <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }} data-testid="velocity-loading">Loading competitive feed…</div>}
        {notConfigured && (
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }} data-testid="velocity-unconfigured">
            Competitive feed not configured or unreachable. New &amp; refreshed competitor pages appear here once the governed feed is connected.
          </div>
        )}
        {loaded && summary && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['4'] }} data-testid="velocity-summary">
              {stat('competitors tracked', fmtInt(summary.competitors_tracked))}
              {stat('pages tracked', fmtInt(summary.pages_tracked))}
              {stat('new this week', fmtInt(summary.this_week_new))}
              {stat('refreshed this week', fmtInt(summary.this_week_changed))}
              {stat('last crawl', summary.last_crawl_date ? timeAgo(summary.last_crawl_date) : 'never')}
            </div>
            {perCompetitor.length === 0 ? (
              <div style={{ marginTop: space['4'], paddingTop: space['4'], borderTop: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }} data-testid="velocity-empty">
                No competitor page changes detected yet{summary.last_crawl_date ? '' : ' — first crawl pending'}.
              </div>
            ) : (
              <div style={{ marginTop: space['4'], paddingTop: space['2'], borderTop: `1px solid ${tc.border.subtle}` }}>
                {perCompetitor.map((c) => (
                  <div key={c.domain || c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space['3'], padding: `${space['2']} 0` }} data-testid={`velocity-row-${c.domain || c.name}`}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, fontWeight: fontWeight.medium, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      {c.domain && <div style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>{c.domain}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: space['2'], flexShrink: 0 }}>
                      <Pill tone="info" tc={tc}>{c.added} new</Pill>
                      <Pill tone="neutral" tc={tc}>{c.refreshed} refreshed</Pill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// =============================================================================
// Trend chart — live GSC timeseries
// =============================================================================
type RangeKey = '7' | '14' | '30' | 'custom';

function TrendChart({ tc }: { tc: Tc }) {
  const [range, setRange] = useState<RangeKey>('30');
  const [customDays, setCustomDays] = useState(45);
  const [data, setData] = useState<SeoTimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = range === 'custom' ? customDays : Number(range);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoTimeseries(days)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load trend'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const series = data?.series ?? [];
  const total = data?.summary.total_clicks ?? 0;
  const delta = data?.summary.half_over_half_delta_pct ?? null;

  // SVG geometry
  const w = 760, h = 200, pad = { l: 36, r: 12, t: 12, b: 24 };
  const clicks = series.map((d) => d.clicks);
  const max = clicks.length ? Math.max(...clicks) * 1.1 : 1;
  const min = clicks.length ? Math.min(...clicks) * 0.85 : 0;
  const span = max - min || 1;
  const xStep = (w - pad.l - pad.r) / Math.max(1, series.length - 1);
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / span);
  const linePts = series.map((d, i) => `${pad.l + i * xStep},${y(d.clicks)}`).join(' ');
  const areaPts = series.length ? `${pad.l},${h - pad.b} ${linePts} ${pad.l + (series.length - 1) * xStep},${h - pad.b}` : '';
  const ticks = [0, 1, 2, 3].map((i) => min + (span / 3) * i);
  const labelEvery = Math.max(1, Math.floor(series.length / 6));

  const rangeBtn = (key: RangeKey, label: string) => {
    const active = range === key;
    return (
      <button
        key={key}
        onClick={() => setRange(key)}
        data-testid={`button-range-${key}`}
        style={{
          padding: '6px 12px', borderRadius: radius.sm, cursor: 'pointer',
          background: active ? PALETTE.violet : tc.background.surface,
          color: active ? '#fff' : tc.text.primary,
          border: `1px solid ${active ? PALETTE.violet : tc.border.default}`,
          fontFamily: fontFamily.body, fontSize: '12px', fontWeight: active ? fontWeight.semibold : fontWeight.medium,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <Card tc={tc} style={{ background: tc.background.surface }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['3'], flexWrap: 'wrap', gap: space['3'] }}>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center' }}>
          {rangeBtn('7', '7d')}
          {rangeBtn('14', '14d')}
          {rangeBtn('30', '30d')}
          {rangeBtn('custom', 'Custom')}
          {range === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginLeft: space['2'] }}>
              <input
                type="range" min={7} max={90} value={customDays}
                onChange={(e) => setCustomDays(Number(e.target.value))}
                data-testid="input-custom-days"
                style={{ width: 140 }}
              />
              <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, minWidth: 56 }}>{customDays} days</span>
            </div>
          )}
        </div>
        <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>GSC organic · vs prior period</span>
      </div>

      <div style={{ marginBottom: space['2'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Organic clicks · last {data?.range_days ?? days} days
        </div>
        <div style={{ display: 'flex', gap: space['3'], alignItems: 'baseline', marginTop: '4px' }}>
          <span style={{ fontFamily: fontFamily.display, fontSize: '34px', fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-total-clicks">
            {fmtInt(total)}
          </span>
          {delta != null && (
            <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: delta >= 0 ? PALETTE.good : PALETTE.bad }} data-testid="text-delta">
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}% half-over-half
            </span>
          )}
        </div>
      </div>

      {loading && <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading trend…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
      {!loading && !error && series.length === 0 && (
        <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>No GSC timeseries data in this window.</div>
      )}
      {!loading && !error && series.length > 0 && (
        <svg width={w} height={h} style={{ display: 'block', maxWidth: '100%' }} role="img" aria-label="Organic clicks trend">
          <defs>
            <linearGradient id="seoGrad" x1="0" x2="0" y1="0" y2="1">
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
          {series.map((d, i) => i % labelEvery === 0 ? (
            <text key={i} x={pad.l + i * xStep} y={h - 6} textAnchor="middle" fontSize="10" fill={tc.text.muted}>
              {d.date.slice(5)}
            </text>
          ) : null)}
          <polygon points={areaPts} fill="url(#seoGrad)" />
          <polyline points={linePts} fill="none" stroke={PALETTE.violet} strokeWidth={2} />
        </svg>
      )}

      {/* GSC anonymized-query caveat — honest data-quality note, not fabricated data */}
      <div style={{ display: 'flex', gap: space['3'], padding: space['3'], background: PALETTE.warnSoft, borderRadius: radius.sm, alignItems: 'flex-start', marginTop: space['3'] }} data-testid="banner-gsc-anonymized">
        <span style={{ fontSize: '16px', lineHeight: 1 }}>⚠</span>
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.warn, lineHeight: 1.5 }}>
          <strong>GSC anonymizes rare queries.</strong> Search Console drops query strings for low-volume / privacy-sensitive searches, so query-level totals can understate true demand. Page-level clicks &amp; impressions above are complete.
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Data freshness — live GSC pipeline health (honest about un-wired sources)
// =============================================================================
function FreshnessCard({ tc }: { tc: Tc }) {
  const [health, setHealth] = useState<GscPipelineHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getGscPipelineHealth()
      .then((d) => { if (alive) setHealth(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load pipeline health'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const statusTone: Record<string, 'good' | 'warn' | 'bad'> = {
    healthy: 'good', warning: 'warn', stale: 'bad', credential_error: 'bad',
  };

  const rel = (iso: string | null): string => {
    if (!iso) return 'never';
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return '—';
    const h = Math.round(ms / 3_600_000);
    if (h < 24) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  };

  return (
    <Card tc={tc}>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['3'] }}>Data freshness</div>

      {loading && <div style={{ color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Checking…</div>}
      {error && <div style={{ color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}

      {health && (
        (() => {
          const observedAt = health.raw_data_last_date || health.last_successful_run || health.last_run_at;
          return (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${tc.border.subtle}` }}>
            <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary }}>Google Search Console</span>
            <span style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
              <Pill tone={statusTone[health.status] ?? 'warn'} tc={tc}>{health.status}</Pill>
              <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted }}>{rel(observedAt)}</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Last successful GSC data</span><span style={{ fontFamily: monoStack }}>{rel(observedAt)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Data lag</span><span style={{ fontFamily: monoStack }}>{health.days_behind == null ? '—' : `${health.days_behind}d`}</span></div>
            {health.last_error && (
              <div style={{ marginTop: space['1'], color: PALETTE.bad, fontSize: '11px' }}>{health.last_error}</div>
            )}
          </div>
          <div style={{ marginTop: space['3'], paddingTop: space['3'], borderTop: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.5 }}>
            GA4, Google Ads &amp; the cluster engine sync on their own schedules and aren&apos;t exposed through this freshness probe yet — this surface tracks GSC only.
          </div>
        </>
          );
        })()
      )}
    </Card>
  );
}

// =============================================================================
// "Do this next" — ranked detections from the engine candidate queue
// =============================================================================
function DetectionRow({
  rank, c, page, tc, onApprove, onDefer,
}: {
  rank: number;
  c: PageDossierCandidate;
  page: PortfolioPage | undefined;
  tc: Tc;
  onApprove: (c: PageDossierCandidate) => void;
  onDefer: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const meta = actionMeta(c.mutation_type, c.proposed_value);
  const score = c.opportunity_score != null ? Math.round(c.opportunity_score * 100) : null;
  // Honest impact: the target page's real GSC demand, not a modelled lift.
  const impr = page?.top_q_impr ?? page?.gsc_impressions ?? null;
  const pos = page?.top_q_pos ?? page?.gsc_best_position ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px 90px 220px', gap: space['4'], alignItems: 'center', padding: `${space['3']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-detection-${c.candidate_id}`}>
      <div style={{ fontFamily: monoStack, fontSize: '18px', fontWeight: fontWeight.semibold, color: tc.text.muted }}>#{rank}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
          <Pill tone={meta.tone} tc={tc}>{meta.label}</Pill>
          {c.regate_review_flag && <Pill tone="warn" tc={tc}>RE-REVIEW</Pill>}
          <span style={{ fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
            {meta.title}
          </span>
        </div>
        <div style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, marginBottom: '4px', wordBreak: 'break-all' }}>
          {c.target_page_url ? pathOf(c.target_page_url) : '—'}
        </div>
        {c.evidence_summary && (
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary, lineHeight: 1.5 }}>
            <span style={{ color: tc.text.muted }}>Why: </span>{c.evidence_summary}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target demand</div>
        <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.primary }}>
          {impr == null ? '—' : `${fmtInt(impr)} impr`}
        </div>
        <div style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
          {pos == null ? 'pos —' : `pos ${fmtPos(pos)}`} {score != null && `· score ${score}`}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effort</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary }}>{meta.effort}</div>
      </div>
      <div style={{ display: 'flex', gap: space['2'], alignItems: 'center' }}>
        <button
          onClick={async () => { setBusy(true); try { await onApprove(c); } finally { setBusy(false); } }}
          disabled={busy}
          data-testid={`button-approve-detection-${c.candidate_id}`}
          style={{ padding: '6px 12px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? '…' : 'Approve'}
        </button>
        <Link
          href={`/dashboard/seo/action/${encodeURIComponent(c.candidate_id)}`}
          data-testid={`link-details-${c.candidate_id}`}
          style={{ padding: '6px 12px', background: tc.background.surface, color: tc.text.primary, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '12px', textDecoration: 'none' }}
        >
          Details
        </Link>
        <button
          onClick={() => onDefer(c.candidate_id)}
          data-testid={`button-defer-${c.candidate_id}`}
          style={{ padding: '6px 8px', background: 'transparent', color: tc.text.muted, border: 'none', fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer' }}
        >
          Defer
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main content
// =============================================================================
function CommandCenterContent() {
  const tc = useThemeColors();

  const [candidates, setCandidates] = useState<PageDossierCandidate[] | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPage[] | null>(null);
  const [gaps, setGaps] = useState<SeoCompetitorGap[] | null>(null);
  const [gapMeta, setGapMeta] = useState<SeoCompetitorGapMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [diagnoseUrl, setDiagnoseUrl] = useState('');

  function loadAll() {
    setLoading(true); setError(null);
    Promise.all([
      getSeoCandidateQueue(),
      getSeoPortfolio(),
      getSeoCompetitorGapFeed().catch(() => ({ data: [] as SeoCompetitorGap[], meta: null })),
    ])
      .then(([q, p, feed]) => {
        setCandidates(q.candidates);
        setPortfolio(p);
        setGaps(feed.data);
        setGapMeta(feed.meta);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load command center'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  // Portfolio lookup keyed by path (host-robust: portfolio + candidate URLs
  // disagree on www vs apex host, so we normalize to pathname before joining).
  const portfolioByPath = useMemo(() => {
    const m = new Map<string, PortfolioPage>();
    (portfolio ?? []).forEach((p) => m.set(pathOf(p.url), p));
    return m;
  }, [portfolio]);

  // Bucket counts for the strip.
  const counts = useMemo(() => {
    const c: Record<PortfolioBucket, number> = { win: 0, strategic: 0, fix: 0, lost: 0 };
    (portfolio ?? []).forEach((p) => { c[p.bucket] += 1; });
    return c;
  }, [portfolio]);

  // Detections: pending engine candidates whose target page is verified
  // canonical_live (governance — never surface targets we can't confirm are
  // live). Ranked by opportunity score (already DESC from the API).
  const detections = useMemo(() => {
    return (candidates ?? [])
      .filter((c) => !deferred.has(c.candidate_id))
      .filter((c) => {
        if (!c.target_page_url) return false;
        const p = portfolioByPath.get(pathOf(c.target_page_url));
        return p != null && p.status_class === 'canonical_live';
      });
  }, [candidates, deferred, portfolioByPath]);

  async function approveOne(c: PageDossierCandidate) {
    await approveEngineCandidate({
      candidate_id: c.candidate_id,
      opportunity_id: c.opportunity_id ?? undefined,
      proposed_value: c.proposed_value ?? undefined,
      target_page_url: c.target_page_url ?? undefined,
    });
    setCandidates((prev) => (prev ?? []).filter((x) => x.candidate_id !== c.candidate_id));
  }

  function deferOne(id: string) {
    setDeferred((prev) => new Set(prev).add(id));
  }

  async function approveTopN(n: number) {
    if (bulkBusy) return;
    const targets = detections.slice(0, n);
    if (targets.length === 0) return;
    setBulkBusy(true); setActionMsg(null);
    const ids = new Set(targets.map((c) => c.candidate_id));
    setCandidates((prev) => (prev ?? []).filter((c) => !ids.has(c.candidate_id)));
    const results = await Promise.allSettled(targets.map((c) => approveEngineCandidate({
      candidate_id: c.candidate_id,
      opportunity_id: c.opportunity_id ?? undefined,
      proposed_value: c.proposed_value ?? undefined,
      target_page_url: c.target_page_url ?? undefined,
    })));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - ok;
    setActionMsg(`Queued ${ok} recommendation${ok === 1 ? '' : 's'} as DRAFT${failed ? ` · ${failed} failed (still pending)` : ''}.`);
    setBulkBusy(false);
    if (failed) loadAll();
  }

  const TOP_N = 5;
  const topCount = Math.min(TOP_N, detections.length);

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['6'], gap: space['4'], flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>SEO Command Center</h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-subtitle">
            {loading ? 'Loading governed recommendations…'
              : `${detections.length} gate-accepted recommendation${detections.length === 1 ? '' : 's'} awaiting approval on live pages.`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
          <button
            onClick={() => setDiagnoseOpen((v) => !v)}
            data-testid="button-diagnose"
            style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, cursor: 'pointer' }}
          >
            Diagnose a URL…
          </button>
          <button
            onClick={() => approveTopN(TOP_N)}
            disabled={bulkBusy || topCount === 0}
            data-testid="button-approve-top"
            style={{ padding: '8px 14px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: (bulkBusy || topCount === 0) ? 'default' : 'pointer', opacity: (bulkBusy || topCount === 0) ? 0.6 : 1 }}
          >
            {bulkBusy ? 'Queuing…' : `Approve top ${topCount}`}
          </button>
        </div>
      </div>

      {/* Diagnose-a-URL inline input */}
      {diagnoseOpen && (
        <div style={{ display: 'flex', gap: space['2'], marginBottom: space['5'], flexWrap: 'wrap' }}>
          <input
            value={diagnoseUrl}
            onChange={(e) => setDiagnoseUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && diagnoseUrl.trim()) setSelectedUrl(diagnoseUrl.trim()); }}
            placeholder="Paste a page URL or path to open its dossier…"
            data-testid="input-diagnose-url"
            style={{ flex: '1 1 320px', padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
          />
          <button
            onClick={() => { if (diagnoseUrl.trim()) setSelectedUrl(diagnoseUrl.trim()); }}
            disabled={!diagnoseUrl.trim()}
            data-testid="button-diagnose-go"
            style={{ padding: '8px 14px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: diagnoseUrl.trim() ? 'pointer' : 'default', opacity: diagnoseUrl.trim() ? 1 : 0.6 }}
          >
            Open dossier
          </button>
        </div>
      )}

      {actionMsg && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: PALETTE.goodSoft, color: PALETTE.good, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-action-msg">
          {actionMsg}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>
      )}

      {/* HERO — trend + freshness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: space['4'], marginBottom: space['4'] }}>
        <TrendChart tc={tc} />
        <FreshnessCard tc={tc} />
      </div>

      {/* MOMENTUM + RECENTLY SHIPPED */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: space['4'], marginBottom: space['6'] }}>
        <MomentumCard tc={tc} />
        <ShippedCard tc={tc} />
      </div>

      {/* DO THIS NEXT */}
      <SectionTitle
        tc={tc}
        sub="Gate-accepted engine recommendations on live pages, ranked by opportunity score"
        right={<Pill tone="neutral" tc={tc}>Lane 1 · draft-only approvals</Pill>}
      >
        Do this next
      </SectionTitle>
      <Card tc={tc} style={{ padding: 0 }}>
        <div style={{ padding: `0 ${space['5']}` }}>
          {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading recommendations…</div>}
          {!loading && detections.length === 0 && (
            <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-detections">
              No gate-accepted recommendations awaiting approval on live pages.
            </div>
          )}
          {!loading && detections.slice(0, 12).map((c, i) => (
            <DetectionRow
              key={c.candidate_id}
              rank={i + 1}
              c={c}
              page={c.target_page_url ? portfolioByPath.get(pathOf(c.target_page_url)) : undefined}
              tc={tc}
              onApprove={approveOne}
              onDefer={deferOne}
            />
          ))}
        </div>
        {!loading && detections.length > 12 && (
          <div style={{ padding: space['4'], borderTop: `1px solid ${tc.border.subtle}`, textAlign: 'center', background: tc.background.muted }}>
            <Link href="/dashboard/seo/performance" style={{ fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none' }} data-testid="link-view-all-detections">
              View all {detections.length} recommendations →
            </Link>
          </div>
        )}
      </Card>

      {/* COMPETITOR INTELLIGENCE */}
      <div style={{ marginTop: space['6'] }}>
        <SectionTitle tc={tc} sub="Informational competitive intel from the governed feed; dispatch decisions are shown inline">
          Competitor intelligence
        </SectionTitle>
        <Card tc={tc} style={{ padding: 0 }}>
          {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading competitor gaps…</div>}
          {!loading && (!gaps || gaps.length === 0) && (
            <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-gaps">
              No competitor gaps recorded in the governed feed.
            </div>
          )}
          {!loading && gaps && gaps.length > 0 && (
            <>
              {gapMeta && (
                <div style={{ padding: `${space['4']} ${space['5']}`, borderBottom: `1px solid ${tc.border.subtle}`, background: tc.background.muted }} data-testid="competitor-gap-meta">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['2'], alignItems: 'center', marginBottom: '4px' }}>
                    <Pill tone="info" tc={tc}>{fmtInt(gapMeta.filtered_count)} governed gaps</Pill>
                    <Pill tone={gapMeta.status_counts.dismissed === gapMeta.filtered_count ? 'neutral' : 'warn'} tc={tc}>
                      {fmtInt(gapMeta.status_counts.dismissed ?? 0)} reviewed / dismissed
                    </Pill>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                      from {fmtInt(gapMeta.total_count)} raw competitor rows
                    </span>
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.5 }}>
                    {gapMeta.filter_note} Showing the top {fmtInt(Math.min(gapMeta.returned_count, gapMeta.limit))}; dismissed rows are market intel, not open actions.
                  </div>
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: tc.background.muted, color: tc.text.muted, textAlign: 'left' }}>
                    <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Keyword</th>
                    <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Competitor</th>
                    <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Dispatch decision</th>
                    <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Their pos</th>
                    <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Your pos</th>
                    <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {gaps.slice(0, 8).map((g) => {
                    const dismissed = g.status === 'dismissed';
                    return (
                      <tr key={g.id} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-gap-${g.id}`}>
                        <td style={{ padding: '10px 16px', color: tc.text.primary, fontWeight: fontWeight.medium }}>{g.keyword || '—'}</td>
                        <td style={{ padding: '10px 8px', color: PALETTE.bad, fontFamily: monoStack, fontSize: '12px' }}>{hostnameOf(g.competitor_url)}</td>
                        <td style={{ padding: '10px 8px', color: tc.text.secondary }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <Pill tone={dismissed ? 'neutral' : g.status === 'new' ? 'warn' : 'info'} tc={tc}>
                              {dismissed ? 'reviewed — not prioritized' : g.status}
                            </Pill>
                            {dismissed && (
                              <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.4 }}>
                                {g.dismissed_reason || 'Dispatch dismissed this signal below the current prioritization threshold.'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{g.competitor_ranking_position ?? '—'}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.muted }}>{g.our_ranking_position ?? 'unranked'}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{g.opportunity_score == null ? '—' : g.opportunity_score.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          {!loading && gaps && gaps.length > 8 && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${tc.border.subtle}`, background: tc.background.muted, textAlign: 'right' }}>
              <Link href="/dashboard/seo/competitors" style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none' }} data-testid="link-view-all-gaps">
                View governed competitive intel ({fmtInt(gapMeta?.filtered_count ?? gaps.length)}) →
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* COMPETITOR CONTENT VELOCITY */}
      <div style={{ marginTop: space['6'] }}>
        <SectionTitle tc={tc} sub="New & refreshed competitor pages from the governed competitive crawl — real change counts, no modeled threat scores">
          Competitor content velocity
        </SectionTitle>
        <CompetitorVelocityCard tc={tc} />
      </div>

      {/* PORTFOLIO STRIP */}
      <div style={{ marginTop: space['6'] }}>
        <SectionTitle tc={tc} sub="Governed page portfolio by bucket — open Performance to triage">
          Portfolio at a glance
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['3'] }}>
          {BUCKETS.map((b) => (
            <Link
              key={b.key}
              href={`/dashboard/seo/performance?bucket=${b.key}`}
              data-testid={`tile-bucket-${b.key}`}
              style={{ textDecoration: 'none', border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface, display: 'block' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{b.label}</span>
                <Pill tone={bucketTone(b.key)} tc={tc}>{b.key}</Pill>
              </div>
              <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{loading ? '—' : counts[b.key]}</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{b.blurb}</div>
            </Link>
          ))}
        </div>
      </div>

      {selectedUrl && (
        <PageDossierDrawer url={selectedUrl} tc={tc} onClose={() => setSelectedUrl(null)} />
      )}
    </div>
  );
}

// =============================================================================
// Page export — RBAC-gated by DashboardGuard.
// =============================================================================
export default function SeoCommandCenterPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <CommandCenterContent />
    </DashboardGuard>
  );
}
