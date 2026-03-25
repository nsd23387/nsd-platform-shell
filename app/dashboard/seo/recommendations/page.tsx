'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardGuard } from '../../../../hooks/useRBAC';
import { AccessDenied } from '../../../../components/dashboard';
import { useThemeColors } from '../../../../hooks/useThemeColors';
import { fontFamily, fontSize, fontWeight, lineHeight } from '../../../../design/tokens/typography';
import { space, radius } from '../../../../design/tokens/spacing';
import { violet, indigo, magenta } from '../../../../design/tokens/colors';
import { Icon } from '../../../../design/components/Icon';
import { getEngineRecommendations, getEngineRecommendationDetail, getPhase1Recommendations, getPhase1RecommendationDetail, getPhase1Suppressed, approveEngineCandidate, rejectEngineCandidate } from '../../../../lib/seoApi';
import type { EngineRecommendationSection, EngineRecommendationCard, EngineRecommendationDetail, Phase1DetailResponse, Phase1SuppressedRow } from '../../../../lib/seoApi';

interface ProposedMetadata {
  targetPage: string | null;
  targetPageStatus: 'resolved' | 'not_resolved';
  currentTitle: string | null;
  currentMeta: string | null;
  currentStatus: 'resolved' | 'unavailable';
  proposedTitle: string;
  proposedMeta: string;
  rationale: string;
}

function generateProposedMetadata(
  cluster: string,
  commercialTier: string | null,
  targetPageBucket: string | null,
  recommendedTargetPage: string | null,
  nsdPageUrl: string | null,
  currentPageUrl?: string | null,
  currentSeoTitle?: string | null,
  currentMetaDescription?: string | null,
): ProposedMetadata {
  let targetPage: string | null = currentPageUrl || null;
  let targetPageStatus: 'resolved' | 'not_resolved' = currentPageUrl ? 'resolved' : 'not_resolved';

  if (!targetPage && nsdPageUrl) {
    targetPage = nsdPageUrl;
    targetPageStatus = 'resolved';
  } else if (!targetPage && recommendedTargetPage) {
    targetPage = recommendedTargetPage;
    targetPageStatus = 'resolved';
  } else if (!targetPage && targetPageBucket && targetPageBucket.startsWith('existing:')) {
    targetPage = targetPageBucket.replace('existing:', '');
    targetPageStatus = 'resolved';
  }

  const currentTitle = currentSeoTitle || null;
  const currentMeta = currentMetaDescription || null;
  const currentStatus: 'resolved' | 'unavailable' = (currentTitle || currentMeta) ? 'resolved' : 'unavailable';

  const clusterTitle = cluster.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const isTier1 = commercialTier === 'tier1_money_page';
  const isTier2 = commercialTier === 'tier2_support_page';

  let proposedTitle: string;
  let proposedMeta: string;
  let rationale: string;

  if (isTier1) {
    proposedTitle = `${clusterTitle} | Custom Designs, Free Shipping | Neon Signs Depot`;
    proposedMeta = `Shop ${cluster} at Neon Signs Depot. Custom designs, energy-efficient LED, free shipping, and a 2-year warranty. Get a free quote today.`;
    rationale = `This is a Tier 1 money page cluster. The proposed title leads with the commercial keyword, adds purchase-intent modifiers (custom designs, free shipping), and includes the brand. The meta description targets transactional searchers with a clear value proposition and call-to-action.`;
  } else if (isTier2) {
    proposedTitle = `${clusterTitle} | Ideas, Inspiration & Custom Options | Neon Signs Depot`;
    proposedMeta = `Explore ${cluster} ideas and inspiration at Neon Signs Depot. Browse styles, get design tips, and order custom neon signs with free shipping.`;
    rationale = `This is a Tier 2 support page cluster. The proposed title balances informational intent (ideas, inspiration) with commercial modifiers (custom options). The meta description guides browsers toward conversion while serving the discovery intent.`;
  } else {
    proposedTitle = `${clusterTitle} | Browse & Shop | Neon Signs Depot`;
    proposedMeta = `Discover ${cluster} at Neon Signs Depot. Browse our collection, find the perfect design, and order with free shipping and a 2-year warranty.`;
    rationale = `The proposed title targets the cluster keyword with light commercial modifiers. The meta description serves both informational and transactional intent, guiding the searcher toward browsing and ordering.`;
  }

  return {
    targetPage,
    targetPageStatus,
    currentTitle,
    currentMeta,
    currentStatus,
    proposedTitle,
    proposedMeta,
    rationale,
  };
}

function buildExecutionTaskBundle(detail: EngineRecommendationDetail, ec: EngineRecommendationDetail['execution_candidates'][number], meta?: ProposedMetadata | null): string {
  const p1 = detail as unknown as Phase1DetailResponse;
  const lines: string[] = [];
  lines.push('=== SEO EXECUTION TASK ===');
  lines.push('');
  lines.push(`Recommendation: ${detail.recommendation_title}`);
  lines.push(`Type: ${(detail.primary_remedy || '').replace(/_/g, ' ')}`);
  lines.push(`Cluster: ${detail.topic_cluster}`);
  lines.push(`Priority Score: ${Number(detail.total_opportunity_score).toFixed(1)}`);
  lines.push(`Urgency: ${detail.urgency_band}`);
  lines.push(`Confidence: ${detail.data_confidence}`);
  lines.push(`Opportunity ID: ${detail.opportunity_id}`);
  if (ec.candidate_id) lines.push(`Candidate ID: ${ec.candidate_id}`);
  lines.push('');

  const targetPage = ec.target_page_url || meta?.targetPage || detail.nsd_page_url || p1.current_page_url || null;
  lines.push(`Target Page: ${targetPage || 'Not yet resolved'}`);
  if (ec.target_field) lines.push(`Target Field: ${ec.target_field}`);
  lines.push(`Execution Status: ${(ec.execution_status || 'pending').replace(/_/g, ' ')}`);
  if (ec.reviewed_at) lines.push(`Approved At: ${new Date(ec.reviewed_at).toLocaleString()}`);
  if (ec.reviewer_id) lines.push(`Reviewer: ${ec.reviewer_id}`);
  lines.push('');

  if (detail.primary_remedy === 'metadata_ctr_optimization' && meta) {
    lines.push('--- METADATA CHANGES ---');
    if (meta.currentTitle) lines.push(`Current Title: ${meta.currentTitle}`);
    lines.push(`Proposed Title: ${meta.proposedTitle}`);
    if (meta.currentMeta) lines.push(`Current Meta Description: ${meta.currentMeta}`);
    lines.push(`Proposed Meta Description: ${meta.proposedMeta}`);
    lines.push('');
  }

  if (ec.proposed_value) {
    lines.push('--- PROPOSED VALUE ---');
    lines.push(ec.proposed_value);
    lines.push('');
  }

  lines.push('--- ACTION SUMMARY ---');
  if (detail.primary_remedy === 'metadata_ctr_optimization') {
    lines.push(`Update the SEO title and meta description${targetPage ? ` on ${targetPage}` : ''} to improve click-through rate for "${detail.topic_cluster}" queries.`);
  } else if (detail.primary_remedy === 'create_new_page') {
    lines.push(`Create a new page targeting "${detail.topic_cluster}" cluster.`);
  } else if (detail.primary_remedy === 'strengthen_existing_page') {
    lines.push(`Strengthen existing page content${targetPage ? ` at ${targetPage}` : ''} for "${detail.topic_cluster}" cluster.`);
  } else if (detail.primary_remedy === 'add_internal_links') {
    lines.push(`Add internal links pointing to the target page for "${detail.topic_cluster}" cluster.`);
  } else {
    lines.push(`Implement the ${(detail.primary_remedy || '').replace(/_/g, ' ')} change for "${detail.topic_cluster}" cluster.`);
  }
  lines.push('');

  if (detail.recommendation_reason) {
    lines.push(`Reason: ${detail.recommendation_reason}`);
  }
  if (ec.review_notes) {
    lines.push(`Review Notes: ${ec.review_notes}`);
  }

  lines.push('');
  lines.push(`Source: Phase-1 SEO Recommendation Engine`);
  lines.push(`Generated: ${new Date().toISOString()}`);

  return lines.join('\n');
}

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

  const isApproved = card.action_state_badge === 'approved' || card.action_state_badge === 'published';

  return (
    <div
      onClick={() => onSelect(card)}
      style={{
        padding: space['4'],
        backgroundColor: tc.background.surface,
        border: `1px solid ${isApproved ? '#10b981' : tc.border.default}`,
        borderLeft: isApproved ? '3px solid #10b981' : `1px solid ${tc.border.default}`,
        borderRadius: radius.lg,
        cursor: 'pointer',
        transition: 'border-color 150ms',
        marginBottom: space['3'],
      }}
      onMouseEnter={(e) => { if (!isApproved) (e.currentTarget as HTMLElement).style.borderColor = violet[400]; }}
      onMouseLeave={(e) => { if (!isApproved) { (e.currentTarget as HTMLElement).style.borderColor = tc.border.default; (e.currentTarget as HTMLElement).style.borderLeftColor = tc.border.default; } }}
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

      {card.coverage_validated === false && card.recommendation_source === 'cluster_engine' && (
        <div
          data-testid="banner-coverage-unverified"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: space['2'],
            backgroundColor: '#FEF3C7',
            borderLeft: '3px solid #F59E0B',
            borderRadius: 0,
            padding: `${space['2']} ${space['3']}`,
            marginBottom: space['2'],
          }}
        >
          <span style={{ fontSize: fontSize.sm, color: '#92400e', fontFamily: fontFamily.body }}>
            Coverage unverified — confirm no existing page before actioning
          </span>
        </div>
      )}

      <div style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, marginBottom: space['3'], lineHeight: lineHeight.relaxed }}>
        {card.recommendation_summary}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: space['1.5'] }}>
        <Badge label={remedyLabel} colors={remedyColor} />
        <Badge label={`urgency: ${card.urgency_band}`} colors={urgencyColor} />
        <Badge label={`confidence: ${card.data_confidence}`} colors={confidenceColor} />
        <Badge label={`freshness: ${card.source_freshness_label}`} colors={freshnessColor} />
        {card.opportunity_family && <Badge label={card.opportunity_family} colors={{ bg: '#f5f5f5', text: '#525252' }} />}
        {card.recommendation_source === 'cluster_engine' && (
          <Badge label="Cluster engine" colors={{ bg: '#F1EFE8', text: '#5F5E5A' }} />
        )}
        {card.recommendation_source === 'phase1' && (
          <Badge label="Phase 1" colors={{ bg: '#EEEDFE', text: '#534AB7' }} />
        )}
        {card.recommendation_quality_score != null && (
          <span style={{
            fontSize: fontSize.sm,
            fontFamily: fontFamily.body,
            color: card.recommendation_quality_score >= 7.0
              ? tc.semantic.success.dark
              : card.recommendation_quality_score >= 4.0
                ? '#92400e'
                : tc.semantic.danger.dark,
          }}>
            Quality: {Number(card.recommendation_quality_score).toFixed(1)} / 10
          </span>
        )}
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

        {detail.coverage_validated === false && detail.recommendation_source === 'cluster_engine' && (
          <div
            data-testid="banner-coverage-unverified"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space['2'],
              backgroundColor: '#FEF3C7',
              borderLeft: '3px solid #F59E0B',
              borderRadius: 0,
              padding: `${space['2']} ${space['3']}`,
              marginBottom: space['2'],
            }}
          >
            <span style={{ fontSize: fontSize.sm, color: '#92400e', fontFamily: fontFamily.body }}>
              Coverage unverified — confirm no existing page before actioning
            </span>
          </div>
        )}

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

        {detail.primary_remedy === 'metadata_ctr_optimization' && (() => {
          const p1 = detail as unknown as Phase1DetailResponse;
          const meta = generateProposedMetadata(
            detail.topic_cluster,
            p1.phase1_commercial_tier || null,
            p1.phase1_target_page_bucket || null,
            p1.phase1_recommended_target_page || null,
            detail.nsd_page_url || null,
            p1.current_page_url,
            p1.current_seo_title,
            p1.current_meta_description,
          );

          const metaFieldLabel: React.CSSProperties = { ...fieldLabel, marginBottom: space['0.5'] };
          const metaFieldValue: React.CSSProperties = { ...fieldValue, fontSize: fontSize.sm, lineHeight: lineHeight.relaxed };
          const unavailableStyle: React.CSSProperties = { fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.placeholder, fontStyle: 'italic' };

          const copyToClipboard = (text: string, label: string) => {
            navigator.clipboard.writeText(text).then(() => {
              const el = document.getElementById(`copy-feedback-${label}`);
              if (el) { el.textContent = 'Copied'; setTimeout(() => { el.textContent = ''; }, 1500); }
            }).catch(() => {});
          };

          const copyBtnStyle: React.CSSProperties = {
            padding: `${space['0.5']} ${space['2']}`,
            fontFamily: fontFamily.body,
            fontSize: '11px',
            fontWeight: fontWeight.medium,
            color: tc.text.muted,
            backgroundColor: 'transparent',
            border: `1px solid ${tc.border.default}`,
            borderRadius: radius.md,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: space['1'],
          };

          return (
            <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'], marginBottom: space['6'] }} data-testid="section-metadata-action">
              <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>Metadata Action</p>

              <div style={{ marginBottom: space['3'] }}>
                <p style={metaFieldLabel}>Target Page</p>
                {meta.targetPageStatus === 'resolved' && meta.targetPage ? (
                  <p style={{ ...metaFieldValue, wordBreak: 'break-all' }} data-testid="text-target-page">{meta.targetPage}</p>
                ) : (
                  <p style={unavailableStyle} data-testid="text-target-page-unavailable">Target page not yet resolved</p>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: space['4'], marginBottom: space['3'] }}>
                <div style={{ padding: space['3'], backgroundColor: tc.background.muted, borderRadius: radius.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['2'] }}>
                    <p style={{ ...metaFieldLabel, fontWeight: fontWeight.medium, color: tc.text.secondary, marginBottom: 0 }}>Current Metadata</p>
                    {meta.currentStatus === 'resolved' && (
                      <span style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.semantic.success.dark }}>Live</span>
                    )}
                  </div>
                  <div style={{ marginBottom: space['2'] }}>
                    <p style={{ ...metaFieldLabel, fontSize: '11px' }}>SEO Title</p>
                    {meta.currentTitle ? (
                      <p style={metaFieldValue} data-testid="text-current-title">{meta.currentTitle}</p>
                    ) : (
                      <p style={unavailableStyle} data-testid="text-current-title">Current title unavailable from source payload</p>
                    )}
                  </div>
                  <div>
                    <p style={{ ...metaFieldLabel, fontSize: '11px' }}>Meta Description</p>
                    {meta.currentMeta ? (
                      <p style={metaFieldValue} data-testid="text-current-meta">{meta.currentMeta}</p>
                    ) : (
                      <p style={unavailableStyle} data-testid="text-current-meta">Current meta description unavailable from source payload</p>
                    )}
                  </div>
                </div>

                <div style={{ padding: space['3'], backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.md }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: space['2'] }}>
                    <p style={{ ...metaFieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: 0 }}>Proposed Metadata</p>
                  </div>
                  <div style={{ marginBottom: space['2'] }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ ...metaFieldLabel, fontSize: '11px' }}>SEO Title</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
                        <button onClick={() => copyToClipboard(meta.proposedTitle, 'title')} style={copyBtnStyle} data-testid="button-copy-title">
                          Copy title
                        </button>
                        <span id="copy-feedback-title" style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.semantic.success.dark }} />
                      </div>
                    </div>
                    <p style={{ ...metaFieldValue, fontWeight: fontWeight.medium }} data-testid="text-proposed-title">{meta.proposedTitle}</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ ...metaFieldLabel, fontSize: '11px' }}>Meta Description</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
                        <button onClick={() => copyToClipboard(meta.proposedMeta, 'meta')} style={copyBtnStyle} data-testid="button-copy-meta">
                          Copy meta
                        </button>
                        <span id="copy-feedback-meta" style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.semantic.success.dark }} />
                      </div>
                    </div>
                    <p style={metaFieldValue} data-testid="text-proposed-meta">{meta.proposedMeta}</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: space['3'] }}>
                <p style={metaFieldLabel}>Why this change is recommended</p>
                <p style={{ ...metaFieldValue, color: tc.text.muted }} data-testid="text-meta-rationale">{meta.rationale}</p>
              </div>

              <div style={{ display: 'flex', gap: space['2'], flexWrap: 'wrap' }}>
                <button
                  onClick={() => copyToClipboard(`Title: ${meta.proposedTitle}\nMeta Description: ${meta.proposedMeta}`, 'both')}
                  style={{
                    padding: `${space['1.5']} ${space['3']}`,
                    fontFamily: fontFamily.body,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.medium,
                    color: '#fff',
                    backgroundColor: magenta[500],
                    border: 'none',
                    borderRadius: radius.md,
                    cursor: 'pointer',
                  }}
                  data-testid="button-copy-both"
                >
                  Copy Proposed Metadata
                </button>
                <span id="copy-feedback-both" style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.semantic.success.dark, alignSelf: 'center' }} />
              </div>
            </div>
          );
        })()}

        {(detail as unknown as Phase1DetailResponse).phase1_kpi_primary && (
          <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'], marginBottom: space['6'] }}>
            <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>Measurement Plan</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['3'] }}>
              <div>
                <p style={fieldLabel}>Primary KPI</p>
                <p style={fieldValue}>{((detail as unknown as Phase1DetailResponse).phase1_kpi_primary || '').replace(/_/g, ' ')}</p>
              </div>
              {(detail as unknown as Phase1DetailResponse).phase1_kpi_secondary && (
                <div>
                  <p style={fieldLabel}>Secondary KPI</p>
                  <p style={fieldValue}>{((detail as unknown as Phase1DetailResponse).phase1_kpi_secondary || '').replace(/_/g, ' ')}</p>
                </div>
              )}
              {(detail as unknown as Phase1DetailResponse).phase1_baseline_window_days != null && (
                <div>
                  <p style={fieldLabel}>Baseline Window</p>
                  <p style={fieldValue}>{(detail as unknown as Phase1DetailResponse).phase1_baseline_window_days} days</p>
                </div>
              )}
              {(detail as unknown as Phase1DetailResponse).phase1_measurement_window_days != null && (
                <div>
                  <p style={fieldLabel}>Measurement Window</p>
                  <p style={fieldValue}>{(detail as unknown as Phase1DetailResponse).phase1_measurement_window_days} days</p>
                </div>
              )}
            </div>
            {(detail as unknown as Phase1DetailResponse).phase1_success_threshold && (
              <div style={{ marginTop: space['2'] }}>
                <p style={fieldLabel}>Success Threshold</p>
                <p style={{ ...fieldValue, fontSize: fontSize.sm, lineHeight: lineHeight.relaxed }}>{(detail as unknown as Phase1DetailResponse).phase1_success_threshold}</p>
              </div>
            )}
            {(detail as unknown as Phase1DetailResponse).phase1_measurement_notes && (
              <div style={{ marginTop: space['1'] }}>
                <p style={fieldLabel}>Measurement Notes</p>
                <p style={{ ...fieldValue, fontSize: fontSize.sm, lineHeight: lineHeight.relaxed, color: tc.text.muted }}>{(detail as unknown as Phase1DetailResponse).phase1_measurement_notes}</p>
              </div>
            )}
            {(detail as unknown as Phase1DetailResponse).phase1_bottleneck_primary && (
              <div style={{ marginTop: space['2'], display: 'flex', gap: space['3'] }}>
                <div>
                  <p style={fieldLabel}>Primary Bottleneck</p>
                  <p style={fieldValue}>{(detail as unknown as Phase1DetailResponse).phase1_bottleneck_primary}</p>
                </div>
                {(detail as unknown as Phase1DetailResponse).phase1_bottleneck_secondary && (
                  <div>
                    <p style={fieldLabel}>Secondary Bottleneck</p>
                    <p style={fieldValue}>{(detail as unknown as Phase1DetailResponse).phase1_bottleneck_secondary}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {detail.execution_candidates && detail.execution_candidates.length > 0 && (
          <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'] }}>
            <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['3'] }}>
              Execution Candidates ({detail.execution_candidates.length})
            </p>
            {detail.execution_candidates.map((ec, ecIdx) => {
              const ecStatus = ACTION_BADGE_STYLES[ec.execution_status || ''] || ACTION_BADGE_STYLES.recommendation;
              const ecApproved = ec.approval_status === 'approved';
              return (
                <div
                  key={ec.candidate_id || `ec-${ecIdx}`}
                  style={{
                    padding: space['3'],
                    border: `1px solid ${ecApproved ? '#10b981' : tc.border.subtle}`,
                    borderLeft: ecApproved ? '3px solid #10b981' : `1px solid ${tc.border.subtle}`,
                    borderRadius: radius.md,
                    marginBottom: space['2'],
                    backgroundColor: ecApproved ? tc.background.surface : tc.background.muted,
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
                    {(ec as any).confidence_tier && (
                      <span style={{
                        fontFamily: fontFamily.body, fontSize: '11px', fontWeight: fontWeight.medium,
                        color: (ec as any).confidence_tier === 'auto' ? '#065f46' : tc.text.muted,
                        backgroundColor: (ec as any).confidence_tier === 'auto' ? '#d1fae5' : 'transparent',
                        padding: (ec as any).confidence_tier === 'auto' ? `0 ${space['1.5']}` : '0',
                        borderRadius: radius.full,
                      }}>
                        Tier: {(ec as any).confidence_tier}
                      </span>
                    )}
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

                  {ecApproved && (
                    <div
                      style={{
                        marginTop: space['3'],
                        padding: space['3'],
                        backgroundColor: tc.background.muted,
                        borderRadius: radius.md,
                        borderTop: `1px solid ${tc.border.default}`,
                      }}
                      data-testid={`execution-handoff-${ec.candidate_id}`}
                    >
                      <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#047857', marginBottom: space['2'] }}>
                        Execution Handoff
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: space['2'] }}>
                        <div>
                          <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Recommendation Type</p>
                          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{(detail.primary_remedy || '').replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Execution Status</p>
                          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{(ec.execution_status || 'pending').replace(/_/g, ' ')}</p>
                        </div>
                        {ec.target_page_url && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Target Page</p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, wordBreak: 'break-all' }}>{ec.target_page_url}</p>
                          </div>
                        )}
                        {ec.target_field && (
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Target Field</p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{ec.target_field}</p>
                          </div>
                        )}
                        {ec.reviewed_at && (
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Approved At</p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{new Date(ec.reviewed_at).toLocaleString()}</p>
                          </div>
                        )}
                        {ec.reviewer_id && (
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Reviewer</p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{ec.reviewer_id}</p>
                          </div>
                        )}
                        {ec.execution_timestamp && (
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Applied At</p>
                            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary }}>{new Date(ec.execution_timestamp).toLocaleString()}</p>
                          </div>
                        )}
                        {(ec as any).confidence_tier && (
                          <div>
                            <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Confidence Tier</p>
                            <p style={{
                              fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium,
                              color: (ec as any).confidence_tier === 'auto' ? '#065f46' : tc.text.primary,
                            }}>
                              {(ec as any).confidence_tier}
                            </p>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: space['2'], padding: space['2'], backgroundColor: tc.background.surface, borderRadius: radius.md }}>
                        <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Execution Summary</p>
                        <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, lineHeight: lineHeight.relaxed }}>
                          {ec.execution_status === 'published'
                            ? `This ${(detail.primary_remedy || '').replace(/_/g, ' ')} change has been published${ec.target_page_url ? ` to ${ec.target_page_url}` : ''}. No further action required.`
                            : ec.execution_status === 'rolled_back'
                            ? `This change was rolled back${ec.rollback_status ? ` (${ec.rollback_status})` : ''}. Review the recommendation and determine next steps.`
                            : `Approved for execution. ${ec.target_page_url ? `Apply the ${(ec.mutation_type || 'change').replace(/_/g, ' ')} to ${ec.target_page_url}.` : `Implement the ${(detail.primary_remedy || '').replace(/_/g, ' ')} change as described above.`}${ec.proposed_value ? ' See the proposed value above for exact content.' : ''}`
                          }
                        </p>
                      </div>

                      {ec.review_notes && (
                        <div style={{ marginTop: space['2'] }}>
                          <p style={{ fontFamily: fontFamily.body, fontSize: '11px', color: tc.text.muted, marginBottom: space['0.5'] }}>Review Notes</p>
                          <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary, fontStyle: 'italic' }}>{ec.review_notes}</p>
                        </div>
                      )}

                      {(() => {
                        const p1ForBundle = detail as unknown as Phase1DetailResponse;
                        const metaForBundle = detail.primary_remedy === 'metadata_ctr_optimization'
                          ? generateProposedMetadata(
                              detail.topic_cluster,
                              p1ForBundle.phase1_commercial_tier || null,
                              p1ForBundle.phase1_target_page_bucket || null,
                              p1ForBundle.phase1_recommended_target_page || null,
                              detail.nsd_page_url || null,
                              p1ForBundle.current_page_url,
                              p1ForBundle.current_seo_title,
                              p1ForBundle.current_meta_description,
                            )
                          : null;

                        return (
                          <div style={{ marginTop: space['3'], display: 'flex', alignItems: 'center', gap: space['2'] }}>
                            <button
                              onClick={() => {
                                const bundle = buildExecutionTaskBundle(detail, ec, metaForBundle);
                                navigator.clipboard.writeText(bundle).then(() => {
                                  const el = document.getElementById(`copy-feedback-task-${ec.candidate_id}`);
                                  if (el) { el.textContent = 'Copied to clipboard'; setTimeout(() => { el.textContent = ''; }, 2000); }
                                }).catch(() => {});
                              }}
                              style={{
                                padding: `${space['1.5']} ${space['3']}`,
                                fontFamily: fontFamily.body,
                                fontSize: fontSize.sm,
                                fontWeight: fontWeight.medium,
                                color: '#fff',
                                backgroundColor: magenta[500],
                                border: 'none',
                                borderRadius: radius.md,
                                cursor: 'pointer',
                              }}
                              data-testid={`button-copy-execution-task-${ec.candidate_id}`}
                            >
                              Copy Execution Task
                            </button>
                            <span
                              id={`copy-feedback-task-${ec.candidate_id}`}
                              style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.semantic.success.dark }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {(!detail.execution_candidates || detail.execution_candidates.length === 0) && (
          <div style={{ borderTop: `1px solid ${tc.border.default}`, paddingTop: space['4'] }} data-testid="section-create-execution-task">
            <p style={{ ...fieldLabel, fontWeight: fontWeight.medium, color: tc.text.primary, marginBottom: space['2'] }}>Execution Task</p>
            <p style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted, marginBottom: space['3'], lineHeight: lineHeight.relaxed }}>
              No execution task exists for this recommendation yet. Approve it to create an execution handoff so it can be tracked and implemented.
            </p>
            <button
              onClick={() => onApprovalAction(detail.opportunity_id, null, 'approve')}
              style={{
                padding: `${space['1.5']} ${space['3']}`,
                fontFamily: fontFamily.body,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.medium,
                color: '#fff',
                backgroundColor: magenta[500],
                border: 'none',
                borderRadius: radius.md,
                cursor: 'pointer',
              }}
              data-testid="button-create-execution-task"
            >
              Approve as Execution Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SuppressedSection({
  tc,
  filterBtnStyle,
}: {
  tc: ReturnType<typeof useThemeColors>;
  filterBtnStyle: (active: boolean) => React.CSSProperties;
}) {
  const [suppressed, setSuppressed] = useState<Phase1SuppressedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPhase1Suppressed()
      .then(setSuppressed)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: space['4'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>Loading suppressed...</div>;
  if (error) return <div style={{ padding: space['4'], color: tc.semantic.danger.dark, fontFamily: fontFamily.body }}>Error: {error}</div>;
  if (suppressed.length === 0) return <div style={{ padding: space['4'], textAlign: 'center', color: tc.text.muted, fontFamily: fontFamily.body }}>No suppressed opportunities.</div>;

  return (
    <div style={{ backgroundColor: tc.background.surface, border: `1px solid ${tc.border.default}`, borderRadius: radius.lg, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${tc.border.default}` }}>
            {['Topic Cluster', 'Intent', 'Suppression Reason', 'Tier', 'Impact'].map(h => (
              <th key={h} style={{ padding: `${space['3']} ${space['4']}`, textAlign: 'left', fontFamily: fontFamily.body, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: tc.text.muted }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {suppressed.map((r) => (
            <tr key={r.opportunity_id} style={{ borderBottom: `1px solid ${tc.border.subtle}` }} data-testid={`row-suppressed-${r.opportunity_id}`}>
              <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.primary, fontWeight: fontWeight.medium }}>{r.topic_cluster}</td>
              <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{(r.strategic_intent || '').replace(/_/g, ' ')}</td>
              <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>{(r.suppression_reason || '').replace(/_/g, ' ')}</td>
              <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>{(r.commercial_tier || '').replace(/_/g, ' ')}</td>
              <td style={{ padding: `${space['3']} ${space['4']}`, fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.secondary }}>{r.business_impact_score.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [showSuppressed, setShowSuppressed] = useState(false);

  const ALLOW_ALL_REMEDIES = process.env.NEXT_PUBLIC_SEO_ALL_REMEDIES === 'true';
  const [phase1Only, setPhase1Only] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (phase1Only) {
        const resp = await getPhase1Recommendations({
          remedy: remedyFilter || undefined,
          urgency: urgencyFilter || undefined,
        });
        setSections(resp.sections);
      } else {
        const data = await getEngineRecommendations({
          limit: 2000,
          family: familyFilter || undefined,
          remedy: remedyFilter || undefined,
          urgency: urgencyFilter || undefined,
        });
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
      if (phase1Only) {
        const detail = await getPhase1RecommendationDetail(card.opportunity_id);
        setSelectedDetail(detail as unknown as EngineRecommendationDetail);
      } else {
        const detail = await getEngineRecommendationDetail(card.opportunity_id);
        setSelectedDetail(detail);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }, [phase1Only]);

  const handleApprovalAction = useCallback(async (opportunityId: string, candidateId: string | null, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        let proposedValue: string | undefined;
        let targetPageUrl: string | undefined;
        if (!candidateId && selectedDetail && selectedDetail.opportunity_id === opportunityId) {
          const p1 = selectedDetail as unknown as Phase1DetailResponse;
          const isMetadata =
            selectedDetail.primary_remedy === 'metadata_ctr_optimization' ||
            p1.phase1_strategic_intent === 'improve_ctr' ||
            p1.phase1_strategic_intent === 'strengthen_page';
          if (isMetadata) {
            const meta = generateProposedMetadata(
              selectedDetail.topic_cluster,
              p1.phase1_commercial_tier || null,
              p1.phase1_target_page_bucket || null,
              p1.phase1_recommended_target_page || null,
              selectedDetail.nsd_page_url || null,
              p1.current_page_url,
              p1.current_seo_title,
              p1.current_meta_description,
            );
            proposedValue = meta.proposedMeta || undefined;
            targetPageUrl = meta.targetPage || undefined;
          }
        }
        await approveEngineCandidate({
          candidate_id: candidateId || undefined,
          opportunity_id: !candidateId ? opportunityId : undefined,
          proposed_value: proposedValue,
          target_page_url: targetPageUrl,
        });
      } else {
        await rejectEngineCandidate({
          candidate_id: candidateId || undefined,
          opportunity_id: !candidateId ? opportunityId : undefined,
        });
      }
      if (phase1Only) {
        const refreshed = await getPhase1RecommendationDetail(opportunityId);
        setSelectedDetail(refreshed as unknown as EngineRecommendationDetail);
      } else {
        const refreshed = await getEngineRecommendationDetail(opportunityId);
        setSelectedDetail(refreshed);
      }
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [loadData, phase1Only, selectedDetail]);

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
          <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Source:</span>
          <button onClick={() => { setPhase1Only(true); setShowSuppressed(false); }} style={filterBtnStyle(phase1Only && !showSuppressed)} data-testid="filter-scope-phase1">
            Phase 1
          </button>
          {ALLOW_ALL_REMEDIES && (
            <button onClick={() => { setPhase1Only(false); setShowSuppressed(false); }} style={filterBtnStyle(!phase1Only && !showSuppressed)} data-testid="filter-scope-all">
              All Remedies
            </button>
          )}
          <button onClick={() => setShowSuppressed(!showSuppressed)} style={filterBtnStyle(showSuppressed)} data-testid="filter-scope-suppressed">
            Suppressed
          </button>
        </div>

        {!showSuppressed && !phase1Only && (
          <div style={{ display: 'flex', alignItems: 'center', gap: space['1'] }}>
            <span style={{ fontFamily: fontFamily.body, fontSize: fontSize.sm, color: tc.text.muted }}>Family:</span>
            {['', 'query', 'page', 'authority'].map(f => (
              <button key={f || 'all'} onClick={() => setFamilyFilter(f)} style={filterBtnStyle(familyFilter === f)} data-testid={`filter-family-${f || 'all'}`}>
                {f || 'All'}
              </button>
            ))}
          </div>
        )}

        {!showSuppressed && (
          <>
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
          </>
        )}
      </div>

      {showSuppressed ? (
        <SuppressedSection tc={tc} filterBtnStyle={filterBtnStyle} />
      ) : (
        <>
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
        </>
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
