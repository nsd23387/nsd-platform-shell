'use client';

// =============================================================================
// SEO — Internal Links (gate-backed)
//
// Reads the SAME gate-accepted candidates as the command-center review queue
// (analytics.seo_execution_candidate, mutation_type='internal_link_insertion')
// via /api/proxy/seo/internal-links — NOT the legacy ungated generator. Each row
// shows its relevance score, grounded signals + why, and the exact on-page edit
// (Implementation line). Read-only: approve/reject lives on the Review screen.
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
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';
type TC = ReturnType<typeof useThemeColors>;
type ToneKey = 'good' | 'warn' | 'info' | 'violet';

interface GateEvidence {
  source?: { url?: string; entity?: string; intent?: string };
  target?: { url?: string; entity?: string; intent?: string };
  signals?: { hierarchy_proximity?: number; embedding_cosine?: number; shared_attributes?: number };
  why?: string;
  anchor_context?: string;
  implementation?: string;
}
interface LinkRec {
  id: string; page: string; anchor: string | null;
  relevance_score: number | null; evidence: GateEvidence | null; evidence_summary: string | null;
}
interface LinksData { links: LinkRec[]; generated_at: string; }

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

function toneStyle(tone: ToneKey, tc: TC) {
  switch (tone) {
    case 'good': return { bg: PALETTE.goodSoft, fg: PALETTE.good };
    case 'warn': return { bg: PALETTE.warnSoft, fg: PALETTE.warn };
    case 'info': return { bg: PALETTE.infoSoft, fg: PALETTE.info };
    default: return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
  }
}
function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: TC }) {
  const s = toneStyle(tone, tc);
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '11px', fontWeight: fontWeight.medium, background: s.bg, color: s.fg, fontFamily: fontFamily.body }}>{children}</span>;
}
function relevanceTone(score: number): ToneKey {
  if (score >= 0.5) return 'good';
  if (score >= 0.3) return 'violet';
  return 'warn';
}

// Implementation line (Fix B2): the concrete on-approval edit, honest about the
// draft-not-publish behaviour. Prefers the job-computed evidence.implementation.
function implementationLine(ev: GateEvidence | null, anchor: string | null): string {
  if (ev?.implementation) return ev.implementation;
  const src = ev?.source?.entity || 'the source page';
  const tgt = ev?.target?.url || ev?.target?.entity || 'the target page';
  const a = anchor || 'the anchor phrase';
  return `On approval: inserts a link in the “${src}” page, wrapping the existing text “${a}” → ${tgt}. Saved as a WordPress draft for your review — not published.`;
}

// Render the anchor sentence with the anchor phrase bolded (before→after preview).
function AnchorContext({ tc, context, anchor }: { tc: TC; context: string; anchor: string | null }) {
  if (!anchor) return <>{context}</>;
  const idx = context.toLowerCase().indexOf(anchor.toLowerCase());
  if (idx < 0) return <>{context}</>;
  return (
    <>
      {context.slice(0, idx)}
      <strong style={{ color: tc.text.primary, background: PALETTE.violetSoft, padding: '0 2px', borderRadius: 3 }}>{context.slice(idx, idx + anchor.length)}</strong>
      {context.slice(idx + anchor.length)}
    </>
  );
}

function GateSignals({ tc, ev }: { tc: TC; ev: GateEvidence | null }) {
  const s = ev?.signals;
  if (!s) return null;
  const chips: React.ReactNode[] = [];
  if (typeof s.hierarchy_proximity === 'number' && s.hierarchy_proximity > 0) {
    chips.push(<Pill key="h" tone="good" tc={tc}>{s.hierarchy_proximity >= 1 ? 'directly adjacent' : 'related'}</Pill>);
  }
  if (typeof s.embedding_cosine === 'number') chips.push(<Pill key="c" tone="info" tc={tc}>similarity {s.embedding_cosine.toFixed(2)}</Pill>);
  if (typeof s.shared_attributes === 'number' && s.shared_attributes > 0) chips.push(<Pill key="a" tone="violet" tc={tc}>{s.shared_attributes} shared attribute{s.shared_attributes === 1 ? '' : 's'}</Pill>);
  if (!chips.length) return null;
  return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>{chips}</div>;
}

function InternalLinksContent() {
  const tc = useThemeColors();
  const [data, setData] = useState<LinksData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJson<LinksData>('/api/proxy/seo/internal-links').then((d) => { setData(d); setLoading(false); });
  }, []);

  const links = data?.links ?? [];
  const cardBase: React.CSSProperties = { backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg };

  if (loading) return <div style={{ padding: space['8'], color: tc.text.muted, fontFamily: fontFamily.body }}>Loading internal links…</div>;

  return (
    <div style={{ maxWidth: 980, fontFamily: fontFamily.body, color: tc.text.primary }}>
      <div style={{ marginBottom: space['6'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }} data-testid="text-internal-links-title">
          Internal Links
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted, lineHeight: lineHeight.normal }}>
          Gate-accepted internal links, anchor-verified — each shows its exact on-page edit. Approve or reject from the Review queue.
        </p>
      </div>

      <div style={{ ...cardBase, padding: 0 }}>
        {links.length === 0 ? (
          <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontSize: fontSize.sm }}>
            No gate-accepted internal links awaiting review. Links whose anchor text isn’t present on the source page are withheld and listed under Suppressed.
          </div>
        ) : links.map((r) => {
          const src = r.evidence?.source?.entity;
          const tgt = r.evidence?.target?.entity;
          const ctx = r.evidence?.anchor_context;
          return (
            <div key={r.id} style={{ padding: space['4'], borderBottom: `1px solid ${tc.border.subtle}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Pill tone="violet" tc={tc}>Internal link</Pill>
                  {src && tgt ? (
                    <span style={{ fontSize: 13, fontWeight: fontWeight.semibold, color: tc.text.primary }}>{src} → {tgt}</span>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: fontWeight.semibold, color: tc.text.primary }}>{r.page || '/'}</span>
                  )}
                </div>
                {r.relevance_score != null && <Pill tone={relevanceTone(r.relevance_score)} tc={tc}>relevance {r.relevance_score.toFixed(2)}</Pill>}
              </div>
              {r.anchor && (
                <div style={{ fontSize: 13, color: tc.text.secondary }}>anchor “<strong style={{ color: tc.text.primary }}>{r.anchor}</strong>”</div>
              )}
              <GateSignals tc={tc} ev={r.evidence} />
              {(r.evidence?.why || r.evidence_summary) && (
                <div style={{ fontSize: 12, color: tc.text.muted, marginTop: 8 }}>{r.evidence?.why || r.evidence_summary}</div>
              )}
              <div style={{ marginTop: 10, padding: '8px 10px', background: tc.background.muted, borderRadius: radius.md, fontSize: 12, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
                <div style={{ fontFamily: monoStack, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', color: tc.text.muted, marginBottom: 3 }}>Implementation</div>
                {implementationLine(r.evidence, r.anchor)}
                {ctx && (
                  <div style={{ marginTop: 6, fontStyle: 'italic', color: tc.text.muted }}>“<AnchorContext tc={tc} context={ctx} anchor={r.anchor} />”</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InternalLinksPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <InternalLinksContent />
    </DashboardGuard>
  );
}
