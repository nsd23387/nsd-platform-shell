'use client';

import React, { useState, useMemo } from 'react';
import { T, sansStack, monoStack } from '../_shared';

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, ...style }}>{children}</div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; sub?: string; right?: React.ReactNode }> = ({ children, sub, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: T.subtle, marginTop: 2 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral' }> = ({ children, tone = 'neutral' }) => {
  const map = {
    good: { bg: T.goodSoft, fg: T.good },
    bad: { bg: T.badSoft, fg: T.bad },
    warn: { bg: T.warnSoft, fg: T.warn },
    info: { bg: T.infoSoft, fg: T.info },
    violet: { bg: T.violetSoft, fg: T.violet },
    neutral: { bg: '#f5f5f4', fg: T.muted },
  }[tone];
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500, background: map.bg, color: map.fg }}>{children}</span>;
};

// =============================================================================
// Dynamic Timeline Chart — 30/60/90/custom range
// =============================================================================

type RangeKey = '30' | '60' | '90' | 'custom';

// Generate plausible mock daily clicks for the last 90 days
const generateSeries = (days: number) => {
  const arr: { day: number; clicks: number; impressions: number }[] = [];
  const baseClicks = 130;
  for (let i = 0; i < days; i++) {
    const t = i / days;
    const trend = baseClicks + t * 50;                // gentle uptrend
    const wave = Math.sin(i * 0.42) * 18;             // weekly cycle
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 2.3)) * 9;
    const clicks = Math.max(40, Math.round(trend + wave + noise));
    arr.push({ day: i, clicks, impressions: Math.round(clicks * (28 + Math.sin(i * 0.3) * 4)) });
  }
  return arr;
};

const FULL_SERIES = generateSeries(90);

const TimelineChart: React.FC<{ range: RangeKey; customDays: number }> = ({ range, customDays }) => {
  const days = range === 'custom' ? customDays : Number(range);
  const series = useMemo(() => FULL_SERIES.slice(-days), [days]);
  const w = 760, h = 200, pad = { l: 36, r: 12, t: 12, b: 24 };
  const max = Math.max(...series.map(d => d.clicks)) * 1.1;
  const min = Math.min(...series.map(d => d.clicks)) * 0.85;
  const xStep = (w - pad.l - pad.r) / Math.max(1, series.length - 1);
  const y = (v: number) => pad.t + (h - pad.t - pad.b) * (1 - (v - min) / (max - min));
  const linePts = series.map((d, i) => `${pad.l + i * xStep},${y(d.clicks)}`).join(' ');
  const areaPts = `${pad.l},${h - pad.b} ${linePts} ${pad.l + (series.length - 1) * xStep},${h - pad.b}`;

  // Y axis ticks
  const ticks = [0, 1, 2, 3].map(i => min + ((max - min) / 3) * i);
  // X axis labels
  const labelEvery = Math.max(1, Math.floor(series.length / 6));

  // Stats summary
  const total = series.reduce((s, d) => s + d.clicks, 0);
  const half = Math.floor(series.length / 2);
  const recent = series.slice(half).reduce((s, d) => s + d.clicks, 0);
  const prior = series.slice(0, half).reduce((s, d) => s + d.clicks, 0);
  const deltaPct = prior === 0 ? 0 : ((recent - prior) / prior) * 100;

  return (
    <div>
      <div style={{ display: 'flex', gap: 28, marginBottom: 12, alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organic clicks · last {days} days</div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 600 }}>{total.toLocaleString()}</span>
            <span style={{ fontSize: 13, color: deltaPct >= 0 ? T.good : T.bad, fontWeight: 500 }}>
              {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% half-over-half
            </span>
          </div>
        </div>
      </div>
      <svg width={w} height={h} style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={T.violet} stopOpacity="0.22" />
            <stop offset="100%" stopColor={T.violet} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={T.border} strokeDasharray="2 3" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={T.muted} fontFamily={monoStack}>{Math.round(t)}</text>
          </g>
        ))}
        {/* x axis labels */}
        {series.map((d, i) => i % labelEvery === 0 && (
          <text key={i} x={pad.l + i * xStep} y={h - 6} textAnchor="middle" fontSize="10" fill={T.muted}>
            d{i + 1}
          </text>
        ))}
        {/* area + line */}
        <polygon points={areaPts} fill="url(#grad)" />
        <polyline points={linePts} fill="none" stroke={T.violet} strokeWidth={2} />
      </svg>
    </div>
  );
};

// =============================================================================
// Action queue row
// =============================================================================

const ActionRow: React.FC<{
  rank: number; intent: string; title: string; url: string; why: string;
  impact: string; effort: string; tone: 'good' | 'warn' | 'info' | 'violet';
}> = ({ rank, intent, title, url, why, impact, effort, tone }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 120px 200px', gap: 16, alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${T.border}` }}>
    <div style={{ fontSize: 18, fontWeight: 600, color: T.muted, fontFamily: monoStack }}>#{rank}</div>
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
        <Pill tone={tone}>{intent}</Pill>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: T.muted, fontFamily: monoStack, marginBottom: 4 }}>{url}</div>
      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}><span style={{ color: T.muted }}>Why: </span>{why}</div>
    </div>
    <div>
      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. impact</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: T.good }}>{impact}</div>
    </div>
    <div>
      <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effort</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{effort}</div>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button style={{ padding: '6px 12px', background: T.violet, color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>Approve</button>
      <button style={{ padding: '6px 12px', background: 'white', color: T.text, border: `1px solid ${T.borderStrong}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Details</button>
      <button style={{ padding: '6px 8px', background: 'transparent', color: T.muted, border: 'none', fontSize: 12, cursor: 'pointer' }}>Snooze</button>
    </div>
  </div>
);

// =============================================================================
// Range selector buttons
// =============================================================================

const RangeBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      background: active ? T.violet : 'white',
      color: active ? 'white' : T.text,
      border: `1px solid ${active ? T.violet : T.borderStrong}`,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: active ? 600 : 500,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

// =============================================================================
// Page
// =============================================================================

export default function ProposedSeoOverview() {
  const [range, setRange] = useState<RangeKey>('30');
  const [customDays, setCustomDays] = useState(45);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: sansStack, color: T.text, padding: '32px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>SEO Command Center</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Your top 5 fixes will move organic clicks +312/mo if approved this week.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 14px', background: 'white', border: `1px solid ${T.borderStrong}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Diagnose a URL…</button>
            <button style={{ padding: '8px 14px', background: T.violet, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Approve top 5 ($0)</button>
          </div>
        </div>

        {/* HERO — dynamic timeline + range selector + freshness */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 32 }}>
          <Card style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 60%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <RangeBtn active={range === '30'} onClick={() => setRange('30')}>30d</RangeBtn>
                <RangeBtn active={range === '60'} onClick={() => setRange('60')}>60d</RangeBtn>
                <RangeBtn active={range === '90'} onClick={() => setRange('90')}>90d</RangeBtn>
                <RangeBtn active={range === 'custom'} onClick={() => setRange('custom')}>Custom</RangeBtn>
                {range === 'custom' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                    <input
                      type="range"
                      min={7}
                      max={90}
                      value={customDays}
                      onChange={(e) => setCustomDays(Number(e.target.value))}
                      style={{ width: 140 }}
                    />
                    <span style={{ fontSize: 12, color: T.muted, fontFamily: monoStack, minWidth: 56 }}>{customDays} days</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: T.subtle }}>vs prior period</span>
            </div>

            <TimelineChart range={range} customDays={customDays} />

            <div style={{ display: 'flex', gap: 12, padding: 12, background: T.warnSoft, borderRadius: 6, alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              <div style={{ fontSize: 13, color: T.warn, lineHeight: 1.5 }}>
                <strong>Velocity stall detected:</strong> growth rate dropped from +11.2% (90d) to +4.2% (30d).
                3 high-traffic clusters have flatlined for 4+ weeks.
                <a href="#" style={{ color: T.warn, marginLeft: 8, fontWeight: 600 }}>See stalled clusters →</a>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Data freshness</div>
            {[
              { src: 'Google Search Console', age: '6h ago', status: 'good' as const },
              { src: 'GA4', age: '12h ago', status: 'good' as const },
              { src: 'Google Ads', age: '63d ago', status: 'bad' as const },
              { src: 'Cluster engine', age: '2h ago', status: 'good' as const },
            ].map(s => (
              <div key={s.src} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 12 }}>{s.src}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: s.status === 'good' ? T.good : T.bad }} />
                  <span style={{ fontSize: 12, color: s.status === 'good' ? T.muted : T.bad, fontFamily: monoStack }}>{s.age}</span>
                </span>
              </div>
            ))}
            <a href="#" style={{ fontSize: 12, color: T.violet, fontWeight: 500, marginTop: 8, display: 'inline-block' }}>Resync Ads →</a>
          </Card>
        </div>

        {/* DO THIS NEXT — priority queue */}
        <SectionTitle sub="Ranked by estimated organic-clicks lift, 30 days" right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill tone="neutral">Filter: All intents</Pill>
            <Pill tone="neutral">Sort: Impact</Pill>
          </div>
        }>Do this next</SectionTitle>
        <Card style={{ padding: 0 }}>
          <div style={{ padding: '0 20px' }}>
            <ActionRow
              rank={1}
              intent="improve_ctr"
              tone="violet"
              title="Rewrite title tag — /for-businesses/"
              url="neonsignsdepot.com/for-businesses/"
              why="Page ranks pos 12.1 for ‘business led signs’ (4,203 imp/mo) but CTR is 0.0%. Title currently lacks the primary keyword."
              impact="+184 clicks/mo"
              effort="Low · 5 min"
            />
            <ActionRow
              rank={2}
              intent="strengthen_page"
              tone="info"
              title="Expand thin content — /products/channel-letters/"
              url="neonsignsdepot.com/products/channel-letters/"
              why="Word count 312, competitor median 1,840. Ranks pos 18.4 — adding pricing, FAQ, and gallery sections lifts pages 5–8 positions on average."
              impact="+72 clicks/mo"
              effort="Medium · 2 hrs"
            />
            <ActionRow
              rank={3}
              intent="add_internal_links"
              tone="good"
              title="Add 4 internal links to /locations/dallas-tx/"
              url="neonsignsdepot.com/locations/dallas-tx/"
              why="Orphan page (0 internal links from top-50 pages). Cluster siblings already rank top-5 — link equity transfer should lift pos 9.8 → ~6."
              impact="+34 clicks/mo"
              effort="Low · 10 min"
            />
            <ActionRow
              rank={4}
              intent="create_page"
              tone="warn"
              title="Create page for ‘sign repair near me’ cluster"
              url="(new) /services/sign-repair-near-me/"
              why="Cluster has 2,810 monthly impressions across 14 queries with no dedicated landing page. Search intent is local-commercial; competitors rank with dedicated pages."
              impact="+22 clicks/mo"
              effort="High · 1 day"
            />
            <ActionRow
              rank={5}
              intent="improve_ctr"
              tone="violet"
              title="Add FAQ schema — /products/led-signs/blade-signs/"
              url="neonsignsdepot.com/products/led-signs/blade-signs/"
              why="Page already has FAQ section but no schema markup. Adding it eligible for rich results — typical CTR lift 8–14%."
              impact="+18 clicks/mo"
              effort="Low · 15 min"
            />
          </div>
          <div style={{ padding: 14, borderTop: `1px solid ${T.border}`, textAlign: 'center', background: '#fafaf9' }}>
            <a href="#" style={{ fontSize: 13, color: T.violet, fontWeight: 500 }}>View all 44 recommendations →</a>
          </div>
        </Card>

        {/* COMPETITOR INTELLIGENCE */}
        <div style={{ marginTop: 32 }}>
          <SectionTitle
            sub="Top organic competitors for your tracked clusters · refreshed weekly"
            right={<button style={{ padding: '4px 10px', background: 'white', border: `1px solid ${T.borderStrong}`, borderRadius: 4, fontSize: 11, color: T.muted, cursor: 'pointer' }}>Add competitor</button>}
          >
            Competitor intelligence
          </SectionTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            {/* Competitor leaderboard */}
            <Card style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left', background: '#fafaf9' }}>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>Competitor</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Share of voice</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Overlap</th>
                    <th style={{ padding: '10px 8px', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Gap kw</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>30d trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'signs.com', sov: 24.6, overlap: 412, gap: 188, trend: 6.4, color: T.bad },
                    { name: 'signazon.com', sov: 18.2, overlap: 356, gap: 142, trend: 2.1, color: T.warn },
                    { name: 'fastsigns.com', sov: 12.9, overlap: 298, gap: 96, trend: -1.4, color: T.good },
                    { name: 'You — neonsignsdepot.com', sov: 9.4, overlap: null, gap: 0, trend: 4.2, color: T.violet, you: true },
                    { name: 'buildasign.com', sov: 7.1, overlap: 208, gap: 71, trend: 3.0, color: T.warn },
                    { name: 'signs365.com', sov: 5.8, overlap: 174, gap: 58, trend: 0.2, color: T.muted },
                  ].map(c => (
                    <tr key={c.name} style={{ borderBottom: `1px solid ${T.border}`, background: c.you ? T.violetSoft : 'transparent' }}>
                      <td style={{ padding: '10px 16px', fontWeight: c.you ? 600 : 500, color: c.you ? T.violet : T.text }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                          <span style={{ fontFamily: monoStack }}>{c.sov.toFixed(1)}%</span>
                          <span style={{ display: 'inline-block', width: 80, height: 4, background: T.border, borderRadius: 2 }}>
                            <span style={{ display: 'block', width: `${(c.sov / 25) * 100}%`, height: '100%', background: c.you ? T.violet : T.subtle, borderRadius: 2 }} />
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: T.muted, fontFamily: monoStack }}>{c.overlap == null ? '—' : c.overlap}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: monoStack, color: c.you ? T.muted : T.text }}>{c.gap}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: c.trend > 5 ? T.bad : c.trend > 0 ? T.warn : T.good, fontFamily: monoStack }}>
                        {c.trend > 0 ? '+' : ''}{c.trend.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.subtle, background: '#fafaf9', display: 'flex', justifyContent: 'space-between' }}>
                <span>Share of voice = your visibility on tracked queries vs total competitor visibility</span>
                <a href="#" style={{ color: T.violet, fontWeight: 500 }}>View full SERP analysis →</a>
              </div>
            </Card>

            {/* Competitor gaps — top opportunities */}
            <Card>
              <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Top competitor gaps</div>
              <div style={{ fontSize: 11, color: T.subtle, marginBottom: 12 }}>Queries competitors rank top-10 for, you don&apos;t</div>
              {[
                { kw: 'led business signs cost', comp: 'signs.com', vol: 880, theirPos: 3 },
                { kw: 'channel letter signs near me', comp: 'fastsigns.com', vol: 720, theirPos: 4 },
                { kw: 'custom neon signs for business', comp: 'signazon.com', vol: 590, theirPos: 6 },
                { kw: 'storefront sign installation', comp: 'fastsigns.com', vol: 480, theirPos: 5 },
                { kw: 'monument sign pricing', comp: 'signs.com', vol: 320, theirPos: 7 },
              ].map(g => (
                <div key={g.kw} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{g.kw}</span>
                    <span style={{ fontSize: 12, color: T.muted, fontFamily: monoStack }}>{g.vol}/mo</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    <span style={{ color: T.bad }}>{g.comp}</span> ranks pos <span style={{ fontFamily: monoStack }}>{g.theirPos}</span> · you&apos;re unranked
                  </div>
                </div>
              ))}
              <a href="#" style={{ fontSize: 12, color: T.violet, fontWeight: 500, marginTop: 10, display: 'inline-block' }}>Generate page recommendations →</a>
            </Card>
          </div>

          {/* Competitor content velocity strip */}
          <Card style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Competitor content velocity (last 30 days)</div>
                <div style={{ fontSize: 12, color: T.subtle }}>New / refreshed pages detected on competitor sitemaps</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { name: 'signs.com', newPages: 12, refreshed: 28, threat: 'high' as const },
                { name: 'signazon.com', newPages: 6, refreshed: 14, threat: 'med' as const },
                { name: 'fastsigns.com', newPages: 3, refreshed: 9, threat: 'low' as const },
                { name: 'buildasign.com', newPages: 8, refreshed: 11, threat: 'med' as const },
              ].map(c => {
                const tone = c.threat === 'high' ? T.bad : c.threat === 'med' ? T.warn : T.good;
                const bg = c.threat === 'high' ? T.badSoft : c.threat === 'med' ? T.warnSoft : T.goodSoft;
                return (
                  <div key={c.name} style={{ padding: 12, border: `1px solid ${T.border}`, borderRadius: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
                      <span>+{c.newPages} new</span>
                      <span>{c.refreshed} refreshed</span>
                    </div>
                    <div style={{ marginTop: 8, padding: '2px 8px', background: bg, color: tone, borderRadius: 999, fontSize: 10, fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {c.threat} threat
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* MOMENTUM + STALLED CLUSTERS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
          <Card>
            <SectionTitle sub="Week vs Month progress">Momentum</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>7d / 7d</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>+12.4%</div>
                <div style={{ fontSize: 12, color: T.muted }}>1,247 clicks</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase' }}>30d / 30d</div>
                <div style={{ fontSize: 22, fontWeight: 600, color: T.warn }}>+4.2%</div>
                <div style={{ fontSize: 12, color: T.muted }}>5,108 clicks</div>
              </div>
            </div>
          </Card>
          <Card>
            <SectionTitle sub="Rankings flat 4+ weeks · revenue at risk">Stalled clusters</SectionTitle>
            {[
              ['custom led signs', '$2.1k/mo', T.bad],
              ['storefront signs', '$1.4k/mo', T.warn],
              ['neon open signs', '$0.9k/mo', T.warn],
            ].map(([name, rev, color]) => (
              <div key={name as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13 }}>{name as string}</span>
                <span style={{ fontSize: 12, color: color as string, fontWeight: 500 }}>{rev as string} at risk</span>
              </div>
            ))}
          </Card>
        </div>

        {/* SHIPPED THIS WEEK */}
        <SectionTitle sub="Approved & executed in last 7 days · with rollback">What we shipped this week</SectionTitle>
        <Card>
          {[
            { title: 'Title tag rewrite — /products/neon-signs/', when: '2d ago', delta: '+47 clicks (14d)', tone: 'good' as const },
            { title: 'Internal links added — /blog/led-vs-neon/', when: '4d ago', delta: '+12 clicks (10d)', tone: 'good' as const },
            { title: 'Meta description — /services/installation/', when: '6d ago', delta: '−3 clicks (8d)', tone: 'bad' as const },
          ].map(s => (
            <div key={s.title} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: T.muted }}>Approved {s.when}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: s.tone === 'good' ? T.good : T.bad, fontWeight: 500 }}>{s.delta}</span>
                <button style={{ padding: '4px 10px', background: 'white', border: `1px solid ${T.borderStrong}`, borderRadius: 4, fontSize: 11, color: T.muted, cursor: 'pointer' }}>Rollback</button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
