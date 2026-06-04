'use client';

// =============================================================================
// SEO Command Center — Recommendations (full governed candidate queue)
// Governance lock: read-only list. This surface NEVER writes — approve/reject
// happens only on the Action Card (/dashboard/seo/action/[id]) and the Command
// Center, both routed through lib/seoApi (draft-only). Only gate-accepted,
// approval-pending candidates whose target page is verified canonical_live are
// listed (same restriction the Command Center applies) — governance never
// surfaces targets we cannot confirm are live.
//
// Curation (D1/D4 + A1/A4): the default view is ONE decision per (page, field) —
// the single highest-scoring proposal — with sibling variants collapsed behind a
// "See N alternatives" control. Text fields (title/meta/h1) have exactly one slot
// per page, so their competing variants are deduped; structural mutations
// (internal links, schema, redirects) are legitimately distinct per target and
// are NOT collapsed.
// =============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontWeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { getSeoCandidateQueue, getSeoPortfolio } from '../../../../lib/seoApi';
import type { PageDossierCandidate, PortfolioPage } from '../../../../lib/seoApi';
import { PALETTE, monoStack, Pill, fmtInt, pathOf, mutationDisplay, proposalReview } from '../_shared';

const PAGE_SIZE = 25;

// Text fields have a single slot per page, so competing proposals are variants of
// the SAME decision and should be deduped. Structural mutations are distinct per
// target and must not collapse (returning null = "do not group with siblings").
function fieldOf(mutationType?: string | null): string | null {
  const t = (mutationType ?? '').toLowerCase();
  if (t.includes('title')) return 'title';
  if (t.includes('meta')) return 'meta';
  if (t.includes('h1')) return 'h1';
  return null;
}

function groupKeyOf(c: PageDossierCandidate): string {
  const path = c.target_page_url ? pathOf(c.target_page_url) : '—';
  const field = fieldOf(c.mutation_type);
  // Non-text mutations stay one-row-each (keyed by their own id).
  return field ? `${path}::${field}` : `${path}::${c.mutation_type ?? 'unknown'}::${c.candidate_id}`;
}

interface RecGroup {
  key: string;
  rep: PageDossierCandidate;
  alts: PageDossierCandidate[];
}

function StatusCell({ c, tc }: { c: PageDossierCandidate; tc: ReturnType<typeof useThemeColors> }) {
  const review = proposalReview(c);
  if (!c.regate_review_flag && !review.flagged) {
    return <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>—</span>;
  }
  return (
    <span style={{ display: 'flex', gap: space['1'], flexWrap: 'wrap' }}>
      {c.regate_review_flag && (
        <span title="Re-surfaced for human re-review after a prior decision"><Pill tone="warn" tc={tc}>re-review</Pill></span>
      )}
      {review.flagged && (
        <span title={review.reasons.join(' ')} data-testid={`pill-needs-review-${c.candidate_id}`}><Pill tone="warn" tc={tc}>needs review</Pill></span>
      )}
    </span>
  );
}

function CandidateRow({
  c, tc, isAlt,
}: { c: PageDossierCandidate; tc: ReturnType<typeof useThemeColors>; isAlt?: boolean }) {
  const m = mutationDisplay(c.mutation_type, c.primary_remedy);
  const score = c.opportunity_score != null ? Math.round(c.opportunity_score * 100) : null;
  return (
    <tr
      style={{ borderTop: `1px solid ${tc.border.subtle}`, background: isAlt ? tc.background.muted : 'transparent' }}
      data-testid={`row-recommendation-${c.candidate_id}`}
    >
      <td style={{ padding: isAlt ? '8px 12px 8px 28px' : '10px 12px', color: isAlt ? tc.text.secondary : tc.text.primary, fontWeight: isAlt ? fontWeight.normal : fontWeight.medium }}>
        {isAlt && <span style={{ color: tc.text.muted, marginRight: 6 }}>↳</span>}
        {m.verb(c.proposed_value)}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <Pill tone="violet" tc={tc}>{m.tag}</Pill>
      </td>
      <td style={{ padding: '10px 12px', fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, wordBreak: 'break-all' }}>
        {c.target_page_url ? pathOf(c.target_page_url) : '—'}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <StatusCell c={c} tc={tc} />
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{score ?? '—'}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <Link
          href={`/dashboard/seo/action/${encodeURIComponent(c.candidate_id)}`}
          data-testid={`link-details-${c.candidate_id}`}
          style={{ color: PALETTE.violet, textDecoration: 'none', fontWeight: fontWeight.medium }}
        >
          Details →
        </Link>
      </td>
    </tr>
  );
}

function RecommendationsContent() {
  const tc = useThemeColors();
  const [candidates, setCandidates] = useState<PageDossierCandidate[] | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 're-review' | 'needs-review'>('all');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    Promise.all([getSeoCandidateQueue(), getSeoPortfolio()])
      .then(([q, p]) => { if (alive) { setCandidates(q.candidates); setPortfolio(p); } })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Failed to load recommendations'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Host-robust path → portfolio lookup (portfolio + candidate URLs disagree on
  // www vs apex host, so we normalize to pathname before joining) — mirrors the
  // Command Center join exactly.
  const portfolioByPath = useMemo(() => {
    const m = new Map<string, PortfolioPage>();
    (portfolio ?? []).forEach((p) => m.set(pathOf(p.url), p));
    return m;
  }, [portfolio]);

  // Governance: only candidates whose target page is verified canonical_live.
  const live = useMemo(() => {
    return (candidates ?? []).filter((c) => {
      if (!c.target_page_url) return false;
      const p = portfolioByPath.get(pathOf(c.target_page_url));
      return p != null && p.status_class === 'canonical_live';
    });
  }, [candidates, portfolioByPath]);

  const typeOptions = useMemo(
    () => Array.from(new Set(live.map((c) => c.mutation_type).filter(Boolean) as string[])).sort(),
    [live],
  );

  // Candidate-level filter (applied before grouping so a match on any variant
  // surfaces its decision).
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return live
      .filter((c) => typeFilter === 'all' || c.mutation_type === typeFilter)
      .filter((c) => {
        if (statusFilter === 're-review') return !!c.regate_review_flag;
        if (statusFilter === 'needs-review') return proposalReview(c).flagged;
        return true;
      })
      .filter((c) => {
        if (term === '') return true;
        const path = c.target_page_url ? pathOf(c.target_page_url).toLowerCase() : '';
        const val = (c.proposed_value ?? '').toLowerCase();
        return path.includes(term) || val.includes(term);
      });
  }, [live, typeFilter, statusFilter, search]);

  // Dedup to one decision per (page, field). Representative = highest score.
  const groups = useMemo<RecGroup[]>(() => {
    const map = new Map<string, PageDossierCandidate[]>();
    for (const c of filtered) {
      const k = groupKeyOf(c);
      const arr = map.get(k);
      if (arr) arr.push(c); else map.set(k, [c]);
    }
    const out: RecGroup[] = [];
    map.forEach((arr, key) => {
      const sorted = [...arr].sort((a, b) => (b.opportunity_score ?? -Infinity) - (a.opportunity_score ?? -Infinity));
      out.push({ key, rep: sorted[0], alts: sorted.slice(1) });
    });
    return out.sort((a, b) => (b.rep.opportunity_score ?? -Infinity) - (a.rep.opportunity_score ?? -Infinity));
  }, [filtered]);

  // Reset to first page whenever the filtered set changes.
  useEffect(() => { setPage(0); }, [search, typeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageGroups = groups.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);

  const needsReviewCount = useMemo(() => live.filter((c) => proposalReview(c).flagged).length, [live]);
  const reReviewCount = useMemo(() => live.filter((c) => !!c.regate_review_flag).length, [live]);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', textAlign: 'left' };
  const thR: React.CSSProperties = { ...th, textAlign: 'right' };

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Recommendations</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-recommendations-subtitle">
          One recommended decision per page field, ranked by opportunity score — competing variants are collapsed behind &ldquo;see alternatives.&rdquo; Gate-accepted, awaiting approval, on live pages only. Read-only — open a recommendation to review and approve it as a DRAFT.
        </p>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space['3'], marginBottom: space['5'] }}>
        {[
          { label: 'Decisions', value: loading ? '—' : fmtInt(groups.length) },
          { label: 'Total proposals', value: loading ? '—' : fmtInt(live.length) },
          { label: 'Re-review flagged', value: loading ? '—' : fmtInt(reReviewCount) },
          { label: 'Needs review', value: loading ? '—' : fmtInt(needsReviewCount) },
        ].map((t) => (
          <div key={t.label} style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, padding: space['4'], background: tc.background.surface }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{t.label}</div>
            <div style={{ fontFamily: monoStack, fontSize: '26px', color: tc.text.primary, marginTop: '4px' }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: space['3'], alignItems: 'center', marginBottom: space['4'], flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by page path or proposed value…"
          data-testid="input-search"
          style={{ flex: '1 1 260px', padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          data-testid="select-mutation-type"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        >
          <option value="all">All types</option>
          {typeOptions.map((t) => <option key={t} value={t}>{mutationDisplay(t).tag}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 're-review' | 'needs-review')}
          data-testid="select-status"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px' }}
        >
          <option value="all">All statuses</option>
          <option value="re-review">Re-review flagged</option>
          <option value="needs-review">Needs review</option>
        </select>
        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>{groups.length} decision{groups.length === 1 ? '' : 's'}</span>
      </div>

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading recommendations…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
      {!loading && !error && groups.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-recommendations">
          No gate-accepted recommendations awaiting approval on live pages match the current filters.
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <>
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden', background: tc.background.surface }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
              <thead>
                <tr style={{ background: tc.background.muted }}>
                  <th style={th}>Recommendation</th>
                  <th style={th}>Type</th>
                  <th style={th}>Target page</th>
                  <th style={th}>Status</th>
                  <th style={thR}>Score</th>
                  <th style={thR}>Details</th>
                </tr>
              </thead>
              <tbody>
                {pageGroups.map((g) => {
                  const isOpen = expanded.has(g.key);
                  return (
                    <React.Fragment key={g.key}>
                      <CandidateRow c={g.rep} tc={tc} />
                      {g.alts.length > 0 && (
                        <tr style={{ borderTop: `1px solid ${tc.border.subtle}` }}>
                          <td colSpan={6} style={{ padding: '6px 12px', background: tc.background.muted }}>
                            <button
                              onClick={() => toggleExpand(g.key)}
                              data-testid={`button-toggle-alternatives-${g.rep.candidate_id}`}
                              style={{ background: 'none', border: 'none', color: PALETTE.violet, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, cursor: 'pointer', padding: 0 }}
                            >
                              {isOpen ? `▾ Hide ${g.alts.length} alternative${g.alts.length === 1 ? '' : 's'}` : `▸ See ${g.alts.length} alternative${g.alts.length === 1 ? '' : 's'}`}
                            </button>
                          </td>
                        </tr>
                      )}
                      {isOpen && g.alts.map((alt) => <CandidateRow key={alt.candidate_id} c={alt} tc={tc} isAlt />)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div style={{ display: 'flex', gap: space['2'], alignItems: 'center', justifyContent: 'center', marginTop: space['4'] }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={clampedPage === 0}
                data-testid="button-prev-page"
                style={{ padding: '6px 12px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, cursor: clampedPage === 0 ? 'default' : 'pointer', opacity: clampedPage === 0 ? 0.5 : 1 }}
              >
                ← Prev
              </button>
              <span style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted }} data-testid="text-page-indicator">
                Page {clampedPage + 1} of {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={clampedPage >= pageCount - 1}
                data-testid="button-next-page"
                style={{ padding: '6px 12px', background: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.sm, fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.primary, cursor: clampedPage >= pageCount - 1 ? 'default' : 'pointer', opacity: clampedPage >= pageCount - 1 ? 0.5 : 1 }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied message="You do not have permission to view SEO recommendations." />}>
      <RecommendationsContent />
    </DashboardGuard>
  );
}
