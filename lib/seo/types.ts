/**
 * NSD SEO Intelligence — Type Definitions (v1)
 * 
 * Core type contracts for the SEO Intelligence system.
 * These types define the data shapes used throughout the SEO domain.
 * 
 * Target-State Alignment:
 * - Governance-first: recommendations are proposals, never actions
 * - Read-only by default: ODS is the system of record; this schema mirrors ODS entities
 * - Explicit approvals: only approval decisions may be written (and must be auditable)
 * - No execution authority: implementation is tracked as reference to external execution
 * 
 * Canonical System / ODS API Alignment:
 * - page_id should align to canonical ODS identifiers (preferred) or deterministic URL hash
 * - recommendation_id is a durable UUID to link: approvals, audit events, implementation, outcomes
 * - All timestamps are ISO8601 UTC strings
 * 
 * Non-Goals (v1):
 * - No autonomous publishing
 * - No CMS write-back
 * - No direct mutations to website repo
 * - No background jobs/workers (those belong in future execution/analytics repos)
 */

// ============================================
// Primitive Types
// ============================================

/** ISO 8601 UTC timestamp, e.g. "2026-01-17T22:15:04.123Z" */
export type IsoUtcTimestamp = string;

/** UUID string for durable identifiers */
export type UUID = string;

// ============================================
// Enumeration Types
// ============================================

/**
 * High-level classification of SEO recommendation families (v1).
 * Keep this enum small and stable; add only when a new family is truly required.
 */
export type SeoRecommendationType =
  | 'meta_title_optimization'
  | 'meta_description_optimization'
  | 'heading_structure_alignment'
  | 'intent_alignment'
  | 'internal_linking'
  | 'content_gap'
  | 'cannibalization_resolution'
  | 'schema_enhancement'
  | 'page_consolidation'
  | 'noindex_suggestion';

/**
 * Page types used across NSD web surfaces.
 * Maps to canonical taxonomy (ODS or platform taxonomy).
 */
export type SeoPageType =
  | 'product'
  | 'category'
  | 'landing'
  | 'city'
  | 'industry'
  | 'blog';

/**
 * Intent segments aligned to NSD segmentation strategy.
 * Use consistently across SEO, paid, and on-site funnels.
 */
export type SeoIntentTarget = 'B2C' | 'B2B' | 'Wholesale';

/**
 * Allowed change scopes (guardrails).
 * Intentionally restrictive to keep v1 low-risk and diff-friendly.
 */
export type AllowedChange =
  | 'metadata_only'
  | 'copy_only'
  | 'internal_links_only'
  | 'schema_only';

/**
 * Recommendation lifecycle status.
 * NOTE: "implemented" indicates "execution confirmed elsewhere", not executed by this system.
 */
export type RecommendationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'implemented'
  | 'rolled_back';

/**
 * Evidence sources (channels) used to justify recommendations.
 * Maps to canonical ingestion sources if/when persisted to activity.events.
 */
export type EvidenceSource =
  | 'google_search_console'
  | 'ga4'
  | 'quote_app'
  | 'woocommerce'
  | 'ads'
  | 'social';

/**
 * Risk level for admin decisioning.
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Approval decision types.
 */
export type ApprovalDecision = 'approve' | 'reject' | 'defer';

/**
 * Implementation method classification.
 * "ai_generated_diff" means a diff/PR was generated (e.g., via Codex), still requires human merge.
 */
export type ImplementationMethod = 'manual' | 'ai_generated_diff';

/**
 * Learning verdict for outcome tracking (post-implementation).
 */
export type LearningVerdict = 'positive' | 'neutral' | 'negative';

/**
 * Confidence factor names for explainable AI.
 */
export type ConfidenceFactorName =
  | 'historical_similarity'
  | 'query_volume'
  | 'conversion_signal_strength'
  | 'prior_success_rate'
  | 'data_completeness'
  | 'risk_penalty';

// ============================================
// Legacy Type Aliases (for backward compatibility)
// ============================================

/** @deprecated Use SeoPageType instead */
export type PageType = SeoPageType | 'support' | 'legal' | 'other';

/** @deprecated Use RecommendationStatus instead */
export type ApprovalStatus = RecommendationStatus;

/** @deprecated Use SeoRecommendationType instead */
export type RecommendationType = SeoRecommendationType | 'title_optimization' | 'meta_description' | 'heading_structure' | 'schema_markup' | 'image_optimization' | 'url_structure';

/** @deprecated Use RiskLevel instead */
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// Supporting Entity Types
// ============================================

export type IndexStatus = 'indexed' | 'not_indexed' | 'pending' | 'blocked' | 'unknown';

export type QueryIntent =
  | 'navigational'
  | 'informational'
  | 'transactional'
  | 'commercial';

export type AuditAction =
  | 'recommendation_generated'
  | 'recommendation_approved'
  | 'recommendation_rejected'
  | 'recommendation_deferred'
  | 'recommendation_implemented'
  | 'recommendation_rolled_back'
  | 'recommendation_outcome_measured'
  | 'snapshot_captured'
  | 'page_added'
  | 'query_tracked';

// ============================================
// Canonical Recommendation Contract (v1)
// ============================================

/**
 * Canonical interface for SEO recommendations across:
 * - Admin UI (review/approve)
 * - ODS API persistence
 * - Future diff-generation automation (Codex-style, proposal-only)
 * - Audit logs / activity events references
 */
export interface SeoRecommendation {
  /** Durable identifier used to link approvals, audit events, and outcomes */
  readonly id: UUID;

  /** Family/type of recommendation */
  readonly type: SeoRecommendationType;

  /** Tight scope definition for governance and future automation */
  readonly scope: SeoRecommendationScope;

  /** Observable evidence across channels (GSC, GA4, Quote funnel, revenue) */
  readonly evidence: SeoEvidence;

  /** Snapshot of current on-page state the recommendation is based on */
  readonly current_state: SeoCurrentState;

  /** Proposed state (diff-ready), plus rationale */
  readonly proposed_state: SeoProposedState;

  /** Confidence model (explainable) */
  readonly confidence: ConfidenceModel;

  /** Expected impact estimates (business-first) */
  readonly expected_impact: ExpectedImpact;

  /** Risk assessment, must be shown in Admin UI */
  readonly risk: RiskAssessment;

  /** Lifecycle status */
  readonly status: RecommendationStatus;

  /** Approval record is present once decided */
  readonly approval?: ApprovalRecord;

  /** Implementation record is present once the approved change is executed elsewhere */
  readonly implementation?: ImplementationRecord;

  /** Learning outcome is present once evaluation window passes and impact is measured */
  readonly learning?: LearningOutcome;

  /** Traceability metadata */
  readonly metadata: RecommendationMetadata;

  readonly created_at: IsoUtcTimestamp;
  readonly updated_at: IsoUtcTimestamp;
}

/**
 * Recommendation Scope
 * - Must map to canonical ODS entities
 * - page_id: prefer canonical page identifier if stored in ODS
 */
export interface SeoRecommendationScope {
  /** Canonical ODS page id OR deterministic url hash (stable) */
  readonly page_id: string;
  /** Canonical URL string (normalized) */
  readonly url: string;
  readonly page_type: SeoPageType;
  readonly intent_target: SeoIntentTarget;

  /**
   * Strictly defines what the diff/implementation is allowed to touch.
   * Governance guardrail and future automation constraint.
   */
  readonly allowed_changes: readonly AllowedChange[];

  /**
   * If recommendation touches multiple URLs (e.g., consolidation/cannibalization).
   * Primary in url/page_id; additional targets here.
   */
  readonly related_pages?: readonly RelatedPage[];
}

export interface RelatedPage {
  readonly page_id: string;
  readonly url: string;
  readonly relationship:
    | 'duplicate_of'
    | 'cannibalizes'
    | 'should_link_to'
    | 'should_merge_with';
}

// ============================================
// Evidence Contract
// ============================================

/**
 * Evidence supporting a recommendation.
 * v1 supports collection of metrics-based signals.
 */
export interface SeoEvidence {
  readonly time_window: {
    readonly start_date: string; // YYYY-MM-DD
    readonly end_date: string; // YYYY-MM-DD
  };

  /** Individual signals used to justify recommendation */
  readonly signals: readonly EvidenceSignal[];

  /**
   * Human-readable justification (must cite key signals and explain intent).
   * Shown in Admin UI.
   */
  readonly summary: string;

  /**
   * Top triggering queries (from GSC) and top converting queries (from GA4/attribution).
   * Enable explainability and link to query views.
   */
  readonly top_queries?: {
    readonly triggering?: readonly string[]; // high impressions / low CTR
    readonly converting?: readonly string[]; // high conversion/revenue contribution
  };
}

export interface EvidenceSignal {
  readonly source: EvidenceSource;

  /**
   * Canonical metric name.
   * Examples:
   * - "gsc.impressions", "gsc.clicks", "gsc.ctr", "gsc.avg_position"
   * - "ga4.sessions", "ga4.engagement_rate"
   * - "quote.starts", "quote.submissions"
   * - "wc.revenue", "wc.orders"
   */
  readonly metric: string;

  /** Current observed value and optional prior value (for deltas) */
  readonly current_value: number | string;
  readonly prior_value?: number | string;

  /** Optional derived delta (percentage or absolute) */
  readonly delta?: number | string;

  /** Optional note to clarify interpretation */
  readonly note?: string;
}

// ============================================
// Current & Proposed State
// ============================================

/**
 * Current State - Snapshot of on-page representation relevant to SEO.
 * Keep sparse; include only what is required for the recommendation family.
 */
export interface SeoCurrentState {
  readonly snapshot_at: IsoUtcTimestamp;

  readonly metadata?: {
    readonly title?: string;
    readonly description?: string;
    readonly canonical_url?: string;
    readonly robots?: string; // e.g., "index,follow"
  };

  readonly headings?: {
    readonly h1?: string;
    readonly h2?: readonly string[];
    readonly h3?: readonly string[];
  };

  readonly internal_links?: readonly string[]; // URLs

  readonly schema?: {
    readonly types?: readonly string[]; // e.g., ["FAQPage","Product"]
    readonly notes?: string;
  };

  readonly content_notes?: {
    readonly word_count_estimate?: number;
    readonly key_sections?: readonly string[];
  };
}

/**
 * Proposed State - Diff-ready target values.
 * Must respect allowed_changes constraints.
 */
export interface SeoProposedState {
  readonly metadata?: {
    readonly title?: string;
    readonly description?: string;
    readonly canonical_url?: string;
    readonly robots?: string;
  };

  readonly headings?: {
    readonly h1?: string;
    readonly h2?: readonly string[];
    readonly h3?: readonly string[];
  };

  readonly internal_links?: readonly string[];

  readonly schema?: {
    readonly types?: readonly string[];
    /** Schema block if website repo uses structured schema configs (proposal only) */
    readonly suggested_schema_jsonld?: Record<string, unknown>;
  };

  readonly content_notes?: {
    readonly suggested_sections?: readonly SuggestedContentSection[];
  };

  /**
   * Rationale is mandatory: why this change is expected to help,
   * referencing evidence and intent alignment.
   */
  readonly rationale: string;
}

export interface SuggestedContentSection {
  readonly heading: string;
  readonly bullets: readonly string[];
}

// ============================================
// Confidence Model (Explainable)
// ============================================

/**
 * Confidence model with explainable factors.
 */
export interface ConfidenceModel {
  /** Score 0..1 */
  readonly score: number;

  /**
   * Factors must be stable and interpretable.
   * Value and weight are 0..1 and can compute the score.
   */
  readonly factors: readonly ConfidenceFactor[];

  /** Short explanation tying factors to evidence */
  readonly explanation: string;
}

export interface ConfidenceFactor {
  readonly name: ConfidenceFactorName;
  /** Weight 0..1 */
  readonly weight: number;
  /** Value 0..1 */
  readonly value: number;
}

// ============================================
// Expected Impact (Business-first)
// ============================================

/**
 * Expected impact estimates.
 * Ranges are strings to avoid false precision and align with explainability.
 */
export interface ExpectedImpact {
  readonly seo_metrics?: {
    readonly ctr_lift_percent?: string; // e.g., "5–10%"
    readonly impressions_change?: string; // e.g., "0–5%"
    readonly ranking_change_estimate?: string; // e.g., "+1–3 positions"
  };

  readonly conversion_metrics?: {
    readonly quote_start_lift?: string; // e.g., "10–20%"
    readonly conversion_rate_lift?: string; // e.g., "0.3–0.7pp"
  };

  readonly revenue_metrics?: {
    readonly revenue_per_session_lift?: string; // e.g., "10–25%"
    readonly monthly_revenue_estimate?: string; // e.g., "$2k–$8k"
  };

  /** Primary metric this recommendation optimizes for (useful for sorting) */
  readonly primary_success_metric?: 'ctr' | 'ranking' | 'quote_starts' | 'conversion_rate' | 'revenue';
}

// ============================================
// Risk Assessment
// ============================================

/**
 * Risk assessment - must be present for every recommendation.
 */
export interface RiskAssessment {
  readonly level: RiskLevel;
  readonly reasons: readonly string[];
  readonly rollback_complexity: 'simple' | 'moderate' | 'complex';
}

// ============================================
// Approval Record
// ============================================

/**
 * Approval record - only human decisions create/modify this.
 * Maps to ODS approvals table + optionally mirrored to activity.events.
 */
export interface ApprovalRecord {
  readonly decision: ApprovalDecision;
  /** User id / email */
  readonly decided_by: string;
  readonly decided_at: IsoUtcTimestamp;
  readonly notes?: string;
}

// ============================================
// Implementation Record
// ============================================

/**
 * Implementation record - tracks that approved recommendation has been executed elsewhere.
 * Never implies this system performed the change.
 */
export interface ImplementationRecord {
  readonly method: ImplementationMethod;

  /** Repo where change was implemented, e.g., "nsd-website" */
  readonly repo?: string;
  /** Link to PR implementing this recommendation */
  readonly pr_url?: string;
  /** Merged commit reference */
  readonly commit_hash?: string;

  /** User id / email */
  readonly implemented_by?: string;
  readonly implemented_at?: IsoUtcTimestamp;

  /** Rollback references */
  readonly rollback_pr_url?: string;
  readonly rolled_back_at?: IsoUtcTimestamp;
}

// ============================================
// Learning Outcome
// ============================================

/**
 * Learning outcome - recorded after evaluation window (e.g., 14/30 days).
 * Enables compounding improvements (what works for NSD specifically).
 */
export interface LearningOutcome {
  readonly evaluation_window_days: number;

  readonly observed_impact: {
    readonly ctr_change?: number; // e.g., +0.012 for +1.2pp
    readonly ranking_change?: number; // negative is worse, positive is better
    readonly quote_start_change?: number;
    readonly conversion_rate_change?: number;
    readonly revenue_change?: number;
  };

  readonly verdict: LearningVerdict;
  readonly notes?: string;

  readonly measured_at: IsoUtcTimestamp;
}

// ============================================
// Recommendation Metadata
// ============================================

/**
 * Traceability metadata for model/versioning.
 * Maps to ODS analytics/layer metadata or activity events.
 */
export interface RecommendationMetadata {
  readonly generated_by: 'seo_ai_v1';
  readonly model_version: string; // e.g., "v1.0.0"
  readonly prompt_version?: string;

  /** Pointers for explainability and cross-linking in Admin UI */
  readonly related_queries?: readonly string[];
  readonly related_pages?: readonly string[];

  /** If this recommendation supersedes another */
  readonly supersedes?: UUID;

  /** Correlation id for multi-step pipelines */
  readonly correlation_id?: string;
}

// ============================================
// Page Entity (ODS-aligned)
// ============================================

/**
 * Represents a page tracked for SEO performance.
 * Read-only snapshot from analytics sources.
 */
export interface SeoPage {
  /** Unique identifier (ODS page_id or deterministic URL hash) */
  readonly id: string;
  /** URL path (relative) */
  readonly path: string;
  /** Full canonical URL */
  readonly canonical_url: string;
  /** Page title as indexed */
  readonly title: string;
  /** Meta description as indexed */
  readonly meta_description: string | null;
  /** Current indexing status */
  readonly index_status: IndexStatus;
  /** Last crawl timestamp */
  readonly last_crawled_at: IsoUtcTimestamp | null;
  /** Page type classification */
  readonly page_type: SeoPageType;
  /** Intent target segment */
  readonly intent_target: SeoIntentTarget;
  /** Associated keywords/queries */
  readonly primary_keywords: readonly string[];
  /** Snapshot timestamp */
  readonly snapshot_at: IsoUtcTimestamp;
}

// ============================================
// Query Entity (ODS-aligned)
// ============================================

/**
 * Represents a search query tracked for performance.
 */
export interface SeoQuery {
  /** Unique identifier */
  readonly id: string;
  /** The search query string */
  readonly query: string;
  /** Average position in SERPs */
  readonly avg_position: number | null;
  /** Total impressions in period */
  readonly impressions: number;
  /** Total clicks in period */
  readonly clicks: number;
  /** Click-through rate */
  readonly ctr: number | null;
  /** Associated page IDs */
  readonly associated_page_ids: readonly string[];
  /** Query intent classification */
  readonly intent: QueryIntent;
  /** Data period start */
  readonly period_start: string;
  /** Data period end */
  readonly period_end: string;
}

// ============================================
// Snapshot Entity
// ============================================

/**
 * Point-in-time SEO metrics snapshot.
 */
export interface SeoSnapshot {
  /** Unique identifier */
  readonly id: string;
  /** Page ID this snapshot belongs to */
  readonly page_id: string;
  /** Snapshot timestamp */
  readonly captured_at: IsoUtcTimestamp;
  /** Organic traffic count */
  readonly organic_traffic: number;
  /** Average position for tracked queries */
  readonly avg_position: number | null;
  /** Number of ranking keywords */
  readonly ranking_keywords: number;
  /** Core Web Vitals scores */
  readonly core_web_vitals: CoreWebVitals | null;
  /** Page authority score (0-100) */
  readonly authority_score: number | null;
}

/**
 * Core Web Vitals metrics.
 */
export interface CoreWebVitals {
  /** Largest Contentful Paint (ms) */
  readonly lcp: number | null;
  /** First Input Delay (ms) */
  readonly fid: number | null;
  /** Cumulative Layout Shift */
  readonly cls: number | null;
  /** First Contentful Paint (ms) */
  readonly fcp: number | null;
  /** Time to First Byte (ms) */
  readonly ttfb: number | null;
}

// ============================================
// Audit Entry
// ============================================

/**
 * Audit log entry for tracking all actions.
 * Immutable and retained indefinitely.
 */
export interface SeoAuditEntry {
  /** Unique identifier */
  readonly id: string;
  /** Action type */
  readonly action: AuditAction;
  /** Entity type affected */
  readonly entity_type: 'page' | 'query' | 'recommendation';
  /** Entity ID affected */
  readonly entity_id: string;
  /** User who performed action */
  readonly user_id: string;
  /** User display name */
  readonly user_display_name: string;
  /** Action timestamp */
  readonly timestamp: IsoUtcTimestamp;
  /** Additional context */
  readonly metadata: Record<string, unknown>;
  /** Previous state (for changes) */
  readonly previous_state: Record<string, unknown> | null;
  /** New state (for changes) */
  readonly new_state: Record<string, unknown> | null;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
  readonly has_more: boolean;
}

export interface SeoMetricsSummary {
  readonly total_pages: number;
  readonly indexed_pages: number;
  readonly total_queries: number;
  readonly avg_position: number | null;
  readonly total_impressions: number;
  readonly total_clicks: number;
  readonly overall_ctr: number | null;
  readonly pending_recommendations: number;
  readonly approved_recommendations: number;
  readonly period_start: string;
  readonly period_end: string;
}

// ============================================
// API Request Types
// ============================================

/**
 * Request to approve a recommendation.
 * One of the FEW write operations allowed.
 */
export interface ApprovalRequest {
  readonly recommendation_id: UUID;
  readonly notes?: string;
}

/**
 * Request to reject a recommendation.
 */
export interface RejectionRequest {
  readonly recommendation_id: UUID;
  readonly reason: string;
}

/**
 * Request to defer a recommendation for later review.
 */
export interface DeferralRequest {
  readonly recommendation_id: UUID;
  readonly defer_until: IsoUtcTimestamp;
  readonly reason?: string;
}

// ============================================
// Filter/Query Types
// ============================================

export interface SeoPageFilters {
  readonly page_type?: SeoPageType;
  readonly intent_target?: SeoIntentTarget;
  readonly index_status?: IndexStatus;
  readonly has_recommendations?: boolean;
  readonly search?: string;
}

export interface SeoQueryFilters {
  readonly intent?: QueryIntent;
  readonly min_impressions?: number;
  readonly min_position?: number;
  readonly max_position?: number;
  readonly search?: string;
}

export interface RecommendationFilters {
  readonly status?: RecommendationStatus;
  readonly type?: SeoRecommendationType;
  readonly risk_level?: RiskLevel;
  readonly min_confidence?: number;
  readonly page_id?: string;
  readonly intent_target?: SeoIntentTarget;
  readonly primary_success_metric?: ExpectedImpact['primary_success_metric'];
}

// ============================================
// ODS API Persistence Notes (v1)
// ============================================
/**
 * When persisting via nsd-ods-api, you will typically store:
 * - seo_recommendations (SeoRecommendation minus large text blobs if needed)
 * - seo_approvals (ApprovalRecord keyed by recommendation_id)
 * - seo_implementation_refs (ImplementationRecord keyed by recommendation_id)
 * - seo_learning_outcomes (LearningOutcome keyed by recommendation_id)
 *
 * Additionally, emit immutable audit trail to activity.events:
 * - seo.recommendation.created
 * - seo.recommendation.approved / rejected / deferred
 * - seo.recommendation.implemented / rolled_back
 * - seo.recommendation.outcome.measured
 *
 * Keep ODS as the source of truth, Platform Shell as the governed UI facade.
 */
