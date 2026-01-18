/**
 * SEO Intelligence Domain - Constants (v1)
 * 
 * Static configuration values for the SEO Intelligence system.
 * Aligned with the canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - No API keys or secrets
 * - No external service URLs (those go in environment config)
 * - No runtime-mutable values
 * 
 * NOT ALLOWED:
 * - CMS connection strings
 * - Deployment targets
 * - Auto-publish configurations
 */

import type {
  SeoRecommendationType,
  SeoPageType,
  SeoIntentTarget,
  AllowedChange,
  RecommendationStatus,
  EvidenceSource,
  RiskLevel,
  ApprovalDecision,
  ImplementationMethod,
  LearningVerdict,
  ConfidenceFactorName,
  IndexStatus,
  QueryIntent,
  AuditAction,
} from './types';

// ============================================
// Domain Configuration
// ============================================

/**
 * SEO domain identifier for permissions and routing.
 */
export const SEO_DOMAIN = 'seo' as const;

/**
 * Permission prefix for SEO Intelligence.
 */
export const SEO_PERMISSION_PREFIX = 'seo:' as const;

/**
 * AI model identifier for traceability.
 */
export const SEO_AI_GENERATOR = 'seo_ai_v1' as const;

// ============================================
// Recommendation Type Labels
// ============================================

export const RECOMMENDATION_TYPE_LABELS: Record<SeoRecommendationType, string> = {
  meta_title_optimization: 'Meta Title Optimization',
  meta_description_optimization: 'Meta Description Optimization',
  heading_structure_alignment: 'Heading Structure Alignment',
  intent_alignment: 'Intent Alignment',
  internal_linking: 'Internal Linking',
  content_gap: 'Content Gap',
  cannibalization_resolution: 'Cannibalization Resolution',
  schema_enhancement: 'Schema Enhancement',
  page_consolidation: 'Page Consolidation',
  noindex_suggestion: 'Noindex Suggestion',
} as const;

export const RECOMMENDATION_TYPE_DESCRIPTIONS: Record<SeoRecommendationType, string> = {
  meta_title_optimization: 'Improve page title for better CTR and relevance',
  meta_description_optimization: 'Enhance meta description for search snippets',
  heading_structure_alignment: 'Align H1/H2/H3 hierarchy with content intent',
  intent_alignment: 'Better match page content to user search intent',
  internal_linking: 'Add or optimize internal link structure',
  content_gap: 'Address missing content that competitors cover',
  cannibalization_resolution: 'Resolve keyword cannibalization between pages',
  schema_enhancement: 'Add or improve structured data markup',
  page_consolidation: 'Merge thin/duplicate pages for stronger signal',
  noindex_suggestion: 'Remove low-value pages from index',
} as const;

// ============================================
// Page Type Labels
// ============================================

export const PAGE_TYPE_LABELS: Record<SeoPageType, string> = {
  product: 'Product Page',
  category: 'Category Page',
  landing: 'Landing Page',
  city: 'City Page',
  industry: 'Industry Page',
  blog: 'Blog Post',
} as const;

// ============================================
// Intent Target Labels
// ============================================

export const INTENT_TARGET_LABELS: Record<SeoIntentTarget, string> = {
  B2C: 'B2C (Consumer)',
  B2B: 'B2B (Business)',
  Wholesale: 'Wholesale',
} as const;

// ============================================
// Allowed Change Labels
// ============================================

export const ALLOWED_CHANGE_LABELS: Record<AllowedChange, string> = {
  metadata_only: 'Metadata Only',
  copy_only: 'Copy/Content Only',
  internal_links_only: 'Internal Links Only',
  schema_only: 'Schema Markup Only',
} as const;

// ============================================
// Status Labels
// ============================================

export const RECOMMENDATION_STATUS_LABELS: Record<RecommendationStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  deferred: 'Deferred',
  implemented: 'Implemented',
  rolled_back: 'Rolled Back',
} as const;

export const INDEX_STATUS_LABELS: Record<IndexStatus, string> = {
  indexed: 'Indexed',
  not_indexed: 'Not Indexed',
  pending: 'Pending',
  blocked: 'Blocked',
  unknown: 'Unknown',
} as const;

// ============================================
// Evidence Source Labels
// ============================================

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSource, string> = {
  google_search_console: 'Google Search Console',
  ga4: 'Google Analytics 4',
  quote_app: 'Quote Application',
  woocommerce: 'WooCommerce',
  ads: 'Advertising',
  social: 'Social Media',
} as const;

export const EVIDENCE_SOURCE_ICONS: Record<EvidenceSource, string> = {
  google_search_console: '🔍',
  ga4: '📊',
  quote_app: '📝',
  woocommerce: '🛒',
  ads: '📢',
  social: '📱',
} as const;

// ============================================
// Risk Level Labels
// ============================================

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
} as const;

export const RISK_LEVEL_DESCRIPTIONS: Record<RiskLevel, string> = {
  low: 'Safe to implement with minimal review',
  medium: 'Requires careful review before approval',
  high: 'Significant change, requires thorough review and testing',
} as const;

// ============================================
// Approval Decision Labels
// ============================================

export const APPROVAL_DECISION_LABELS: Record<ApprovalDecision, string> = {
  approve: 'Approve',
  reject: 'Reject',
  defer: 'Defer',
} as const;

// ============================================
// Implementation Method Labels
// ============================================

export const IMPLEMENTATION_METHOD_LABELS: Record<ImplementationMethod, string> = {
  manual: 'Manual Implementation',
  ai_generated_diff: 'AI-Generated Diff',
} as const;

// ============================================
// Learning Verdict Labels
// ============================================

export const LEARNING_VERDICT_LABELS: Record<LearningVerdict, string> = {
  positive: 'Positive Impact',
  neutral: 'Neutral/No Change',
  negative: 'Negative Impact',
} as const;

// ============================================
// Confidence Factor Labels
// ============================================

export const CONFIDENCE_FACTOR_LABELS: Record<ConfidenceFactorName, string> = {
  historical_similarity: 'Historical Similarity',
  query_volume: 'Query Volume',
  conversion_signal_strength: 'Conversion Signal Strength',
  prior_success_rate: 'Prior Success Rate',
  data_completeness: 'Data Completeness',
  risk_penalty: 'Risk Penalty',
} as const;

// ============================================
// Query Intent Labels
// ============================================

export const QUERY_INTENT_LABELS: Record<QueryIntent, string> = {
  navigational: 'Navigational',
  informational: 'Informational',
  transactional: 'Transactional',
  commercial: 'Commercial Investigation',
} as const;

// ============================================
// Audit Action Labels
// ============================================

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  recommendation_generated: 'Recommendation Generated',
  recommendation_approved: 'Recommendation Approved',
  recommendation_rejected: 'Recommendation Rejected',
  recommendation_deferred: 'Recommendation Deferred',
  recommendation_implemented: 'Recommendation Implemented',
  recommendation_rolled_back: 'Recommendation Rolled Back',
  recommendation_outcome_measured: 'Outcome Measured',
  snapshot_captured: 'Snapshot Captured',
  page_added: 'Page Added',
  query_tracked: 'Query Tracked',
} as const;

// ============================================
// Thresholds and Limits
// ============================================

/**
 * Confidence score thresholds for recommendations.
 */
export const CONFIDENCE_THRESHOLDS = {
  /** Below this, recommendation should be reviewed carefully */
  LOW: 0.5,
  /** Good confidence level */
  MEDIUM: 0.7,
  /** High confidence, safe to approve */
  HIGH: 0.85,
} as const;

/**
 * Position thresholds for ranking classification.
 */
export const POSITION_THRESHOLDS = {
  /** Top 3 - prime position */
  TOP: 3,
  /** Page 1 */
  PAGE_ONE: 10,
  /** Page 2 */
  PAGE_TWO: 20,
  /** Beyond page 2 - needs improvement */
  LOW: 50,
} as const;

/**
 * Core Web Vitals thresholds (Google's standards).
 */
export const CWV_THRESHOLDS = {
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
  },
  FID: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300,
  },
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
  },
} as const;

/**
 * Default pagination values.
 */
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Deferral limits.
 */
export const DEFERRAL_LIMITS = {
  MIN_DAYS: 1,
  MAX_DAYS: 90,
} as const;

/**
 * Learning outcome evaluation windows.
 */
export const LEARNING_EVALUATION_WINDOWS = {
  SHORT: 14, // days
  STANDARD: 30, // days
  LONG: 60, // days
} as const;

// ============================================
// Route Configuration
// ============================================

/**
 * SEO domain routes.
 */
export const SEO_ROUTES = {
  ROOT: '/seo',
  DASHBOARD: '/seo/dashboard',
  PAGES: '/seo/pages',
  PAGE_DETAIL: (id: string) => `/seo/pages/${id}`,
  QUERIES: '/seo/queries',
  QUERY_DETAIL: (id: string) => `/seo/queries/${id}`,
  RECOMMENDATIONS: '/seo/recommendations',
  RECOMMENDATION_DETAIL: (id: string) => `/seo/recommendations/${id}`,
  APPROVALS: '/seo/approvals',
  AUDIT: '/seo/audit',
} as const;

/**
 * API route paths.
 */
export const SEO_API_ROUTES = {
  PAGES: '/api/seo/pages',
  QUERIES: '/api/seo/queries',
  RECOMMENDATIONS: '/api/seo/recommendations',
  APPROVALS: '/api/seo/approvals',
  AUDIT: '/api/seo/audit',
} as const;

// ============================================
// Feature Flags (for gradual rollout)
// ============================================

/**
 * Feature flags for SEO Intelligence.
 * NOTE: These are NOT runtime toggles - they're compile-time constants.
 * Runtime feature flags should come from bootstrap context.
 */
export const SEO_FEATURES = {
  /** Enable recommendations display */
  RECOMMENDATIONS_ENABLED: true,
  /** Enable approval workflow */
  APPROVALS_ENABLED: true,
  /** Enable audit log */
  AUDIT_ENABLED: true,
  /** Enable confidence scores display */
  CONFIDENCE_DISPLAY: true,
  /** Enable diff view for recommendations */
  DIFF_VIEW_ENABLED: true,
  /** Enable risk assessment display */
  RISK_DISPLAY: true,
  /** Enable evidence signals display */
  EVIDENCE_DISPLAY: true,
  /** Enable learning outcomes display */
  LEARNING_DISPLAY: true,
} as const;

// ============================================
// Audit Configuration
// ============================================

/**
 * Audit log retention and display settings.
 */
export const AUDIT_CONFIG = {
  /** Default number of entries to display */
  DEFAULT_DISPLAY_COUNT: 50,
  /** Maximum entries to fetch in one request */
  MAX_FETCH_COUNT: 500,
} as const;

// ============================================
// Primary Success Metric Labels
// ============================================

export const PRIMARY_SUCCESS_METRIC_LABELS: Record<string, string> = {
  ctr: 'Click-Through Rate',
  ranking: 'Search Ranking',
  quote_starts: 'Quote Starts',
  conversion_rate: 'Conversion Rate',
  revenue: 'Revenue',
} as const;

// ============================================
// Rollback Complexity Labels
// ============================================

export const ROLLBACK_COMPLEXITY_LABELS: Record<string, string> = {
  simple: 'Simple (can revert easily)',
  moderate: 'Moderate (requires some effort)',
  complex: 'Complex (significant effort to revert)',
} as const;
