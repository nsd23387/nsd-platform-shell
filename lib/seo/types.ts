/**
 * SEO Intelligence Domain - Type Definitions
 * 
 * Core type contracts for the SEO Intelligence system.
 * These types define the data shapes used throughout the SEO domain.
 * 
 * GOVERNANCE:
 * - All types are read-only by default
 * - Mutation types are explicitly marked and require approval workflows
 * - No types should reference CMS or website mutation operations
 * 
 * NOT ALLOWED:
 * - Types that imply direct CMS writes
 * - Types for auto-publishing workflows
 * - Types that bypass approval requirements
 */

// ============================================
// Core Entity Types
// ============================================

/**
 * Represents a page tracked for SEO performance.
 * This is a read-only snapshot from analytics sources.
 */
export interface SeoPage {
  /** Unique identifier */
  readonly id: string;
  /** URL path (relative) */
  readonly path: string;
  /** Full canonical URL */
  readonly canonicalUrl: string;
  /** Page title as indexed */
  readonly title: string;
  /** Meta description as indexed */
  readonly metaDescription: string | null;
  /** Current indexing status */
  readonly indexStatus: IndexStatus;
  /** Last crawl timestamp */
  readonly lastCrawledAt: string | null;
  /** Page type classification */
  readonly pageType: PageType;
  /** Associated keywords/queries */
  readonly primaryKeywords: readonly string[];
  /** Snapshot timestamp */
  readonly snapshotAt: string;
}

/**
 * Represents a search query tracked for performance.
 */
export interface SeoQuery {
  /** Unique identifier */
  readonly id: string;
  /** The search query string */
  readonly query: string;
  /** Average position in SERPs */
  readonly averagePosition: number | null;
  /** Total impressions in period */
  readonly impressions: number;
  /** Total clicks in period */
  readonly clicks: number;
  /** Click-through rate */
  readonly ctr: number | null;
  /** Associated page IDs */
  readonly associatedPageIds: readonly string[];
  /** Query intent classification */
  readonly intent: QueryIntent;
  /** Data period start */
  readonly periodStart: string;
  /** Data period end */
  readonly periodEnd: string;
}

/**
 * Point-in-time SEO metrics snapshot.
 */
export interface SeoSnapshot {
  /** Unique identifier */
  readonly id: string;
  /** Page ID this snapshot belongs to */
  readonly pageId: string;
  /** Snapshot timestamp */
  readonly capturedAt: string;
  /** Organic traffic count */
  readonly organicTraffic: number;
  /** Average position for tracked queries */
  readonly averagePosition: number | null;
  /** Number of ranking keywords */
  readonly rankingKeywords: number;
  /** Core Web Vitals scores */
  readonly coreWebVitals: CoreWebVitals | null;
  /** Page authority score (0-100) */
  readonly authorityScore: number | null;
}

/**
 * AI-generated recommendation for SEO improvement.
 * Requires human approval before any action.
 */
export interface SeoRecommendation {
  /** Unique identifier */
  readonly id: string;
  /** Target page ID */
  readonly pageId: string;
  /** Recommendation type */
  readonly type: RecommendationType;
  /** Current state (what exists now) */
  readonly currentValue: string | null;
  /** Proposed change */
  readonly proposedValue: string;
  /** Confidence score (0-1) */
  readonly confidence: number;
  /** Expected impact assessment */
  readonly expectedImpact: ImpactLevel;
  /** Rationale for the recommendation */
  readonly rationale: string;
  /** Approval status */
  readonly status: ApprovalStatus;
  /** Generated timestamp */
  readonly generatedAt: string;
  /** Approval/rejection timestamp */
  readonly reviewedAt: string | null;
  /** Reviewer user ID */
  readonly reviewedBy: string | null;
  /** Review notes */
  readonly reviewNotes: string | null;
}

/**
 * Audit log entry for tracking all actions.
 */
export interface SeoAuditEntry {
  /** Unique identifier */
  readonly id: string;
  /** Action type */
  readonly action: AuditAction;
  /** Entity type affected */
  readonly entityType: 'page' | 'query' | 'recommendation';
  /** Entity ID affected */
  readonly entityId: string;
  /** User who performed action */
  readonly userId: string;
  /** User display name */
  readonly userDisplayName: string;
  /** Action timestamp */
  readonly timestamp: string;
  /** Additional context */
  readonly metadata: Record<string, unknown>;
  /** Previous state (for changes) */
  readonly previousState: Record<string, unknown> | null;
  /** New state (for changes) */
  readonly newState: Record<string, unknown> | null;
}

// ============================================
// Supporting Types
// ============================================

export type IndexStatus = 'indexed' | 'not_indexed' | 'pending' | 'blocked' | 'unknown';

export type PageType = 
  | 'product'
  | 'category'
  | 'landing'
  | 'blog'
  | 'support'
  | 'legal'
  | 'other';

export type QueryIntent = 
  | 'navigational'
  | 'informational'
  | 'transactional'
  | 'commercial';

export type RecommendationType =
  | 'title_optimization'
  | 'meta_description'
  | 'heading_structure'
  | 'content_gap'
  | 'internal_linking'
  | 'schema_markup'
  | 'image_optimization'
  | 'url_structure';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'deferred'
  | 'implemented';

export type AuditAction =
  | 'recommendation_generated'
  | 'recommendation_approved'
  | 'recommendation_rejected'
  | 'recommendation_deferred'
  | 'snapshot_captured'
  | 'page_added'
  | 'query_tracked';

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
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly hasMore: boolean;
}

export interface SeoMetricsSummary {
  readonly totalPages: number;
  readonly indexedPages: number;
  readonly totalQueries: number;
  readonly averagePosition: number | null;
  readonly totalImpressions: number;
  readonly totalClicks: number;
  readonly overallCtr: number | null;
  readonly pendingRecommendations: number;
  readonly approvedRecommendations: number;
  readonly periodStart: string;
  readonly periodEnd: string;
}

// ============================================
// Approval Request Types
// ============================================

/**
 * Request to approve a recommendation.
 * This is one of the FEW write operations allowed.
 */
export interface ApprovalRequest {
  readonly recommendationId: string;
  readonly notes?: string;
}

/**
 * Request to reject a recommendation.
 */
export interface RejectionRequest {
  readonly recommendationId: string;
  readonly reason: string;
}

/**
 * Request to defer a recommendation for later review.
 */
export interface DeferralRequest {
  readonly recommendationId: string;
  readonly deferUntil: string;
  readonly reason?: string;
}

// ============================================
// Filter/Query Types
// ============================================

export interface SeoPageFilters {
  readonly pageType?: PageType;
  readonly indexStatus?: IndexStatus;
  readonly hasRecommendations?: boolean;
  readonly search?: string;
}

export interface SeoQueryFilters {
  readonly intent?: QueryIntent;
  readonly minImpressions?: number;
  readonly minPosition?: number;
  readonly maxPosition?: number;
  readonly search?: string;
}

export interface RecommendationFilters {
  readonly status?: ApprovalStatus;
  readonly type?: RecommendationType;
  readonly impact?: ImpactLevel;
  readonly minConfidence?: number;
  readonly pageId?: string;
}
