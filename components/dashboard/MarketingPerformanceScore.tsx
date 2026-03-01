'use client';

import React, { useState } from 'react';
import type { MarketingKPIs, MarketingKPIComparisons } from '../../types/activity-spine';
import { background, text, border, semantic, violet } from '../../design/tokens/colors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../design/tokens/typography';
import { space, radius } from '../../design/tokens/spacing';

export interface MarketingPerformanceScoreProps {
  kpis: MarketingKPIs | undefined;
  comparisons: MarketingKPIComparisons | undefined;
  loading: boolean;
}

function safe(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDelta(d: number): number {
  if (d <= -1) return 0;
  if (d >= 1) return 100;
  return 50 + d * 50;
}

function normalizeRate(r: number): number {
  const clamped = Math.max(0, Math.min(1, safe(r)));
  return clamped * 100;
}

function computeScore(
  kpis: MarketingKPIs | undefined,
  comparisons: MarketingKPIComparisons | undefined
): { score: number; breakdown: { label: string; value: number; weight: number }[] } {
  const revDelta = safe(comparisons?.total_pipeline_value_usd?.delta_pct);
  const trafficDelta = safe(comparisons?.sessions?.delta_pct);
  const sessions = safe(kpis?.sessions);
  const submissions = safe(kpis?.total_submissions);
  const clicks = safe(kpis?.organic_clicks);
  const impressions = safe(kpis?.impressions);

  const convRate = sessions > 0 ? submissions / sessions : 0;
  const ctr = impressions > 0 ? clicks / impressions : 0;

  const hasRevenue = safe(kpis?.total_pipeline_value_usd) > 0 || revDelta !== 0;

  let w1 = 0.4, w2 = 0.3, w3 = 0.2, w4 = 0.1;
  if (!hasRevenue) {
    const redistributed = w1;
    w1 = 0;
    w2 += redistributed * (w2 / (w2 + w3 + w4));
    w3 += redistributed * (w3 / (w2 + w3 + w4));
    w4 += redistributed * (w4 / (w2 + w3 + w4));
  }

  const revScore = normalizeDelta(revDelta);
  const trafficScore = normalizeDelta(trafficDelta);
  const convScore = normalizeRate(convRate);
  const ctrScore = normalizeRate(ctr);

  const raw = w1 * revScore + w2 * trafficScore + w3 * convScore + w4 * ctrScore;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const breakdown = [
    { label: 'Revenue Growth', value: Math.round(revScore), weight: w1 },
    { label: 'Traffic Growth', value: Math.round(trafficScore), weight: w2 },
    { label: 'Conversion Efficiency', value: Math.round(convScore), weight: w3 },
    { label: 'SEO CTR', value: Math.round(ctrScore), weight: w4 },
  ].filter((b) => b.weight > 0);

  return { score, breakdown };
}

function scoreColor(score: number): string {
  if (score >= 80) return semantic.success.base;
  if (score >= 60) return violet[500];
  if (score >= 40) return semantic.warning.base;
  return semantic.danger.base;
}

export function MarketingPerformanceScore({ kpis, comparisons, loading }: MarketingPerformanceScoreProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (loading) return null;

  const { score, breakdown } = computeScore(kpis, comparisons);
  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space['5'],
        backgroundColor: background.surface,
        border: `1px solid ${border.default}`,
        borderRadius: radius.xl,
        padding: `${space['5']} ${space['6']}`,
        marginBottom: space['6'],
        position: 'relative',
      }}
    >
      {/* Circular badge */}
      <div
        style={{ position: 'relative', flexShrink: 0, cursor: 'default' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width={96} height={96} viewBox="0 0 96 96">
          <circle cx={48} cy={48} r={40} fill="none" stroke={border.subtle} strokeWidth={6} />
          <circle
            cx={48} cy={48} r={40}
            fill="none" stroke={color} strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fontFamily.body,
            fontSize: fontSize['3xl'],
            fontWeight: fontWeight.semibold,
            color,
          }}
        >
          {score}
        </div>
      </div>

      {/* Label */}
      <div>
        <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: text.primary, lineHeight: lineHeight.snug }}>
          Marketing Performance Score
        </div>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: text.muted, marginTop: space['1'] }}>
          Composite of revenue growth, traffic, conversion, and SEO efficiency.
        </div>
      </div>

      {/* Hover tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: space['6'],
            marginTop: space['2'],
            backgroundColor: background.surface,
            border: `1px solid ${border.default}`,
            borderRadius: radius.lg,
            padding: space['4'],
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 10,
            minWidth: '240px',
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
          }}
        >
          <div style={{ fontWeight: fontWeight.medium, color: text.primary, marginBottom: space['2'] }}>Score Breakdown</div>
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: space['1'], color: text.secondary }}>
              <span>{b.label} ({Math.round(b.weight * 100)}%)</span>
              <span style={{ fontWeight: fontWeight.medium, color: text.primary }}>{b.value}/100</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
