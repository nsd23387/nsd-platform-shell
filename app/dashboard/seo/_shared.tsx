'use client';

// =============================================================================
// SEO Command Center — shared primitives
// Governance lock: read-first. The ONLY write paths are the existing engine
// candidate approve/reject endpoints (Lane 1), routed through
// approveEngineCandidate / rejectEngineCandidate -> /api/proxy/seo/recommendations.
// Lanes 2 (Rank Math manual) and 3 (off-page) are advisory only — no mutations.
// Ahrefs is decommissioned — keyword value is sourced from DataForSEO via
// analytics.external_query_intelligence. Only canonical_live pages are surfaced
// as optimization targets; lost pages live in the Lost queue; pending pages
// carry a verify flag; excluded pages are never shown.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import {
  getSeoPageDossier, approveEngineCandidate, rejectEngineCandidate,
} from '../../../lib/seoApi';
import type {
  PortfolioPage, PortfolioBucket, PageDossier, PageDossierCandidate,
} from '../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Brand accents not present in the global theme tokens.
// -----------------------------------------------------------------------------
export const PALETTE = {
  violet: violet[500],
  violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
export const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

export type Tc = ReturnType<typeof useThemeColors>;
export type ToneKey = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

export function toneStyle(tone: ToneKey, tc: Tc) {
  switch (tone) {
    case 'good':   return { bg: PALETTE.goodSoft,   fg: PALETTE.good };
    case 'bad':    return { bg: PALETTE.badSoft,    fg: PALETTE.bad };
    case 'warn':   return { bg: PALETTE.warnSoft,   fg: PALETTE.warn };
    case 'info':   return { bg: PALETTE.infoSoft,   fg: PALETTE.info };
    case 'violet': return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
    default:       return { bg: tc.background.muted, fg: tc.text.muted };
  }
}

export function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: Tc }) {
  const s = toneStyle(tone, tc);
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      fontSize: '11px', fontWeight: fontWeight.medium, background: s.bg, color: s.fg,
      fontFamily: fontFamily.body, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Bucket presentation metadata.
// -----------------------------------------------------------------------------
export const BUCKETS: { key: PortfolioBucket; label: string; tone: ToneKey; blurb: string }[] = [
  { key: 'win',       label: 'Wins',           tone: 'good',   blurb: 'Live pages ranking 1–30 — defend and lift CTR' },
  { key: 'strategic', label: 'Strategic',      tone: 'info',   blurb: 'Live pages ranking >30 or unranked — earn position' },
  { key: 'fix',       label: 'Fix',            tone: 'warn',   blurb: 'Duplicate / canonicalization issues to resolve' },
  { key: 'lost',      label: 'Lost queue',     tone: 'bad',    blurb: 'Pages no longer live — restore or 301 redirect' },
];

// How many cards to paint per bucket before requiring a "Show more" click.
export const PAGE_SIZE = 36;

export function bucketTone(b: PortfolioBucket): ToneKey {
  return BUCKETS.find(x => x.key === b)?.tone ?? 'neutral';
}

export function statusTone(statusClass: string): ToneKey {
  if (statusClass === 'canonical_live') return 'good';
  if (statusClass === 'lost') return 'bad';
  return 'warn';
}

// Deterministic one-line "read" for a portfolio card — what to do with this page.
export function cardRead(p: PortfolioPage): string {
  const q = p.gsc_top_query ? `“${p.gsc_top_query}”` : 'its target query';
  switch (p.bucket) {
    case 'lost':
      return `HTTP ${p.http_status ?? '404'} — restore or 301 redirect to the closest live page.`;
    case 'fix':
      return 'Duplicate / canonical issue — consolidate signals to the primary URL.';
    case 'win':
      return `Ranking ~${fmtPos(p.top_q_pos ?? p.gsc_best_position)} for ${q} — defend and lift CTR.`;
    default:
      return (p.top_q_pos ?? p.gsc_best_position) == null
        ? `Not yet ranking for ${q} — earn position.`
        : `Position ~${fmtPos(p.top_q_pos ?? p.gsc_best_position)} for ${q} — earn position.`;
  }
}

// -----------------------------------------------------------------------------
// Formatting helpers.
// -----------------------------------------------------------------------------
export const fmtInt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
export const fmtPos = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
export const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : `$${n.toFixed(2)}`);

// Mutation-type display — the engine emits several distinct candidate types
// (title, meta, h1, schema, internal_link, redirect). The UI must reflect the
// ACTUAL type of each candidate, never a hardcoded one (data truthfulness).
// `tag` is the short pill label; `verb(proposedValue)` is the headline phrase.
export function mutationDisplay(
  mutationType: string | null | undefined,
  primaryRemedy?: string | null,
): { tag: string; verb: (proposedValue?: string | null) => string } {
  const t = (mutationType ?? '').toLowerCase();
  const tgt = (v?: string | null) => (v ? ` → ${v}` : '');
  if (t.includes('internal_link')) {
    return { tag: 'INTERNAL LINK', verb: (v) => `Add internal link${tgt(v)}` };
  }
  if (t.includes('redirect')) {
    return { tag: 'REDIRECT', verb: (v) => `Add redirect${tgt(v)}` };
  }
  if (t.includes('schema') || t.includes('offer')) {
    return { tag: 'SCHEMA', verb: () => 'Add structured-data schema' };
  }
  if (t.includes('meta')) {
    return { tag: 'META', verb: () => 'Update meta description' };
  }
  if (t.includes('title')) {
    return { tag: 'TITLE', verb: () => 'Update title tag' };
  }
  if (t === 'h1' || t.includes('h1')) {
    return { tag: 'H1', verb: () => 'Update H1 heading' };
  }
  // Unknown / future mutation type — surface the raw type honestly rather than
  // inventing a friendly label that could misrepresent the action. When neither
  // field is present, fall back to an explicit UNKNOWN (governance: never imply a
  // specific action we cannot name).
  const raw = mutationType || primaryRemedy;
  if (!raw) return { tag: 'UNKNOWN', verb: () => 'Unknown change type' };
  return { tag: raw.replace(/_/g, ' ').toUpperCase(), verb: () => raw.replace(/_/g, ' ') };
}

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || '');
  } catch {
    return url.replace(/^https?:\/\/[^/]+/, '') || url;
  }
}

// Render `text` with every case-insensitive occurrence of `term` wrapped in a
// subtle highlight mark. Returns the plain string when there is no active term
// (or no match) so non-searching renders stay untouched.
export function highlightMatch(text: string, term: string): React.ReactNode {
  const needle = term.trim();
  if (!needle) return text;
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let idx = lowerText.indexOf(lowerNeedle, from);
  if (idx === -1) return text;
  let key = 0;
  while (idx !== -1) {
    if (idx > from) parts.push(text.slice(from, idx));
    parts.push(
      <mark
        key={key++}
        style={{ background: PALETTE.warnSoft, color: 'inherit', borderRadius: '2px', padding: '0 1px' }}
      >
        {text.slice(idx, idx + needle.length)}
      </mark>,
    );
    from = idx + needle.length;
    idx = lowerText.indexOf(lowerNeedle, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

// =============================================================================
// Level-2 — Page Dossier drawer
// =============================================================================

export function lane2Suggestion(d: PageDossier): { title: string; body: string } {
  const p = d.page;
  const q = p.gsc_top_query || 'the page’s priority query';
  switch (p.status_class) {
    case 'lost':
      return {
        title: 'Restore or redirect (Rank Math)',
        body: p.rankmath_redirect_target
          ? `A redirect to ${p.rankmath_redirect_target} is already configured — verify it resolves and is the closest live match.`
          : `Page returns HTTP ${p.http_status ?? '404'}. Add a 301 in Rank Math to the closest live page, or restore the URL if demand justifies it.`,
      };
    default:
      break;
  }
  if (p.has_rankmath_redirect) {
    return {
      title: 'Resolve duplicate / canonical (Rank Math)',
      body: `This URL has a Rank Math redirect (${p.rankmath_redirect_target ?? 'target set'}). Confirm the canonical primary URL and consolidate signals to it.`,
    };
  }
  if (p.gsc_best_position != null && p.gsc_best_position <= 30) {
    return {
      title: 'Improve CTR (Rank Math)',
      body: `Ranking ~${fmtPos(p.gsc_best_position)} for "${q}". Sharpen the SEO title & meta description in Rank Math to win more clicks at the current position.`,
    };
  }
  return {
    title: 'Strengthen on-page (Rank Math)',
    body: `Position ${p.gsc_best_position == null ? 'not yet ranking' : `~${fmtPos(p.gsc_best_position)}`} for "${q}". Expand on-page content depth and tighten the title/H1 around the target intent before chasing links.`,
  };
}

export function lane3Applicable(d: PageDossier): boolean {
  const p = d.page;
  // Off-page authority work matters most for live, indexable pages that are
  // stuck outside the top 10 — i.e. authority-bound rather than content-bound.
  if (p.status_class !== 'canonical_live') return false;
  if (p.gsc_best_position == null) return true;
  return p.gsc_best_position > 10;
}

export function CandidateCard({
  c, tc, onDone,
}: {
  c: PageDossierCandidate;
  tc: Tc;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null);
  const [err, setErr] = useState<string | null>(null);

  const pending = c.approval_status === 'pending' && !done;

  async function act(kind: 'approve' | 'reject') {
    setBusy(kind); setErr(null);
    try {
      if (kind === 'approve') {
        await approveEngineCandidate({
          candidate_id: c.candidate_id,
          opportunity_id: c.opportunity_id ?? undefined,
          proposed_value: c.proposed_value ?? undefined,
          target_page_url: c.target_page_url ?? undefined,
        });
        setDone('approved');
      } else {
        await rejectEngineCandidate({
          candidate_id: c.candidate_id,
          opportunity_id: c.opportunity_id ?? undefined,
        });
        setDone('rejected');
      }
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  }

  const statusLabel = done ?? c.approval_status ?? 'pending';
  const statusToneKey: ToneKey = statusLabel === 'approved' ? 'good' : statusLabel === 'rejected' ? 'bad' : 'warn';

  return (
    <div
      data-testid={`card-candidate-${c.candidate_id}`}
      style={{
        border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
        padding: space['4'], background: tc.background.surface, marginBottom: space['3'],
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center' }}>
          <Pill tone="violet" tc={tc}>{c.primary_remedy || c.mutation_type || 'remedy'}</Pill>
          {c.confidence_tier && <Pill tone="info" tc={tc}>{c.confidence_tier}</Pill>}
          {c.opportunity_score != null && (
            <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
              score {Math.round(c.opportunity_score * 100)}
            </span>
          )}
        </div>
        <Pill tone={statusToneKey} tc={tc}>{statusLabel}</Pill>
      </div>

      {c.proposed_value && (
        <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary }}>
          <span style={{ color: tc.text.muted }}>Proposed: </span>{c.proposed_value}
        </div>
      )}
      {c.evidence_summary && (
        <div style={{ marginTop: space['1'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
          {c.evidence_summary}
        </div>
      )}

      {err && (
        <div style={{ marginTop: space['2'], fontSize: '12px', color: PALETTE.bad, fontFamily: fontFamily.body }}>
          {err}
        </div>
      )}

      {pending && (
        <div style={{ display: 'flex', gap: space['2'], marginTop: space['3'] }}>
          <button
            data-testid={`button-approve-${c.candidate_id}`}
            onClick={() => act('approve')}
            disabled={busy !== null}
            style={{
              padding: '6px 14px', borderRadius: radius.sm, border: 'none', cursor: busy ? 'default' : 'pointer',
              background: PALETTE.good, color: '#fff', fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'approve' ? 'Approving…' : 'Approve'}
          </button>
          <button
            data-testid={`button-reject-${c.candidate_id}`}
            onClick={() => act('reject')}
            disabled={busy !== null}
            style={{
              padding: '6px 14px', borderRadius: radius.sm, cursor: busy ? 'default' : 'pointer',
              background: 'transparent', color: PALETTE.bad, border: `1px solid ${PALETTE.bad}`,
              fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, opacity: busy ? 0.6 : 1,
            }}
          >
            {busy === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  );
}

export function PageDossierDrawer({
  url, tc, onClose,
}: {
  url: string;
  tc: Tc;
  onClose: () => void;
}) {
  const [dossier, setDossier] = useState<PageDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoPageDossier(url)
      .then((d) => { if (alive) setDossier(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load page'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url, reloadKey]);

  const sectionLabel = {
    fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: tc.text.muted,
    marginBottom: space['2'],
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="drawer-page-dossier"
        style={{
          width: 'min(720px, 96vw)', height: '100%', overflowY: 'auto',
          background: tc.background.page, borderLeft: `1px solid ${tc.border.strong}`,
          padding: space['6'], boxShadow: '-8px 0 24px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: space['3'] }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: monoStack, fontSize: '13px', color: tc.text.primary, wordBreak: 'break-all' }}>
              {pathOf(url)}
            </div>
            <a
              href={url} target="_blank" rel="noopener noreferrer"
              data-testid="link-open-live"
              style={{ fontFamily: fontFamily.body, fontSize: '12px', color: PALETTE.violet, textDecoration: 'none' }}
            >
              Open live ↗
            </a>
          </div>
          <button
            onClick={onClose}
            data-testid="button-close-dossier"
            style={{
              border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.muted,
              borderRadius: radius.sm, padding: '4px 10px', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>

        {loading && (
          <div style={{ padding: space['6'], color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
            Loading dossier…
          </div>
        )}
        {error && (
          <div style={{ marginTop: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>
            {error}
          </div>
        )}

        {dossier && !loading && (
          <>
            {/* Page facts */}
            <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', marginTop: space['3'] }}>
              <Pill tone="neutral" tc={tc}>{dossier.page.content_type || 'page'}</Pill>
              <Pill tone={dossier.page.status_class === 'canonical_live' ? 'good' : dossier.page.status_class === 'lost' ? 'bad' : 'warn'} tc={tc}>
                {dossier.page.status_class}
              </Pill>
              {dossier.page.needs_verify && <Pill tone="warn" tc={tc}>verify live</Pill>}
              {dossier.page.noindex && <Pill tone="bad" tc={tc}>noindex</Pill>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: space['3'], marginTop: space['4'] }}>
              {[
                { k: 'Impressions', v: fmtInt(dossier.page.gsc_impressions) },
                { k: 'Best position', v: fmtPos(dossier.page.gsc_best_position) },
                { k: 'HTTP', v: dossier.page.http_status != null ? String(dossier.page.http_status) : '—' },
              ].map((m) => (
                <div key={m.k} style={{ border: `1px solid ${tc.border.subtle}`, borderRadius: radius.md, padding: space['3'], background: tc.background.surface }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.k}</div>
                  <div style={{ fontFamily: monoStack, fontSize: '18px', color: tc.text.primary, marginTop: '2px' }}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* Primary keyword target */}
            {(() => {
              const top = dossier.page.gsc_top_query;
              const match = top
                ? dossier.demand.find((q) => q.query.trim().toLowerCase() === top.trim().toLowerCase())
                : undefined;
              const ref = match ?? dossier.demand.find((q) => !q.is_discard);
              return (
                <div style={{ marginTop: space['6'] }} data-testid="section-primary-target">
                  <div style={sectionLabel}>Primary keyword target</div>
                  {!top && !ref ? (
                    <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
                      No primary query identified for this page yet.
                    </div>
                  ) : (
                    <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
                      <div style={{ fontFamily: fontFamily.body, fontSize: '15px', fontWeight: fontWeight.semibold, color: tc.text.primary }} data-testid="text-primary-query">
                        {top || ref?.query || '—'}
                      </div>
                      <div style={{ display: 'flex', gap: space['5'], flexWrap: 'wrap', marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                        <span>position <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(ref?.avg_position ?? dossier.page.gsc_best_position)}</span></span>
                        <span>impr. <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(ref?.impressions ?? dossier.page.gsc_impressions)}</span></span>
                        <span>volume <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(ref?.kw_volume ?? null)}</span></span>
                        <span>KD <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{ref?.kw_difficulty == null ? '—' : ref.kw_difficulty.toFixed(0)}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Demand — real vs discard */}
            <div style={{ marginTop: space['6'] }}>
              <div style={sectionLabel}>Search demand · top queries (real vs discard)</div>
              {dossier.demand.length === 0 ? (
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
                  No query/page demand recorded for this URL.
                </div>
              ) : (
                <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: tc.background.muted, color: tc.text.muted }}>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Query</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Impr.</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Pos.</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>Vol.</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px' }}>KD</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px' }}>Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossier.demand.map((q, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${tc.border.subtle}`, opacity: q.is_discard ? 0.6 : 1 }} data-testid={`row-demand-${i}`}>
                          <td style={{ padding: '8px 10px', color: tc.text.primary }}>{q.query}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtInt(q.impressions)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtPos(q.avg_position)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{fmtInt(q.kw_volume)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: monoStack, color: tc.text.secondary }}>{q.kw_difficulty == null ? '—' : q.kw_difficulty.toFixed(0)}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {q.is_discard
                              ? <span title={q.discard_reason ?? ''}><Pill tone="bad" tc={tc}>discard</Pill></span>
                              : <Pill tone="good" tc={tc}>real</Pill>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Lane 1 — engine actions */}
            <div style={{ marginTop: space['6'] }}>
              <div style={sectionLabel}>Lane 1 · Engine actions (gate-accepted)</div>
              {dossier.candidates.length === 0 ? (
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
                  No gate-accepted engine candidates for this page.
                </div>
              ) : (
                dossier.candidates.map((c) => (
                  <CandidateCard key={c.candidate_id} c={c} tc={tc} onDone={() => setReloadKey((k) => k + 1)} />
                ))
              )}
            </div>

            {/* Lane 2 — Rank Math manual */}
            <div style={{ marginTop: space['6'] }}>
              <div style={sectionLabel}>Lane 2 · Rank Math (manual)</div>
              {(() => {
                const s = lane2Suggestion(dossier);
                return (
                  <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary }}>{s.title}</div>
                    <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '4px' }}>{s.body}</div>
                  </div>
                );
              })()}
            </div>

            {/* Lane 3 — off-page */}
            <div style={{ marginTop: space['6'], marginBottom: space['6'] }}>
              <div style={sectionLabel}>Lane 3 · Off-page authority</div>
              {lane3Applicable(dossier) ? (
                <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, color: tc.text.primary }}>
                    Earn links / digital PR
                  </div>
                  <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted, marginTop: '4px' }}>
                    This page is authority-bound ({dossier.page.gsc_best_position == null ? 'not yet ranking' : `pos ~${fmtPos(dossier.page.gsc_best_position)}`} for
                    {' '}&ldquo;{dossier.page.gsc_top_query || 'its target query'}&rdquo;). On-page is necessary but not sufficient — pursue relevant backlinks and digital PR to break into the top 10.
                  </div>
                </div>
              ) : (
                <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }}>
                  Not authority-bound right now — focus on Lanes 1 & 2 first.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Page portfolio card
// =============================================================================

export function PageCard({ p, tc, onOpen }: { p: PortfolioPage; tc: Tc; onOpen: (url: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.url)}
      data-testid={`card-page-${p.url}`}
      style={{
        textAlign: 'left', width: '100%', cursor: 'pointer',
        border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
        padding: space['4'], background: tc.background.surface, display: 'block',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: space['3'], alignItems: 'flex-start' }}>
        <div style={{ fontFamily: monoStack, fontSize: '12px', color: tc.text.primary, wordBreak: 'break-all' }}>
          {pathOf(p.url)}
        </div>
        <div style={{ display: 'flex', gap: space['2'], flexShrink: 0 }}>
          {p.needs_verify && <Pill tone="warn" tc={tc}>verify</Pill>}
          <Pill tone={statusTone(p.status_class)} tc={tc}>{p.status_class}</Pill>
          <Pill tone={bucketTone(p.bucket)} tc={tc}>{p.bucket}</Pill>
        </div>
      </div>
      <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
        {cardRead(p)}
      </div>
      <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['3'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
        <span><span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(p.top_q_impr ?? p.gsc_impressions)}</span> impr.</span>
        <span>pos <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(p.top_q_pos ?? p.gsc_best_position)}</span></span>
        {(p.top_query || p.gsc_top_query) && <span>“{p.top_query || p.gsc_top_query}”</span>}
      </div>
      <div style={{ display: 'flex', gap: space['4'], flexWrap: 'wrap', marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
        {p.has_dataforseo ? (
          <>
            <span>vol <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{fmtInt(p.kw_volume)}</span></span>
            <span>KD <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{p.kw_difficulty == null ? '—' : p.kw_difficulty.toFixed(0)}</span></span>
            <span>cpc <span style={{ fontFamily: monoStack, color: tc.text.secondary }}>{fmtMoney(p.kw_cpc)}</span></span>
            {p.is_competitor_only && <Pill tone="bad" tc={tc}>competitor-only</Pill>}
          </>
        ) : (
          <span style={{ fontStyle: 'italic' }}>no DataForSEO keyword value</span>
        )}
      </div>
    </button>
  );
}
