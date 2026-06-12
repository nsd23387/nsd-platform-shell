'use client';

import React, { useState } from 'react';
import type { MarketingKPIs, MarketingKPIComparisons } from '../../types/activity-spine';
import { useThemeColors } from '../../hooks/useThemeColors';
import { violet } from '../../design/tokens/colors';
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

function normalizeDelta(d: unknown): number {
  const v = safe(d);
  if (v <= -1) return 0;
  if (v >= 1) return 100;
  return 50 + v * 50;
}

function normalizeRate(r: unknown): number {
  const v = Math.max(0, Math.min(1, safe(r)));
  return v * 100;
}

interface WeightedComponent {
  label: string;
  baseWeight: number;
  value: number;
}

// C-6: every label/weight below is the REAL client-side formula — this score is
// computed here in the dashboard from the overview API's kpis + comparisons; it
// is not a number the API returns. Weights renormalize over whichever
// components have usable data in this response.
const ALL_COMPONENTS: { label: string; baseWeight: number; describes: string }[] = [
  { label: 'Revenue Growth', baseWeight: 0.4, describes: 'pipeline-value delta vs prior period, mapped −100%→0, 0%→50, +100%→100' },
  { label: 'Traffic Growth', baseWeight: 0.3, describes: 'sessions delta vs prior period, mapped −100%→0, 0%→50, +100%→100' },
  { label: 'Conversion Efficiency', baseWeight: 0.2, describes: 'submissions ÷ sessions, as points (1% → 1)' },
  { label: 'SEO CTR', baseWeight: 0.1, describes: 'organic clicks ÷ impressions, as points (1% → 1)' },
];

function computeScore(
  kpis: MarketingKPIs | undefined,
  comparisons: MarketingKPIComparisons | undefined
): { score: number; breakdown: { label: string; value: number; weight: number }[] } {
  const sessions = safe(kpis?.sessions);
  const submissions = safe(kpis?.total_submissions);
  const clicks = safe(kpis?.organic_clicks);
  const impressions = safe(kpis?.impressions);

  const revenueAvailable = safe(kpis?.total_pipeline_value_usd) > 0 ||
    safe(comparisons?.total_pipeline_value_usd?.delta_pct) !== 0;
  const trafficAvailable = sessions > 0 ||
    safe(comparisons?.sessions?.delta_pct) !== 0;
  const conversionAvailable = sessions > 0;
  const ctrAvailable = impressions > 0;

  const components: WeightedComponent[] = [];

  if (revenueAvailable) {
    components.push({
      label: 'Revenue Growth',
      baseWeight: 0.4,
      value: normalizeDelta(comparisons?.total_pipeline_value_usd?.delta_pct),
    });
  }
  if (trafficAvailable) {
    components.push({
      label: 'Traffic Growth',
      baseWeight: 0.3,
      value: normalizeDelta(comparisons?.sessions?.delta_pct),
    });
  }
  if (conversionAvailable) {
    components.push({
      label: 'Conversion Efficiency',
      baseWeight: 0.2,
      value: normalizeRate(submissions / sessions),
    });
  }
  if (ctrAvailable) {
    components.push({
      label: 'SEO CTR',
      baseWeight: 0.1,
      value: normalizeRate(clicks / impressions),
    });
  }

  const totalWeight = components.reduce((s, c) => s + c.baseWeight, 0);

  if (totalWeight === 0) {
    return { score: 50, breakdown: [] };
  }

  const raw = components.reduce((s, c) => s + (c.baseWeight / totalWeight) * c.value, 0);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const breakdown = components.map((c) => ({
    label: c.label,
    value: Math.round(c.value),
    weight: c.baseWeight / totalWeight,
  }));

  return { score, breakdown };
}

function scoreColor(score: number, tc: ReturnType<typeof useThemeColors>): string {
  if (score >= 80) return tc.semantic.success.base;
  if (score >= 60) return violet[500];
  if (score >= 40) return tc.semantic.warning.base;
  return tc.semantic.danger.base;
}

export function MarketingPerformanceScore({ kpis, comparisons, loading }: MarketingPerformanceScoreProps) {
  const tc = useThemeColors();
  const [showTooltip, setShowTooltip] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  const { score, breakdown } = computeScore(kpis, comparisons);
  const color = scoreColor(score, tc);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  // C-6: full component accounting. `breakdown` holds only the components with
  // usable data in this API response (weights already renormalized); anything
  // in ALL_COMPONENTS but not in `breakdown` had no usable value and is shown
  // as "not returned by API" instead of a fabricated zero.
  const present = breakdown.map((b) => ({
    ...b,
    contribution: (b.weight * b.value),
    describes: ALL_COMPONENTS.find((c) => c.label === b.label)?.describes ?? '',
  }));
  const missing = ALL_COMPONENTS.filter((c) => !breakdown.some((b) => b.label === c.label));
  // Biggest drag = the component costing the most points vs a perfect 100
  // (weight × shortfall), among components we actually have data for.
  const biggestDrag = present.length > 0
    ? present.reduce((worst, c) => ((c.weight * (100 - c.value)) > (worst.weight * (100 - worst.value)) ? c : worst), present[0])
    : null;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: space['5'],
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.xl,
        padding: `${space['5']} ${space['6']}`,
        marginBottom: space['6'],
        position: 'relative',
      }}
    >
      <div
        style={{ position: 'relative', flexShrink: 0, cursor: 'default' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg width={96} height={96} viewBox="0 0 96 96">
          <circle cx={48} cy={48} r={40} fill="none" stroke={tc.border.subtle} strokeWidth={6} />
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

      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }}>
          Marketing Performance Score
        </div>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['1'] }}>
          Composite of revenue growth, traffic, conversion, and SEO efficiency — computed in this dashboard from the overview API&apos;s KPIs, not a number the API returns. 0–100; weights renormalize over the components with data.
        </div>
        {biggestDrag && (
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginTop: space['1'] }} data-testid="text-score-biggest-drag">
            Biggest drag: <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{biggestDrag.label}</span> ({biggestDrag.value}/100)
          </div>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          data-testid="button-score-breakdown-toggle"
          style={{ marginTop: space['2'], padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: violet[500] }}
        >
          {expanded ? '▾ Hide breakdown' : '▸ Show breakdown'}
        </button>
        {expanded && (
          <div style={{ marginTop: space['3'], borderTop: `1px solid ${tc.border.subtle}`, paddingTop: space['3'] }} data-testid="section-score-breakdown">
            {present.map((c) => (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], marginBottom: space['2'], fontFamily: fontFamily.body, fontSize: fontSize.sm }} data-testid={`score-component-${c.label.replace(/\W+/g, '-').toLowerCase()}`}>
                <span style={{ color: tc.text.secondary, minWidth: 0 }}>
                  <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{c.label}</span>
                  {' '}· weight {Math.round(c.weight * 100)}%
                  <span style={{ display: 'block', color: tc.text.muted, fontSize: fontSize.xs }}>{c.describes}</span>
                </span>
                <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary, whiteSpace: 'nowrap' }}>
                  {c.value}/100 → +{c.contribution.toFixed(1)} pts
                </span>
              </div>
            ))}
            {missing.map((c) => (
              <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], marginBottom: space['2'], fontFamily: fontFamily.body, fontSize: fontSize.sm }} data-testid={`score-component-missing-${c.label.replace(/\W+/g, '-').toLowerCase()}`}>
                <span style={{ color: tc.text.muted }}>
                  {c.label} · base weight {Math.round(c.baseWeight * 100)}%
                </span>
                <span style={{ color: tc.text.muted, fontStyle: 'italic', whiteSpace: 'nowrap' }}>not returned by API</span>
              </div>
            ))}
            <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: fontSize.xs, color: tc.text.muted, lineHeight: 1.5 }}>
              Score = Σ (renormalized weight × component value). Base weights: Revenue Growth 40% · Traffic Growth 30% · Conversion Efficiency 20% · SEO CTR 10%. Components without usable data are dropped and the remaining weights are scaled to sum to 100%.
            </div>
          </div>
        )}
      </div>

      {showTooltip && breakdown.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: space['6'],
            marginTop: space['2'],
            backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.lg,
            padding: space['4'],
            zIndex: 10,
            minWidth: '240px',
            fontFamily: fontFamily.body,
            fontSize: fontSize.sm,
          }}
        >
          <div style={{ fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>Score Breakdown</div>
          {breakdown.map((b) => (
            <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: space['1'], color: tc.text.secondary }}>
              <span>{b.label} ({Math.round(b.weight * 100)}%)</span>
              <span style={{ fontWeight: fontWeight.medium, color: tc.text.primary }}>{b.value}/100</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
