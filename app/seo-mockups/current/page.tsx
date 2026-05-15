'use client';

import React from 'react';
import { T, sansStack } from '../_shared';

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20, ...style }}>{children}</div>
);

const SectionTitle: React.FC<{ children: React.ReactNode; sub?: string }> = ({ children, sub }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{children}</div>
    {sub && <div style={{ fontSize: 12, color: T.subtle, marginTop: 2 }}>{sub}</div>}
  </div>
);

const Delta: React.FC<{ pct: number; invertGood?: boolean }> = ({ pct, invertGood }) => {
  const good = invertGood ? pct < 0 : pct > 0;
  const color = pct === 0 ? T.muted : good ? T.good : T.bad;
  return <span style={{ color, fontSize: 12, fontWeight: 500 }}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>;
};

const Row: React.FC<{ label: string; value: string; right?: React.ReactNode }> = ({ label, value, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: 12, color: T.muted }}>{label}</span>
    <span style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{value}</span>
      {right}
    </span>
  </div>
);

export default function CurrentSeoOverview() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: sansStack, color: T.text, padding: '32px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0 }}>SEO Command Center</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Last updated 4 minutes ago · 44 active recommendations</div>
          </div>
        </div>

        {/* Today's Brief */}
        <SectionTitle sub="Snapshot of approvals, issues, and momentum">Today&apos;s Brief</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <Card>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pending approvals</div>
            <div style={{ fontSize: 32, fontWeight: 600 }}>12</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Awaiting review</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Pages with critical issues</div>
            <div style={{ fontSize: 32, fontWeight: 600 }}>7</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>200+ impressions, zero clicks</div>
          </Card>
          <Card>
            <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Top keyword cluster</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>led business signs</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>3,402 impressions · pos 8.4</div>
          </Card>
        </div>

        {/* Progress Scoreboard */}
        <SectionTitle>Progress Scoreboard</SectionTitle>
        <Card style={{ marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Last 7 days vs prior 7</div>
              <Row label="Organic clicks" value="1,247" right={<Delta pct={12.4} />} />
              <Row label="Impressions" value="48,910" right={<Delta pct={8.1} />} />
              <Row label="Avg position" value="14.2" right={<span style={{ color: T.good, fontSize: 12 }}>↑ 0.8</span>} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Last 30 days vs prior 30</div>
              <Row label="Organic clicks" value="5,108" right={<Delta pct={4.2} />} />
              <Row label="Impressions" value="201,330" right={<Delta pct={2.8} />} />
              <Row label="Avg position" value="14.6" right={<span style={{ color: T.good, fontSize: 12 }}>↑ 0.3</span>} />
            </div>
          </div>
        </Card>

        {/* Action Cards */}
        <SectionTitle>Suggested Actions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Pending approvals</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>12 recommendations awaiting your review.</div>
            <a href="#" style={{ fontSize: 13, color: T.violet, fontWeight: 500 }}>Review →</a>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>CTR issues</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>7 pages with high impressions, zero clicks.</div>
            <a href="#" style={{ fontSize: 13, color: T.violet, fontWeight: 500 }}>View pages →</a>
          </Card>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Overnight activity</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 12 }}>3 recommendations executed in the last 24h.</div>
            <a href="#" style={{ fontSize: 13, color: T.violet, fontWeight: 500 }}>View log →</a>
          </Card>
        </div>

        {/* Top 5 opportunities */}
        <SectionTitle sub="Pages with 200+ impressions and zero clicks">Top 5 opportunities</SectionTitle>
        <Card>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
                <th style={{ padding: '8px 0', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase' }}>URL</th>
                <th style={{ padding: '8px 0', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Impressions</th>
                <th style={{ padding: '8px 0', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Avg pos</th>
                <th style={{ padding: '8px 0', fontWeight: 600, color: T.muted, fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['/for-businesses/', 4203, 12.1, 0],
                ['/products/channel-letters/', 2810, 18.4, 0],
                ['/locations/dallas-tx/', 1944, 9.8, 0],
                ['/services/sign-repair/', 1422, 22.0, 0],
                ['/products/led-signs/blade-signs/', 1180, 14.6, 0],
              ].map(([u, i, p, c]) => (
                <tr key={u as string} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: '10px 0', color: T.text }}>{u}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{(i as number).toLocaleString()}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>{p}</td>
                  <td style={{ padding: '10px 0', textAlign: 'right', color: T.bad }}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Collapsed system status */}
        <div style={{ marginTop: 24, padding: 12, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, color: T.muted, display: 'flex', justifyContent: 'space-between' }}>
          <span>▸ System status</span>
          <span style={{ color: T.good }}>● All sources healthy</span>
        </div>
      </div>
    </div>
  );
}
