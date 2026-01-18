/**
 * SEO Intelligence Domain - Constants
 * 
 * Static configuration values for the SEO Intelligence system.
 * These constants define labels, thresholds, and configuration.
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

// ============================================
// Display Labels
// ============================================

export const INDEX_STATUS_LABELS: Record<string, string> = {
  indexed: 'Indexed',
  not_indexed: 'Not Indexed',
  pending: 'Pending',
  blocked: 'Blocked',
  unknown: 'Unknown',
} as const;

export const PAGE_TYPE_LABELS: Record<string, string> = {
  product: 'Product Page',
  category: 'Category Page',
  landing: 'Landing Page',
  blog: 'Blog Post',
  support: 'Support Article',
  legal: 'Legal Page',
  other: 'Other',
} as const;

export const QUERY_INTENT_LABELS: Record<string, string> = {
  navigational: 'Navigational',
  informational: 'Informational',
  transactional: 'Transactional',
  commercial: 'Commercial Investigation',
} as const;

export const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  title_optimization: 'Title Optimization',
  meta_description: 'Meta Description',
  heading_structure: 'Heading Structure',
  content_gap: 'Content Gap',
  internal_linking: 'Internal Linking',
  schema_markup: 'Schema Markup',
  image_optimization: 'Image Optimization',
  url_structure: 'URL Structure',
} as const;

export const IMPACT_LEVEL_LABELS: Record<string, string> = {
  low: 'Low Impact',
  medium: 'Medium Impact',
  high: 'High Impact',
  critical: 'Critical',
} as const;

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  deferred: 'Deferred',
  implemented: 'Implemented',
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
 * These control which features are enabled.
 * 
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
