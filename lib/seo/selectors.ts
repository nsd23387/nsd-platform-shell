/**
 * SEO Intelligence Domain - Selectors (v1)
 * 
 * Pure functions for deriving state from SEO data.
 * Aligned with the canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - All selectors are pure functions (no side effects)
 * - All selectors operate on read-only data
 * - No selectors may trigger data mutations
 * 
 * NOT ALLOWED:
 * - Side effects
 * - API calls
 * - State mutations
 * - CMS data access
 */

import type {
  SeoPage,
  SeoQuery,
  SeoRecommendation,
  SeoSnapshot,
  SeoAuditEntry,
  RecommendationStatus,
  RiskLevel,
  SeoRecommendationType,
  IndexStatus,
  CoreWebVitals,
  SeoMetricsSummary,
  SeoIntentTarget,
  ConfidenceModel,
  LearningVerdict,
} from './types';

import {
  CONFIDENCE_THRESHOLDS,
  POSITION_THRESHOLDS,
  CWV_THRESHOLDS,
} from './constants';

// ============================================
// Page Selectors
// ============================================

/**
 * Filter pages by index status.
 */
export function selectPagesByIndexStatus(
  pages: readonly SeoPage[],
  status: IndexStatus
): readonly SeoPage[] {
  // NOT IMPLEMENTED - Stub only
  // This function will filter pages by their indexing status
  throw new Error('NotImplemented: selectPagesByIndexStatus');
}

/**
 * Filter pages by intent target.
 */
export function selectPagesByIntentTarget(
  pages: readonly SeoPage[],
  target: SeoIntentTarget
): readonly SeoPage[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectPagesByIntentTarget');
}

/**
 * Get pages that have pending recommendations.
 */
export function selectPagesWithPendingRecommendations(
  pages: readonly SeoPage[],
  recommendations: readonly SeoRecommendation[]
): readonly SeoPage[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectPagesWithPendingRecommendations');
}

/**
 * Sort pages by organic traffic (from latest snapshot).
 */
export function selectPagesByTraffic(
  pages: readonly SeoPage[],
  snapshots: readonly SeoSnapshot[],
  order: 'asc' | 'desc' = 'desc'
): readonly SeoPage[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectPagesByTraffic');
}

// ============================================
// Query Selectors
// ============================================

/**
 * Get top performing queries by clicks.
 */
export function selectTopQueriesByClicks(
  queries: readonly SeoQuery[],
  limit: number = 10
): readonly SeoQuery[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectTopQueriesByClicks');
}

/**
 * Get queries with improvement opportunity (position 4-20).
 */
export function selectQueriesWithOpportunity(
  queries: readonly SeoQuery[]
): readonly SeoQuery[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectQueriesWithOpportunity');
}

/**
 * Calculate average position across all queries.
 */
export function selectAveragePosition(
  queries: readonly SeoQuery[]
): number | null {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectAveragePosition');
}

// ============================================
// Recommendation Selectors
// ============================================

/**
 * Filter recommendations by status.
 */
export function selectRecommendationsByStatus(
  recommendations: readonly SeoRecommendation[],
  status: RecommendationStatus
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsByStatus');
}

/**
 * Get high-impact recommendations that need review.
 * Based on risk level and confidence.
 */
export function selectHighImpactPendingRecommendations(
  recommendations: readonly SeoRecommendation[]
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectHighImpactPendingRecommendations');
}

/**
 * Filter recommendations by confidence threshold.
 */
export function selectRecommendationsByConfidence(
  recommendations: readonly SeoRecommendation[],
  minConfidence: number
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsByConfidence');
}

/**
 * Filter recommendations by risk level.
 */
export function selectRecommendationsByRiskLevel(
  recommendations: readonly SeoRecommendation[],
  riskLevel: RiskLevel
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsByRiskLevel');
}

/**
 * Group recommendations by type.
 */
export function selectRecommendationsGroupedByType(
  recommendations: readonly SeoRecommendation[]
): Record<SeoRecommendationType, readonly SeoRecommendation[]> {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsGroupedByType');
}

/**
 * Get recommendations for a specific page.
 */
export function selectRecommendationsForPage(
  recommendations: readonly SeoRecommendation[],
  pageId: string
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsForPage');
}

/**
 * Sort recommendations by expected impact (primary success metric).
 */
export function selectRecommendationsByImpact(
  recommendations: readonly SeoRecommendation[],
  order: 'asc' | 'desc' = 'desc'
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsByImpact');
}

/**
 * Get recommendations with learning outcomes.
 */
export function selectRecommendationsWithOutcomes(
  recommendations: readonly SeoRecommendation[]
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsWithOutcomes');
}

/**
 * Get recommendations by learning verdict.
 */
export function selectRecommendationsByVerdict(
  recommendations: readonly SeoRecommendation[],
  verdict: LearningVerdict
): readonly SeoRecommendation[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationsByVerdict');
}

// ============================================
// Snapshot Selectors
// ============================================

/**
 * Get the latest snapshot for a page.
 */
export function selectLatestSnapshot(
  snapshots: readonly SeoSnapshot[],
  pageId: string
): SeoSnapshot | null {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectLatestSnapshot');
}

/**
 * Get snapshot history for a page (chronological order).
 */
export function selectSnapshotHistory(
  snapshots: readonly SeoSnapshot[],
  pageId: string
): readonly SeoSnapshot[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectSnapshotHistory');
}

/**
 * Calculate traffic trend (percentage change).
 */
export function selectTrafficTrend(
  snapshots: readonly SeoSnapshot[],
  pageId: string
): { change: number; direction: 'up' | 'down' | 'stable' } | null {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectTrafficTrend');
}

// ============================================
// Core Web Vitals Selectors
// ============================================

/**
 * Classify CWV status (good, needs improvement, poor).
 */
export function selectCwvStatus(
  cwv: CoreWebVitals | null
): 'good' | 'needs_improvement' | 'poor' | 'unknown' {
  if (!cwv) {
    return 'unknown';
  }
  
  // Check if any metric is in "poor" range
  if (cwv.lcp !== null && cwv.lcp > CWV_THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
    return 'poor';
  }
  if (cwv.fid !== null && cwv.fid > CWV_THRESHOLDS.FID.NEEDS_IMPROVEMENT) {
    return 'poor';
  }
  if (cwv.cls !== null && cwv.cls > CWV_THRESHOLDS.CLS.NEEDS_IMPROVEMENT) {
    return 'poor';
  }
  
  // Check if any metric needs improvement
  if (cwv.lcp !== null && cwv.lcp > CWV_THRESHOLDS.LCP.GOOD) {
    return 'needs_improvement';
  }
  if (cwv.fid !== null && cwv.fid > CWV_THRESHOLDS.FID.GOOD) {
    return 'needs_improvement';
  }
  if (cwv.cls !== null && cwv.cls > CWV_THRESHOLDS.CLS.GOOD) {
    return 'needs_improvement';
  }
  
  return 'good';
}

/**
 * Get pages with poor Core Web Vitals.
 */
export function selectPagesWithPoorCwv(
  pages: readonly SeoPage[],
  snapshots: readonly SeoSnapshot[]
): readonly SeoPage[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectPagesWithPoorCwv');
}

// ============================================
// Audit Selectors
// ============================================

/**
 * Get audit entries for a specific entity.
 */
export function selectAuditEntriesForEntity(
  entries: readonly SeoAuditEntry[],
  entityType: SeoAuditEntry['entity_type'],
  entityId: string
): readonly SeoAuditEntry[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectAuditEntriesForEntity');
}

/**
 * Get recent audit entries.
 */
export function selectRecentAuditEntries(
  entries: readonly SeoAuditEntry[],
  limit: number = 50
): readonly SeoAuditEntry[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecentAuditEntries');
}

/**
 * Get audit entries by user.
 */
export function selectAuditEntriesByUser(
  entries: readonly SeoAuditEntry[],
  userId: string
): readonly SeoAuditEntry[] {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectAuditEntriesByUser');
}

// ============================================
// Summary Selectors
// ============================================

/**
 * Compute overall SEO metrics summary.
 */
export function selectMetricsSummary(
  pages: readonly SeoPage[],
  queries: readonly SeoQuery[],
  recommendations: readonly SeoRecommendation[]
): SeoMetricsSummary {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectMetricsSummary');
}

/**
 * Get recommendation status counts.
 */
export function selectRecommendationStatusCounts(
  recommendations: readonly SeoRecommendation[]
): Record<RecommendationStatus, number> {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationStatusCounts');
}

/**
 * Get recommendation type distribution.
 */
export function selectRecommendationTypeDistribution(
  recommendations: readonly SeoRecommendation[]
): Record<SeoRecommendationType, number> {
  // NOT IMPLEMENTED - Stub only
  throw new Error('NotImplemented: selectRecommendationTypeDistribution');
}

// ============================================
// Confidence Selectors
// ============================================

/**
 * Classify confidence level from score.
 */
export function selectConfidenceLevel(
  confidence: number
): 'low' | 'medium' | 'high' {
  if (confidence < CONFIDENCE_THRESHOLDS.LOW) {
    return 'low';
  }
  if (confidence < CONFIDENCE_THRESHOLDS.HIGH) {
    return 'medium';
  }
  return 'high';
}

/**
 * Classify confidence level from model.
 */
export function selectConfidenceLevelFromModel(
  model: ConfidenceModel
): 'low' | 'medium' | 'high' {
  return selectConfidenceLevel(model.score);
}

/**
 * Get top confidence factors.
 */
export function selectTopConfidenceFactors(
  model: ConfidenceModel,
  limit: number = 3
): ConfidenceModel['factors'] {
  // Sort by weighted value (weight * value) and take top N
  return [...model.factors]
    .sort((a, b) => (b.weight * b.value) - (a.weight * a.value))
    .slice(0, limit);
}

/**
 * Classify position quality.
 */
export function selectPositionQuality(
  position: number | null
): 'top' | 'page_one' | 'page_two' | 'low' | 'unknown' {
  if (position === null) {
    return 'unknown';
  }
  if (position <= POSITION_THRESHOLDS.TOP) {
    return 'top';
  }
  if (position <= POSITION_THRESHOLDS.PAGE_ONE) {
    return 'page_one';
  }
  if (position <= POSITION_THRESHOLDS.PAGE_TWO) {
    return 'page_two';
  }
  return 'low';
}

// ============================================
// Risk Selectors
// ============================================

/**
 * Classify risk level for sorting/filtering.
 */
export function selectRiskPriority(level: RiskLevel): number {
  switch (level) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

/**
 * Sort recommendations by risk (highest first).
 */
export function selectRecommendationsSortedByRisk(
  recommendations: readonly SeoRecommendation[],
  order: 'asc' | 'desc' = 'desc'
): readonly SeoRecommendation[] {
  const sorted = [...recommendations].sort((a, b) => {
    const aPriority = selectRiskPriority(a.risk.level);
    const bPriority = selectRiskPriority(b.risk.level);
    return bPriority - aPriority;
  });
  
  return order === 'desc' ? sorted : sorted.reverse();
}

// ============================================
// Evidence Selectors
// ============================================

/**
 * Get unique evidence sources from a recommendation.
 */
export function selectEvidenceSources(
  recommendation: SeoRecommendation
): readonly string[] {
  const sources = new Set(
    recommendation.evidence.signals.map(s => s.source)
  );
  return Array.from(sources);
}

/**
 * Check if recommendation has strong conversion signals.
 */
export function selectHasStrongConversionSignals(
  recommendation: SeoRecommendation
): boolean {
  const conversionSources = ['quote_app', 'woocommerce', 'ga4'];
  return recommendation.evidence.signals.some(
    s => conversionSources.includes(s.source)
  );
}

// ============================================
// Learning Outcome Selectors
// ============================================

/**
 * Calculate learning success rate from recommendations.
 */
export function selectLearningSuccessRate(
  recommendations: readonly SeoRecommendation[]
): number | null {
  const withOutcomes = recommendations.filter(r => r.learning);
  if (withOutcomes.length === 0) {
    return null;
  }
  
  const positiveCount = withOutcomes.filter(
    r => r.learning?.verdict === 'positive'
  ).length;
  
  return positiveCount / withOutcomes.length;
}
