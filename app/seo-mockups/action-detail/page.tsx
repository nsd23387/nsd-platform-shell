'use client';

import React from 'react';
import { T, sansStack, monoStack } from '../_shared';

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, ...style }}>{children}</div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral' }> = ({ children, tone = 'neutral' }) => {
  const map = {
    good: { bg: T.goodSoft, fg: T.good }, bad: { bg: T.badSoft, fg: T.bad },
    warn: { bg: T.warnSoft, fg: T.warn }, info: { bg: T.infoSoft, fg: T.info },
    violet: { bg: T.violetSoft, fg: T.violet }, neutral: { bg: '#f5f5f4', fg: T.muted },
  }[tone];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: map.bg, color: map.fg }}>{children}</span>;
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{children}</div>
);

export default function ActionDetailMockup() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: sansStack, color: T.text, padding: '32px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumb / back */}
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>
          <a href="#" style={{ color: T.violet }}>SEO Command Center</a>
          <span style={{ margin: '0 6px' }}>/</span>
          <a href="#" style={{ color: T.violet }}>Do this next</a>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>Recommendation #1</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Pill tone="violet">improve_ctr</Pill>
              <Pill tone="neutral">Phase 1 · Quick win</Pill>
              <Pill tone="info">Confidence: High (87%)</Pill>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Rewrite title tag — /for-businesses/</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4, fontFamily: monoStack }}>neonsignsdepot.com/for-businesses/</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ padding: '8px 14px', background: 'white', border: `1px solid ${T.borderStrong}`, borderRadius: 6, fontSize: 13, color: T.muted, cursor: 'pointer' }}>Reject</button>
            <button style={{ padding: '8px 14px', background: 'white', border: `1px solid ${T.borderStrong}`, borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Modify</button>
            <button style={{ padding: '8px 18px', background: T.violet, color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Approve & queue</button>
          </div>
        </div>

        {/* WHY — diagnostic evidence */}
        <Card style={{ marginBottom: 16 }}>
          <Label>Why we&apos;re recommending this</Label>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
            <li>Page ranks <strong>position 12.1</strong> for the query <strong>“business led signs”</strong> with <strong>4,203 impressions / month</strong> — but CTR is <strong style={{ color: T.bad }}>0.0%</strong> (industry baseline at pos 12 is 1.6%).</li>
            <li>Current title tag is <code style={{ background: '#f5f5f4', padding: '1px 6px', borderRadius: 3, fontFamily: monoStack, fontSize: 12 }}>“For Businesses | Neon Signs Depot”</code> — the primary keyword does not appear, and there is no commercial qualifier.</li>
            <li>Top 3 competitors (signs.com, signazon.com, fastsigns.com) all lead their title with the keyword + a price/CTA modifier.</li>
          </ul>
        </Card>

        {/* BEFORE / AFTER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <Card>
            <Label>Before</Label>
            <div style={{ padding: 12, background: T.badSoft, border: `1px solid ${T.bad}30`, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.bad, marginBottom: 4, fontWeight: 600 }}>Current title</div>
              <div style={{ fontSize: 14, fontFamily: monoStack }}>For Businesses | Neon Signs Depot</div>
            </div>
            <table style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Avg position</td><td style={{ textAlign: 'right' }}>12.1</td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Impressions / mo</td><td style={{ textAlign: 'right' }}>4,203</td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Clicks / mo</td><td style={{ textAlign: 'right', color: T.bad }}>0</td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>CTR</td><td style={{ textAlign: 'right', color: T.bad }}>0.0%</td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Est. monthly revenue</td><td style={{ textAlign: 'right' }}>$0</td></tr>
              </tbody>
            </table>
          </Card>
          <Card>
            <Label>After (proposed)</Label>
            <div style={{ padding: 12, background: T.goodSoft, border: `1px solid ${T.good}30`, borderRadius: 6, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: T.good, marginBottom: 4, fontWeight: 600 }}>Proposed title</div>
              <div style={{ fontSize: 14, fontFamily: monoStack }}>Business LED Signs — Custom Quotes in 24h | Neon Signs Depot</div>
            </div>
            <table style={{ width: '100%', fontSize: 13 }}>
              <tbody>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Predicted position</td><td style={{ textAlign: 'right' }}>11.4 <span style={{ color: T.good, fontSize: 11 }}>↑0.7</span></td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Impressions / mo</td><td style={{ textAlign: 'right' }}>4,400 <span style={{ color: T.good, fontSize: 11 }}>+5%</span></td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Clicks / mo</td><td style={{ textAlign: 'right', color: T.good }}>184 <span style={{ fontSize: 11 }}>+184</span></td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Predicted CTR</td><td style={{ textAlign: 'right', color: T.good }}>4.2%</td></tr>
                <tr><td style={{ padding: '4px 0', color: T.muted }}>Est. monthly revenue</td><td style={{ textAlign: 'right', color: T.good, fontWeight: 600 }}>$1,840</td></tr>
              </tbody>
            </table>
          </Card>
        </div>

        {/* EXPECTED OUTCOMES — measurement plan */}
        <Card style={{ marginBottom: 16 }}>
          <Label>Expected outcomes & measurement plan</Label>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase' }}>KPI</th>
                <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', textAlign: 'right' }}>Baseline (28d)</th>
                <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', textAlign: 'right' }}>14-day target</th>
                <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', textAlign: 'right' }}>30-day target</th>
                <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', textAlign: 'right' }}>Success threshold</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Clicks / week', '0', '28', '46', '≥ 20 (statistical)'],
                ['CTR', '0.0%', '2.1%', '4.2%', '≥ 1.5%'],
                ['Avg position', '12.1', '11.7', '11.4', 'No regression > 0.5'],
                ['Conversions', '0', '1', '3', '≥ 1'],
              ].map(r => (
                <tr key={r[0]} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 0' }}>{r[0]}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: T.muted }}>{r[1]}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{r[2]}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600 }}>{r[3]}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: T.muted }}>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: T.muted }}>
            <span>📅 Measurement window: <strong style={{ color: T.text }}>day 14 → day 42 after deploy</strong></span>
            <span>🔁 Auto-rollback if CTR &lt; baseline + 0.5pp at day 28</span>
          </div>
        </Card>

        {/* EVIDENCE LINKS + RISK */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Card>
            <Label>Supporting evidence</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href="#" style={{ color: T.violet }}>→ View 90-day GSC query history (32 queries, 4 above 200 imp)</a>
              <a href="#" style={{ color: T.violet }}>→ Competitor SERP snapshot (signs.com, signazon.com, fastsigns.com)</a>
              <a href="#" style={{ color: T.violet }}>→ Cluster page: “business signs” (8 sibling pages, 14k imp)</a>
              <a href="#" style={{ color: T.violet }}>→ Internal linking graph for /for-businesses/ (3 inbound, 12 outbound)</a>
            </div>
          </Card>
          <Card>
            <Label>Risk & assumptions</Label>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: T.text }}>
              <li>CTR model trained on 1,840 NSD pages (RMSE 0.3pp).</li>
              <li>Title change can be rolled back in &lt;1 min via Engine UI.</li>
              <li>No risk to existing rankings — title is metadata only.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
