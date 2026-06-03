'use client';

// =============================================================================
// SEO Command Center — Results (outcomes & pipeline health)
// Governance lock: read-only. Every figure is a live read from the progress
// endpoint — no modelled or fabricated outcome numbers.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoProgress } from '../../../../lib/seoApi';
import type { SeoProgressResponse, SeoProgressDelta, SeoProgressPositionDelta } from '../../../../lib/seoApi';
import { PALETTE, monoStack, Tc, Pill, fmtInt, fmtPos } from '../_shared';

function Card({ children, style, tc }: { children: React.ReactNode; style?: React.CSSProperties; tc: Tc }) {
  return <div style={{ background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['5'], ...style }}>{children}</div>;
}

function DeltaStat({ label, d, tc, invert }: { label: string; d: SeoProgressDelta; tc: Tc; invert?: boolean }) {
  const up = d.delta_pct >= 0;
  const good = invert ? !up : up;
  return (
    <div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary, marginTop: '2px' }}>{fmtInt(d.current)}</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: good ? PALETTE.good : PALETTE.bad, marginTop: '2px' }}>
        {up ? '▲' : '▼'} {Math.abs(d.delta_pct).toFixed(1)}% vs prior ({fmtInt(d.prior)})
      </div>
    </div>
  );
}

function PositionStat({ label, d, tc }: { label: string; d: SeoProgressPositionDelta; tc: Tc }) {
  // For position, a NEGATIVE delta (moved toward #1) is good.
  const improved = d.delta != null && d.delta < 0;
  return (
    <div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, color: tc.text.primary, marginTop: '2px' }}>{fmtPos(d.current)}</div>
      <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: d.delta == null ? tc.text.muted : (improved ? PALETTE.good : PALETTE.bad), marginTop: '2px' }}>
        {d.delta == null ? 'no prior data' : `${improved ? '▲' : '▼'} ${Math.abs(d.delta).toFixed(1)} pos vs prior (${fmtPos(d.prior)})`}
      </div>
    </div>
  );
}

function ResultsContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<SeoProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getSeoProgress()
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load results'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rel = (iso: string | null): string => {
    if (!iso) return 'never';
    const ms = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(ms)) return '—';
    const h = Math.round(ms / 3_600_000);
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };

  return (
    <div style={{ padding: space['6'], maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Results</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Live organic outcomes and execution pipeline health. Every number is a direct read — no modelled projections.
        </p>
      </div>

      {loading && <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading results…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}

      {data && (
        <>
          {/* Week + Month */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
            <Card tc={tc}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['4'] }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>Last 7 days</span>
                <Pill tone="neutral" tc={tc}>{data.week.pages_optimized} optimized · {data.week.pages_measuring} measuring</Pill>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: space['4'] }}>
                <DeltaStat label="Clicks" d={data.week.organic_clicks} tc={tc} />
                <DeltaStat label="Impressions" d={data.week.organic_impressions} tc={tc} />
                <PositionStat label="Avg position" d={data.week.avg_position} tc={tc} />
              </div>
            </Card>
            <Card tc={tc}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space['4'] }}>
                <span style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.semibold, color: tc.text.primary }}>Last 30 days</span>
                <Pill tone={data.month.win_rate_pct != null && data.month.win_rate_pct >= 50 ? 'good' : 'neutral'} tc={tc}>
                  {data.month.win_rate_pct == null ? `${data.month.pages_optimized} optimized` : `${data.month.win_rate_pct.toFixed(0)}% win rate (n=${data.month.win_sample_size})`}
                </Pill>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: space['4'] }}>
                <DeltaStat label="Clicks" d={data.month.organic_clicks} tc={tc} />
                <DeltaStat label="Impressions" d={data.month.organic_impressions} tc={tc} />
                <PositionStat label="Avg position" d={data.month.avg_position} tc={tc} />
              </div>
            </Card>
          </div>

          {/* Needs attention + yesterday */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['4'], marginBottom: space['4'] }}>
            <Card tc={tc}>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['3'] }}>Needs attention</div>
              {([
                ['Awaiting approval', data.today.needs_attention.awaiting_approval],
                ['Decay detected', data.today.needs_attention.decay_count],
                ['Cannibalization', data.today.needs_attention.cannibalization_count],
                ['Urgent pages', data.today.needs_attention.urgent_pages],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${tc.border.subtle}`, fontFamily: fontFamily.body, fontSize: '13px' }}>
                  <span style={{ color: tc.text.secondary }}>{label}</span>
                  <span style={{ fontFamily: monoStack, color: val > 0 ? PALETTE.warn : tc.text.muted, fontWeight: fontWeight.medium }}>{val}</span>
                </div>
              ))}
              {data.today.needs_attention.top_decay_page && (
                <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                  Top decay page: <span style={{ fontFamily: monoStack, color: tc.text.primary }}>{data.today.needs_attention.top_decay_page}</span>
                </div>
              )}
            </Card>
            <Card tc={tc}>
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['3'] }}>Yesterday&apos;s actions</div>
              <div style={{ display: 'flex', gap: space['5'], marginBottom: space['3'] }}>
                {([['Applied', data.today.actions_yesterday.applied], ['Approved', data.today.actions_yesterday.approved], ['Rejected', data.today.actions_yesterday.rejected]] as [string, number][]).map(([l, v]) => (
                  <div key={l}>
                    <div style={{ fontFamily: monoStack, fontSize: '24px', color: tc.text.primary }}>{v}</div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>{l}</div>
                  </div>
                ))}
              </div>
              {data.today.actions_yesterday.pages.length > 0 && (
                <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                  {data.today.actions_yesterday.pages.length} page(s) touched
                </div>
              )}
            </Card>
          </div>

          {/* Pipeline health */}
          <Card tc={tc}>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: space['3'] }}>Pipeline health</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: space['4'] }}>
              {([
                ['GSC data', data.today.pipeline_health.last_gsc_date],
                ['Cluster run', data.today.pipeline_health.last_cluster_run],
                ['Decay detection', data.today.pipeline_health.last_decay_detection],
                ['Last execution', data.today.pipeline_health.last_execution],
              ] as [string, string | null][]).map(([label, iso]) => (
                <div key={label}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{label}</div>
                  <div style={{ fontFamily: monoStack, fontSize: '14px', color: tc.text.primary, marginTop: '2px' }}>{rel(iso)}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO results." />}>
      <ResultsContent />
    </DashboardGuard>
  );
}
