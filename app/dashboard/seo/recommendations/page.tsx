'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet } from '../../../../design/tokens/colors';
import {
  getEngineRecommendations,
  getEngineRecommendationDetail,
  getPhase1Recommendations,
  getPhase1RecommendationDetail,
  getPhase1Suppressed,
  approveEngineCandidate,
  rejectEngineCandidate,
} from '../../../../lib/seoApi';
import type {
  EngineRecommendationSection,
  EngineRecommendationCard,
  EngineRecommendationDetail,
} from '../../../../lib/seoApi';

// =============================================================================
// Plain English helpers
// =============================================================================

function plainEnglishTitle(card: EngineRecommendationCard): string {
  const cluster = card.topic_cluster || 'this page';
  switch (card.primary_remedy) {
    case 'metadata_ctr_optimization': return `Fix the title & description for ${cluster}`;
    case 'strengthen_existing_page': return `Strengthen the ${cluster} page`;
    case 'create_new_page': return `Create a new page for ${cluster}`;
    case 'add_internal_links': return `Add internal links for ${cluster}`;
    case 'pursue_backlinks': return `Build backlinks for ${cluster}`;
    default: return card.recommendation_title || `SEO action for ${cluster}`;
  }
}

function plainEnglishRemedy(remedy: string): string {
  switch (remedy) {
    case 'metadata_ctr_optimization': return 'Fix title & description';
    case 'strengthen_existing_page': return 'Improve existing page';
    case 'create_new_page': return 'Create new page';
    case 'add_internal_links': return 'Add internal links';
    case 'pursue_backlinks': return 'Build backlinks';
    case 'maintain_paid_support': return 'Maintain paid support';
    default: return remedy.replace(/_/g, ' ');
  }
}

function mutationTypeLabel(mt: string | null): string {
  switch (mt) {
    case 'meta_description_update': return 'Meta description';
    case 'title_tag_refinement': return 'Title tag';
    case 'internal_link_insertion': return 'Internal link';
    default: return mt?.replace(/_/g, ' ') || 'Change';
  }
}

// =============================================================================
// Proposed value validation
// =============================================================================

const INVALID_PROPOSED_VALUES = new Set([
  'improve_ctr', 'strengthen_page', 'add_internal_links',
  'create_new_page', 'pursue_backlinks',
  'strengthen_existing_page', 'metadata_ctr_optimization',
  'see_recommendation',
]);

function isValidProposedValue(value: string | null | undefined, mutationType: string): boolean {
  if (!value) return false;
  if (INVALID_PROPOSED_VALUES.has(value)) return false;
  if ((mutationType === 'meta_description_update' || mutationType === 'title_tag_refinement') && value.length < 20) return false;
  return true;
}

function cardHasValidContent(card: EngineRecommendationCard): boolean {
  // Heuristic: low score + non-high confidence likely has invalid proposed values
  if ((card.recommendation_quality_score ?? 0) < 3.0 && card.data_confidence !== 'high') return false;
  return true;
}

type ShowFilter = 'needs_action' | 'approved' | 'all';

function cardNeedsAction(card: EngineRecommendationCard): boolean {
  const badge = card.action_state_badge || 'recommendation';
  return ['recommendation', 'candidate_generated', 'awaiting_approval'].includes(badge);
}

function cardIsApproved(card: EngineRecommendationCard): boolean {
  const badge = card.action_state_badge || '';
  return ['approved', 'published'].includes(badge);
}

// =============================================================================
// Accent colors
// =============================================================================

const URGENCY_BORDER: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#D1D5DB',
};

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  published: { bg: '#d1fae5', text: '#065f46', label: 'Published' },
  approved: { bg: '#FEF3C7', text: '#92400e', label: 'Approved — awaiting execution' },
  rolled_back: { bg: '#fee2e2', text: '#991b1b', label: 'Rolled back' },
  rejected: { bg: '#fee2e2', text: '#991b1b', label: 'Rejected' },
};

// =============================================================================
// Main component
// =============================================================================

function RecommendationsContent() {
  const tc = useThemeColors();

  // Data
  const [sections, setSections] = useState<EngineRecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [showFilter, setShowFilter] = useState<ShowFilter>('needs_action');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Expansion + detail cache
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Map<string, EngineRecommendationDetail>>(new Map());
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Bulk approve
  const [bulkInProgress, setBulkInProgress] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResult, setBulkResult] = useState<{ approved: number; failed: number } | null>(null);

  // Action feedback per card
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPhase1Recommendations();
      setSections(data.sections ?? []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  // ── Flatten sections into card list ────────────────────────────────────
  const allCards = useMemo(() => {
    const cards: EngineRecommendationCard[] = [];
    for (const s of sections) {
      for (const item of s.items) {
        if (!cards.some(c => c.opportunity_id === item.opportunity_id)) {
          cards.push(item);
        }
      }
    }
    return cards;
  }, [sections]);

  // ── Filtered cards ─────────────────────────────────────────────────────
  const filteredCards = useMemo(() => {
    let result = allCards;
    if (showFilter === 'needs_action') result = result.filter(cardNeedsAction);
    else if (showFilter === 'approved') result = result.filter(cardIsApproved);
    if (urgencyFilter !== 'all') result = result.filter(c => c.urgency_band === urgencyFilter);
    if (typeFilter !== 'all') result = result.filter(c => c.primary_remedy === typeFilter);
    return result;
  }, [allCards, showFilter, urgencyFilter, typeFilter]);

  const pendingCount = allCards.filter(cardNeedsAction).length;

  // ── Bulk eligible ──────────────────────────────────────────────────────
  const bulkEligible = useMemo(() =>
    allCards.filter(c =>
      cardNeedsAction(c) &&
      c.data_confidence === 'high' &&
      (c.recommendation_quality_score ?? 0) >= 6.0 &&
      (c.action_state_badge === 'awaiting_approval' || c.action_state_badge === 'candidate_generated')
    ),
    [allCards]
  );

  // ── Expand / detail fetch ──────────────────────────────────────────────
  const handleExpand = useCallback(async (card: EngineRecommendationCard) => {
    const id = card.opportunity_id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (detailCache.has(id)) return;
    setDetailLoading(id);
    try {
      const detail = await getPhase1RecommendationDetail(id);
      if (detail) {
        setDetailCache(prev => new Map(prev).set(id, detail as unknown as EngineRecommendationDetail));
      }
    } catch { /* detail fetch failed — expanded view will show limited data */ }
    setDetailLoading(null);
  }, [expandedId, detailCache]);

  // ── Approve / Reject ───────────────────────────────────────────────────
  const handleApprove = useCallback(async (card: EngineRecommendationCard, candidateId?: string | null) => {
    setActionLoading(card.opportunity_id);
    try {
      if (candidateId) {
        await approveEngineCandidate({ candidate_id: candidateId });
      } else {
        await approveEngineCandidate({ opportunity_id: card.opportunity_id });
      }
      // Refresh this card's detail
      try {
        const detail = await getPhase1RecommendationDetail(card.opportunity_id);
        if (detail) {
          setDetailCache(prev => new Map(prev).set(card.opportunity_id, detail as unknown as EngineRecommendationDetail));
        }
      } catch { /* refresh failed */ }
      // Update card in sections
      setSections(prev => prev.map(s => ({
        ...s,
        items: s.items.map(c => c.opportunity_id === card.opportunity_id
          ? { ...c, action_state_badge: 'approved', approval_status: 'approved', execution_status: 'approved' }
          : c
        ),
      })));
    } catch (err) {
      console.error('Approve failed:', err);
    }
    setActionLoading(null);
  }, []);

  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleReject = useCallback(async (card: EngineRecommendationCard, candidateId?: string | null) => {
    setActionLoading(card.opportunity_id);
    setRejectError(null);
    try {
      if (candidateId) {
        await rejectEngineCandidate({ candidate_id: candidateId });
      } else {
        await rejectEngineCandidate({ opportunity_id: card.opportunity_id });
      }
      setSections(prev => prev.map(s => ({
        ...s,
        items: s.items.map(c => c.opportunity_id === card.opportunity_id
          ? { ...c, action_state_badge: 'rejected', approval_status: 'rejected', execution_status: 'rejected' }
          : c
        ),
      })));
    } catch (err) {
      console.error('Reject failed:', err);
      setRejectError(card.opportunity_id);
    }
    setActionLoading(null);
  }, []);

  // ── Bulk approve ───────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async () => {
    setBulkInProgress(true);
    setBulkResult(null);
    const eligible = bulkEligible;
    setBulkProgress({ current: 0, total: eligible.length });
    let approved = 0;
    let failed = 0;
    for (let i = 0; i < eligible.length; i++) {
      setBulkProgress({ current: i + 1, total: eligible.length });
      try {
        const card = eligible[i];
        const candidateId = card.candidate_id;
        if (candidateId) {
          await approveEngineCandidate({ candidate_id: candidateId });
        } else {
          await approveEngineCandidate({ opportunity_id: card.opportunity_id });
        }
        setSections(prev => prev.map(s => ({
          ...s,
          items: s.items.map(c => c.opportunity_id === card.opportunity_id
            ? { ...c, action_state_badge: 'approved', approval_status: 'approved', execution_status: 'approved' }
            : c
          ),
        })));
        approved++;
      } catch {
        failed++;
      }
    }
    setBulkResult({ approved, failed });
    setBulkInProgress(false);
  }, [bulkEligible]);

  // ── Styles ─────────────────────────────────────────────────────────────
  const toggleBtn = (active: boolean): React.CSSProperties => ({
    padding: `${space['1.5']} ${space['3']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.semibold : fontWeight.normal,
    color: active ? tc.text.primary : tc.text.muted,
    backgroundColor: active ? tc.background.muted : 'transparent',
    border: `1px solid ${active ? tc.border.default : 'transparent'}`,
    borderRadius: radius.md,
    cursor: 'pointer',
  });

  if (loading) return <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading recommendations...</div>;
  if (error) return <div style={{ padding: space['6'], color: tc.text.primary, fontFamily: fontFamily.body }}>Failed to load: {error}</div>;

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: space['4'] }}>
        <h1 style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }} data-testid="text-recommendations-title">
          SEO Recommendations
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted, marginTop: space['1'] }}>
          Review and approve changes before they go live on your website
        </p>
      </div>

      {/* Sticky action bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${space['3']} ${space['4']}`,
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        marginBottom: space['4'],
      }} data-testid="bar-sticky-actions">
        <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.secondary }}>
          {pendingCount > 0
            ? `${pendingCount} recommendation${pendingCount === 1 ? '' : 's'} need${pendingCount === 1 ? 's' : ''} your decision`
            : 'No pending recommendations'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: space['3'] }}>
          {bulkResult && (
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: bulkResult.failed > 0 ? '#991b1b' : '#065f46' }}>
              {bulkResult.approved} approved{bulkResult.failed > 0 ? ` · ${bulkResult.failed} failed` : ''}
            </span>
          )}
          {bulkEligible.length > 0 && !bulkInProgress && (
            <button
              onClick={handleBulkApprove}
              style={{
                padding: `${space['2']} ${space['4']}`,
                fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
                color: '#92400e', backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B', borderRadius: radius.md, cursor: 'pointer',
              }}
              data-testid="button-bulk-approve"
            >
              Approve all high-confidence ({bulkEligible.length})
            </button>
          )}
          {bulkInProgress && (
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#92400e', fontWeight: fontWeight.medium }}>
              Approving {bulkProgress.current} of {bulkProgress.total}...
            </span>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['3'], alignItems: 'center', marginBottom: space['4'] }}>
        <div style={{ display: 'flex', gap: space['1'] }}>
          {(['needs_action', 'approved', 'all'] as ShowFilter[]).map(f => (
            <button key={f} onClick={() => setShowFilter(f)} style={toggleBtn(showFilter === f)}>
              {f === 'needs_action' ? 'Needs action' : f === 'approved' ? 'Approved' : 'All'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: space['1'] }}>
          {['all', 'high', 'medium', 'low'].map(u => (
            <button key={u} onClick={() => setUrgencyFilter(u)} style={toggleBtn(urgencyFilter === u)}>
              {u === 'all' ? 'All urgency' : u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: `${space['1.5']} ${space['3']}`,
            fontFamily: fontFamily.body, fontSize: fontSize.sm,
            color: tc.text.primary, backgroundColor: tc.background.surface,
            border: `1px solid ${tc.border.default}`, borderRadius: radius.md,
          }}
        >
          <option value="all">All types</option>
          <option value="metadata_ctr_optimization">Fix title &amp; description</option>
          <option value="strengthen_existing_page">Improve existing page</option>
          <option value="create_new_page">Create new page</option>
          <option value="add_internal_links">Add internal links</option>
          <option value="pursue_backlinks">Build backlinks</option>
        </select>
      </div>

      {/* Empty states */}
      {filteredCards.length === 0 && (
        <div style={{ padding: space['8'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, textAlign: 'center' }}>
          {showFilter === 'needs_action' ? (
            <>
              <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'] }}>You&rsquo;re all caught up</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>No recommendations waiting for your decision</div>
              <button onClick={() => setShowFilter('all')} style={{ marginTop: space['3'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: violet[500], background: 'none', border: 'none', cursor: 'pointer' }}>Switch to &lsquo;All&rsquo; to see the full history</button>
            </>
          ) : showFilter === 'approved' ? (
            <>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, fontWeight: fontWeight.medium, color: tc.text.secondary }}>No approved recommendations yet</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['1'] }}>Approve recommendations above to see them here</div>
            </>
          ) : (
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.base, color: tc.text.muted }}>No recommendations match your filters</div>
          )}
        </div>
      )}

      {/* Card list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space['3'] }}>
        {filteredCards.map(card => {
          const isExpanded = expandedId === card.opportunity_id;
          const detail = detailCache.get(card.opportunity_id);
          const isLoadingDetail = detailLoading === card.opportunity_id;
          const isActionLoading = actionLoading === card.opportunity_id;
          const badge = card.action_state_badge || 'recommendation';
          const needsAction = cardNeedsAction(card);
          const statusPill = STATUS_PILL[badge];
          const borderColor = statusPill ? '#10b981' : URGENCY_BORDER[card.urgency_band] || URGENCY_BORDER.low;
          const hasCandidate = card.candidate_id != null;
          const isAwaiting = badge === 'awaiting_approval';

          return (
            <div
              key={card.opportunity_id}
              style={{
                backgroundColor: tc.background.surface,
                border: `1px solid ${tc.border.default}`,
                borderLeft: `3px solid ${borderColor}`,
                borderRadius: radius.lg,
                overflow: 'hidden',
              }}
              data-testid={`card-rec-${card.opportunity_id}`}
            >
              {/* ── Collapsed view ──────────────────────────────────── */}
              <div
                onClick={() => handleExpand(card)}
                style={{ padding: space['4'], cursor: 'pointer' }}
              >
                {/* ROW 1 — Headline */}
                <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug, marginBottom: space['1'] }}>
                  {plainEnglishTitle(card)}
                </div>

                {/* ROW 2 — Summary */}
                <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed, marginBottom: space['2'], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {card.recommendation_summary}
                </div>

                {/* Coverage warning */}
                {card.coverage_validated === false && card.recommendation_source === 'cluster_engine' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: space['1.5'], backgroundColor: '#FEF3C7', borderLeft: '3px solid #F59E0B', borderRadius: 0, padding: `${space['1.5']} ${space['2.5']}`, marginBottom: space['2'], fontSize: fontSize.sm, color: '#92400e', fontFamily: fontFamily.body }}>
                    Verify no existing page before actioning
                  </div>
                )}

                {/* ROW 3+4 — Chips + actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: space['2'] }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['1.5'], alignItems: 'center' }}>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                      Score {Number(card.total_opportunity_score).toFixed(1)}
                    </span>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: card.urgency_band === 'high' ? '#991b1b' : tc.text.muted }}>
                      {card.urgency_band}
                    </span>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                      {card.topic_cluster}
                    </span>
                    {card.gsc_impressions != null && card.gsc_impressions > 0 && (
                      <>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.muted }}>
                          {Number(card.gsc_impressions).toLocaleString()} imp
                        </span>
                      </>
                    )}
                    {card.recommendation_quality_score != null && (
                      <>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: (card.recommendation_quality_score ?? 0) >= 7 ? '#065f46' : tc.text.muted }}>
                          Quality {Number(card.recommendation_quality_score).toFixed(1)}
                        </span>
                      </>
                    )}
                    {card.source_freshness_label === 'stale' && (
                      <>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: '#92400e' }}>Aging — review priority</span>
                      </>
                    )}
                    {card.source_freshness_label === 'expired' && (
                      <>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>&middot;</span>
                        <span style={{ fontFamily: fontFamily.body, fontSize: '12px', color: '#991b1b' }}>May be outdated</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: space['2'], alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {rejectError === card.opportunity_id && (
                      <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: '#991b1b' }}>Failed — try again</span>
                    )}
                    {statusPill ? (
                      <span style={{ display: 'inline-block', padding: `${space['0.5']} ${space['2.5']}`, borderRadius: radius.full, fontSize: fontSize.sm, fontWeight: fontWeight.medium, backgroundColor: statusPill.bg, color: statusPill.text, fontFamily: fontFamily.body }}>
                        {statusPill.label}
                      </span>
                    ) : needsAction && (isAwaiting || hasCandidate) ? (
                      cardHasValidContent(card) ? (
                        <>
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleApprove(card, card.candidate_id)}
                            style={{ padding: `${space['1']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#fff', backgroundColor: '#059669', border: 'none', borderRadius: radius.md, cursor: isActionLoading ? 'wait' : 'pointer', opacity: isActionLoading ? 0.6 : 1 }}
                          >
                            {isActionLoading ? '...' : '✓ Approve'}
                          </button>
                          <button
                            disabled={isActionLoading}
                            onClick={() => handleReject(card, card.candidate_id)}
                            style={{ padding: `${space['1']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#991b1b', backgroundColor: '#fee2e2', border: 'none', borderRadius: radius.md, cursor: isActionLoading ? 'wait' : 'pointer', opacity: isActionLoading ? 0.6 : 1 }}
                          >
                            ✗ Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleExpand(card)}
                          style={{ padding: `${space['1']} ${space['3']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#92400e', backgroundColor: '#FEF3C7', border: 'none', borderRadius: radius.md, cursor: 'pointer' }}
                        >
                          Review required
                        </button>
                      )
                    ) : (
                      <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: violet[500] }}>
                        Review &rarr;
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Expanded view ──────────────────────────────────── */}
              {isExpanded && (
                <ExpandedCard
                  card={card}
                  detail={detail ?? null}
                  isLoading={isLoadingDetail}
                  isActionLoading={isActionLoading}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  tc={tc}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Proposed copy generator
// =============================================================================

function generateProposedCopy(topicCluster: string): { title: string; metaDescription: string } {
  const tc = topicCluster.replace(/\b\w/g, c => c.toUpperCase());
  return {
    title: `${tc} | Custom LED Neon Signs | Neon Signs Depot`,
    metaDescription: `Shop ${topicCluster.toLowerCase()} at Neon Signs Depot. Browse custom LED neon signs — free design consultation, free shipping & 2-year warranty. Order online today.`,
  };
}

function charCountLabel(value: string, type: 'title' | 'meta'): { text: string; color: string } {
  const len = value.length;
  if (type === 'title') {
    if (len < 30) return { text: `Too short (${len} chars)`, color: '#92400e' };
    if (len <= 60) return { text: `Good length (${len} chars)`, color: '#065f46' };
    return { text: `Too long — may be truncated (${len} chars)`, color: '#991b1b' };
  }
  if (len < 120) return { text: `Too short (${len} chars)`, color: '#92400e' };
  if (len <= 160) return { text: `Good length (${len} chars)`, color: '#065f46' };
  return { text: `Too long — may be truncated (${len} chars)`, color: '#991b1b' };
}

// =============================================================================
// Expanded card (inline detail)
// =============================================================================

function ExpandedCard({
  card,
  detail,
  isLoading,
  isActionLoading,
  onApprove,
  onReject,
  tc,
}: {
  card: EngineRecommendationCard;
  detail: EngineRecommendationDetail | null;
  isLoading: boolean;
  isActionLoading: boolean;
  onApprove: (card: EngineRecommendationCard, candidateId?: string | null) => Promise<void>;
  onReject: (card: EngineRecommendationCard, candidateId?: string | null) => Promise<void>;
  tc: ReturnType<typeof useThemeColors>;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const needsAction = cardNeedsAction(card);
  const badge = card.action_state_badge || 'recommendation';
  const statusPill = STATUS_PILL[badge];
  const candidates = detail?.execution_candidates ?? [];
  const p1 = detail as any; // Phase1DetailResponse fields

  const isMetadataRemedy = card.primary_remedy === 'metadata_ctr_optimization';
  const generatedCopy = generateProposedCopy(card.topic_cluster || 'neon signs');

  if (isLoading) {
    return (
      <div style={{ padding: `${space['4']} ${space['5']}`, borderTop: `1px solid ${tc.border.default}`, color: tc.text.muted, fontFamily: fontFamily.body, fontSize: fontSize.sm }}>
        Loading detail...
      </div>
    );
  }

  // Build the change blocks to render
  type ChangeBlock = { label: string; currentValue: string; proposedValue: string; type: 'title' | 'meta'; isPreview: boolean };
  const changeBlocks: ChangeBlock[] = [];

  let invalidCandidateCount = 0;
  let validCandidateCount = 0;
  let has404Target = false;

  if (candidates.length > 0) {
    // Check for 404 target URLs
    has404Target = candidates.some(ec => (ec as any).target_url_validated === false);

    // Render from actual candidates — validate proposed_value
    for (const ec of candidates) {
      const mt = ec.mutation_type || '';
      const isTitleMutation = mt.includes('title');

      if (!isValidProposedValue(ec.proposed_value, mt)) {
        invalidCandidateCount++;
        const fallback = isTitleMutation ? generatedCopy.title : generatedCopy.metaDescription;
        const current = (ec as any).current_value_snapshot
          || (isTitleMutation ? p1?.current_seo_title : p1?.current_meta_description)
          || null;
        changeBlocks.push({
          label: mutationTypeLabel(ec.mutation_type),
          currentValue: current || 'Current value not retrieved',
          proposedValue: fallback,
          type: isTitleMutation ? 'title' : 'meta',
          isPreview: true,
        });
      } else {
        validCandidateCount++;
        const current = (ec as any).current_value_snapshot
          || (isTitleMutation ? p1?.current_seo_title : p1?.current_meta_description)
          || null;
        changeBlocks.push({
          label: mutationTypeLabel(ec.mutation_type),
          currentValue: current || 'Current value not retrieved',
          proposedValue: ec.proposed_value!,
          type: isTitleMutation ? 'title' : 'meta',
          isPreview: false,
        });
      }
    }
  }

  // Only block approval if ALL candidates have invalid content (not just some)
  const hasInvalidContent = candidates.length > 0 && validCandidateCount === 0 && invalidCandidateCount > 0;
  // Block approval if target URL is a 404
  const isBlocked = hasInvalidContent || has404Target; else if (isMetadataRemedy) {
    // No candidates yet — generate preview for both title and meta
    changeBlocks.push({
      label: 'Title tag',
      currentValue: p1?.current_seo_title || 'Current value not retrieved',
      proposedValue: generatedCopy.title,
      type: 'title',
      isPreview: true,
    });
    changeBlocks.push({
      label: 'Meta description',
      currentValue: p1?.current_meta_description || 'Current value not retrieved',
      proposedValue: generatedCopy.metaDescription,
      type: 'meta',
      isPreview: true,
    });
  }

  // For non-metadata remedies, build a current state + proposed action pair
  const targetPage = card.nsd_page_url?.replace('https://neonsignsdepot.com', '') || p1?.current_page_url?.replace('https://neonsignsdepot.com', '') || '';
  const targetPageFull = card.nsd_page_url || p1?.current_page_url || p1?.phase1_recommended_target_page || null;
  const cluster = card.topic_cluster || 'this topic';
  const posLabel = card.gsc_best_position != null ? `position ${Number(card.gsc_best_position).toFixed(1)}` : null;
  const impLabel = card.gsc_impressions != null ? `${Number(card.gsc_impressions).toLocaleString()} impressions` : null;

  type NonMetaBlock = { currentState: string; proposedAction: string } | null;
  const nonMetaBlock: NonMetaBlock = (() => {
    if (changeBlocks.length > 0) return null;
    switch (card.primary_remedy) {
      case 'strengthen_existing_page': {
        const parts = [`Current page: ${targetPageFull || targetPage || 'unknown'}`];
        if (posLabel || impLabel) parts.push(`Currently ranking: ${[posLabel, `for '${cluster}'`, impLabel ? `with ${impLabel}` : ''].filter(Boolean).join(' ')}`);
        return { currentState: parts.join('\n'), proposedAction: `The system will review ${targetPage || 'the page'} and generate updated content recommendations targeting '${cluster}' keywords.` };
      }
      case 'create_new_page':
        return {
          currentState: `No page exists for '${cluster}'${card.competitor_domain ? `\nCompetitors ranking: ${card.competitor_domain}${posLabel ? ` at ${posLabel}` : ''}` : ''}`,
          proposedAction: `The system will generate a content brief for a new page targeting '${cluster}' and create a WordPress draft for your review.`,
        };
      case 'add_internal_links':
        return {
          currentState: `Current internal links to this topic: 0 detected${targetPageFull ? `\nTarget page: ${targetPageFull}` : ''}`,
          proposedAction: `The system will identify pages on your site that mention '${cluster}' and add links pointing to ${targetPage || 'the target page'}.`,
        };
      case 'pursue_backlinks':
        return {
          currentState: `Current backlink profile for '${cluster}'${card.competitor_referring_domains ? `: competitor has ${card.competitor_referring_domains} referring domains` : ''}`,
          proposedAction: `The system will identify backlink opportunities from competitor domains ranking for '${cluster}'.`,
        };
      default:
        return { currentState: `Topic: ${cluster}`, proposedAction: `This recommendation targets '${cluster}' for SEO improvement.` };
    }
  })();

  // Helper to render a single change block
  const renderChangeBlock = (block: ChangeBlock, i: number) => {
    const charInfo = charCountLabel(block.proposedValue, block.type);
    const currentMissing = block.currentValue === 'Current value not retrieved';
    return (
      <div key={i} style={{ marginBottom: space['3'], border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
        <div style={{ padding: `${space['2']} ${space['3']}`, backgroundColor: tc.background.muted, fontFamily: fontFamily.body, fontSize: '12px', fontWeight: fontWeight.medium, color: tc.text.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {block.label}
        </div>
        {/* CURRENT */}
        <div style={{ padding: space['3'] }}>
          <div style={{ fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'], fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: '0.03em' }}>CURRENT</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: currentMissing ? tc.text.placeholder : tc.text.secondary, fontStyle: currentMissing ? 'italic' : 'normal', lineHeight: lineHeight.relaxed }}>
            {block.currentValue}
          </div>
          {currentMissing && <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.placeholder, marginTop: space['0.5'] }}>Values shown at execution time</div>}
        </div>
        {/* PROPOSED */}
        <div style={{ padding: space['3'], borderLeft: '3px solid #10b981', borderTop: `1px solid ${tc.border.default}` }}>
          <div style={{ fontSize: '11px', color: '#065f46', marginBottom: space['0.5'], fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: '0.03em' }}>PROPOSED</div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, fontWeight: fontWeight.medium, lineHeight: lineHeight.relaxed }}>
            {block.proposedValue}
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: charInfo.color, marginTop: space['1'] }}>{charInfo.text}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: `0 ${space['5']} ${space['5']}`, borderTop: `1px solid ${tc.border.default}` }}>

      {/* BLOCK 1 — Why this matters */}
      <div style={{ marginTop: space['4'], marginBottom: space['4'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'] }}>Why this matters</div>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
          {detail?.recommendation_reason || card.recommendation_reason || card.recommendation_summary}
        </div>
      </div>

      {/* BLOCK 2 — What will change */}
      <div style={{ marginBottom: space['4'] }}>
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['2'] }}>
          What will change on your website
        </div>

        {has404Target && (
          <div style={{ padding: space['3'], backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: radius.md, marginBottom: space['3'] }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#991b1b', marginBottom: space['1'] }}>
              Target page not found (404)
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#7f1d1d' }}>
              This recommendation targets a URL that returned a 404. It should be rejected.
            </div>
          </div>
        )}

        {hasInvalidContent && !has404Target && (
          <div style={{ padding: space['3'], backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: radius.md, marginBottom: space['3'] }}>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#991b1b', marginBottom: space['1'] }}>
              Content not yet generated
            </div>
            <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#7f1d1d' }}>
              This recommendation needs copy generated before it can be approved. The proposed value shown below is a preview — the actual content will be generated at execution time.
            </div>
          </div>
        )}

        {changeBlocks.length > 0 && (
          <>
            {changeBlocks.map((block, i) => renderChangeBlock(block, i))}
            {changeBlocks.some(b => b.isPreview) && (
              <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.placeholder, fontStyle: 'italic', marginTop: space['1'] }}>
                * Exact copy generated at execution time — this is a preview
              </div>
            )}
          </>
        )}

        {nonMetaBlock && (
          <div style={{ border: `1px solid ${tc.border.default}`, borderRadius: radius.md, overflow: 'hidden' }}>
            <div style={{ padding: space['3'] }}>
              <div style={{ fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'], fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: '0.03em' }}>CURRENT STATE</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, lineHeight: lineHeight.relaxed, whiteSpace: 'pre-line' }}>
                {nonMetaBlock.currentState}
              </div>
            </div>
            <div style={{ padding: space['3'], borderTop: `1px solid ${tc.border.default}`, borderLeft: '3px solid #10b981' }}>
              <div style={{ fontSize: '11px', color: '#065f46', marginBottom: space['0.5'], fontWeight: fontWeight.medium, textTransform: 'uppercase', letterSpacing: '0.03em' }}>WHAT WILL CHANGE</div>
              <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, fontWeight: fontWeight.medium, lineHeight: lineHeight.relaxed }}>
                {nonMetaBlock.proposedAction}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BLOCK 3 — Evidence (collapsible) */}
      <div style={{ marginBottom: space['4'] }}>
        <button
          onClick={() => setShowEvidence(!showEvidence)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, padding: 0 }}
        >
          {showEvidence ? 'Hide evidence ▴' : 'Show evidence ▾'}
        </button>
        {showEvidence && (
          <div style={{ marginTop: space['2'], padding: space['3'], backgroundColor: tc.background.muted, borderRadius: radius.md, fontSize: fontSize.sm, fontFamily: fontFamily.body, color: tc.text.secondary, lineHeight: lineHeight.relaxed }}>
            {card.evidence_summary_short && <div style={{ marginBottom: space['2'] }}>{card.evidence_summary_short}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: space['2'] }}>
              {card.ahrefs_search_volume != null && <div><span style={{ color: tc.text.muted }}>Search volume:</span> {Number(card.ahrefs_search_volume).toLocaleString()}</div>}
              {card.gsc_impressions != null && <div><span style={{ color: tc.text.muted }}>Impressions:</span> {Number(card.gsc_impressions).toLocaleString()}</div>}
              {card.gsc_best_position != null && <div><span style={{ color: tc.text.muted }}>Best position:</span> {Number(card.gsc_best_position).toFixed(1)}</div>}
              {card.ahrefs_keyword_difficulty != null && <div><span style={{ color: tc.text.muted }}>KD:</span> {card.ahrefs_keyword_difficulty}</div>}
              {card.competitor_domain && <div><span style={{ color: tc.text.muted }}>Competitor:</span> {card.competitor_domain}</div>}
              {card.nsd_page_url && <div><span style={{ color: tc.text.muted }}>NSD page:</span> {card.nsd_page_url.replace('https://neonsignsdepot.com', '')}</div>}
            </div>
            {card.confidence_reason && <div style={{ marginTop: space['2'], fontSize: '12px', color: tc.text.placeholder }}>{card.confidence_reason}</div>}
          </div>
        )}
      </div>

      {/* BLOCK 4 — Actions */}
      {needsAction && !statusPill && (
        <div style={{ marginBottom: space['4'] }}>
          {!showNotes && (
            <button onClick={() => setShowNotes(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, padding: 0, marginBottom: space['2'] }}>
              Add a note...
            </button>
          )}
          {showNotes && (
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional review notes..."
              style={{ width: '100%', padding: space['2'], fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md, marginBottom: space['2'], resize: 'vertical', minHeight: '60px' }}
            />
          )}
          {actionError && (
            <div style={{ padding: `${space['2']} ${space['3']}`, backgroundColor: '#fee2e2', borderRadius: radius.md, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#991b1b', marginBottom: space['2'] }}>
              {actionError}
            </div>
          )}
          <button
            disabled={isActionLoading || isBlocked}
            title={has404Target ? 'Target page returned 404 — reject this recommendation' : hasInvalidContent ? 'Generate valid content before approving' : undefined}
            onClick={async () => {
              setActionError(null);
              const cid = candidates.find(c => c.awaiting_approval)?.candidate_id || card.candidate_id;
              try { await onApprove(card, cid); } catch { setActionError('Failed to approve — try again'); }
            }}
            style={{ width: '100%', padding: `${space['2.5']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#fff', backgroundColor: isBlocked ? '#9CA3AF' : '#059669', border: 'none', borderRadius: radius.md, cursor: isBlocked ? 'not-allowed' : isActionLoading ? 'wait' : 'pointer', opacity: (isActionLoading || isBlocked) ? 0.5 : 1, marginBottom: space['2'] }}
          >
            {isActionLoading ? 'Processing...' : has404Target ? 'Target page is 404 — reject instead' : hasInvalidContent ? 'Generate valid content before approving' : '✓ Approve this recommendation'}
          </button>
          <div style={{ textAlign: 'center' }}>
            {!rejectConfirm ? (
              <button
                disabled={isActionLoading}
                onClick={() => setRejectConfirm(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: '#991b1b' }}
              >
                ✗ Reject
              </button>
            ) : (
              <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>
                Confirm reject?{' '}
                <button
                  disabled={isActionLoading}
                  onClick={async () => {
                    setActionError(null);
                    const cid = candidates.find(c => c.awaiting_approval)?.candidate_id || card.candidate_id;
                    try { await onReject(card, cid); } catch { setActionError('Failed to reject — try again'); }
                    setRejectConfirm(false);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#991b1b' }}
                >
                  Yes, reject
                </button>
                {' '}
                <button
                  onClick={() => setRejectConfirm(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}
                >
                  Cancel
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {statusPill && (
        <div style={{ padding: `${space['2.5']} ${space['3']}`, backgroundColor: statusPill.bg, borderRadius: radius.md, fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: statusPill.text, marginBottom: space['3'] }}>
          {statusPill.label}
        </div>
      )}

      {/* BLOCK 5 — Measurement plan (if detail available) */}
      {detail && (detail as any).kpi_primary && (
        <div style={{ fontFamily: fontFamily.body, fontSize: '12px', color: tc.text.placeholder }}>
          Measuring success by: {(detail as any).kpi_primary} &middot; Baseline: {(detail as any).baseline_window_days ?? 14} days &middot; Measurement: {(detail as any).measurement_window_days ?? 30} days
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Page export
// =============================================================================

export default function RecommendationsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <RecommendationsContent />
    </DashboardGuard>
  );
}
