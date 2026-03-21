'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, indigo, magenta } from '../../../../design/tokens/colors';
import { Icon } from '../../../../design/components/Icon';
import { getEngineRecommendations, getEngineRecommendationDetail, approveEngineCandidate, rejectEngineCandidate } from '../../../../lib/seoApi';
import type { EngineRecommendationSection, EngineRecommendationCard, EngineRecommendationDetail } from '../../../../lib/seoApi';

const REMEDY_COLORS: Record<string, { bg: string; text: string }> = {
  create_new_page: { bg: '#dbeafe', text: '#1e40af' },
  strengthen_existing_page: { bg: '#d1fae5', text: '#065f46' },
  add_internal_links: { bg: '#e0e7ff', text: '#3730a3' },
  pursue_backlinks: { bg: '#fce7f3', text: '#9d174d' },
  maintain_paid_support: { bg: '#fef3c7', text: '#92400e' },
  metadata_ctr_optimization: { bg: '#f3e8ff', text: '#6b21a8' },
  hybrid: { bg: '#f0fdf4', text: '#166534' },
};

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: '#fee2e2', text: '#991b1b' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  low: { bg: '#f0f9ff', text: '#0c4a6e' },
};

const CONFIDENCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  low: { bg: '#fee2e2', text: '#991b1b' },
};

const FRESHNESS_COLORS: Record<string, { bg: string; text: string }> = {
  healthy: { bg: '#d1fae5', text: '#065f46' },
  stale: { bg: '#fef3c7', text: '#92400e' },
  expired: { bg: '#fee2e2', text: '#991b1b' },
};

const ACTION_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  recommendation: { bg: '#f5f5f5', text: '#525252', label: 'Recommendation' },
  candidate_generated: { bg: '#dbeafe', text: '#1e40af', label: 'Candidate Generated' },
  awaiting_approval: { bg: '#fef3c7', text: '#92400e', label: 'Awaiting Approval' },
  approved: { bg: '#d1fae5', text: '#065f46', label: 'Approved' },
  published: { bg: '#a7f3d0', text: '#047857', label: 'Published' },
  rolled_back: { bg: '#fee2e2', text: '#991b1b', label: 'Rolled Back' },
};

function formatEvidenceShort(raw: string): string {
  return raw
    .replace(/\bSV:([\d,]+)/g, (_, v) => `Volume: ${v}`)
    .replace(/\bKD:([\d.]+)/g, (_, v) => `KD: ${v}`)
    .replace(/\bGSC:\s*([\d,]+)\s*imp\s*@\s*([\d.]+)/g, (_, imp, pos) => `GSC: ${imp} imp at pos ${pos}`)
    .replace(/\bAds:\s*\$?([\d,.]+)/g, (_, v) => `Ads: $${v}`)
    .replace(/\bConv:\s*([\d.]+)/g, (_, v) => `${v} conversions`)
    .replace(/\bComp:\s*([\w./:@-]+)/g, (_, v) => `vs ${v}`)
    .replace(/\s*→\s*/g, ' — ')
    .replace(/_/g, ' ');
}

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: `${space['0.5']} ${space['2']}`,
        borderRadius: radius.full,
        fontSize: fontSize.sm,
        fontWeight: fontWeight.medium,
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: fontFamily.body,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function RecommendationCardRow({
  card,
  onSelect,
  tc,
}: {
  card: EngineRecommendationCard;
  onSelect: (c: EngineRecommendationCard) => void;
  tc: ReturnType<typeof useThemeColors>;
}) {
  const remedyLabel = (card.primary_remedy || '').replace(/_/g, ' ');
  const remedyColor = REMEDY_COLORS[card.primary_remedy] || REMEDY_COLORS.hybrid;
  const urgencyColor = URGENCY_COLORS[card.urgency_band] || URGENCY_COLORS.medium;
  const confidenceColor = CONFIDENCE_COLORS[card.data_confidence] || CONFIDENCE_COLORS.medium;
  const freshnessColor = FRESHNESS_COLORS[card.source_freshness_label] || FRESHNESS_COLORS.stale;
  const actionBadge = ACTION_BADGE_STYLES[card.action_state_badge] || ACTION_BADGE_STYLES.recommendation;

  return (
    <div
      onClick={() => onSelect(card)}
      style={{
        padding: space['4'],
        backgroundColor: tc.background.surface,
        border: `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        transition: 'border-color 150ms',
        marginBottom: space['3'],
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = violet[400]; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = tc.border.default; }}
      data-testid={`card-recommendation-${card.opportunity_id}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space['3'], marginBottom: space['2'] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontFamily.display, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}>
            {card.recommendation_title}
          </div>
          <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['1'] }}>
            Score: {Number(card.total_opportunity_score).toFixed(2)} | Rank #{card.balanced_rank}{card.competitor_domain ? ` | vs ${card.competitor_domain}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: space['1'], flexShrink: 0 }}>
          <Badge label={actionBadge.label} colors={actionBadge} />
        </div>
      </div>

      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginBottom: space['3'], lineHeight: lineHeight.relaxed }}>
        {card.recommendation_summary}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['1.5'] }}>
        <Badge label={remedyLabel} colors={remedyColor} />
        <Badge label={`urgency: ${card.urgency_band}`} colors={urgencyColor} />
        <Badge label={`confidence: ${card.data_confidence}`} colors={confidenceColor} />
        <Badge label={`freshness: ${card.source_freshness_label}`} colors={freshnessColor} />
        {card.opportunity_family && <Badge label={card.opportunity_family} colors={{ bg: '#f5f5f5', text: '#525252' }} />}
      </div>

      {card.confidence_reason && (
        <div style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.placeholder, marginTop: space['1.5'], display: 'flex', alignItems: 'flex-start', gap: space['1'] }}>
          <Icon name="info" size={12} />
          <span>{card.confidence_reason}</span>
        </div>
      )}

      {card.evidence_summary_short && (
        <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginTop: space['2'], padding: `${space['1']} ${space['2']}`, backgroundColor: tc.background.muted, borderRadius: radius.md }}>
          {formatEvidenceShort(card.evidence_summary_short)}
        </div>
      )}
    </div>
  );
}

function DetailPanel({
  detail,
  onClose,
  onApprovalAction,
  tc,
}: {
  detail: EngineRecommendationDetail;
  onClose: () => void;
  onApprovalAction: (opportunityId: string, candidateId: string | null, action: 'approve' | 'reject') => Promise<void>;
  tc: ReturnType<typeof useThemeColors>;
}) {
  const fieldLabel: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    color: tc.text.muted,
    marginBottom: space['0.5'],
  };
  const fieldValue: React.CSSProperties = {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: tc.text.primary,
    marginBottom: space['4'],
  };
  const actionBadge = ACTION_BADGE_STYLES[detail.action_state_badge] || ACTION_BADGE_STYLES.recommendation;
  const remedyLabel = (detail.primary_remedy || '').replace(/_/g, ' ');
  const remedyColor = REMEDY_COLORS[detail.primary_remedy] || REMEDY_COLORS.hybrid;

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
      data-testid="panel-recommendation-detail"
    >
      <div
        style={{ width: '560px', maxWidth: '100vw', backgroundColor: tc.background.surface, height: '100%', overflow: 'auto', borderLeft: `1px solid ${tc.border.default}`, padding: space['6'] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['6'] }}>
          <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }}>
            Opportunity Detail
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: tc.text.muted, padding: space['1'] }} data-testid="button-close-detail-panel">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['2'], marginBottom: space['6'] }}>
          <Badge label={actionBadge.label} colors={actionBadge} />
          <Badge label={remedyLabel} colors={remedyColor} />
          <Badge label={`urgency: ${detail.urgency_band}`} colors={URGENCY_COLORS[detail.urgency_band] || URGENCY_COLORS.medium} />
          <Badge label={`confidence: ${detail.data_confidence}`} colors={CONFIDENCE_COLORS[detail.data_confidence] || CONFIDENCE_COLORS.medium} />
          <Badge label={`freshness: ${detail.source_freshness_label}`} colors={FRESHNESS_COLORS[detail.source_freshness_label] || FRESHNESS_COLORS.stale} />
        </div>

        <div style={{ marginBottom: space['6'] }}>
          <p style={fieldLabel}>Recommendation</p>
          <p style={{ ...fieldValue, lineHeight: lineHeight.relaxed }}>{detail.recommendation_summary}</p>

          <p style={fieldLabel}>Reason</p>
          <p style={fieldValue}>{detail.recommendation_reason}</p>

          <p style={fieldLabel}>Topic Cluster</p>
          <p style={fieldValue}>{detail.topic_cluster}</p>

          {detail.nsd_page_url && (
            <>
              <p style={fieldLabel}>NSD Page</p>
              <p style={{ ...fieldValue, wordBreak: 'break-all' }}>{detail.nsd_page_url}</p>
            </>
          )}

          {detail.nsd_ranking_page && detail.nsd_ranking_page !== detail.nsd_page_url && (
            <>
              <p style={fieldLabel}>NSD Ranking Page</p>
              <p style={{ ...fieldValue, wordBreak: 'break-all' }}>{detail.nsd_ranking_page}</p>
            </>
          )}

          {detail.competitor_domain && (
            <>
              <p style={fieldLabel}>Competitor</p>
              <p style={fieldValue}>
                {detail.competitor_domain}
                {detail.primary_subject && detail.primary_subject.startsWith('http') && detail.primary_subject.includes(detail.competitor_domain) && (
                  <span style={{ display: 'block', fontSize: fontSize.sm, color: tc.text.muted, wordBreak: 'break-all', marginTop: space['0.5'] }}>
                    Ranking page: {detail.primary_subject}
                  </span>
                )}
              </p>
            </>
          )}

          {detail.primary_subject && !detail.primary_subject.startsWith('http') && detail.primary_subject !== detail.topic_cluster && (
            <>
              <p style={fieldLabel}>Target Keyword</p>
              <p style={fieldValue}>{detail.primary_subject}</p>
            </>
          )}

          {detail.primary_subject && detail.primary_subject.startsWith('http') && (!detail.competitor_domain || !detail.primary_subject.includes(detail.competitor_domain)) && (
            <>
              <p style={fieldLabel}>Reference Page</p>
              <p style={{ ...fieldValue, wordBreak: 'break-all' }}>{detail.primary_subject}</p>
            </>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'], marginBottom: space['6'] }}>
          <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>Evidence</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['3'] }}>
            {detail.ahrefs_search_volume != null && (
              <div>
                <p style={fieldLabel}>Search Volume</p>
                <p style={fieldValue}>{Number(detail.ahrefs_search_volume).toLocaleString()}</p>
              </div>
            )}
            {detail.ahrefs_keyword_difficulty != null && (
              <div>
                <p style={fieldLabel}>Keyword Difficulty</p>
                <p style={fieldValue}>{detail.ahrefs_keyword_difficulty}</p>
              </div>
            )}
            {detail.ahrefs_cpc != null && (
              <div>
                <p style={fieldLabel}>CPC</p>
                <p style={fieldValue}>${Number(detail.ahrefs_cpc).toFixed(2)}</p>
              </div>
            )}
            {detail.gsc_impressions != null && (
              <div>
                <p style={fieldLabel}>GSC Impressions</p>
                <p style={fieldValue}>{Number(detail.gsc_impressions).toLocaleString()}</p>
              </div>
            )}
            {detail.gsc_best_position != null && (
              <div>
                <p style={fieldLabel}>Best Position</p>
                <p style={fieldValue}>{Number(detail.gsc_best_position).toFixed(1)}</p>
              </div>
            )}
            {detail.ads_cost != null && (
              <div>
                <p style={fieldLabel}>Ad Spend</p>
                <p style={fieldValue}>${Number(detail.ads_cost).toFixed(2)}</p>
              </div>
            )}
            {detail.ads_conversions != null && (
              <div>
                <p style={fieldLabel}>Ad Conversions</p>
                <p style={fieldValue}>{Number(detail.ads_conversions)}</p>
              </div>
            )}
            {detail.competitor_domain_rating != null && (
              <div>
                <p style={fieldLabel}>Competitor DR</p>
                <p style={fieldValue}>{Number(detail.competitor_domain_rating).toFixed(0)}</p>
              </div>
            )}
            {detail.competitor_referring_domains != null && (
              <div>
                <p style={fieldLabel}>Referring Domains</p>
                <p style={fieldValue}>{Number(detail.competitor_referring_domains).toLocaleString()}</p>
              </div>
            )}
            {detail.internal_link_signal_strength && (
              <div>
                <p style={fieldLabel}>Internal Link Signal</p>
                <p style={fieldValue}>{detail.internal_link_signal_strength}</p>
              </div>
            )}
          </div>

          {detail.confidence_reason && (
            <div style={{ marginTop: space['3'] }}>
              <p style={fieldLabel}>Confidence Reason</p>
              <p style={{ ...fieldValue, fontSize: fontSize.sm }}>{detail.confidence_reason}</p>
            </div>
          )}

          {detail.evidence_summary_short && (
            <div style={{ marginTop: space['2'], padding: `${space['2']} ${space['3']}`, backgroundColor: tc.background.muted, borderRadius: radius.md }}>
              <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, lineHeight: lineHeight.relaxed }}>{formatEvidenceShort(detail.evidence_summary_short)}</p>
            </div>
          )}
        </div>

        {detail.execution_candidates && detail.execution_candidates.length > 0 && (
          <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'] }}>
            <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>
              Execution Candidates ({detail.execution_candidates.length})
            </p>
            {detail.execution_candidates.map((ec, ecIdx) => {
              const ecStatus = ACTION_BADGE_STYLES[ec.execution_status || ''] || ACTION_BADGE_STYLES.recommendation;
              return (
                <div
                  key={ec.candidate_id || `ec-${ecIdx}`}
                  style={{
                    padding: space['3'],
                    border: `1px solid ${tc.border.subtle}`,
                    borderRadius: radius.md,
                    marginBottom: space['2'],
                    backgroundColor: tc.background.muted,
                  }}
                  data-testid={`execution-candidate-${ec.candidate_id}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['1'] }}>
                    <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.primary }}>
                      {(ec.mutation_type || '').replace(/_/g, ' ')}
                    </span>
                    <Badge label={ec.execution_status || 'unknown'} colors={ecStatus} />
                  </div>
                  {ec.target_page_url && (
                    <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, wordBreak: 'break-all' }}>
                      {ec.target_page_url}
                    </p>
                  )}
                  {ec.proposed_value && (
                    <p style={{ fontFamily: fontFamily.mono, fontSize: '11px', color: tc.text.secondary, marginTop: space['1'], padding: `${space['1']} ${space['2']}`, backgroundColor: tc.background.surface, borderRadius: radius.md, whiteSpace: 'pre-wrap' }}>
                      {ec.proposed_value.slice(0, 300)}{ec.proposed_value.length > 300 ? '...' : ''}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: space['2'], marginTop: space['2'] }}>
                    <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
                      Approval: {ec.approval_status}
                    </span>
                    {ec.rollback_status && (
                      <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted }}>
                        Rollback: {ec.rollback_status}
                      </span>
                    )}
                    {ec.awaiting_approval && (
                      <div style={{ display: 'flex', gap: space['1'], marginLeft: 'auto' }}>
                        <button
                          onClick={() => onApprovalAction(detail.opportunity_id, ec.candidate_id, 'approve')}
                          style={{
                            padding: `${space['0.5']} ${space['2.5']}`,
                            fontFamily: fontFamily.body,
                            fontSize: '11px',
                            fontWeight: fontWeight.medium,
                            color: '#fff',
                            backgroundColor: magenta[500],
                            border: 'none',
                            borderRadius: radius.md,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-approve-${ec.candidate_id}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onApprovalAction(detail.opportunity_id, ec.candidate_id, 'reject')}
                          style={{
                            padding: `${space['0.5']} ${space['2.5']}`,
                            fontFamily: fontFamily.body,
                            fontSize: '11px',
                            fontWeight: fontWeight.medium,
                            color: tc.text.muted,
                            backgroundColor: 'transparent',
                            border: `1px solid ${tc.border.default}`,
                            borderRadius: radius.md,
                            cursor: 'pointer',
                          }}
                          data-testid={`button-reject-${ec.candidate_id}`}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationsContent() {
  const tc = useThemeColors();
  const [sections, setSections] = useState<EngineRecommendationSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<EngineRecommendationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [familyFilter, setFamilyFilter] = useState<string>('');
  const [remedyFilter, setRemedyFilter] = useState<string>('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('');

  const PHASE1_REMEDIES = ['create_new_page', 'strengthen_existing_page', 'metadata_ctr_optimization', 'add_internal_links'];
  const [phase1Only, setPhase1Only] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const effectiveRemedy = remedyFilter || undefined;
      const data = await getEngineRecommendations({
        limit: 2000,
        family: familyFilter || undefined,
        remedy: effectiveRemedy,
        urgency: urgencyFilter || undefined,
      });
      if (phase1Only && !effectiveRemedy) {
        const filtered = data.map(section => ({
          ...section,
          items: section.items.filter(item => PHASE1_REMEDIES.includes(item.primary_remedy)),
        })).filter(section => section.items.length > 0);
        setSections(filtered);
      } else {
        setSections(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [familyFilter, remedyFilter, urgencyFilter, phase1Only]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelect = useCallback(async (card: EngineRecommendationCard) => {
    setDetailLoading(true);
    try {
      const detail = await getEngineRecommendationDetail(card.opportunity_id);
      setSelectedDetail(detail);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleApprovalAction = useCallback(async (opportunityId: string, candidateId: string | null, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveEngineCandidate({
          candidate_id: candidateId || undefined,
          opportunity_id: !candidateId ? opportunityId : undefined,
        });
      } else {
        await rejectEngineCandidate({
          candidate_id: candidateId || undefined,
          opportunity_id: !candidateId ? opportunityId : undefined,
        });
      }
      const refreshed = await getEngineRecommendationDetail(opportunityId);
      setSelectedDetail(refreshed);
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [loadData]);

  const totalItems = useMemo(() => sections.reduce((sum, s) => sum + s.items.length, 0), [sections]);

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: `${space['1']} ${space['2.5']}`,
    fontFamily: fontFamily.body,
    fontSize: fontSize.sm,
    fontWeight: active ? fontWeight.medium : fontWeight.normal,
    color: active ? tc.text.primary : tc.text.muted,
    backgroundColor: active ? tc.background.muted : 'transparent',
    border: `1px solid ${active ? tc.border.default : 'transparent'}`,
    borderRadius: radius.md,
    cursor: 'pointer',
  });

  return (
    <div>
      <div style={{ marginBottom: space['6'] }}>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['2'] }}>
          SEO Intelligence / Engine Recommendations
        </p>
        <h1
          style={{ fontFamily: fontFamily.display, fontSize: fontSize['2xl'], fontWeight: fontWeight.semibold, color: tc.text.primary, marginBottom: space['1'], lineHeight: lineHeight.snug }}
          data-testid="text-recommendations-title"
        >
          SEO Recommendations
        </h1>
        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.lg, color: tc.text.muted }}>
          Structured, evidence-based recommendations from the SEO Intelligence Engine. Grouped by priority, remedy, and execution state.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['4'], marginBottom: space['4'], alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Scope:</span>
          <button onClick={() => setPhase1Only(true)} style={filterBtnStyle(phase1Only)} data-testid="filter-scope-phase1">
            Phase 1
          </button>
          <button onClick={() => setPhase1Only(false)} style={filterBtnStyle(!phase1Only)} data-testid="filter-scope-all">
            All Remedies
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Family:</span>
          {['', 'query', 'page', 'authority'].map(f => (
            <button key={f || 'all'} onClick={() => setFamilyFilter(f)} style={filterBtnStyle(familyFilter === f)} data-testid={`filter-family-${f || 'all'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Urgency:</span>
          {['', 'high', 'medium', 'low'].map(u => (
            <button key={u || 'all'} onClick={() => setUrgencyFilter(u)} style={filterBtnStyle(urgencyFilter === u)} data-testid={`filter-urgency-${u || 'all'}`}>
              {u || 'All'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Remedy:</span>
          <select
            value={remedyFilter}
            onChange={(e) => setRemedyFilter(e.target.value)}
            style={{
              padding: `${space['1']} ${space['2']}`,
              fontFamily: fontFamily.body,
              fontSize: fontSize.sm,
              color: tc.text.primary,
              backgroundColor: tc.background.surface,
              border: `1px solid ${tc.border.default}`,
              borderRadius: radius.md,
            }}
            data-testid="filter-remedy"
          >
            <option value="">All</option>
            <option value="create_new_page">Create New Page</option>
            <option value="strengthen_existing_page">Strengthen Page</option>
            <option value="metadata_ctr_optimization">Metadata/CTR</option>
            <option value="add_internal_links">Internal Links</option>
            {!phase1Only && <option value="pursue_backlinks">Backlinks</option>}
            {!phase1Only && <option value="maintain_paid_support">Paid Support</option>}
            {!phase1Only && <option value="hybrid">Hybrid</option>}
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          Loading engine recommendations...
        </div>
      )}

      {error && (
        <div style={{ padding: space['4'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, color: tc.semantic.danger.dark, fontFamily: fontFamily.body, marginBottom: space['4'] }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && sections.length === 0 && (
        <div style={{ padding: space['8'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>
          No recommendations match the current filters.
        </div>
      )}

      {!loading && !error && sections.map((section) => (
        <div key={section.section_id} style={{ marginBottom: space['8'] }} data-testid={`section-${section.section_id}`}>
          <div style={{ marginBottom: space['3'] }}>
            <h2 style={{ fontFamily: fontFamily.display, fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: tc.text.primary, lineHeight: lineHeight.snug }}>
              {section.section_title}
            </h2>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>
              {section.section_description}
            </p>
          </div>

          {section.items.map((card) => (
            <RecommendationCardRow
              key={card.opportunity_id}
              card={card}
              onSelect={handleSelect}
              tc={tc}
            />
          ))}
        </div>
      ))}

      {detailLoading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ padding: space['6'], backgroundColor: tc.background.surface, borderRadius: radius.lg, fontFamily: fontFamily.body, color: tc.text.primary }}>
            Loading opportunity detail...
          </div>
        </div>
      )}

      {selectedDetail && (
        <DetailPanel
          detail={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onApprovalAction={handleApprovalAction}
          tc={tc}
        />
      )}
    </div>
  );
}

export default function SeoRecommendationsPage() {
  return (
    <DashboardGuard dashboard="seo" fallback={<AccessDenied />}>
      <RecommendationsContent />
    </DashboardGuard>
  );
}
