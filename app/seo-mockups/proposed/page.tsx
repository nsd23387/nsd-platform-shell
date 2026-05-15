'use client';

import React from 'react';
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

const Sparkline: React.FC<{ data: number[]; color?: string; w?: number; h?: number }> = ({ data, color = T.violet, w = 160, h = 36 }) => {
  const max = Math.max(...data); const min = Math.min(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / Math.max(1, max - min)) * h}`).join(' ');
  return <svg width={w} height={h}><polyline fill="none" stroke={color} strokeWidth={2} points={pts} /></svg>;
};

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

export default function ProposedSeoOverview() {
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

        {/* HERO — momentum + stall detector */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 32 }}>
          <Card style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 60%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Organic clicks · last 30 days</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginTop: 6 }}>
                  <span style={{ fontSize: 40, fontWeight: 600 }}>5,108</span>
                  <span style={{ fontSize: 14, color: T.good, fontWeight: 500 }}>+4.2% vs prior 30</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Pace below 90-day trend (+11.2%) — momentum is slowing.</div>
              </div>
              <Sparkline data={[120, 135, 142, 138, 155, 168, 172, 165, 180, 178, 175, 168, 162, 158]} w={200} h={50} />
            </div>
            <div style={{ display: 'flex', gap: 12, padding: 12, background: T.warnSoft, borderRadius: 6, alignItems: 'center' }}>
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
