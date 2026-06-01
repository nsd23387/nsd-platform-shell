'use client';

// =============================================================================
// SEO — Suppressed (intent/relevance gate audit)
//
// "Recommendations the gate withheld and why — nothing is hidden."
// Read-only: GET /api/proxy/seo/suppressed. The gate logic lives in the DB;
// this page just surfaces what it rejected and the grounded reason.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet } from '../../../../design/tokens/colors';

const PALETTE = {
  violet: violet[500], violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
type TC = ReturnType<typeof useThemeColors>;

// Humanize the gate reason codes.
const REASON_LABEL: Record<string, string> = {
  no_relevance_signal: 'No relevance signal',
  intent_mismatch: 'Intent mismatch',
  source_not_linkable: 'Source not linkable',
  cross_intent: 'Cross-intent',
};
const reasonLabel = (r: string) => REASON_LABEL[r] || r.replace(/_/g, ' ');

const MUTATION_LABEL: Record<string, string> = {
  meta_description_update: 'Meta description', meta_description: 'Meta description',
  title_tag_refinement: 'Title tag', title_tag: 'Title tag',
  internal_link_insertion: 'Internal link',
};

interface ByReason { reason: string; count: number; }
interface RecentRow {
  id: string; mutation_type: string; source: string | null; target: string | null;
  gate_reasons: string[]; relevance_score: number | null; why: string | null; created_at: string;
}
interface SuppressedData { total: number; byReason: ByReason[]; recent: RecentRow[]; generated_at: string; }

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
  } catch {
    return null;
  }
}

function Pill({ children, tc }: { children: React.ReactNode; tc: TC }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: fontWeight.medium, background: PALETTE.warnSoft, color: PALETTE.warn, fontFamily: fontFamily.body }}>
      {children}
    </span>
  );
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; }
}

function SuppressedContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<SuppressedData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<SuppressedData>('/api/proxy/seo/suppressed').then((d) => { setData(d); setLoading(false); });
  }, []);

  const cardBase: React.CSSProperties = { backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, padding: space['5'] };
  const total = data?.total ?? 0;
  const byReason = data?.byReason ?? [];
  const recent = data?.recent ?? [];
  const maxReason = byReason.reduce((m, r) => Math.max(m, r.count), 0) || 1;

  if (loading) {
    return <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading suppressed candidates…</div>;
  }

  return (
    <div style={{ padding: space['6'], maxWidth: 1100, margin: '0 auto', fontFamily: fontFamily.body, color: tc.text.primary }}>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '28px', fontWeight: fontWeight.semibold, margin: 0, color: tc.text.primary, lineHeight: lineHeight.snug }}>
          Suppressed ({total})
        </h1>
        <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: space['1'] }}>
          Recommendations the gate withheld and why — nothing is hidden.
        </div>
      </div>

      {/* By-reason breakdown */}
      <div style={{ ...cardBase, marginBottom: space['6'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted, marginBottom: space['3'] }}>By reason</div>
        {byReason.length === 0 ? (
          <div style={{ fontSize: 13, color: tc.text.muted }}>No suppressed candidates yet — the gate has accepted everything it has seen.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space['2'] }}>
            {byReason.map((r) => (
              <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
                <div style={{ width: 180, flexShrink: 0, fontSize: 13, color: tc.text.primary }}>{reasonLabel(r.reason)}</div>
                <div style={{ flex: 1, background: tc.background.muted, borderRadius: radius.sm, height: 18, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(4, (r.count / maxReason) * 100)}%`, height: '100%', background: PALETTE.warn, opacity: 0.85 }} />
                </div>
                <div style={{ width: 44, textAlign: 'right', fontFamily: monoStack, fontSize: 12, color: tc.text.secondary }}>{r.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent suppressed */}
      <div style={{ marginBottom: space['3'], fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.06em', color: tc.text.muted }}>Recent (latest {recent.length})</div>
      <div style={{ ...cardBase, padding: 0 }}>
        {recent.length === 0 ? (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontSize: fontSize.sm }}>Nothing suppressed.</div>
        ) : recent.map((row) => (
          <div key={row.id} style={{ padding: space['4'], borderBottom: `1px solid ${tc.border.subtle}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: tc.text.muted, fontFamily: fontFamily.body }}>{MUTATION_LABEL[row.mutation_type] || row.mutation_type}</span>
                {row.source && row.target && (
                  <span style={{ fontSize: 13, fontWeight: fontWeight.semibold, color: tc.text.primary }}>{row.source} → {row.target}</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {row.relevance_score != null && <span style={{ fontFamily: monoStack, fontSize: 11, color: tc.text.muted }}>relevance {row.relevance_score.toFixed(2)}</span>}
                <span style={{ fontSize: 11, color: tc.text.muted }}>{fmtDate(row.created_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {row.gate_reasons.map((r) => <Pill key={r} tc={tc}>{reasonLabel(r)}</Pill>)}
            </div>
            {row.why && <div style={{ fontSize: 12, color: tc.text.muted }}>{row.why}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuppressedPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <SuppressedContent />
    </DashboardGuard>
  );
}
