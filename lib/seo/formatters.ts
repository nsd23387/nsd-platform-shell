/**
 * SEO Intelligence Domain - Formatters (v1)
 * 
 * Pure functions for formatting SEO data for display.
 * Aligned with the canonical AI recommendation schema.
 * 
 * GOVERNANCE:
 * - All formatters are pure functions (no side effects)
 * - All formatters operate on read-only data
 * - Formatters do not modify source data
 * 
 * NOT ALLOWED:
 * - Side effects
 * - Data mutations
 * - API calls
 */

import {
  INDEX_STATUS_LABELS,
  PAGE_TYPE_LABELS,
  QUERY_INTENT_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  RECOMMENDATION_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  EVIDENCE_SOURCE_LABELS,
  APPROVAL_DECISION_LABELS,
  IMPLEMENTATION_METHOD_LABELS,
  LEARNING_VERDICT_LABELS,
  CONFIDENCE_FACTOR_LABELS,
  INTENT_TARGET_LABELS,
  ALLOWED_CHANGE_LABELS,
  AUDIT_ACTION_LABELS,
  PRIMARY_SUCCESS_METRIC_LABELS,
  ROLLBACK_COMPLEXITY_LABELS,
  CONFIDENCE_THRESHOLDS,
  CWV_THRESHOLDS,
} from './constants';

import type {
  IndexStatus,
  SeoPageType,
  QueryIntent,
  SeoRecommendationType,
  RecommendationStatus,
  RiskLevel,
  EvidenceSource,
  ApprovalDecision,
  ImplementationMethod,
  LearningVerdict,
  ConfidenceFactorName,
  SeoIntentTarget,
  AllowedChange,
  AuditAction,
  CoreWebVitals,
  IsoUtcTimestamp,
  ConfidenceModel,
  RiskAssessment,
  ExpectedImpact,
  SeoEvidence,
} from './types';

// ============================================
// Enum Label Formatters
// ============================================

/**
 * Format index status for display.
 */
export function formatIndexStatus(status: IndexStatus): string {
  return INDEX_STATUS_LABELS[status] ?? 'Unknown';
}

/**
 * Format page type for display.
 */
export function formatPageType(type: SeoPageType): string {
  return PAGE_TYPE_LABELS[type] ?? type;
}

/**
 * Format query intent for display.
 */
export function formatQueryIntent(intent: QueryIntent): string {
  return QUERY_INTENT_LABELS[intent] ?? intent;
}

/**
 * Format recommendation type for display.
 */
export function formatRecommendationType(type: SeoRecommendationType): string {
  return RECOMMENDATION_TYPE_LABELS[type] ?? type;
}

/**
 * Format recommendation status for display.
 */
export function formatRecommendationStatus(status: RecommendationStatus): string {
  return RECOMMENDATION_STATUS_LABELS[status] ?? status;
}

/**
 * Format risk level for display.
 */
export function formatRiskLevel(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level] ?? level;
}

/**
 * Format evidence source for display.
 */
export function formatEvidenceSource(source: EvidenceSource): string {
  return EVIDENCE_SOURCE_LABELS[source] ?? source;
}

/**
 * Format approval decision for display.
 */
export function formatApprovalDecision(decision: ApprovalDecision): string {
  return APPROVAL_DECISION_LABELS[decision] ?? decision;
}

/**
 * Format implementation method for display.
 */
export function formatImplementationMethod(method: ImplementationMethod): string {
  return IMPLEMENTATION_METHOD_LABELS[method] ?? method;
}

/**
 * Format learning verdict for display.
 */
export function formatLearningVerdict(verdict: LearningVerdict): string {
  return LEARNING_VERDICT_LABELS[verdict] ?? verdict;
}

/**
 * Format confidence factor name for display.
 */
export function formatConfidenceFactorName(name: ConfidenceFactorName): string {
  return CONFIDENCE_FACTOR_LABELS[name] ?? name;
}

/**
 * Format intent target for display.
 */
export function formatIntentTarget(target: SeoIntentTarget): string {
  return INTENT_TARGET_LABELS[target] ?? target;
}

/**
 * Format allowed change type for display.
 */
export function formatAllowedChange(change: AllowedChange): string {
  return ALLOWED_CHANGE_LABELS[change] ?? change;
}

/**
 * Format audit action for display.
 */
export function formatAuditAction(action: AuditAction): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

/**
 * Format primary success metric for display.
 */
export function formatPrimarySuccessMetric(metric: string): string {
  return PRIMARY_SUCCESS_METRIC_LABELS[metric] ?? metric;
}

/**
 * Format rollback complexity for display.
 */
export function formatRollbackComplexity(complexity: string): string {
  return ROLLBACK_COMPLEXITY_LABELS[complexity] ?? complexity;
}

// Legacy alias
export function formatApprovalStatus(status: RecommendationStatus): string {
  return formatRecommendationStatus(status);
}

// Legacy alias
export function formatImpactLevel(level: RiskLevel | 'critical'): string {
  if (level === 'critical') return 'Critical';
  return formatRiskLevel(level as RiskLevel);
}

// ============================================
// Number Formatters
// ============================================

/**
 * Format a number with thousands separators.
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toLocaleString('en-US');
}

/**
 * Format a percentage value.
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format click-through rate.
 */
export function formatCtr(ctr: number | null | undefined): string {
  return formatPercentage(ctr, 2);
}

/**
 * Format position (average SERP position).
 */
export function formatPosition(position: number | null | undefined): string {
  if (position === null || position === undefined) {
    return '—';
  }
  return position.toFixed(1);
}

/**
 * Format confidence score as percentage.
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format confidence with label.
 */
export function formatConfidenceWithLabel(confidence: number): string {
  const percentage = formatConfidence(confidence);
  if (confidence < CONFIDENCE_THRESHOLDS.LOW) {
    return `${percentage} (Low)`;
  }
  if (confidence < CONFIDENCE_THRESHOLDS.HIGH) {
    return `${percentage} (Medium)`;
  }
  return `${percentage} (High)`;
}

/**
 * Format confidence model for display.
 */
export function formatConfidenceModel(model: ConfidenceModel): string {
  const score = formatConfidence(model.score);
  return `${score} - ${model.explanation}`;
}

/**
 * Format a currency value.
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: string = 'USD'
): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ============================================
// Date/Time Formatters
// ============================================

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(
  timestamp: IsoUtcTimestamp | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!timestamp) {
    return '—';
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  try {
    return new Date(timestamp).toLocaleString('en-US', defaultOptions);
  } catch {
    return '—';
  }
}

/**
 * Format a date only (no time).
 */
export function formatDate(date: string | null | undefined): string {
  return formatTimestamp(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '—';
  }
  
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) {
      return 'Just now';
    }
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
    }
    if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
    }
    if (diffDay < 7) {
      return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    }
    
    return formatDate(timestamp);
  } catch {
    return '—';
  }
}

/**
 * Format a date range.
 */
export function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

// ============================================
// Core Web Vitals Formatters
// ============================================

/**
 * Format LCP value.
 */
export function formatLcp(lcp: number | null | undefined): string {
  if (lcp === null || lcp === undefined) {
    return '—';
  }
  return `${(lcp / 1000).toFixed(2)}s`;
}

/**
 * Format FID value.
 */
export function formatFid(fid: number | null | undefined): string {
  if (fid === null || fid === undefined) {
    return '—';
  }
  return `${fid}ms`;
}

/**
 * Format CLS value.
 */
export function formatCls(cls: number | null | undefined): string {
  if (cls === null || cls === undefined) {
    return '—';
  }
  return cls.toFixed(3);
}

/**
 * Format CWV status label.
 */
export function formatCwvStatus(
  cwv: CoreWebVitals | null
): 'Good' | 'Needs Improvement' | 'Poor' | 'Unknown' {
  if (!cwv) {
    return 'Unknown';
  }
  
  // Check if any metric is in "poor" range
  if (cwv.lcp !== null && cwv.lcp > CWV_THRESHOLDS.LCP.NEEDS_IMPROVEMENT) {
    return 'Poor';
  }
  if (cwv.fid !== null && cwv.fid > CWV_THRESHOLDS.FID.NEEDS_IMPROVEMENT) {
    return 'Poor';
  }
  if (cwv.cls !== null && cwv.cls > CWV_THRESHOLDS.CLS.NEEDS_IMPROVEMENT) {
    return 'Poor';
  }
  
  // Check if any metric needs improvement
  if (cwv.lcp !== null && cwv.lcp > CWV_THRESHOLDS.LCP.GOOD) {
    return 'Needs Improvement';
  }
  if (cwv.fid !== null && cwv.fid > CWV_THRESHOLDS.FID.GOOD) {
    return 'Needs Improvement';
  }
  if (cwv.cls !== null && cwv.cls > CWV_THRESHOLDS.CLS.GOOD) {
    return 'Needs Improvement';
  }
  
  // All metrics are good (or null)
  return 'Good';
}

// ============================================
// URL Formatters
// ============================================

/**
 * Format URL for display (truncate if too long).
 */
export function formatUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.substring(0, maxLength - 3)}...`;
}

/**
 * Format URL path (remove domain).
 */
export function formatPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url;
  }
}

// ============================================
// Diff Formatters
// ============================================

/**
 * Format a diff for display (current vs proposed).
 */
export function formatDiff(
  current: string | null,
  proposed: string
): { current: string; proposed: string } {
  return {
    current: current ?? '(empty)',
    proposed: proposed,
  };
}

/**
 * Calculate character difference.
 */
export function formatCharDiff(
  current: string | null,
  proposed: string
): string {
  const currentLen = current?.length ?? 0;
  const proposedLen = proposed.length;
  const diff = proposedLen - currentLen;
  
  if (diff === 0) {
    return 'No change in length';
  }
  if (diff > 0) {
    return `+${diff} characters`;
  }
  return `${diff} characters`;
}

// ============================================
// Risk Assessment Formatters
// ============================================

/**
 * Format risk assessment for display.
 */
export function formatRiskAssessment(risk: RiskAssessment): string {
  const level = formatRiskLevel(risk.level);
  const rollback = formatRollbackComplexity(risk.rollback_complexity);
  return `${level} (${rollback})`;
}

/**
 * Format risk reasons as bullet list.
 */
export function formatRiskReasons(reasons: readonly string[]): string {
  if (reasons.length === 0) {
    return 'No specific risks identified';
  }
  return reasons.map(r => `• ${r}`).join('\n');
}

// ============================================
// Evidence Formatters
// ============================================

/**
 * Format evidence time window.
 */
export function formatEvidenceTimeWindow(evidence: SeoEvidence): string {
  return formatDateRange(
    evidence.time_window.start_date,
    evidence.time_window.end_date
  );
}

/**
 * Format evidence signal count.
 */
export function formatEvidenceSignalCount(evidence: SeoEvidence): string {
  const count = evidence.signals.length;
  return `${count} signal${count === 1 ? '' : 's'}`;
}

// ============================================
// Expected Impact Formatters
// ============================================

/**
 * Format expected impact summary.
 */
export function formatExpectedImpactSummary(impact: ExpectedImpact): string {
  const parts: string[] = [];
  
  if (impact.seo_metrics?.ctr_lift_percent) {
    parts.push(`CTR: ${impact.seo_metrics.ctr_lift_percent}`);
  }
  if (impact.seo_metrics?.ranking_change_estimate) {
    parts.push(`Ranking: ${impact.seo_metrics.ranking_change_estimate}`);
  }
  if (impact.conversion_metrics?.quote_start_lift) {
    parts.push(`Quote Starts: ${impact.conversion_metrics.quote_start_lift}`);
  }
  if (impact.revenue_metrics?.monthly_revenue_estimate) {
    parts.push(`Revenue: ${impact.revenue_metrics.monthly_revenue_estimate}`);
  }
  
  if (parts.length === 0) {
    return 'Impact not estimated';
  }
  
  return parts.join(' | ');
}

// ============================================
// Metric Name Formatters
// ============================================

/**
 * Format canonical metric name for display.
 */
export function formatMetricName(metric: string): string {
  const parts = metric.split('.');
  if (parts.length !== 2) {
    return metric;
  }
  
  const [source, name] = parts;
  const sourceLabel = {
    gsc: 'GSC',
    ga4: 'GA4',
    quote: 'Quote',
    wc: 'WooCommerce',
  }[source] ?? source.toUpperCase();
  
  const nameLabel = name
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  
  return `${sourceLabel} ${nameLabel}`;
}

// ============================================
// Allowed Changes Formatters
// ============================================

/**
 * Format allowed changes list.
 */
export function formatAllowedChangesList(changes: readonly AllowedChange[]): string {
  if (changes.length === 0) {
    return 'No changes allowed';
  }
  return changes.map(c => formatAllowedChange(c)).join(', ');
}
