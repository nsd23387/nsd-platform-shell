'use client';

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoEvaluation } from '../../../../lib/seoApi';
import type { SeoEvaluationRow } from '../../../../lib/seoApi';
import { PALETTE, monoStack, type Tc } from '../_shared';
import { LifecycleBadge } from '../components/LifecycleBadge';

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '') || url;
  }
}

function daysElapsed(startAt: string): number {
  return Math.floor((Date.now() - new Date(startAt).getTime()) / 86_400_000);
}

function ProgressBar({ value, tc }: { value: number; tc: Tc }) {
  const clamped = Math.min(1, Math.max(0, value));
  const color = clamped >= 1 ? PALETTE.bad : clamped >= 0.7 ? PALETTE.warn : PALETTE.info;
  return (
    <div style={{ width: '80px', height: '6px', borderRadius: 3, background: tc.border.subtle, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${clamped * 100}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

function EvaluationTable({ rows, tc }: { rows: SeoEvaluationRow[]; tc: Tc }) {
  if (rows.length === 0) {
    return (
      <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, padding: space['6'], textAlign: 'center' }}>
        <div>No pages currently in evaluation.</div>
        <div style={{ marginTop: '6px', fontSize: '12px' }}>Pages appear here after their first approval. Packages in evaluation are measured over 30–60 days.</div>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left', fontFamily: fontFamily.body,
    fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted,
    textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 12px', fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary,
    verticalAlign: 'middle',
  };

  return (
    <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: tc.background.muted }}>
            <th style={thStyle}>State</th>
            <th style={thStyle}>Page</th>
            <th style={thStyle}>Ver</th>
            <th style={thStyle}>Progress</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Rank Δ</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Click Δ%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const elapsed = daysElapsed(row.evaluation_start_at);
            const inFirstPhase = elapsed <= row.first_verdict_days;
            const targetDays = inFirstPhase ? row.first_verdict_days : row.final_verdict_days;
            const progress = elapsed / targetDays;
            const phaseLabel = inFirstPhase
              ? `Day ${elapsed} of ${row.first_verdict_days}`
              : `Day ${elapsed} of ${row.final_verdict_days}`;

            const rankColor = row.rank_delta == null ? tc.text.muted
              : row.rank_delta < 0 ? PALETTE.good
              : row.rank_delta > 0 ? PALETTE.bad
              : tc.text.secondary;

            return (
              <tr
                key={row.enhancement_id}
                style={{ borderTop: i > 0 ? `1px solid ${tc.border.subtle}` : undefined }}
              >
                <td style={tdStyle}>
                  <LifecycleBadge state={row.lifecycle_state} size="sm" />
                </td>
                <td style={{ ...tdStyle, maxWidth: '280px' }}>
                  <span
                    style={{
                      fontFamily: monoStack, fontSize: '12px', color: tc.text.primary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      display: 'block',
                    }}
                    title={row.canonical_url}
                  >
                    {pathOf(row.canonical_url)}
                  </span>
                </td>
                <td style={tdStyle}>
                  <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>v{row.version}</span>
                </td>
                <td style={{ ...tdStyle }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: space['2'] }}>
                    <ProgressBar value={progress} tc={tc} />
                    <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, whiteSpace: 'nowrap' }}>
                      {phaseLabel}
                    </span>
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: monoStack, color: rankColor }}>
                  {row.rank_delta == null ? '—' : (row.rank_delta > 0 ? '+' : '') + row.rank_delta.toFixed(1)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right', fontFamily: monoStack, color: row.click_delta_pct == null ? tc.text.muted : tc.text.secondary }}>
                  {row.click_delta_pct == null ? '—' : `${row.click_delta_pct > 0 ? '+' : ''}${row.click_delta_pct.toFixed(1)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EvaluationContent() {
  const tc = useThemeColors();
  const [rows, setRows] = useState<SeoEvaluationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getSeoEvaluation()
      .then((data) => {
        if (alive) {
          // Sort by soonest verdict
          const sorted = [...data].sort((a, b) => {
            const aElapsed = daysElapsed(a.evaluation_start_at);
            const bElapsed = daysElapsed(b.evaluation_start_at);
            const aRemain = a.first_verdict_days - aElapsed;
            const bRemain = b.first_verdict_days - bElapsed;
            return aRemain - bRemain;
          });
          setRows(sorted);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setLoading(false);
        }
      });
    return () => { alive = false; };
  }, [tick]);

  return (
    <div style={{ maxWidth: '960px' }} aria-live="polite">
      <div style={{ marginBottom: space['6'] }}>
        <h1
          style={{
            fontFamily: fontFamily.display, fontSize: '24px',
            fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0,
          }}
        >
          In Evaluation
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Pages being measured. Read-only — decisions happen at Review.
        </p>
      </div>

      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', marginBottom: space['4'], display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => { setError(null); setLoading(true); setTick((t) => t + 1); }} style={{ marginLeft: space['4'], padding: `${space['1']} ${space['3']}`, borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: 'transparent', color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ background: tc.background.muted, borderRadius: radius.md, height: '48px', marginBottom: space['2'] }}
            />
          ))}
        </div>
      ) : (
        <EvaluationTable rows={rows} tc={tc} />
      )}
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <DashboardGuard
      dashboard="seo"
      fallback={<AccessDenied message="You do not have permission to view this page." />}
    >
      <EvaluationContent />
    </DashboardGuard>
  );
}
