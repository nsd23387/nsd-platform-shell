'use client';

// =============================================================================
// SEO Command Center — Review (page portfolio + page dossier)
// Governance lock: this page is read-first. The ONLY write paths are the
// existing engine candidate approve/reject endpoints (Lane 1), routed through
// approveEngineCandidate / rejectEngineCandidate -> /api/proxy/seo/recommendations.
// Lanes 2 (Rank Math manual) and 3 (off-page) are advisory only — no mutations.
// Ahrefs is decommissioned — keyword value is sourced from DataForSEO via
// analytics.external_query_intelligence. Only canonical_live pages are surfaced
// as optimization targets; lost pages live in the Lost queue; pending pages
// carry a verify flag; excluded pages are never shown.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardGuard } from '../../../hooks/useRBAC';
import { AccessDenied } from '../../../components/dashboard';
import { useThemeColors } from '../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../design/tokens/typography';
import { space, radius } from '../../../design/tokens/spacing';
import { violet } from '../../../design/tokens/colors';
import {
  getSeoPortfolio, getSeoPageDossier, getSeoCandidateQueue,
  approveEngineCandidate, rejectEngineCandidate,
} from '../../../lib/seoApi';
import type {
  PortfolioPage, PortfolioBucket, PageDossier, PageDossierCandidate,
} from '../../../lib/seoApi';

// -----------------------------------------------------------------------------
// Brand accents not present in the global theme tokens.
// -----------------------------------------------------------------------------
const PALETTE = {
  violet: violet[500],
  violetSoft: '#ede9fe',
  good: '#065f46', goodSoft: '#d1fae5',
  bad: '#991b1b', badSoft: '#fee2e2',
  warn: '#92400e', warnSoft: '#fef3c7',
  info: '#1e40af', infoSoft: '#dbeafe',
};
const monoStack = '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace';

type Tc = ReturnType<typeof useThemeColors>;
type ToneKey = 'good' | 'bad' | 'warn' | 'info' | 'violet' | 'neutral';

function toneStyle(tone: ToneKey, tc: Tc) {
  switch (tone) {
    case 'good':   return { bg: PALETTE.goodSoft,   fg: PALETTE.good };
    case 'bad':    return { bg: PALETTE.badSoft,    fg: PALETTE.bad };
    case 'warn':   return { bg: PALETTE.warnSoft,   fg: PALETTE.warn };
    case 'info':   return { bg: PALETTE.infoSoft,   fg: PALETTE.info };
    case 'violet': return { bg: PALETTE.violetSoft, fg: PALETTE.violet };
    default:       return { bg: tc.background.muted, fg: tc.text.muted };
  }
}

function Pill({ children, tone, tc }: { children: React.ReactNode; tone: ToneKey; tc: Tc }) {
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
const BUCKETS: { key: PortfolioBucket; label: string; tone: ToneKey; blurb: string }[] = [
  { key: 'win',       label: 'Wins',           tone: 'good',   blurb: 'Live pages ranking 1–30 — defend and lift CTR' },
  { key: 'strategic', label: 'Strategic',      tone: 'info',   blurb: 'Live pages ranking >30 or unranked — earn position' },
  { key: 'fix',       label: 'Fix',            tone: 'warn',   blurb: 'Duplicate / canonicalization issues to resolve' },
  { key: 'lost',      label: 'Lost queue',     tone: 'bad',    blurb: 'Pages no longer live — restore or 301 redirect' },
];

// How many cards to paint per bucket before requiring a "Show more" click.
const PAGE_SIZE = 36;

function bucketTone(b: PortfolioBucket): ToneKey {
  return BUCKETS.find(x => x.key === b)?.tone ?? 'neutral';
}

function statusTone(statusClass: string): ToneKey {
  if (statusClass === 'canonical_live') return 'good';
  if (statusClass === 'lost') return 'bad';
  return 'warn';
}

// Deterministic one-line "read" for a portfolio card — what to do with this page.
function cardRead(p: PortfolioPage): string {
  const q = p.gsc_top_query ? `“${p.gsc_top_query}”` : 'its target query';
  switch (p.bucket) {
    case 'lost':
      return `HTTP ${p.http_status ?? '404'} — restore or 301 redirect to the closest live page.`;
    case 'fix':
      return 'Duplicate / canonical issue — consolidate signals to the primary URL.';
    case 'win':
      return `Ranking ~${fmtPos(p.gsc_best_position)} for ${q} — defend and lift CTR.`;
    default:
      return p.gsc_best_position == null
        ? `Not yet ranking for ${q} — earn position.`
        : `Position ~${fmtPos(p.gsc_best_position)} for ${q} — earn position.`;
  }
}

// -----------------------------------------------------------------------------
// Formatting helpers.
// -----------------------------------------------------------------------------
const fmtInt = (n: number | null | undefined) => (n == null ? '—' : n.toLocaleString('en-US'));
const fmtPos = (n: number | null | undefined) => (n == null ? '—' : n.toFixed(1));
const fmtMoney = (n: number | null | undefined) => (n == null ? '—' : `$${n.toFixed(2)}`);

function pathOf(url: string): string {
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
function highlightMatch(text: string, term: string): React.ReactNode {
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

function lane2Suggestion(d: PageDossier): { title: string; body: string } {
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

function lane3Applicable(d: PageDossier): boolean {
  const p = d.page;
  // Off-page authority work matters most for live, indexable pages that are
  // stuck outside the top 10 — i.e. authority-bound rather than content-bound.
  if (p.status_class !== 'canonical_live') return false;
  if (p.gsc_best_position == null) return true;
  return p.gsc_best_position > 10;
}

function CandidateCard({
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
  const statusTone: ToneKey = statusLabel === 'approved' ? 'good' : statusLabel === 'rejected' ? 'bad' : 'warn';

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
              score {c.opportunity_score.toFixed(0)}
            </span>
          )}
        </div>
        <Pill tone={statusTone} tc={tc}>{statusLabel}</Pill>
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

function PageDossierDrawer({
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
                    {' '}"{dossier.page.gsc_top_query || 'its target query'}"). On-page is necessary but not sufficient — pursue relevant backlinks and digital PR to break into the top 10.
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
// Level-1 — Page portfolio
// =============================================================================

function PageCard({ p, tc, onOpen }: { p: PortfolioPage; tc: Tc; onOpen: (url: string) => void }) {
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
        <span><span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtInt(p.gsc_impressions)}</span> impr.</span>
        <span>pos <span style={{ color: tc.text.secondary, fontFamily: monoStack }}>{fmtPos(p.gsc_best_position)}</span></span>
        {p.gsc_top_query && <span>“{p.gsc_top_query}”</span>}
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

// =============================================================================
// Portfolio-wide engine action queue — multi-select bulk approve / reject
// =============================================================================

function CandidateQueue({ tc, onOpenPage }: { tc: Tc; onOpenPage: (url: string) => void }) {
  const [candidates, setCandidates] = useState<PageDossierCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<null | 'approve' | 'reject'>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  // Triage controls — filter by remedy / urgency / confidence, sort by score / urgency / page.
  const [remedyFilter, setRemedyFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [pageSearch, setPageSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'urgency' | 'page'>('score');

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoCandidateQueue()
      .then((d) => {
        if (!alive) return;
        setCandidates(d.candidates);
        // Drop selections that are no longer in the queue (already actioned).
        setSelected((prev) => {
          const present = new Set(d.candidates.map((c) => c.candidate_id));
          const next = new Set<string>();
          prev.forEach((id) => { if (present.has(id)) next.add(id); });
          return next;
        });
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load action queue'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [reloadKey]);

  const allRows = candidates ?? [];

  // Distinct filter options, derived from the loaded queue so we never offer a
  // value that would match nothing.
  const remedyOptions = useMemo(
    () => Array.from(new Set(allRows.map((c) => c.primary_remedy).filter((v): v is string => !!v))).sort(),
    [allRows],
  );
  const urgencyOptions = useMemo(
    () => Array.from(new Set(allRows.map((c) => c.opportunity_urgency).filter((v): v is string => !!v))).sort(),
    [allRows],
  );
  const confidenceOptions = useMemo(
    () => Array.from(new Set(allRows.map((c) => c.confidence_tier).filter((v): v is string => !!v))).sort(),
    [allRows],
  );

  const rows = useMemo(() => {
    const term = pageSearch.trim().toLowerCase();
    let r = allRows.filter((c) =>
      (remedyFilter === 'all' || c.primary_remedy === remedyFilter) &&
      (urgencyFilter === 'all' || c.opportunity_urgency === urgencyFilter) &&
      (confidenceFilter === 'all' || c.confidence_tier === confidenceFilter) &&
      (term === '' ||
        (c.target_page_url || '').toLowerCase().includes(term) ||
        (c.proposed_value || '').toLowerCase().includes(term) ||
        (c.evidence_summary || '').toLowerCase().includes(term)),
    );
    const urgencyRank = (v: string | null): number => {
      switch ((v || '').toLowerCase()) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };
    r = [...r].sort((a, b) => {
      if (sortBy === 'urgency') {
        const d = urgencyRank(b.opportunity_urgency) - urgencyRank(a.opportunity_urgency);
        if (d !== 0) return d;
        return (b.opportunity_score ?? -Infinity) - (a.opportunity_score ?? -Infinity);
      }
      if (sortBy === 'page') {
        return pathOf(a.target_page_url || '').localeCompare(pathOf(b.target_page_url || ''));
      }
      // score (default) — highest opportunity first.
      return (b.opportunity_score ?? -Infinity) - (a.opportunity_score ?? -Infinity);
    });
    return r;
  }, [allRows, remedyFilter, urgencyFilter, confidenceFilter, pageSearch, sortBy]);

  const filterActive = remedyFilter !== 'all' || urgencyFilter !== 'all' || confidenceFilter !== 'all' || pageSearch.trim() !== '';
  const allSelected = rows.length > 0 && rows.every((c) => selected.has(c.candidate_id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((c) => c.candidate_id))));
  }

  async function runBulk(kind: 'approve' | 'reject') {
    if (selected.size === 0 || busy) return;
    // Act on every selected candidate, even ones currently hidden by a filter.
    const targets = allRows.filter((c) => selected.has(c.candidate_id));
    setBusy(kind); setActionErr(null);

    // Optimistic: remove the acted-upon candidates immediately and clear the
    // selection. The reconcile refetch below restores any that actually failed
    // (they remain approval_status='pending' server-side).
    setCandidates((prev) => (prev ?? []).filter((c) => !selected.has(c.candidate_id)));
    setSelected(new Set());

    const results = await Promise.allSettled(
      targets.map((c) =>
        kind === 'approve'
          ? approveEngineCandidate({
              candidate_id: c.candidate_id,
              opportunity_id: c.opportunity_id ?? undefined,
              proposed_value: c.proposed_value ?? undefined,
              target_page_url: c.target_page_url ?? undefined,
            })
          : rejectEngineCandidate({
              candidate_id: c.candidate_id,
              opportunity_id: c.opportunity_id ?? undefined,
            }),
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      setActionErr(`${failed} of ${targets.length} action(s) failed — they remain in the queue. Try again.`);
    }
    setBusy(null);
    // Cache refresh — reconcile the optimistic list with server truth.
    setReloadKey((k) => k + 1);
  }

  const sectionLabel = {
    fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.semibold,
    textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: tc.text.muted,
  };

  const selectStyle = {
    padding: '6px 10px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`,
    background: tc.background.surface, color: tc.text.primary,
    fontFamily: fontFamily.body, fontSize: '12px', cursor: 'pointer',
  };
  const controlLabel = {
    fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium,
    color: tc.text.muted,
  };

  return (
    <div data-testid="view-queue">
      {/* Filter + sort controls */}
      <div
        style={{
          display: 'flex', gap: space['4'], alignItems: 'flex-end', flexWrap: 'wrap',
          padding: space['3'], marginBottom: space['3'], borderRadius: radius.md,
          border: `1px solid ${tc.border.default}`, background: tc.background.surface,
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
          <span style={controlLabel}>Remedy</span>
          <select
            data-testid="select-queue-remedy"
            value={remedyFilter}
            onChange={(e) => setRemedyFilter(e.target.value)}
            disabled={busy !== null}
            style={selectStyle}
          >
            <option value="all">All remedies</option>
            {remedyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
          <span style={controlLabel}>Urgency</span>
          <select
            data-testid="select-queue-urgency"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            disabled={busy !== null}
            style={selectStyle}
          >
            <option value="all">All urgency</option>
            {urgencyOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
          <span style={controlLabel}>Confidence</span>
          <select
            data-testid="select-queue-confidence"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            disabled={busy !== null}
            style={selectStyle}
          >
            <option value="all">All confidence</option>
            {confidenceOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: space['1'], flex: 1, minWidth: 200 }}>
          <span style={controlLabel}>Search target page</span>
          <input
            type="text"
            data-testid="input-queue-search"
            value={pageSearch}
            onChange={(e) => setPageSearch(e.target.value)}
            placeholder="Filter by page URL, proposed value, or evidence…"
            disabled={busy !== null}
            style={{ ...selectStyle, cursor: 'text', width: '100%' }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: space['1'] }}>
          <span style={controlLabel}>Sort by</span>
          <select
            data-testid="select-queue-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'urgency' | 'page')}
            disabled={busy !== null}
            style={selectStyle}
          >
            <option value="score">Opportunity score</option>
            <option value="urgency">Urgency</option>
            <option value="page">Target page</option>
          </select>
        </label>
        {filterActive && (
          <button
            data-testid="button-queue-clear-filters"
            onClick={() => { setRemedyFilter('all'); setUrgencyFilter('all'); setConfidenceFilter('all'); setPageSearch(''); }}
            disabled={busy !== null}
            style={{
              padding: '6px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`,
              background: 'transparent', color: tc.text.secondary, cursor: busy ? 'default' : 'pointer',
              fontFamily: fontFamily.body, fontSize: '12px',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      <div
        style={{
          display: 'flex', gap: space['3'], alignItems: 'center', flexWrap: 'wrap',
          padding: space['3'], marginBottom: space['4'], borderRadius: radius.md,
          border: `1px solid ${tc.border.default}`, background: tc.background.surface,
        }}
      >
        <label style={{ display: 'flex', gap: space['2'], alignItems: 'center', cursor: rows.length ? 'pointer' : 'default', fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.secondary }}>
          <input
            type="checkbox"
            data-testid="checkbox-queue-all"
            checked={allSelected}
            onChange={toggleAll}
            disabled={rows.length === 0 || busy !== null}
          />
          Select all
        </label>
        <span data-testid="text-queue-selected" style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
          {selected.size} selected · {filterActive ? `${rows.length} of ${allRows.length}` : rows.length} pending
        </span>
        <div style={{ flex: 1 }} />
        <button
          data-testid="button-bulk-approve"
          onClick={() => runBulk('approve')}
          disabled={selected.size === 0 || busy !== null}
          style={{
            padding: '6px 14px', borderRadius: radius.sm, border: 'none',
            cursor: selected.size === 0 || busy ? 'default' : 'pointer',
            background: PALETTE.good, color: '#fff', fontFamily: fontFamily.body,
            fontSize: '12px', fontWeight: fontWeight.medium,
            opacity: selected.size === 0 || busy ? 0.5 : 1,
          }}
        >
          {busy === 'approve' ? 'Approving…' : `Approve selected${selected.size ? ` (${selected.size})` : ''}`}
        </button>
        <button
          data-testid="button-bulk-reject"
          onClick={() => runBulk('reject')}
          disabled={selected.size === 0 || busy !== null}
          style={{
            padding: '6px 14px', borderRadius: radius.sm,
            cursor: selected.size === 0 || busy ? 'default' : 'pointer',
            background: 'transparent', color: PALETTE.bad, border: `1px solid ${PALETTE.bad}`,
            fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium,
            opacity: selected.size === 0 || busy ? 0.5 : 1,
          }}
        >
          {busy === 'reject' ? 'Rejecting…' : `Reject selected${selected.size ? ` (${selected.size})` : ''}`}
        </button>
      </div>

      {actionErr && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '12px' }}>
          {actionErr}
        </div>
      )}

      {loading && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          Loading action queue…
        </div>
      )}
      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div data-testid="text-queue-empty" style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          {filterActive && allRows.length > 0
            ? (pageSearch.trim()
                ? `No candidates match “${pageSearch.trim()}”. Try a different search or clear the filters.`
                : 'No candidates match the current filters. Try clearing them.')
            : 'No gate-accepted engine candidates are awaiting approval. The queue is clear.'}
        </div>
      )}

      {!loading && !error && rows.map((c) => {
        const checked = selected.has(c.candidate_id);
        return (
          <div
            key={c.candidate_id}
            data-testid={`row-queue-${c.candidate_id}`}
            style={{
              display: 'flex', gap: space['3'], alignItems: 'flex-start',
              border: `1px solid ${checked ? PALETTE.violet : tc.border.default}`,
              borderRadius: radius.md, padding: space['4'], background: tc.background.surface,
              marginBottom: space['3'],
            }}
          >
            <input
              type="checkbox"
              data-testid={`checkbox-queue-${c.candidate_id}`}
              checked={checked}
              onChange={() => toggle(c.candidate_id)}
              disabled={busy !== null}
              style={{ marginTop: '3px' }}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap', alignItems: 'center' }}>
                <Pill tone="violet" tc={tc}>{c.primary_remedy || c.mutation_type || 'remedy'}</Pill>
                {c.confidence_tier && <Pill tone="info" tc={tc}>{c.confidence_tier}</Pill>}
                {c.opportunity_urgency && <Pill tone="warn" tc={tc}>{c.opportunity_urgency}</Pill>}
                {c.opportunity_score != null && (
                  <span style={{ fontFamily: monoStack, fontSize: '11px', color: tc.text.muted }}>
                    score {c.opportunity_score.toFixed(0)}
                  </span>
                )}
              </div>
              {c.target_page_url && (
                <button
                  onClick={() => onOpenPage(c.target_page_url as string)}
                  data-testid={`link-queue-page-${c.candidate_id}`}
                  style={{
                    display: 'block', marginTop: space['2'], padding: 0, border: 'none', background: 'none',
                    textAlign: 'left', cursor: 'pointer', fontFamily: monoStack, fontSize: '12px', color: PALETTE.violet,
                    wordBreak: 'break-all',
                  }}
                >
                  {highlightMatch(pathOf(c.target_page_url), pageSearch)}
                </button>
              )}
              {c.proposed_value && (
                <div style={{ marginTop: space['2'], fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary }}>
                  <span style={{ color: tc.text.muted }}>Proposed: </span>{highlightMatch(c.proposed_value, pageSearch)}
                </div>
              )}
              {c.evidence_summary && (
                <div style={{ marginTop: space['1'], fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                  {highlightMatch(c.evidence_summary, pageSearch)}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div style={sectionLabel} />
    </div>
  );
}

function SeoReviewContent() {
  const tc = useThemeColors();
  const [view, setView] = useState<'portfolio' | 'queue'>('portfolio');
  const [pages, setPages] = useState<PortfolioPage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeBucket, setActiveBucket] = useState<PortfolioBucket | 'all'>('all');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  // The portfolio can hold ~1700 pages; rendering every card at once locks the main
  // thread. Cap visible cards per bucket and reveal more on demand.
  const [visible, setVisible] = useState<Record<PortfolioBucket, number>>({
    win: PAGE_SIZE, strategic: PAGE_SIZE, fix: PAGE_SIZE, lost: PAGE_SIZE,
  });
  // Any change to the filter/search resets the reveal counts so we never try to
  // paint a giant list after narrowing.
  useEffect(() => {
    setVisible({ win: PAGE_SIZE, strategic: PAGE_SIZE, fix: PAGE_SIZE, lost: PAGE_SIZE });
  }, [search, activeBucket]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    getSeoPortfolio()
      .then((d) => { if (alive) setPages(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load portfolio'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<PortfolioBucket, number> = { win: 0, strategic: 0, fix: 0, lost: 0 };
    (pages ?? []).forEach((p) => { c[p.bucket] += 1; });
    return c;
  }, [pages]);

  // Total search impressions tied to lost pages — the demand currently going unserved.
  const lostImpressions = useMemo(
    () => (pages ?? []).reduce((sum, p) => (p.bucket === 'lost' ? sum + (p.gsc_impressions ?? 0) : sum), 0),
    [pages],
  );

  const filtered = useMemo(() => {
    let rows = pages ?? [];
    if (activeBucket !== 'all') rows = rows.filter((p) => p.bucket === activeBucket);
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((p) =>
        p.url.toLowerCase().includes(term) ||
        (p.gsc_top_query || '').toLowerCase().includes(term),
      );
    }
    return rows;
  }, [pages, activeBucket, search]);

  const grouped = useMemo(() => {
    const g: Record<PortfolioBucket, PortfolioPage[]> = { win: [], strategic: [], fix: [], lost: [] };
    filtered.forEach((p) => { g[p.bucket].push(p); });
    return g;
  }, [filtered]);

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.body, fontSize: '22px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>
          SEO Review
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }}>
          Governed page portfolio. Only live pages are surfaced as targets; lost pages sit in the restore queue; excluded pages are never shown. Click any page to open its dossier.
        </p>
      </div>

      {/* View toggle — page portfolio vs portfolio-wide engine action queue */}
      <div style={{ display: 'inline-flex', gap: '2px', padding: '3px', marginBottom: space['5'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, background: tc.background.surface }}>
        {([
          { key: 'portfolio' as const, label: 'Page portfolio' },
          { key: 'queue' as const, label: 'Action queue' },
        ]).map((v) => {
          const active = view === v.key;
          return (
            <button
              key={v.key}
              data-testid={`button-view-${v.key}`}
              onClick={() => setView(v.key)}
              style={{
                padding: '6px 14px', borderRadius: radius.sm, cursor: 'pointer', border: 'none',
                background: active ? PALETTE.violet : 'transparent',
                color: active ? '#fff' : tc.text.muted,
                fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium,
              }}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {view === 'queue' ? (
        <CandidateQueue tc={tc} onOpenPage={setSelectedUrl} />
      ) : (
      <>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            data-testid={`kpi-${b.key}`}
            onClick={() => setActiveBucket(activeBucket === b.key ? 'all' : b.key)}
            style={{
              textAlign: 'left', cursor: 'pointer',
              border: `1px solid ${activeBucket === b.key ? toneStyle(b.tone, tc).fg : tc.border.default}`,
              borderRadius: radius.md, padding: space['4'], background: tc.background.surface,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{b.label}</span>
              <Pill tone={b.tone} tc={tc}>{b.key}</Pill>
            </div>
            <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{counts[b.key]}</div>
            <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>{b.blurb}</div>
          </button>
        ))}
        <div
          data-testid="kpi-lost-impressions"
          style={{
            textAlign: 'left',
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.md, padding: space['4'], background: tc.background.surface,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>Lost impressions</span>
            <Pill tone="bad" tc={tc}>demand</Pill>
          </div>
          <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{fmtInt(lostImpressions)}</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginTop: '2px' }}>Search impressions tied to lost pages — demand going unserved</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginBottom: space['4'], flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by URL or query…"
          data-testid="input-search"
          style={{
            flex: '1 1 260px', padding: '8px 12px', borderRadius: radius.sm,
            border: `1px solid ${tc.border.default}`, background: tc.background.surface,
            color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px',
          }}
        />
        {activeBucket !== 'all' && (
          <button
            onClick={() => setActiveBucket('all')}
            data-testid="button-clear-filter"
            style={{
              padding: '8px 12px', borderRadius: radius.sm, cursor: 'pointer',
              border: `1px solid ${tc.border.default}`, background: tc.background.surface,
              color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '12px',
            }}
          >
            Clear bucket filter ({activeBucket})
          </button>
        )}
        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
          {filtered.length} pages
        </span>
      </div>

      {loading && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          Loading portfolio…
        </div>
      )}
      {error && (
        <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && !error && BUCKETS.map((b) => {
        const rows = grouped[b.key];
        if (rows.length === 0) return null;
        const shown = Math.min(visible[b.key], rows.length);
        return (
          <div key={b.key} style={{ marginBottom: space['6'] }}>
            <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', marginBottom: space['3'] }}>
              <Pill tone={b.tone} tc={tc}>{b.label}</Pill>
              <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{rows.length} · {b.blurb}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: space['3'] }}>
              {rows.slice(0, shown).map((p) => (
                <PageCard key={p.url} p={p} tc={tc} onOpen={setSelectedUrl} />
              ))}
            </div>
            {shown < rows.length && (
              <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginTop: space['3'] }}>
                <button
                  data-testid={`button-show-more-${b.key}`}
                  onClick={() => setVisible((v) => ({ ...v, [b.key]: v[b.key] + PAGE_SIZE }))}
                  style={{
                    padding: '8px 14px', borderRadius: radius.sm, cursor: 'pointer',
                    border: `1px solid ${tc.border.default}`, background: tc.background.surface,
                    color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium,
                  }}
                >
                  Show {Math.min(PAGE_SIZE, rows.length - shown)} more
                </button>
                <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                  Showing {shown} of {rows.length} — narrow with the filter above
                </span>
              </div>
            )}
          </div>
        );
      })}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>
          No pages match the current filters.
        </div>
      )}
      </>
      )}

      {selectedUrl && (
        <PageDossierDrawer url={selectedUrl} tc={tc} onClose={() => setSelectedUrl(null)} />
      )}
    </div>
  );
}

// =============================================================================
// Page export — RBAC-gated by DashboardGuard.
// =============================================================================

export default function SeoReviewPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view the SEO Command Center." />}>
      <SeoReviewContent />
    </DashboardGuard>
  );
}
