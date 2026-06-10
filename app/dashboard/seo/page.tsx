'use client';

// =============================================================================
// SEO Command Center — Screen 1 (overview / "do this next")
// Governance lock: this page is read-first. The ONLY write paths are the
// existing engine candidate approve/reject endpoints (Lane 1), routed through
// approveEngineCandidate / rejectEngineCandidate -> /api/proxy/seo/recommendations.
// Lanes 2 (Rank Math manual) and 3 (off-page) are advisory only — no mutations.
// Ahrefs is decommissioned — keyword value is sourced from DataForSEO via
// analytics.external_query_intelligence. The approvable queue comes from
// analytics.v_seo_dashboard_queue; lost/non-live redirect work is sectioned,
// not silently hidden.
//
// Data truthfulness: every number on this screen is a live read. We do NOT
// fabricate predicted lift, share-of-voice, or velocity figures. Detection
// "impact" is the target page's real GSC demand (impressions @ position), not a
// modelled click projection.
// =============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  getSeoOffpageBriefs, getSeoSuppressed, getSeoSystemHealth, getSeoOverviewKpis,
} from '../../../lib/seoApi';
import type {
  PortfolioPage, PortfolioBucket, PageDossierCandidate,
  SeoTimeseriesResponse, GscPipelineHealth, SeoCompetitorGap,
  SeoTimeseriesPoint, CompetitiveVelocitySummary, CompetitivePageChange,
  SeoShippedAction, SeoCandidateQueue, SeoOffpageBrief, SuppressedAudit,
  SeoCompetitorGapMeta, SeoWindowRequest, SeoSystemHealthRow, SeoDashboardMetricContract,
} from '../../../lib/seoApi';
import {
  PALETTE, monoStack, Tc, ToneKey, Pill, toneStyle, BUCKETS, bucketTone,
  fmtInt, fmtPos, fmtScore, pathOf, PageDossierDrawer, mutationDisplay, sectionLabelStyle, proposalReview,
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

function provenanceText(contract?: SeoDashboardMetricContract): string | null {
  if (!contract) return null;
  const parts = [contract.source_label || contract.freshness_source || 'Source declared', contract.grain, contract.window_label]
    .filter(Boolean);
  return parts.join(' · ');
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
  // Window by calendar DATE (anchored to the most recent point), not by array
  // index. The GSC daily series can be missing zero-traffic days, so slicing the
  // last N rows would span more than N calendar days and disagree with the hero /
  // Results 30-day number. Date-windowing keeps every surface on one number.
  if (series.length === 0) {
    return { label, curSum: 0, priorSum: 0, deltaPct: null, full: false, haveDays: 0, needDays: 2 * n };
  }
  const DAY = 86_400_000;
  const anchor = Date.parse(`${series[series.length - 1].date}T00:00:00Z`);
  const earliest = Date.parse(`${series[0].date}T00:00:00Z`);
  const sumWindow = (fromDaysAgo: number, toDaysAgo: number) =>
    series.reduce((sum, p) => {
      const t = Date.parse(`${p.date}T00:00:00Z`);
      return t > anchor - fromDaysAgo * DAY && t <= anchor - toDaysAgo * DAY ? sum + (p.clicks ?? 0) : sum;
    }, 0);
  const curSum = sumWindow(n, 0);
  const priorSum = sumWindow(2 * n, n);
  const haveDays = Math.round((anchor - earliest) / DAY) + 1;
  const full = haveDays >= 2 * n;
  const deltaPct = full && priorSum > 0 ? ((curSum - priorSum) / priorSum) * 100 : null;
  return { label, curSum, priorSum, deltaPct, full, haveDays, needDays: 2 * n };
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

function MomentumCard({ tc, window }: { tc: Tc; window: SeoWindowRequest }) {
  const [series, setSeries] = useState<SeoTimeseriesPoint[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setErr(false);
    setSeries(null);
    getSeoTimeseries({ ...window, days: Math.min(180, window.days * 2) })
      .then((r) => { if (alive) setSeries(r.series ?? []); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, [window]);

  const windows = useMemo(() => {
    if (!series) return null;
    return [computeMomentum(series, window.days, `${window.days}d`)];
  }, [series, window.days]);

  return (
    <Card tc={tc} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Momentum</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '2px', marginBottom: space['1'] }}>Selected GSC window vs equal prior period</div>
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
// Global GSC window — one selected range for every GSC-derived panel.
// =============================================================================
type RangeKey = '7' | '30' | '90' | 'custom';

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  const dt = new Date(`${d.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dt.getTime())) return d.slice(0, 10);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function referenceSourceLabel(source?: string | null, observedAt?: string | null): string {
  const src = source === 'dataforseo' ? 'DataForSEO' : source === 'ahrefs_fallback' ? 'Ahrefs fallback' : 'Keyword refs';
  return `${src}${observedAt ? ` · as of ${formatDate(observedAt)}` : ''}`;
}

function selectedWindow(range: RangeKey, customDays: number, customStart: string, customEnd: string): SeoWindowRequest {
  if (range === 'custom') {
    return { days: customDays, start: customStart || null, end: customEnd || null };
  }
  return { days: Number(range) };
}

function WindowControls({
  range, customDays, customStart, customEnd, onRange, onCustomDays, onCustomStart, onCustomEnd, data, tc,
}: {
  range: RangeKey;
  customDays: number;
  customStart: string;
  customEnd: string;
  onRange: (r: RangeKey) => void;
  onCustomDays: (d: number) => void;
  onCustomStart: (d: string) => void;
  onCustomEnd: (d: string) => void;
  data: SeoTimeseriesResponse | null;
  tc: Tc;
}) {
  const btn = (key: RangeKey, label: string) => {
    const active = range === key;
    return (
      <button
        key={key}
        onClick={() => onRange(key)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'], alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
        {btn('7', '7d')}
        {btn('30', '30d')}
        {btn('90', '90d')}
        {btn('custom', 'Custom')}
        {range === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <input
              type="range" min={1} max={180} value={customDays}
              onChange={(e) => onCustomDays(Number(e.target.value))}
              data-testid="input-custom-days"
              style={{ width: 140 }}
            />
            <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, minWidth: 58 }}>{customDays} days</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStart(e.target.value)}
              data-testid="input-custom-start"
              style={{ padding: '5px 8px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '12px' }}
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEnd(e.target.value)}
              data-testid="input-custom-end"
              style={{ padding: '5px 8px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '12px' }}
            />
          </div>
        )}
      </div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textAlign: 'right' }} data-testid="text-gsc-window">
        Showing: last {data?.range_days ?? (range === 'custom' ? customDays : Number(range))} days
        {' · '}GSC data {formatDate(data?.gsc_available_start)} → {formatDate(data?.gsc_available_end)}
      </div>
    </div>
  );
}

// =============================================================================
// Trend chart — live GSC timeseries
// =============================================================================

function TrendChart({
  tc, window, onData, contract,
}: {
  tc: Tc;
  window: SeoWindowRequest;
  onData: (d: SeoTimeseriesResponse | null) => void;
  contract?: SeoDashboardMetricContract;
}) {
  const [data, setData] = useState<SeoTimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoTimeseries(window)
      .then((d) => { if (alive) { setData(d); onData(d); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load trend'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [window, onData]);

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

  return (
    <Card tc={tc} style={{ background: tc.background.surface }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['3'], flexWrap: 'wrap', gap: space['3'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Organic trend</div>
        <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>{provenanceText(contract) ?? 'GSC organic · vs prior period'}</span>
      </div>

      <div style={{ marginBottom: space['2'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Organic clicks · last {data?.range_days ?? window.days} days
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
function FreshnessCard({ tc, contract }: { tc: Tc; contract?: SeoDashboardMetricContract }) {
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
      {provenanceText(contract) && (
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['3'] }}>
          {provenanceText(contract)}
        </div>
      )}

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
          <div style={{ marginTop: space['3'], paddingTop: space['3'], borderTop: `1px solid ${tc.border.subtle}` }}>
            {[
              { name: 'Google Analytics 4' },
              { name: 'Google Ads' },
              { name: 'Cluster engine' },
              { name: 'Rank Math' },
            ].map((s) => (
              <div
                key={s.name}
                data-testid={`row-freshness-${s.name.replace(/\W+/g, '-').toLowerCase()}`}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}
              >
                <span>{s.name}</span>
                <Pill tone="neutral" tc={tc}>no freshness probe</Pill>
              </div>
            ))}
            <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.5 }}>
              These sources sync on their own schedules and aren&apos;t wired to a freshness probe yet — only GSC is observed here.
            </div>
          </div>
        </>
          );
        })()
      )}
    </Card>
  );
}

function formatHealthTime(iso: string | null): string {
  if (!iso) return 'not run yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'not run yet';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function healthTone(row: SeoSystemHealthRow): ToneKey {
  if (row.health_group === 'red' || row.status === 'fail') return 'bad';
  if (row.health_group === 'amber' || row.status === 'warn') return 'warn';
  return 'good';
}

function sampleString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function sampleUrl(row: Record<string, unknown>): string | null {
  return sampleString(row.target_page_url)
    ?? sampleString(row.page_url)
    ?? sampleString(row.url)
    ?? sampleString(row.target_url)
    ?? sampleString(row.source_page)
    ?? null;
}

function healthSampleLabel(row: Record<string, unknown>): string {
  const url = sampleUrl(row);
  const field = sampleString(row.target_field);
  const candidate = sampleString(row.candidate_id);
  const signal = sampleString(row.source_name) ?? sampleString(row.metric_key);
  if (url) return field ? `${pathOf(url)} · ${field}` : pathOf(url);
  if (candidate) return `candidate ${candidate.slice(0, 8)}`;
  return signal ?? 'sample item';
}

function SystemHealthPanel({
  tc,
  rows,
  error,
  onOpenDossier,
}: {
  tc: Tc;
  rows: SeoSystemHealthRow[] | null;
  error: string | null;
  onOpenDossier: (url: string) => void;
}) {
  const grouped = useMemo(() => {
    const base: Record<'red' | 'amber' | 'green', SeoSystemHealthRow[]> = { red: [], amber: [], green: [] };
    (rows ?? []).forEach((row) => {
      if (row.health_group === 'red') base.red.push(row);
      else if (row.health_group === 'amber') base.amber.push(row);
      else base.green.push(row);
    });
    return base;
  }, [rows]);
  const red = grouped.red.length;
  const amber = grouped.amber.length;
  const visibleRows = rows
    ? [...grouped.red, ...grouped.amber, ...grouped.green.slice(0, Math.max(0, 6 - red - amber))]
    : [];

  return (
    <Card tc={tc} style={{ padding: 0, marginBottom: space['6'] }}>
      <div style={{ padding: space['5'], borderBottom: `1px solid ${tc.border.subtle}`, display: 'flex', justifyContent: 'space-between', gap: space['4'], flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={sectionLabelStyle(tc)}>System Health</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '3px' }}>
            Integrity failures become tracked business actions here, with self-heal attempts logged when available.
          </div>
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Pill tone={red ? 'bad' : 'good'} tc={tc}>{red} red</Pill>
          <Pill tone={amber ? 'warn' : 'good'} tc={tc}>{amber} amber</Pill>
          <Pill tone="good" tc={tc}>{grouped.green.length} green</Pill>
        </div>
      </div>

      {error && (
        <div style={{ padding: space['5'], color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="error-system-health">
          System health unavailable.
        </div>
      )}
      {!error && !rows && (
        <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          Loading system health…
        </div>
      )}
      {!error && rows && rows.length === 0 && (
        <div style={{ padding: space['5'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          No integrity checks are cataloged yet.
        </div>
      )}
      {!error && visibleRows.length > 0 && (
        <div style={{ padding: `0 ${space['5']}` }}>
          {visibleRows.map((row) => {
            const tone = healthTone(row);
            const samples = Array.isArray(row.sample) ? row.sample.slice(0, 2) : [];
            return (
              <div key={row.check_name} style={{ padding: `${space['4']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`system-health-${row.check_name}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: '1 1 360px' }}>
                    <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill tone={tone} tc={tc}>{row.status}</Pill>
                      <span style={{ fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>{row.human_title}</span>
                      <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>{row.category}</span>
                    </div>
                    <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, lineHeight: 1.5 }}>
                      {row.what_it_means} {row.why_it_matters}
                    </div>
                    <div style={{ marginTop: '8px', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.primary, lineHeight: 1.5 }}>
                      <strong style={{ fontWeight: fontWeight.semibold }}>Fix:</strong> {row.remediation}
                    </div>
                    {row.last_remediation_at && (
                      <div style={{ marginTop: '6px', fontFamily: fontFamily.body, fontSize: '12px', color: row.last_remediation_result === 'failed' ? PALETTE.bad : tc.text.muted }}>
                        Last self-heal: {row.last_remediation_result ?? 'recorded'} · {formatHealthTime(row.last_remediation_at)}
                        {row.last_remediation_notes ? ` · ${row.last_remediation_notes}` : ''}
                      </div>
                    )}
                    {samples.length > 0 && (
                      <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginTop: '10px' }}>
                        {samples.map((sample, idx) => {
                          const url = sampleUrl(sample);
                          return (
                            <button
                              key={`${row.check_name}-${idx}`}
                              onClick={() => { if (url) onOpenDossier(url); }}
                              disabled={!url}
                              style={{ border: `1px solid ${tc.border.default}`, background: tc.background.surface, borderRadius: radius.sm, padding: '5px 8px', color: url ? PALETTE.violet : tc.text.muted, fontFamily: monoStack, fontSize: '11px', cursor: url ? 'pointer' : 'default', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={url ?? healthSampleLabel(sample)}
                            >
                              {healthSampleLabel(sample)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontFamily: monoStack, fontSize: '24px', color: tone === 'bad' ? PALETTE.bad : tone === 'warn' ? PALETTE.warn : PALETTE.good }}>
                      {fmtInt(row.count)}
                    </div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
                      affected · {formatHealthTime(row.run_at)}
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <Pill tone={row.auto_remediated ? 'violet' : 'neutral'} tc={tc}>
                        {row.auto_remediated ? 'self-heal' : row.owner}
                      </Pill>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {rows && rows.length > visibleRows.length && (
            <div style={{ padding: `${space['3']} 0 ${space['4']}`, fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
              {rows.length - visibleRows.length} green check{rows.length - visibleRows.length === 1 ? '' : 's'} hidden to keep the command center focused.
            </div>
          )}
        </div>
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
  const score = fmtScore(c.opportunity_score);
  // Honest impact: the target page's real GSC demand, not a modelled lift.
  const impr = page?.top_q_impr ?? page?.gsc_impressions ?? null;
  const pos = page?.top_q_pos ?? page?.gsc_best_position ?? null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 160px 90px 220px', gap: space['4'], alignItems: 'center', padding: `${space['3']} 0`, borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-detection-${c.candidate_id}`}>
      <div style={{ fontFamily: monoStack, fontSize: '18px', fontWeight: fontWeight.semibold, color: tc.text.muted }}>#{rank}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
          {(() => { const m = mutationDisplay(c.mutation_type, c.primary_remedy); return (
            <>
              <Pill tone="violet" tc={tc}>{c.mutation_label ?? m.tag}</Pill>
              <span style={{ fontFamily: fontFamily.body, fontSize: '14px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>
                {c.mutation_label ?? m.verb(c.proposed_value)}
              </span>
              {c.regate_review_flag && (
                <span title="Re-surfaced for human re-review after a prior decision">
                  <Pill tone="warn" tc={tc}>re-review</Pill>
                </span>
              )}
              {(() => { const review = proposalReview(c); return review.flagged ? (
                <span title={`Not auto-approvable — ${review.reasons.join(' ')}`} data-testid={`detection-needs-review-${c.candidate_id}`}>
                  <Pill tone="warn" tc={tc}>needs review</Pill>
                </span>
              ) : null; })()}
            </>
          ); })()}
        </div>
        <div style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, marginBottom: '4px', wordBreak: 'break-all' }}>
          {c.page_url_canonical ?? (c.target_page_url ? pathOf(c.target_page_url) : '—')}
        </div>
        {(c.why || c.evidence_summary) && (
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary, lineHeight: 1.5 }}>
            <span style={{ color: tc.text.muted }}>Why: </span>{c.why ?? c.evidence_summary}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target demand</div>
        <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.primary }}>
          {impr == null ? '—' : `${fmtInt(impr)} impr`}
        </div>
        <div style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
          {pos == null ? 'pos —' : `pos ${fmtPos(pos)}`} {score !== '—' && `· score ${score}`}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effort</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary }}>Low</div>
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
// Off-page authority briefs — portfolio-wide Lane 3 advisory (read-only).
// Sourced from analytics.seo_offpage_brief. All figures are real observed GSC /
// DataForSEO values — no fabricated link counts or projected authority.
// =============================================================================
function OffpageBriefsSection({ tc, window }: { tc: Tc; window: SeoWindowRequest }) {
  const [briefs, setBriefs] = useState<SeoOffpageBrief[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getSeoOffpageBriefs(undefined, window)
      .then((b) => { if (alive) setBriefs(b); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load off-page briefs'); });
    return () => { alive = false; };
  }, [window]);

  return (
    <div style={{ marginTop: space['6'] }}>
      <SectionTitle
        tc={tc}
        sub="Authority-bound pages where on-page is adequate — earn links / digital PR to break into the top 10"
        right={<Pill tone="neutral" tc={tc}>Lane 3 · advisory</Pill>}
      >
        Off-page authority briefs
      </SectionTitle>
      <Card tc={tc} style={{ padding: 0 }}>
        {!briefs && !error && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading off-page briefs…</div>}
        {error && <div style={{ padding: space['4'], color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
        {briefs && briefs.length === 0 && (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-offpage">
            No off-page authority briefs — on-page work (Lanes 1 &amp; 2) is the priority.
          </div>
        )}
        {briefs && briefs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
            <thead>
              <tr style={{ background: tc.background.muted, color: tc.text.muted, textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Page</th>
                <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Target keyword</th>
                <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Pos</th>
                <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Impr</th>
                <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Vol ref</th>
                <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>KD ref</th>
                <th style={{ padding: '10px 16px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase' }}>Why</th>
              </tr>
            </thead>
            <tbody>
              {briefs.map((b, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-offpage-${i}`}>
                  <td style={{ padding: '10px 16px', fontFamily: monoStack, fontSize: '12px', color: tc.text.primary, wordBreak: 'break-all' }}>{pathOf(b.page_url)}</td>
                  <td style={{ padding: '10px 8px', color: tc.text.primary }}>{b.target_keyword || '—'}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtPos(b.current_position)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtInt(b.impressions)}</td>
                  <td
                    style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}
                    title={referenceSourceLabel(b.reference_metrics_source, b.reference_metrics_observed_at)}
                  >
                    {fmtInt(b.search_volume)}
                  </td>
                  <td
                    style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}
                    title={referenceSourceLabel(b.reference_metrics_source, b.reference_metrics_observed_at)}
                  >
                    {b.keyword_difficulty == null ? '—' : b.keyword_difficulty.toFixed(0)}
                  </td>
                  <td style={{ padding: '10px 16px', color: tc.text.muted, fontSize: '12px', maxWidth: 320 }}>{b.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// =============================================================================
// Suppressed candidates — read-only audit grouped by gate reason. Sourced from
// the engine's gate-rejected pile (analytics). Shows WHY the engine withheld a
// candidate so the absence of action is transparent, never hidden.
// =============================================================================
function SuppressedSection({ tc }: { tc: Tc }) {
  const [audit, setAudit] = useState<SuppressedAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openReason, setOpenReason] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getSeoSuppressed()
      .then((a) => { if (alive) setAudit(a); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load suppressed audit'); });
    return () => { alive = false; };
  }, []);

  // Group returned sample rows for expansion details. Headline counts come from
  // audit.reasons, which is the full-table rollup and not limited by sample size.
  const sampleRowsByReason = useMemo(() => {
    const m = new Map<string, SuppressedAudit['rows']>();
    (audit?.rows ?? []).forEach((r) => {
      const reasons = r.gate_reasons.length > 0 ? r.gate_reasons : ['(no reason recorded)'];
      reasons.forEach((reason) => {
        const list = m.get(reason) ?? [];
        list.push(r);
        m.set(reason, list);
      });
    });
    return m;
  }, [audit]);
  const reasonRollups = audit?.reasons ?? [];

  return (
    <div style={{ marginTop: space['6'] }}>
      <SectionTitle
        tc={tc}
        sub="Candidates the engine withheld at the gate — grouped by reason, for transparency"
        right={audit ? <Pill tone="neutral" tc={tc}>{audit.total} suppressed</Pill> : undefined}
      >
        Suppressed by the gate
      </SectionTitle>
      <Card tc={tc} style={{ padding: 0 }}>
        {!audit && !error && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading suppressed audit…</div>}
        {error && <div style={{ padding: space['4'], color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
        {audit && reasonRollups.length === 0 && (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-suppressed">
            Nothing suppressed — every candidate the engine produced passed the gate.
          </div>
        )}
        {audit && reasonRollups.map((rollup) => {
          const reason = rollup.reason;
          const rows = sampleRowsByReason.get(reason) ?? [];
          const pct = audit.total > 0 ? Math.round((rollup.count / audit.total) * 1000) / 10 : 0;
          const open = openReason === reason;
          return (
            <div key={reason} style={{ borderTop: `1px solid ${tc.border.subtle}` }}>
              <button
                onClick={() => setOpenReason(open ? null : reason)}
                data-testid={`button-suppressed-reason-${reason.replace(/\W+/g, '-').toLowerCase()}`}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: space['3'], padding: `${space['3']} ${space['5']}`, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap' }}>
                  <Pill tone="warn" tc={tc}>{reason}</Pill>
                  <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                    {fmtInt(rollup.count)} suppressed · {pct.toFixed(1)}%
                  </span>
                </span>
                <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted }}>{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <div style={{ padding: `0 ${space['5']} ${space['3']}` }}>
                  {rows.length === 0 && (
                    <div style={{ padding: '6px 0', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                      No sampled rows for this reason in the current response; the count above is the full gate-suppressed rollup.
                    </div>
                  )}
                  {rows.map((r) => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], padding: '6px 0', borderTop: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: '12px' }} data-testid={`row-suppressed-${r.id}`}>
                      <span style={{ minWidth: 0 }}>
                        <Pill tone="neutral" tc={tc}>{mutationDisplay(r.mutation_type).tag}</Pill>
                        <span style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, marginLeft: space['2'], wordBreak: 'break-all' }}>{r.target_url ? pathOf(r.target_url) : '—'}</span>
                      </span>
                      <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, flexShrink: 0 }}>
                        {r.relevance_score == null ? '' : `rel ${(r.relevance_score * 100).toFixed(0)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// =============================================================================
// Main content
// =============================================================================
function CommandCenterContent() {
  const tc = useThemeColors();

  const [candidates, setCandidates] = useState<PageDossierCandidate[] | null>(null);
  const [queueSummary, setQueueSummary] = useState<SeoCandidateQueue['summary'] | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPage[] | null>(null);
  const [gaps, setGaps] = useState<SeoCompetitorGap[] | null>(null);
  const [gapMeta, setGapMeta] = useState<SeoCompetitorGapMeta | null>(null);
  const [systemHealth, setSystemHealth] = useState<SeoSystemHealthRow[] | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [gapsError, setGapsError] = useState<string | null>(null);
  const [systemHealthError, setSystemHealthError] = useState<string | null>(null);
  const [deferred, setDeferred] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewSelected, setReviewSelected] = useState<Set<string>>(new Set());
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [diagnoseOpen, setDiagnoseOpen] = useState(false);
  const [diagnoseUrl, setDiagnoseUrl] = useState('');
  const [metricContracts, setMetricContracts] = useState<Record<string, SeoDashboardMetricContract>>({});
  const [range, setRange] = useState<RangeKey>('30');
  const [customDays, setCustomDays] = useState(45);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [trendData, setTrendData] = useState<SeoTimeseriesResponse | null>(null);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search).get('url');
    if (url) setSelectedUrl(url);
  }, []);
  const seoWindow = useMemo(() => selectedWindow(range, customDays, customStart, customEnd), [range, customDays, customStart, customEnd]);
  const handleTrendData = useCallback((d: SeoTimeseriesResponse | null) => setTrendData(d), []);

  const loadQueue = useCallback(() => {
    let alive = true;
    setQueueLoading(true);
    setQueueError(null);
    getSeoCandidateQueue()
      .then((q) => {
        if (!alive) return;
        setCandidates(q.candidates ?? []);
        setQueueSummary(q.summary ?? null);
      })
      .catch((e) => {
        if (!alive) return;
        setCandidates([]);
        setQueueSummary(null);
        setQueueError(e instanceof Error ? e.message : 'Failed to load recommendations');
      })
      .finally(() => {
        if (alive) setQueueLoading(false);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => loadQueue(), [loadQueue]);

  useEffect(() => {
    let alive = true;
    getSeoOverviewKpis()
      .then((kpis) => {
        if (!alive) return;
        const rows = kpis.metric_contracts ?? [];
        setMetricContracts(Object.fromEntries(rows.map((row) => [row.metric_key, row])));
      })
      .catch(() => {
        if (alive) setMetricContracts({});
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setPortfolioLoading(true);
    setPortfolioError(null);
    getSeoPortfolio(seoWindow)
      .then((p) => { if (alive) setPortfolio(p); })
      .catch((e) => {
        if (!alive) return;
        setPortfolio([]);
        setPortfolioError(e instanceof Error ? e.message : 'Failed to load portfolio');
      })
      .finally(() => { if (alive) setPortfolioLoading(false); });
    return () => { alive = false; };
  }, [seoWindow]);

  useEffect(() => {
    let alive = true;
    setGapsLoading(true);
    setGapsError(null);
    getSeoCompetitorGapFeed(seoWindow)
      .then((feed) => {
        if (!alive) return;
        setGaps(feed.data);
        setGapMeta(feed.meta);
      })
      .catch((e) => {
        if (!alive) return;
        setGaps([]);
        setGapMeta(null);
        setGapsError(e instanceof Error ? e.message : 'Failed to load competitor gaps');
      })
      .finally(() => { if (alive) setGapsLoading(false); });
    return () => { alive = false; };
  }, [seoWindow]);

  useEffect(() => {
    let alive = true;
    setSystemHealthError(null);
    getSeoSystemHealth()
      .then((rows) => { if (alive) setSystemHealth(rows); })
      .catch((e) => {
        if (!alive) return;
        setSystemHealth([]);
        setSystemHealthError(e instanceof Error ? e.message : 'Failed to load system health');
      });
    return () => { alive = false; };
  }, []);

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

  // How many of the pages in each bucket are unverified (needs_verify). These
  // are pending_verification pages folded into Strategic — surfaced as a
  // subgroup so the bucket count is not silently inflated by pages we cannot
  // yet confirm are canonical_live.
  const verifyCounts = useMemo(() => {
    const c: Record<PortfolioBucket, number> = { win: 0, strategic: 0, fix: 0, lost: 0 };
    (portfolio ?? []).forEach((p) => { if (p.needs_verify) c[p.bucket] += 1; });
    return c;
  }, [portfolio]);

  const detections = useMemo(() => {
    return (candidates ?? [])
      .filter((c) => !deferred.has(c.candidate_id));
  }, [candidates, deferred]);

  const liveDetections = useMemo(
    () => detections.filter((c) => c.page_is_live === true),
    [detections],
  );

  const redirectDetections = useMemo(
    () => detections.filter((c) => c.page_is_live !== true),
    [detections],
  );

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

  // Open the review-then-confirm panel for the top N detections. Nothing is
  // approved until the user confirms — and they may deselect any candidate
  // first (governance: bulk approve must remain a deliberate, reviewable act).
  function openReview(n: number) {
    const targets = detections.slice(0, n);
    if (targets.length === 0) return;
    // Governance (D7): candidates flagged "needs review" (placeholder/scaffold
    // proposals) are NOT pre-selected — a human must deliberately opt them in
    // after authoring/checking. They still appear in the list, just unchecked.
    setReviewSelected(new Set(targets.filter((c) => !proposalReview(c).flagged).map((c) => c.candidate_id)));
    setReviewOpen(true);
  }

  function toggleReview(id: string) {
    setReviewSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function confirmReview() {
    if (bulkBusy) return;
    const targets = detections.filter((c) => reviewSelected.has(c.candidate_id));
    if (targets.length === 0) { setReviewOpen(false); return; }
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
    setReviewOpen(false);
    if (failed) loadQueue();
  }

  const TOP_N = 5;
  const topCount = Math.min(TOP_N, detections.length);
  const reviewTargets = useMemo(
    () => detections.slice(0, TOP_N),
    [detections],
  );
  const summaryTiles = [
    { label: 'Decisions', value: queueSummary?.decisions ?? detections.length, help: 'Guarded recommendations awaiting approval', metricKey: 'awaiting_approval' },
    { label: 'Total proposals', value: queueSummary?.total_proposals ?? detections.length, help: 'Canonical queue rows', metricKey: 'total_proposals' },
    { label: 'Re-review flagged', value: queueSummary?.re_review_flagged ?? 0, help: 'Needs another gate review' },
    { label: 'Needs review', value: queueSummary?.needs_review ?? 0, help: 'Evidence or QA attention needed' },
  ];

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space['6'], gap: space['4'], flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>SEO Command Center</h1>
          <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-subtitle">
            {queueLoading ? 'Loading governed recommendations…'
              : `${detections.length} guarded recommendation${detections.length === 1 ? '' : 's'} awaiting approval (${liveDetections.length} live-page, ${redirectDetections.length} lost/non-live).`}
          </p>
          <Link
            href="/dashboard/marketing/seo"
            style={{ display: 'inline-flex', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.semibold, color: PALETTE.violet, textDecoration: 'none' }}
            data-testid="link-marketing-seo-summary"
          >
            Marketing SEO Summary →
          </Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'], alignItems: 'flex-end' }}>
          <WindowControls
            range={range}
            customDays={customDays}
            customStart={customStart}
            customEnd={customEnd}
            onRange={setRange}
            onCustomDays={setCustomDays}
            onCustomStart={setCustomStart}
            onCustomEnd={setCustomEnd}
            data={trendData}
            tc={tc}
          />
          <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDiagnoseOpen((v) => !v)}
              data-testid="button-diagnose"
              style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, cursor: 'pointer' }}
            >
              Diagnose a URL…
            </button>
            <button
              onClick={() => openReview(TOP_N)}
              disabled={bulkBusy || topCount === 0}
              data-testid="button-approve-top"
              style={{ padding: '8px 14px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: (bulkBusy || topCount === 0) ? 'default' : 'pointer', opacity: (bulkBusy || topCount === 0) ? 0.6 : 1 }}
            >
              {`Review top ${topCount}…`}
            </button>
          </div>
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

      {/* Approve-top-N review-then-confirm. Governance: bulk approve is never a
          one-click act — the user reviews each candidate and may deselect any
          before anything is queued as DRAFT. */}
      {reviewOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: space['6'], overflowY: 'auto' }}
          onClick={() => { if (!bulkBusy) setReviewOpen(false); }}
          data-testid="overlay-review"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 640, background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['5'], marginTop: '48px' }}
          >
            <div style={sectionLabelStyle(tc)}>Review before queuing as DRAFT</div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginBottom: space['4'] }}>
              Deselect anything you don&apos;t want to approve. Selected items are queued as DRAFT for human governance — nothing is published.
            </div>
            <div style={{ borderTop: `1px solid ${tc.border.subtle}`, marginBottom: space['4'] }}>
              {reviewTargets.map((c) => {
                const checked = reviewSelected.has(c.candidate_id);
                const m = mutationDisplay(c.mutation_type, c.primary_remedy);
                const review = proposalReview(c);
                return (
                  <label
                    key={c.candidate_id}
                    data-testid={`review-row-${c.candidate_id}`}
                    style={{ display: 'flex', gap: space['3'], alignItems: 'flex-start', padding: `${space['3']} 0`, borderBottom: `1px solid ${tc.border.subtle}`, cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => { toggleReview(c.candidate_id); }}
                      data-testid={`review-check-${c.candidate_id}`}
                      style={{ marginTop: '3px', flexShrink: 0 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'flex', gap: space['2'], alignItems: 'center', flexWrap: 'wrap', marginBottom: '2px' }}>
                        <Pill tone="violet" tc={tc}>{c.mutation_label ?? m.tag}</Pill>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.mutation_label ?? m.verb(c.proposed_value)}</span>
                        {c.regate_review_flag && <Pill tone="warn" tc={tc}>re-review</Pill>}
                        {review.flagged && (
                          <span title={review.reasons.join(' ')} data-testid={`review-needs-review-${c.candidate_id}`}><Pill tone="warn" tc={tc}>needs review</Pill></span>
                        )}
                      </span>
                      <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted, wordBreak: 'break-all' }}>{c.target_page_url ? pathOf(c.target_page_url) : '—'}</span>
                      {review.flagged && (
                        <span style={{ display: 'block', fontFamily: fontFamily.body, fontSize: '11px', color: PALETTE.warn, marginTop: '2px' }}>
                          Not auto-approvable — {review.reasons[0]}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: space['2'], justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                onClick={() => setReviewOpen(false)}
                disabled={bulkBusy}
                data-testid="button-review-cancel"
                style={{ padding: '8px 14px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, cursor: bulkBusy ? 'default' : 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReview}
                disabled={bulkBusy || reviewSelected.size === 0}
                data-testid="button-review-confirm"
                style={{ padding: '8px 14px', background: PALETTE.violet, color: '#fff', border: 'none', borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: (bulkBusy || reviewSelected.size === 0) ? 'default' : 'pointer', opacity: (bulkBusy || reviewSelected.size === 0) ? 0.6 : 1 }}
              >
                {bulkBusy ? 'Queuing…' : `Queue ${reviewSelected.size} as DRAFT`}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.sm, background: PALETTE.goodSoft, color: PALETTE.good, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-action-msg">
          {actionMsg}
        </div>
      )}
      {queueError && (
        <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{queueError}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['3'], marginBottom: space['4'] }}>
        {summaryTiles.map((tile) => (
          <Card key={tile.label} tc={tc} style={{ padding: space['4'] }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: fontWeight.semibold }}>
              {tile.label}
            </div>
            <div style={{ fontFamily: monoStack, fontSize: '28px', lineHeight: 1.1, color: tc.text.primary, marginTop: '6px' }}>
              {queueLoading ? '—' : fmtInt(tile.value)}
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '4px' }}>
              {tile.help}
            </div>
            {'metricKey' in tile && tile.metricKey && provenanceText(metricContracts[tile.metricKey]) && (
              <div style={{ fontFamily: fontFamily.body, fontSize: '10px', color: tc.text.muted, marginTop: '6px', lineHeight: 1.35 }}>
                {provenanceText(metricContracts[tile.metricKey])}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* HERO — trend + freshness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: space['4'], marginBottom: space['4'] }}>
        <TrendChart tc={tc} window={seoWindow} onData={handleTrendData} contract={metricContracts.organic_clicks_30d} />
        <FreshnessCard tc={tc} contract={metricContracts.gsc_latest_data_age_days} />
      </div>

      {/* MOMENTUM + RECENTLY SHIPPED */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: space['4'], marginBottom: space['6'] }}>
        <MomentumCard tc={tc} window={seoWindow} />
        <ShippedCard tc={tc} />
      </div>

      <SystemHealthPanel
        tc={tc}
        rows={systemHealth}
        error={systemHealthError}
        onOpenDossier={setSelectedUrl}
      />

      {/* DO THIS NEXT */}
      <SectionTitle
        tc={tc}
        sub="Guarded engine recommendations, ordered by queue type and target page while opportunity scoring is recalibrated"
        right={<Pill tone="neutral" tc={tc}>Lane 1 · draft-only approvals</Pill>}
      >
        Do this next
      </SectionTitle>
      <Card tc={tc} style={{ padding: 0 }}>
        <div style={{ padding: `0 ${space['5']}` }}>
          {queueLoading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading recommendations…</div>}
          {!queueLoading && queueError && (
            <div style={{ padding: space['6'], textAlign: 'center', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="error-detections">
              Recommendations unavailable.
            </div>
          )}
          {!queueLoading && !queueError && detections.length === 0 && (
            <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-detections">
              No guarded recommendations awaiting approval.
            </div>
          )}
          {!queueLoading && !queueError && liveDetections.length > 0 && (
            <div style={{ padding: `${space['4']} 0 ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              On-page optimizations ({liveDetections.length})
            </div>
          )}
          {!queueLoading && !queueError && liveDetections.slice(0, 12).map((c, i) => (
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
          {!queueLoading && !queueError && redirectDetections.length > 0 && (
            <div style={{ padding: `${space['5']} 0 ${space['2']}`, fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, color: PALETTE.bad, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Lost pages / redirects ({redirectDetections.length})
            </div>
          )}
          {!queueLoading && !queueError && redirectDetections.slice(0, 20).map((c, i) => (
            <DetectionRow
              key={c.candidate_id}
              rank={liveDetections.length + i + 1}
              c={c}
              page={c.target_page_url ? portfolioByPath.get(pathOf(c.target_page_url)) : undefined}
              tc={tc}
              onApprove={approveOne}
              onDefer={deferOne}
            />
          ))}
        </div>
        {!queueLoading && !queueError && detections.length > 12 && (
          <div style={{ padding: space['4'], borderTop: `1px solid ${tc.border.subtle}`, textAlign: 'center', background: tc.background.muted }}>
            <Link href="/dashboard/seo/recommendations" style={{ fontFamily: fontFamily.body, fontSize: '13px', color: PALETTE.violet, fontWeight: fontWeight.medium, textDecoration: 'none' }} data-testid="link-view-all-detections">
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
          {gapsLoading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading competitor gaps…</div>}
          {!gapsLoading && gapsError && (
            <div style={{ padding: space['6'], textAlign: 'center', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="error-gaps">
              Competitor gaps unavailable.
            </div>
          )}
          {!gapsLoading && !gapsError && (!gaps || gaps.length === 0) && (
            <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-gaps">
              No competitor gaps recorded in the governed feed.
            </div>
          )}
          {!gapsLoading && !gapsError && gaps && gaps.length > 0 && (
            <>
              {gapMeta && (
                <div style={{ padding: `${space['4']} ${space['5']}`, borderBottom: `1px solid ${tc.border.subtle}`, background: tc.background.muted }} data-testid="competitor-gap-meta">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['2'], alignItems: 'center', marginBottom: '4px' }}>
                    <Pill tone="info" tc={tc}>{fmtInt(gapMeta.filtered_count)} governed gaps</Pill>
                    <Pill tone="neutral" tc={tc}>
                      {fmtInt(gapMeta.governed_competitors_count)} governed / {fmtInt(gapMeta.raw_competitors_count)} raw / {fmtInt(gapMeta.configured_competitors_count)} configured competitors
                    </Pill>
                    <Pill tone={gapMeta.status_counts.dismissed === gapMeta.filtered_count ? 'neutral' : 'warn'} tc={tc}>
                      {fmtInt(gapMeta.status_counts.dismissed ?? 0)} reviewed / dismissed
                    </Pill>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                      from {fmtInt(gapMeta.total_count)} raw competitor rows
                    </span>
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.5 }}>
                    {gapMeta.filter_note} Showing {fmtInt(gapMeta.returned_count)} matching rows; dismissed rows are market intel, not open actions.
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
                    <th style={{ padding: '10px 8px', fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', textAlign: 'right' }}>Volume ref</th>
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
                              {dismissed ? 'reviewed - not prioritized' : g.status}
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
                        <td
                          style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}
                          title={referenceSourceLabel(g.reference_metrics_source, g.reference_metrics_observed_at)}
                        >
                          {fmtInt(g.search_volume)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{g.opportunity_score == null ? '—' : g.opportunity_score.toFixed(0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
          {!gapsLoading && !gapsError && gaps && gaps.length > 8 && (
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

      {/* OFF-PAGE AUTHORITY BRIEFS (Lane 3 advisory) */}
      <OffpageBriefsSection tc={tc} window={seoWindow} />

      {/* SUPPRESSED BY THE GATE (read-only audit) */}
      <SuppressedSection tc={tc} />

      {/* PORTFOLIO STRIP */}
      <div style={{ marginTop: space['6'] }}>
        <SectionTitle tc={tc} sub="Governed page portfolio by bucket — open Performance to triage">
          Portfolio at a glance
        </SectionTitle>
        {portfolioError && (
          <div style={{ marginBottom: space['3'], padding: space['3'], borderRadius: radius.sm, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="error-portfolio">
            Portfolio unavailable.
          </div>
        )}
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
              <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{portfolioLoading ? '—' : counts[b.key]}</div>
              {!portfolioLoading && verifyCounts[b.key] > 0 && (
                <div style={{ marginTop: '4px' }} data-testid={`text-verify-count-${b.key}`}>
                  <Pill tone="warn" tc={tc}>{verifyCounts[b.key]} need verify</Pill>
                </div>
              )}
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{b.blurb}</div>
            </Link>
          ))}
        </div>
      </div>

      {selectedUrl && (
        <PageDossierDrawer url={selectedUrl} tc={tc} window={seoWindow} onClose={() => setSelectedUrl(null)} />
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
