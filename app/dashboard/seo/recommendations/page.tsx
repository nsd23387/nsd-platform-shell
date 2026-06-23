'use client';

// =============================================================================
// SEO Command Center — Recommendations (full governed candidate queue)
// Governance lock: approve/reject writes route only through lib/seoApi and the
// guarded /api/proxy/seo/recommendations engine endpoint. Only gate-accepted,
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
import { approveEngineCandidate, bulkApproveEngineCandidates, getSeoCandidateQueue, getSeoPortfolio, rejectEngineCandidate } from '../../../../lib/seoApi';
import type { PageDossierCandidate, PortfolioPage } from '../../../../lib/seoApi';
import { PALETTE, monoStack, Pill, fmtInt, fmtScore, pathOf, mutationDisplay, proposalReview, isSchemaMutation, candidateHeadline, QUEUE_SCORE_TOOLTIP } from '../_shared';
import { Term } from '../../../../design/components/Term';

const PAGE_SIZE = 25;
const QUALITY_FLOOR = 70;
const FAST_LANE_TYPES = new Set([
  'meta_description_update',
  'title_tag_refinement',
  'image_alt_text_update',
  'image_alt_update',
  'alt_text_update',
]);

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
    return <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>Pending</span>;
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

function valuePreview(value: string | null | undefined): string {
  const v = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!v) return '—';
  return v.length > 110 ? `${v.slice(0, 107)}...` : v;
}

function isHighConfidence(c: PageDossierCandidate): boolean {
  return [c.confidence_tier, c.source_confidence].some((v) => String(v ?? '').toLowerCase() === 'high');
}

function hasSnapshot(c: PageDossierCandidate): boolean {
  return c.current_value_snapshot != null;
}

function hasUsableProposedValue(c: PageDossierCandidate): boolean {
  const proposed = (c.proposed_value ?? '').trim();
  return Boolean(proposed) && proposed !== '__llm_pending__';
}

function isFastLaneCandidate(c: PageDossierCandidate): boolean {
  return c.auto_publish === true
    && FAST_LANE_TYPES.has((c.mutation_type ?? '').toLowerCase())
    && isHighConfidence(c)
    && (c.quality_self_score ?? c.opportunity_score ?? 0) >= QUALITY_FLOOR
    && c.gate_status === 'accepted'
    && c.approval_status === 'pending'
    && c.execution_status === 'proposed'
    && hasSnapshot(c)
    && hasUsableProposedValue(c)
    && !c.regate_review_flag
    && !proposalReview(c).flagged;
}

function CandidateRow({
  c, tc, isAlt, selected, busy, onToggle, onApprove, onReject,
}: {
  c: PageDossierCandidate;
  tc: ReturnType<typeof useThemeColors>;
  isAlt?: boolean;
  selected: boolean;
  busy: boolean;
  onToggle: (id: string) => void;
  onApprove: (c: PageDossierCandidate) => void;
  onReject: (c: PageDossierCandidate) => void;
}) {
  const m = mutationDisplay(c.mutation_type, c.primary_remedy);
  const score = fmtScore(c.opportunity_score);
  const canAct = c.approval_status === 'pending' && c.execution_status === 'proposed';
  return (
    <tr
      style={{ borderTop: `1px solid ${tc.border.subtle}`, background: isAlt ? tc.background.muted : 'transparent' }}
      data-testid={`row-recommendation-${c.candidate_id}`}
    >
      <td style={{ padding: isAlt ? '8px 8px 8px 16px' : '10px 8px' }}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(c.candidate_id)}
          aria-label={`Select ${candidateHeadline(c)}`}
          data-testid={`checkbox-select-${c.candidate_id}`}
          style={{ width: 16, height: 16 }}
        />
      </td>
      <td style={{ padding: isAlt ? '8px 12px 8px 12px' : '10px 12px', color: isAlt ? tc.text.secondary : tc.text.primary, fontWeight: isAlt ? fontWeight.normal : fontWeight.medium }}>
        <div>
          {isAlt && <span style={{ color: tc.text.muted, marginRight: 6 }}>↳</span>}
          {candidateHeadline(c)}
        </div>
        <div
          title={`${c.current_value_snapshot ?? '—'} → ${c.proposed_value ?? '—'}`}
          style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'center', fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, lineHeight: 1.35 }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valuePreview(c.current_value_snapshot)}</span>
          <span>→</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: tc.text.secondary }}>{valuePreview(c.proposed_value)}</span>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <Pill tone="violet" tc={tc}>{c.mutation_label ?? m.tag}</Pill>
      </td>
      <td style={{ padding: '10px 12px', fontFamily: monoStack, fontSize: '12px', color: tc.text.muted, wordBreak: 'break-all' }}>
        {c.target_page_url ? pathOf(c.target_page_url) : '—'}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <StatusCell c={c} tc={tc} />
      </td>
      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: monoStack, color: tc.text.primary }}>{score}</td>
      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: space['2'], flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onApprove(c)}
            disabled={!canAct || busy}
            data-testid={`button-inline-approve-${c.candidate_id}`}
            style={{ padding: '5px 9px', borderRadius: radius.sm, border: 'none', background: canAct ? PALETTE.good : tc.background.muted, color: canAct ? '#fff' : tc.text.muted, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, cursor: canAct && !busy ? 'pointer' : 'default' }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(c)}
            disabled={!canAct || busy}
            data-testid={`button-inline-reject-${c.candidate_id}`}
            style={{ padding: '5px 9px', borderRadius: radius.sm, border: `1px solid ${canAct ? PALETTE.bad : tc.border.default}`, background: tc.background.surface, color: canAct ? PALETTE.bad : tc.text.muted, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, cursor: canAct && !busy ? 'pointer' : 'default' }}
          >
            Reject
          </button>
        </div>
      </td>
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  function loadQueue() {
    let alive = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([getSeoCandidateQueue(), getSeoPortfolio()])
      .then(([queueResult, portfolioResult]) => {
        if (!alive) return;

        const errors: string[] = [];
        if (queueResult.status === 'fulfilled') {
          setCandidates(queueResult.value.candidates);
        } else {
          setCandidates([]);
          errors.push(queueResult.reason instanceof Error ? queueResult.reason.message : 'Failed to load recommendations');
        }

        if (portfolioResult.status === 'fulfilled') {
          setPortfolio(portfolioResult.value);
        } else {
          setPortfolio([]);
          errors.push(portfolioResult.reason instanceof Error ? portfolioResult.reason.message : 'Failed to load live page portfolio');
        }

        setError(errors.length > 0 ? errors.join(' ') : null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }

  useEffect(() => {
    return loadQueue();
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

  // Dedup to one decision per (page, field). Representative = highest score,
  // with stable type/page ordering while the score distribution is flat.
  const groups = useMemo<RecGroup[]>(() => {
    const map = new Map<string, PageDossierCandidate[]>();
    for (const c of filtered) {
      const k = groupKeyOf(c);
      const arr = map.get(k);
      if (arr) arr.push(c); else map.set(k, [c]);
    }
    const out: RecGroup[] = [];
    map.forEach((arr, key) => {
      const sorted = [...arr].sort((a, b) => {
        const scoreDelta = (b.opportunity_score ?? -Infinity) - (a.opportunity_score ?? -Infinity);
        if (scoreDelta !== 0) return scoreDelta;
        const typeDelta = (a.mutation_label ?? a.mutation_type ?? '').localeCompare(b.mutation_label ?? b.mutation_type ?? '');
        if (typeDelta !== 0) return typeDelta;
        return (a.target_page_url ?? '').localeCompare(b.target_page_url ?? '');
      });
      out.push({ key, rep: sorted[0], alts: sorted.slice(1) });
    });
    return out.sort((a, b) => {
      const scoreDelta = (b.rep.opportunity_score ?? -Infinity) - (a.rep.opportunity_score ?? -Infinity);
      if (scoreDelta !== 0) return scoreDelta;
      const typeDelta = (a.rep.mutation_label ?? a.rep.mutation_type ?? '').localeCompare(b.rep.mutation_label ?? b.rep.mutation_type ?? '');
      if (typeDelta !== 0) return typeDelta;
      return (a.rep.target_page_url ?? '').localeCompare(b.rep.target_page_url ?? '');
    });
  }, [filtered]);

  // Reset to first page whenever the filtered set changes.
  useEffect(() => { setPage(0); }, [search, typeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(groups.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount - 1);
  const pageGroups = groups.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE);
  const filteredRepIds = useMemo(() => groups.map((g) => g.rep.candidate_id), [groups]);
  const selectedCandidates = useMemo(() => {
    const byId = new Map(filtered.map((c) => [c.candidate_id, c]));
    return Array.from(selectedIds).map((id) => byId.get(id)).filter(Boolean) as PageDossierCandidate[];
  }, [filtered, selectedIds]);
  const fastLaneCandidates = useMemo(() => groups.map((g) => g.rep).filter(isFastLaneCandidate), [groups]);
  const selectedLivePublishCount = selectedCandidates.filter((c) => c.auto_publish).length;
  const selectedDraftCount = selectedCandidates.length - selectedLivePublishCount;

  const needsReviewCount = useMemo(() => live.filter((c) => proposalReview(c).flagged).length, [live]);
  const reReviewCount = useMemo(() => live.filter((c) => !!c.regate_review_flag).length, [live]);
  const schemaCount = useMemo(() => live.filter((c) => isSchemaMutation(c.mutation_type)).length, [live]);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectFiltered() {
    setSelectedIds(new Set(filteredRepIds));
  }

  function selectFastLane() {
    setSelectedIds(new Set(fastLaneCandidates.map((c) => c.candidate_id)));
  }

  async function handleApprove(c: PageDossierCandidate) {
    const liveNote = c.auto_publish
      ? 'This approval publishes live through the executor policy.'
      : 'This approval queues a draft.';
    if (!window.confirm(`Approve this recommendation?\n\n${liveNote}`)) return;
    setBusyIds((prev) => new Set(prev).add(c.candidate_id));
    setActionMsg(null);
    try {
      await approveEngineCandidate({ candidate_id: c.candidate_id, review_notes: 'inline approval from recommendations queue' });
      setActionMsg(`Approved 1 recommendation${c.auto_publish ? ' for live publish' : ' as draft'}.`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(c.candidate_id);
        return next;
      });
      loadQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(c.candidate_id);
        return next;
      });
    }
  }

  async function handleReject(c: PageDossierCandidate) {
    if (!window.confirm('Reject this recommendation?')) return;
    setBusyIds((prev) => new Set(prev).add(c.candidate_id));
    setActionMsg(null);
    try {
      await rejectEngineCandidate({ candidate_id: c.candidate_id, review_notes: 'inline rejection from recommendations queue' });
      setActionMsg('Rejected 1 recommendation.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(c.candidate_id);
        return next;
      });
      loadQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        next.delete(c.candidate_id);
        return next;
      });
    }
  }

  async function handleBulkApprove() {
    if (selectedCandidates.length === 0) return;
    const message = `Approve ${selectedCandidates.length} selected recommendation${selectedCandidates.length === 1 ? '' : 's'}?\n\n${selectedLivePublishCount} publish live now, ${selectedDraftCount} queue as drafts. Guard-failing rows will be skipped.`;
    if (!window.confirm(message)) return;
    setBulkBusy(true);
    setActionMsg(null);
    try {
      const result = await bulkApproveEngineCandidates({
        candidate_ids: selectedCandidates.map((c) => c.candidate_id),
        quality_floor: QUALITY_FLOOR,
        review_notes: `bulk approval from recommendations queue; quality_floor=${QUALITY_FLOOR}`,
      });
      setActionMsg(`Bulk approve complete: ${result.summary.approved} approved, ${result.summary.skipped} skipped, ${result.summary.errors} errored.`);
      setSelectedIds(new Set());
      loadQueue();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Bulk approve failed');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkReject() {
    if (selectedCandidates.length === 0) return;
    if (!window.confirm(`Reject ${selectedCandidates.length} selected recommendation${selectedCandidates.length === 1 ? '' : 's'}?`)) return;
    setBulkBusy(true);
    setActionMsg(null);
    const results = await Promise.allSettled(selectedCandidates.map((c) => rejectEngineCandidate({
      candidate_id: c.candidate_id,
      review_notes: 'bulk rejection from recommendations queue',
    })));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    setActionMsg(`Bulk reject complete: ${ok} rejected, ${results.length - ok} failed.`);
    setSelectedIds(new Set());
    setBulkBusy(false);
    loadQueue();
  }

  const th: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: fontWeight.semibold, color: tc.text.muted, textTransform: 'uppercase', textAlign: 'left' };
  const thR: React.CSSProperties = { ...th, textAlign: 'right' };

  return (
    <div style={{ padding: space['6'], maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: space['5'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: '24px', fontWeight: fontWeight.semibold, color: tc.text.primary, margin: 0 }}>Recommendations</h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.muted, marginTop: '4px' }} data-testid="text-recommendations-subtitle">
          One recommended decision per page field, ordered by type and target page while opportunity scoring is recalibrated in Batch 2. Competing text variants are collapsed behind &ldquo;see alternatives.&rdquo; Gate-accepted, awaiting approval, on live pages only.
        </p>
      </div>

      {schemaCount > 0 && (
        <div style={{ marginBottom: space['4'], padding: space['4'], borderRadius: radius.md, background: PALETTE.warnSoft, color: PALETTE.warn, fontFamily: fontFamily.body, fontSize: '13px', lineHeight: 1.5 }} data-testid="banner-schema-approval-paused">
          Schema execution is temporarily paused while the write path is under repair. Schema recommendations remain visible here, but approval is disabled on the detail card until Batch 1 re-enables the lane.
        </div>
      )}

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
        <button
          type="button"
          onClick={selectFiltered}
          disabled={groups.length === 0}
          data-testid="button-select-filtered"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px', cursor: groups.length ? 'pointer' : 'default', opacity: groups.length ? 1 : 0.5 }}
        >
          Select all filtered
        </button>
        <button
          type="button"
          onClick={selectFastLane}
          disabled={fastLaneCandidates.length === 0}
          data-testid="button-select-safe-fast-lane"
          style={{ padding: '8px 12px', borderRadius: radius.sm, border: 'none', background: fastLaneCandidates.length ? PALETTE.good : tc.background.muted, color: fastLaneCandidates.length ? '#fff' : tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: fastLaneCandidates.length ? 'pointer' : 'default' }}
        >
          Safe to bulk-approve ({fmtInt(fastLaneCandidates.length)})
        </button>
      </div>

      {actionMsg && (
        <div style={{ marginBottom: space['4'], padding: space['3'], borderRadius: radius.md, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.secondary, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="text-action-message">
          {actionMsg}
        </div>
      )}

      {loading && <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }}>Loading recommendations…</div>}
      {error && <div style={{ padding: space['4'], borderRadius: radius.md, background: PALETTE.badSoft, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px' }}>{error}</div>}
      {!loading && groups.length === 0 && (
        <div style={{ padding: space['6'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body, fontSize: '13px' }} data-testid="empty-recommendations">
          {error ? 'Recommendations could not fully load. Check the error above, then retry the page.' : 'No gate-accepted recommendations awaiting approval on live pages match the current filters.'}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <>
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden', background: tc.background.surface }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontFamily.body, fontSize: '13px' }}>
              <thead>
                <tr style={{ background: tc.background.muted }}>
                  <th style={{ ...th, width: 36 }} />
                  <th style={th}>Recommendation</th>
                  <th style={th}>Type</th>
                  <th style={th}>Target page</th>
                  <th style={th}>Status</th>
                  <th style={thR}><Term def={QUEUE_SCORE_TOOLTIP}>Score</Term></th>
                  <th style={thR}>Actions</th>
                  <th style={thR}>Details</th>
                </tr>
              </thead>
              <tbody>
                {pageGroups.map((g) => {
                  const isOpen = expanded.has(g.key);
                  return (
                    <React.Fragment key={g.key}>
                      <CandidateRow
                        c={g.rep}
                        tc={tc}
                        selected={selectedIds.has(g.rep.candidate_id)}
                        busy={bulkBusy || busyIds.has(g.rep.candidate_id)}
                        onToggle={toggleSelected}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                      {g.alts.length > 0 && (
                        <tr style={{ borderTop: `1px solid ${tc.border.subtle}` }}>
                          <td colSpan={8} style={{ padding: '6px 12px', background: tc.background.muted }}>
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
                      {isOpen && g.alts.map((alt) => (
                        <CandidateRow
                          key={alt.candidate_id}
                          c={alt}
                          tc={tc}
                          isAlt
                          selected={selectedIds.has(alt.candidate_id)}
                          busy={bulkBusy || busyIds.has(alt.candidate_id)}
                          onToggle={toggleSelected}
                          onApprove={handleApprove}
                          onReject={handleReject}
                        />
                      ))}
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

      {selectedCandidates.length > 0 && (
        <div
          style={{ position: 'sticky', bottom: space['4'], marginTop: space['4'], border: `1px solid ${tc.border.default}`, borderRadius: radius.md, background: tc.background.surface, boxShadow: '0 16px 40px rgba(15,23,42,0.18)', padding: space['3'], display: 'flex', gap: space['3'], alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', zIndex: 5 }}
          data-testid="bar-bulk-actions"
        >
          <div style={{ fontFamily: fontFamily.body, fontSize: '13px', color: tc.text.secondary }}>
            <strong style={{ color: tc.text.primary }}>{fmtInt(selectedCandidates.length)} selected</strong>
            {' '}— {fmtInt(selectedLivePublishCount)} publish live, {fmtInt(selectedDraftCount)} queue as drafts
          </div>
          <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${tc.border.default}`, background: tc.background.surface, color: tc.text.primary, fontFamily: fontFamily.body, fontSize: '13px', cursor: bulkBusy ? 'default' : 'pointer' }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkReject}
              disabled={bulkBusy}
              data-testid="button-bulk-reject"
              style={{ padding: '8px 12px', borderRadius: radius.sm, border: `1px solid ${PALETTE.bad}`, background: tc.background.surface, color: PALETTE.bad, fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: bulkBusy ? 'default' : 'pointer' }}
            >
              Reject {fmtInt(selectedCandidates.length)} selected
            </button>
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={bulkBusy}
              data-testid="button-bulk-approve-selected"
              style={{ padding: '8px 12px', borderRadius: radius.sm, border: 'none', background: PALETTE.good, color: '#fff', fontFamily: fontFamily.body, fontSize: '13px', fontWeight: fontWeight.medium, cursor: bulkBusy ? 'default' : 'pointer' }}
            >
              Approve {fmtInt(selectedCandidates.length)} selected
            </button>
          </div>
        </div>
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
