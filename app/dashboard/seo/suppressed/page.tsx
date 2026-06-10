'use client';

// =============================================================================
// SEO — Suppressed Audit
// Governance lock: READ-ONLY transparency trail. Surfaces mutations the gate
// withheld (analytics.seo_gate_suppressed) and why, so reviewers can audit what
// the engine chose not to propose. No write paths exist on this surface.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoSuppressed } from '../../../../lib/seoApi';
import type { SuppressedAudit } from '../../../../lib/seoApi';

const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
const BAD = '#991b1b', BAD_SOFT = '#fee2e2';

type Tc = ReturnType<typeof useThemeColors>;

const fmtInt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));

function pathOf(url: string | null): string {
  if (!url) return '—';
  try { const u = new URL(url); return u.pathname + (u.search || ''); }
  catch { return url.replace(/^https?:\/\/[^/]+/, '') || url; }
}

function SuppressedContent() {
  const tc = useThemeColors();
  const [audit, setAudit] = useState<SuppressedAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReason, setActiveReason] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoSuppressed(300)
      .then((d) => { if (alive) setAudit(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load suppressed audit'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const rows = useMemo(() => {
    const all = audit?.rows ?? [];
    if (!activeReason) return all;
    return all.filter((r) => r.gate_reasons.includes(activeReason));
  }, [audit, activeReason]);

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.body, fontSize: '22px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>
          Suppressed Audit
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Transparency trail of mutations the gate withheld — what was not proposed, and why. Read-only.
        </p>
      </div>

      {loading && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          Loading suppressed audit…
        </div>
      )}
      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: BAD_SOFT, color: BAD, fontFamily: fontFamily.body, fontSize: '13px' }}>
          {error}
        </div>
      )}

      {audit && !loading && !error && (
        <>
          <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginBottom: space['4'] }}>
            {fmtInt(audit.total)} total suppressed · showing {fmtInt(audit.returned)} most recent
          </div>

          {/* Reason rollup */}
          <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginBottom: space['5'] }}>
            {audit.reasons.map((r) => {
              const active = activeReason === r.reason;
              const pct = audit.total > 0 ? Math.round((r.count / audit.total) * 1000) / 10 : 0;
              return (
                <button
                  key={r.reason}
                  data-testid={`chip-reason-${r.reason}`}
                  onClick={() => setActiveReason(active ? null : r.reason)}
                  style={{
                    cursor: 'pointer', padding: '6px 12px', borderRadius: 999,
                    border: `1px solid ${active ? tc.border.strong : tc.border.default}`,
                    background: active ? tc.background.active : tc.background.surface,
                    color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '12px',
                  }}
                >
                  {r.reason} <span style={{ fontFamily: monoStack, color: tc.text.muted }}>· {fmtInt(r.count)} · {pct.toFixed(1)}%</span>
                </button>
              );
            })}
          </div>

          {activeReason && (
            <div style={{ marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
              Filtered by “{activeReason}” · {rows.length} rows shown
            </div>
          )}

          {/* Rows */}
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '12px' }}>
              <thead>
                <tr style={{ background: tc.background.muted, color: tc.text.muted }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Target URL</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Mutation</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Gate reasons</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>Relevance</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>Generator</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${tc.border.subtle}` }} data-testid={`row-suppressed-${r.id}`}>
                    <td style={{ padding: '8px 10px', fontFamily: monoStack, color: tc.text.primary, wordBreak: 'break-all' }}>{pathOf(r.target_url)}</td>
                    <td style={{ padding: '8px 10px', color: tc.text.secondary }}>{r.mutation_type || '—'}</td>
                    <td style={{ padding: '8px 10px', color: tc.text.secondary }}>{r.gate_reasons.join(', ') || '—'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>
                      {r.relevance_score == null ? '—' : r.relevance_score.toFixed(3)}
                    </td>
                    <td style={{ padding: '8px 10px', color: tc.text.muted }}>{r.generator || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
              No suppressed mutations match this filter.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SeoSuppressedPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <SuppressedContent />
    </DashboardGuard>
  );
}
