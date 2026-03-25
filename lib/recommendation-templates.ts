export interface OpportunityRow {
  opportunity_id: string;
  opportunity_family: string;
  opportunity_type: string;
  topic_cluster: string;
  primary_subject: string;
  nsd_page_url: string | null;
  competitor_domain: string | null;
  total_opportunity_score: number;
  demand_score: number;
  competitive_opportunity_score: number;
  authority_gap_score: number;
  paid_support_score: number;
  execution_readiness_score: number;
  primary_remedy: string;
  secondary_remedy: string | null;
  urgency_band: string;
  data_confidence: string;
  source_freshness_label: string;
  confidence_reason: string | null;
  source_coverage_count: number;
  ahrefs_search_volume: number | null;
  ahrefs_keyword_difficulty: number | null;
  ahrefs_cpc: number | null;
  gsc_impressions: number | null;
  gsc_best_position: number | null;
  ads_cost: number | null;
  ads_conversions: number | null;
  competitor_referring_domains: number | null;
  competitor_domain_rating: number | null;
  evidence_summary_short: string | null;
  evidence_summary_long: string | null;
  internal_link_signal_strength: string | null;
  nsd_ranking_page: string | null;
  balanced_rank: number;
  portfolio_position: string | null;
  balancing_strategy: string | null;
  ahrefs_data_stale: boolean | null;
  execution_status: string | null;
  approval_status: string | null;
  candidate_id: string | null;
  mutation_type: string | null;
  rollback_status: string | null;
  awaiting_approval: boolean | null;
  ready_to_execute: boolean | null;
  recommendation_source?: string | null;
  coverage_validated?: boolean | null;
  recommendation_quality_score?: number | null;
}

export interface RecommendationCard {
  opportunity_id: string;
  balanced_rank: number;
  portfolio_position: string | null;
  opportunity_family: string;
  primary_remedy: string;
  secondary_remedy: string | null;
  topic_cluster: string;
  primary_subject: string;
  nsd_page_url: string | null;
  competitor_domain: string | null;
  total_opportunity_score: number;
  urgency_band: string;
  data_confidence: string;
  source_freshness_label: string;
  confidence_reason: string | null;
  recommendation_title: string;
  recommendation_summary: string;
  recommendation_reason: string;
  evidence_summary_short: string;
  action_state_badge: string;
  ahrefs_search_volume: number | null;
  ahrefs_keyword_difficulty: number | null;
  ahrefs_cpc: number | null;
  gsc_impressions: number | null;
  gsc_best_position: number | null;
  ads_cost: number | null;
  ads_conversions: number | null;
  competitor_referring_domains: number | null;
  competitor_domain_rating: number | null;
  internal_link_signal_strength: string | null;
  nsd_ranking_page: string | null;
  execution_status: string | null;
  approval_status: string | null;
  candidate_id: string | null;
  mutation_type: string | null;
  rollback_status: string | null;
  recommendation_source?: string | null;
  coverage_validated?: boolean | null;
  recommendation_quality_score?: number | null;
}

export type RecommendationSection = {
  section_id: string;
  section_title: string;
  section_description: string;
  items: RecommendationCard[];
};

function fmtNum(v: number | null | undefined): string {
  if (v == null) return '--';
  return Number(v).toLocaleString();
}

function fmtDec(v: number | null | undefined, digits = 1): string {
  if (v == null) return '--';
  return Number(v).toFixed(digits);
}

function fmtDollar(v: number | null | undefined): string {
  if (v == null) return '--';
  return `$${Number(v).toFixed(2)}`;
}

function isUrl(s: string): boolean {
  return s.startsWith('http://') || s.startsWith('https://');
}

function topicLabel(row: OpportunityRow): string {
  return row.topic_cluster || 'this topic';
}

function nsdPageLabel(row: OpportunityRow): string {
  if (row.nsd_page_url) return row.nsd_page_url;
  if (row.nsd_ranking_page) return row.nsd_ranking_page;
  return '';
}

function competitorContext(row: OpportunityRow): string {
  if (!row.competitor_domain) return '';
  const subject = row.primary_subject;
  if (subject && isUrl(subject) && subject.includes(row.competitor_domain)) {
    return `${row.competitor_domain} is ranking with ${subject}`;
  }
  return `${row.competitor_domain} is competing for this topic`;
}

function gscEvidence(row: OpportunityRow): string {
  const parts: string[] = [];
  if (row.gsc_impressions != null) parts.push(`${fmtNum(row.gsc_impressions)} impressions`);
  if (row.gsc_best_position != null) parts.push(`position ${fmtDec(row.gsc_best_position)}`);
  return parts.length ? parts.join(' at ') : '';
}

function ahrefsEvidence(row: OpportunityRow): string {
  const parts: string[] = [];
  if (row.ahrefs_search_volume != null) parts.push(`search volume ${fmtNum(row.ahrefs_search_volume)}`);
  if (row.ahrefs_keyword_difficulty != null) parts.push(`KD ${row.ahrefs_keyword_difficulty}`);
  if (row.ahrefs_cpc != null) parts.push(`CPC ${fmtDollar(row.ahrefs_cpc)}`);
  return parts.length ? parts.join(', ') : '';
}

function paidEvidence(row: OpportunityRow): string {
  const parts: string[] = [];
  if (row.ads_cost != null) parts.push(`ad spend ${fmtDollar(row.ads_cost)}`);
  if (row.ads_conversions != null) parts.push(`${fmtNum(row.ads_conversions)} conversions`);
  return parts.length ? parts.join(', ') : '';
}

function authorityEvidence(row: OpportunityRow): string {
  const parts: string[] = [];
  if (row.competitor_domain_rating != null) parts.push(`DR ${fmtDec(row.competitor_domain_rating, 0)}`);
  if (row.competitor_referring_domains != null) parts.push(`${fmtNum(row.competitor_referring_domains)} referring domains`);
  return parts.length ? parts.join(', ') : '';
}

function buildTitle(remedy: string, row: OpportunityRow): string {
  const topic = topicLabel(row);
  const nsd = nsdPageLabel(row);
  const nsdShort = nsd ? ` (${nsd.replace(/^https?:\/\/(www\.)?neonsignsdepot\.com/, '')})` : '';
  switch (remedy) {
    case 'create_new_page':
      return `Create a new NSD page for "${topic}"`;
    case 'strengthen_existing_page':
      return `Strengthen NSD page for "${topic}"${nsdShort}`;
    case 'add_internal_links':
      return `Add internal links for "${topic}"${nsdShort}`;
    case 'pursue_backlinks':
      return `Build backlinks for "${topic}"${nsdShort}`;
    case 'maintain_paid_support':
      return `Keep paid support for "${topic}"`;
    case 'metadata_ctr_optimization':
      return `Improve title/meta for "${topic}"${nsdShort}`;
    case 'hybrid': {
      const secondary = row.secondary_remedy ? row.secondary_remedy.replace(/_/g, ' ') : 'combined tactics';
      return `"${topic}" — ${secondary}${nsdShort}`;
    }
    default:
      return `Opportunity for "${topic}"`;
  }
}

function buildSummary(remedy: string, row: OpportunityRow): string {
  const topic = topicLabel(row);
  const ahrefs = ahrefsEvidence(row);
  const gsc = gscEvidence(row);
  const paid = paidEvidence(row);
  const auth = authorityEvidence(row);
  const comp = competitorContext(row);
  const nsd = nsdPageLabel(row);

  switch (remedy) {
    case 'create_new_page': {
      let s = `NSD does not have a strong page for "${topic}."`;
      if (comp) s += ` ${comp}.`;
      s += ` Create a dedicated page to capture this traffic.`;
      if (ahrefs) s += ` Demand: ${ahrefs}.`;
      if (gsc) s += ` Organic signal: ${gsc}.`;
      return s;
    }
    case 'strengthen_existing_page': {
      let s = `NSD has a page${nsd ? ` (${nsd})` : ''} for "${topic}" with some organic visibility, but competitors are outranking it.`;
      if (comp) s += ` ${comp}.`;
      if (gsc) s += ` Organic signal: ${gsc}.`;
      if (ahrefs) s += ` Demand: ${ahrefs}.`;
      return s;
    }
    case 'add_internal_links': {
      let s = `"${topic}" has ranking potential on NSD but the page appears under-linked internally.`;
      if (row.internal_link_signal_strength) s += ` Internal-link signal: ${row.internal_link_signal_strength}.`;
      if (nsd) s += ` Target page: ${nsd}.`;
      if (gsc) s += ` Organic signal: ${gsc}.`;
      return s;
    }
    case 'pursue_backlinks': {
      let s = `NSD needs more backlinks for "${topic}" to close the authority gap with competitors.`;
      if (comp) s += ` ${comp}`;
      if (auth) s += ` (${auth}).`;
      else if (comp) s += '.';
      if (nsd) s += ` Target NSD page: ${nsd}.`;
      if (ahrefs) s += ` Demand: ${ahrefs}.`;
      return s;
    }
    case 'maintain_paid_support': {
      let s = `Paid ads are driving results for "${topic}" while SEO is still developing.`;
      if (paid) s += ` Current: ${paid}.`;
      if (gsc) s += ` Organic signal: ${gsc}.`;
      s += ` Keep paid support active until organic rankings improve.`;
      return s;
    }
    case 'metadata_ctr_optimization': {
      let s = `NSD ranks for "${topic}" but click-through rate is low relative to impressions.`;
      if (gsc) s += ` Current: ${gsc}.`;
      s += ` Improve the title tag and meta description to increase CTR.`;
      if (nsd) s += ` Page: ${nsd}.`;
      return s;
    }
    case 'hybrid': {
      const secondaryLabel = row.secondary_remedy ? row.secondary_remedy.replace(/_/g, ' ') : 'multiple tactics';
      let s = `"${topic}" needs a combined approach (${secondaryLabel}) to improve NSD's position.`;
      if (comp) s += ` ${comp}.`;
      if (gsc) s += ` Organic: ${gsc}.`;
      if (ahrefs) s += ` Demand: ${ahrefs}.`;
      if (auth) s += ` Competitor authority: ${auth}.`;
      if (paid) s += ` Paid: ${paid}.`;
      return s;
    }
    default: {
      let s = `Optimize NSD's presence for "${topic}."`;
      if (gsc) s += ` Organic signal: ${gsc}.`;
      return s;
    }
  }
}

function buildReason(row: OpportunityRow): string {
  const parts: string[] = [];
  if (row.demand_score > 0) parts.push(`demand score ${fmtDec(row.demand_score)}`);
  if (row.competitive_opportunity_score > 0) parts.push(`competitive gap ${fmtDec(row.competitive_opportunity_score)}`);
  if (row.authority_gap_score > 0) parts.push(`authority gap ${fmtDec(row.authority_gap_score)}`);
  if (row.paid_support_score > 0) parts.push(`paid support ${fmtDec(row.paid_support_score)}`);
  if (row.execution_readiness_score > 0) parts.push(`execution readiness ${fmtDec(row.execution_readiness_score)}`);
  return parts.length
    ? `Scored ${fmtDec(row.total_opportunity_score)} total: ${parts.join(', ')}.`
    : `Scored ${fmtDec(row.total_opportunity_score)} total.`;
}

function resolveActionBadge(row: OpportunityRow): string {
  if (row.rollback_status === 'rolled_back') return 'rolled_back';
  if (row.execution_status === 'published') return 'published';
  if (row.execution_status === 'approved' || row.approval_status === 'approved') return 'approved';
  if (row.awaiting_approval) return 'awaiting_approval';
  if (row.candidate_id) return 'candidate_generated';
  return 'recommendation';
}

export function toRecommendationCard(row: OpportunityRow): RecommendationCard {
  return {
    opportunity_id: row.opportunity_id,
    balanced_rank: Number(row.balanced_rank),
    portfolio_position: row.portfolio_position,
    opportunity_family: row.opportunity_family,
    primary_remedy: row.primary_remedy,
    secondary_remedy: row.secondary_remedy,
    topic_cluster: row.topic_cluster,
    primary_subject: row.primary_subject,
    nsd_page_url: row.nsd_page_url,
    competitor_domain: row.competitor_domain,
    total_opportunity_score: Number(row.total_opportunity_score),
    urgency_band: row.urgency_band,
    data_confidence: row.data_confidence,
    source_freshness_label: row.source_freshness_label,
    confidence_reason: row.confidence_reason,
    recommendation_title: buildTitle(row.primary_remedy, row),
    recommendation_summary: buildSummary(row.primary_remedy, row),
    recommendation_reason: buildReason(row),
    evidence_summary_short: row.evidence_summary_short || '',
    action_state_badge: resolveActionBadge(row),
    ahrefs_search_volume: row.ahrefs_search_volume != null ? Number(row.ahrefs_search_volume) : null,
    ahrefs_keyword_difficulty: row.ahrefs_keyword_difficulty != null ? Number(row.ahrefs_keyword_difficulty) : null,
    ahrefs_cpc: row.ahrefs_cpc != null ? Number(row.ahrefs_cpc) : null,
    gsc_impressions: row.gsc_impressions != null ? Number(row.gsc_impressions) : null,
    gsc_best_position: row.gsc_best_position != null ? Number(row.gsc_best_position) : null,
    ads_cost: row.ads_cost != null ? Number(row.ads_cost) : null,
    ads_conversions: row.ads_conversions != null ? Number(row.ads_conversions) : null,
    competitor_referring_domains: row.competitor_referring_domains != null ? Number(row.competitor_referring_domains) : null,
    competitor_domain_rating: row.competitor_domain_rating != null ? Number(row.competitor_domain_rating) : null,
    internal_link_signal_strength: row.internal_link_signal_strength,
    nsd_ranking_page: row.nsd_ranking_page,
    execution_status: row.execution_status,
    approval_status: row.approval_status,
    candidate_id: row.candidate_id,
    mutation_type: row.mutation_type,
    rollback_status: row.rollback_status,
    recommendation_source: row.recommendation_source ?? null,
    coverage_validated: row.coverage_validated ?? null,
    recommendation_quality_score: row.recommendation_quality_score != null ? Number(row.recommendation_quality_score) : null,
  };
}

export function groupIntoSections(cards: RecommendationCard[]): RecommendationSection[] {
  const executionReady = cards.filter(c => c.action_state_badge === 'awaiting_approval' || c.action_state_badge === 'candidate_generated');
  const recentlyExecuted = cards.filter(c => c.action_state_badge === 'approved' || c.action_state_badge === 'published' || c.action_state_badge === 'rolled_back');
  const topAll = cards.filter(c => c.action_state_badge === 'recommendation').slice(0, 10);
  const quickWins = cards.filter(c => c.action_state_badge === 'recommendation' && c.urgency_band === 'high' && c.total_opportunity_score >= 5);
  const contentPage = cards.filter(c => c.action_state_badge === 'recommendation' && (c.primary_remedy === 'create_new_page' || c.primary_remedy === 'strengthen_existing_page' || c.primary_remedy === 'metadata_ctr_optimization'));
  const authority = cards.filter(c => c.action_state_badge === 'recommendation' && (c.primary_remedy === 'pursue_backlinks' || c.primary_remedy === 'add_internal_links'));
  const paidSupported = cards.filter(c => c.action_state_badge === 'recommendation' && c.primary_remedy === 'maintain_paid_support');

  const sections: RecommendationSection[] = [];

  if (executionReady.length > 0) {
    sections.push({
      section_id: 'execution-ready',
      section_title: 'Awaiting Approval',
      section_description: `${executionReady.length} candidates generated and awaiting review.`,
      items: executionReady.slice(0, 20),
    });
  }

  if (recentlyExecuted.length > 0) {
    sections.push({
      section_id: 'recently-executed',
      section_title: 'Recently Executed',
      section_description: `${recentlyExecuted.length} recommendations with execution activity.`,
      items: recentlyExecuted.slice(0, 20),
    });
  }

  sections.push({
    section_id: 'top-opportunities',
    section_title: 'Top Opportunities',
    section_description: `Highest-ranked opportunities from the balanced queue.`,
    items: topAll,
  });

  if (quickWins.length > 0) {
    sections.push({
      section_id: 'quick-wins',
      section_title: 'Quick Wins',
      section_description: `${quickWins.length} high-urgency, high-score opportunities for immediate action.`,
      items: quickWins.slice(0, 20),
    });
  }

  if (contentPage.length > 0) {
    sections.push({
      section_id: 'content-page',
      section_title: 'Page and Content Opportunities',
      section_description: `${contentPage.length} opportunities to create, strengthen, or optimize page content.`,
      items: contentPage.slice(0, 30),
    });
  }

  if (authority.length > 0) {
    sections.push({
      section_id: 'authority-outreach',
      section_title: 'Authority and Outreach',
      section_description: `${authority.length} backlink and internal-link opportunities.`,
      items: authority.slice(0, 30),
    });
  }

  if (paidSupported.length > 0) {
    sections.push({
      section_id: 'paid-supported',
      section_title: 'Paid-Supported',
      section_description: `${paidSupported.length} opportunities where paid is bridging organic gaps.`,
      items: paidSupported,
    });
  }

  return sections;
}
