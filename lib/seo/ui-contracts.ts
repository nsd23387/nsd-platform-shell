/**
 * SEO Intelligence - UI Integration Contracts
 * 
 * UI-facing helper types derived from the canonical schema.
 * These types are optimized for list rendering and UI consumption:
 * - Exclude large blobs (evidence details, schema JSON)
 * - Flatten nested structures where helpful
 * - Add computed/derived fields for display
 * 
 * GOVERNANCE:
 * - These types are derived from canonical schema (lib/seo/types.ts)
 * - They do not add new data, only reshape existing data
 * - All data flows from ODS through server layer
 * 
 * NON-GOALS:
 * - This system does NOT execute SEO changes
 * - This system does NOT modify website content
 * - This system ONLY proposes and governs decisions
 * - All execution happens externally (e.g., website repo via PR)
 */

import type {
  SeoRecommendation,
  SeoRecommendationType,
  SeoPageType,
  SeoIntentTarget,
  RecommendationStatus,
  RiskLevel,
  ApprovalDecision,
  UUID,
  IsoUtcTimestamp,
} from './types';

// ============================================
// Recommendation Summary (List View)
// ============================================

/**
 * Lightweight recommendation summary for list rendering.
 * Excludes large blobs like evidence details and schema JSON.
 */
export interface SeoRecommendationSummary {
  /** Recommendation UUID */
  readonly id: UUID;
  
  /** Recommendation type */
  readonly type: SeoRecommendationType;
  
  /** Current lifecycle status */
  readonly status: RecommendationStatus;
  
  // --- Scope (flattened) ---
  /** Target page ID */
  readonly page_id: string;
  /** Target page URL */
  readonly url: string;
  /** Page type */
  readonly page_type: SeoPageType;
  /** Intent segment */
  readonly intent_target: SeoIntentTarget;
  
  // --- Confidence (flattened) ---
  /** Confidence score (0-1) */
  readonly confidence_score: number;
  /** Confidence explanation */
  readonly confidence_explanation: string;
  
  // --- Risk (flattened) ---
  /** Risk level */
  readonly risk_level: RiskLevel;
  /** Rollback complexity */
  readonly rollback_complexity: 'simple' | 'moderate' | 'complex';
  
  // --- Impact (flattened) ---
  /** Primary success metric */
  readonly primary_success_metric?: string;
  /** CTR lift estimate */
  readonly ctr_lift_percent?: string;
  /** Ranking change estimate */
  readonly ranking_change_estimate?: string;
  /** Revenue estimate */
  readonly monthly_revenue_estimate?: string;
  
  // --- Evidence (summary only) ---
  /** Evidence summary text */
  readonly evidence_summary: string;
  /** Number of evidence signals */
  readonly evidence_signal_count: number;
  /** Evidence time window */
  readonly evidence_time_window: {
    readonly start_date: string;
    readonly end_date: string;
  };
  
  // --- Proposed change (preview only) ---
  /** Proposed title (if applicable) */
  readonly proposed_title?: string;
  /** Proposed description (if applicable) */
  readonly proposed_description?: string;
  /** Rationale text */
  readonly rationale: string;
  
  // --- Timestamps ---
  readonly created_at: IsoUtcTimestamp;
  readonly updated_at: IsoUtcTimestamp;
  
  // --- Approval info (if decided) ---
  readonly approval_decision?: ApprovalDecision;
  readonly approval_decided_by?: string;
  readonly approval_decided_at?: IsoUtcTimestamp;
}

/**
 * Convert full recommendation to summary for list rendering.
 */
export function toRecommendationSummary(
  rec: SeoRecommendation
): SeoRecommendationSummary {
  return {
    id: rec.id,
    type: rec.type,
    status: rec.status,
    
    // Scope
    page_id: rec.scope.page_id,
    url: rec.scope.url,
    page_type: rec.scope.page_type,
    intent_target: rec.scope.intent_target,
    
    // Confidence
    confidence_score: rec.confidence.score,
    confidence_explanation: rec.confidence.explanation,
    
    // Risk
    risk_level: rec.risk.level,
    rollback_complexity: rec.risk.rollback_complexity,
    
    // Impact
    primary_success_metric: rec.expected_impact.primary_success_metric,
    ctr_lift_percent: rec.expected_impact.seo_metrics?.ctr_lift_percent,
    ranking_change_estimate: rec.expected_impact.seo_metrics?.ranking_change_estimate,
    monthly_revenue_estimate: rec.expected_impact.revenue_metrics?.monthly_revenue_estimate,
    
    // Evidence (summary only)
    evidence_summary: rec.evidence.summary,
    evidence_signal_count: rec.evidence.signals.length,
    evidence_time_window: rec.evidence.time_window,
    
    // Proposed change (preview)
    proposed_title: rec.proposed_state.metadata?.title,
    proposed_description: rec.proposed_state.metadata?.description,
    rationale: rec.proposed_state.rationale,
    
    // Timestamps
    created_at: rec.created_at,
    updated_at: rec.updated_at,
    
    // Approval info
    approval_decision: rec.approval?.decision,
    approval_decided_by: rec.approval?.decided_by,
    approval_decided_at: rec.approval?.decided_at,
  };
}

// ============================================
// Approval Action Input
// ============================================

/**
 * Input type for approval actions from UI.
 */
export interface SeoApprovalActionInput {
  /** The action to perform */
  readonly action: ApprovalDecision;
  /** Target recommendation ID */
  readonly recommendationId: UUID;
  /** Optional notes (for approve) */
  readonly notes?: string;
  /** Required reason (for reject) */
  readonly reason?: string;
  /** Required date (for defer) */
  readonly deferUntil?: IsoUtcTimestamp;
}

/**
 * Validate approval action input from UI.
 */
export function validateApprovalActionInput(
  input: SeoApprovalActionInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.action) {
    errors.push('Action is required');
  } else if (!['approve', 'reject', 'defer'].includes(input.action)) {
    errors.push('Action must be approve, reject, or defer');
  }

  if (!input.recommendationId) {
    errors.push('Recommendation ID is required');
  }

  if (input.action === 'reject' && !input.reason) {
    errors.push('Reason is required for rejection');
  }

  if (input.action === 'defer' && !input.deferUntil) {
    errors.push('Defer until date is required for deferral');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// Page Summary (List View)
// ============================================

/**
 * Lightweight page summary for list rendering.
 */
export interface SeoPageSummary {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly page_type: SeoPageType;
  readonly intent_target: SeoIntentTarget;
  readonly index_status: string;
  readonly last_crawled_at: IsoUtcTimestamp | null;
  readonly pending_recommendations_count: number;
}

// ============================================
// Dashboard Stats
// ============================================

/**
 * Dashboard statistics for overview display.
 */
export interface SeoDashboardStats {
  /** Total recommendations */
  readonly total_recommendations: number;
  /** Pending review count */
  readonly pending_count: number;
  /** Approved count */
  readonly approved_count: number;
  /** Rejected count */
  readonly rejected_count: number;
  /** Implemented count */
  readonly implemented_count: number;
  /** Average confidence score */
  readonly avg_confidence: number | null;
  /** High-impact pending count */
  readonly high_impact_pending_count: number;
  /** Recommendations by type */
  readonly by_type: Record<SeoRecommendationType, number>;
  /** Recommendations by risk level */
  readonly by_risk: Record<RiskLevel, number>;
}

// ============================================
// Diff View Data
// ============================================

/**
 * Structured diff data for recommendation review UI.
 */
export interface SeoRecommendationDiff {
  readonly recommendation_id: UUID;
  readonly type: SeoRecommendationType;
  
  /** What's changing */
  readonly change_type: 'metadata' | 'content' | 'internal_links' | 'schema';
  
  /** Current state snapshot */
  readonly current: {
    readonly title?: string;
    readonly description?: string;
    readonly h1?: string;
    readonly h2s?: readonly string[];
    readonly internal_links?: readonly string[];
    readonly schema_types?: readonly string[];
  };
  
  /** Proposed state */
  readonly proposed: {
    readonly title?: string;
    readonly description?: string;
    readonly h1?: string;
    readonly h2s?: readonly string[];
    readonly internal_links?: readonly string[];
    readonly schema_types?: readonly string[];
  };
  
  /** Character count changes */
  readonly char_diff?: {
    readonly title_diff?: number;
    readonly description_diff?: number;
  };
}

/**
 * Extract diff data from a recommendation.
 */
export function extractRecommendationDiff(
  rec: SeoRecommendation
): SeoRecommendationDiff {
  // Determine change type based on allowed_changes
  let changeType: SeoRecommendationDiff['change_type'] = 'metadata';
  if (rec.scope.allowed_changes.includes('copy_only')) {
    changeType = 'content';
  } else if (rec.scope.allowed_changes.includes('internal_links_only')) {
    changeType = 'internal_links';
  } else if (rec.scope.allowed_changes.includes('schema_only')) {
    changeType = 'schema';
  }

  const current = rec.current_state;
  const proposed = rec.proposed_state;

  // Calculate char diffs for metadata
  const titleDiff = proposed.metadata?.title && current.metadata?.title
    ? proposed.metadata.title.length - current.metadata.title.length
    : undefined;
  const descDiff = proposed.metadata?.description && current.metadata?.description
    ? proposed.metadata.description.length - current.metadata.description.length
    : undefined;

  return {
    recommendation_id: rec.id,
    type: rec.type,
    change_type: changeType,
    current: {
      title: current.metadata?.title,
      description: current.metadata?.description,
      h1: current.headings?.h1,
      h2s: current.headings?.h2,
      internal_links: current.internal_links,
      schema_types: current.schema?.types,
    },
    proposed: {
      title: proposed.metadata?.title,
      description: proposed.metadata?.description,
      h1: proposed.headings?.h1,
      h2s: proposed.headings?.h2,
      internal_links: proposed.internal_links,
      schema_types: proposed.schema?.types,
    },
    char_diff: titleDiff !== undefined || descDiff !== undefined
      ? { title_diff: titleDiff, description_diff: descDiff }
      : undefined,
  };
}

// ============================================
// Exports
// ============================================

export type {
  SeoRecommendation,
  SeoRecommendationType,
  RecommendationStatus,
  RiskLevel,
  ApprovalDecision,
} from './types';
