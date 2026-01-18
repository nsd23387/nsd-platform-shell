/**
 * SEO Intelligence Domain - Formatters
 * 
 * Pure functions for formatting SEO data for display.
 * These formatters transform raw values into human-readable strings.
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
 * - Locale-specific formatting without explicit locale parameter
 */

import {
  INDEX_STATUS_LABELS,
  PAGE_TYPE_LABELS,
  QUERY_INTENT_LABELS,
  RECOMMENDATION_TYPE_LABELS,
  IMPACT_LEVEL_LABELS,
  APPROVAL_STATUS_LABELS,
  CONFIDENCE_THRESHOLDS,
  CWV_THRESHOLDS,
} from './constants';

import type {
  IndexStatus,
  PageType,
  QueryIntent,
  RecommendationType,
  ImpactLevel,
  ApprovalStatus,
  CoreWebVitals,
} from './types';

// ============================================
// Label Formatters
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
export function formatPageType(type: PageType): string {
  return PAGE_TYPE_LABELS[type] ?? 'Other';
}

/**
 * Format query intent for display.
 */
export function formatQueryIntent(intent: QueryIntent): string {
  return QUERY_INTENT_LABELS[intent] ?? 'Unknown';
}

/**
 * Format recommendation type for display.
 */
export function formatRecommendationType(type: RecommendationType): string {
  return RECOMMENDATION_TYPE_LABELS[type] ?? 'Unknown';
}

/**
 * Format impact level for display.
 */
export function formatImpactLevel(impact: ImpactLevel): string {
  return IMPACT_LEVEL_LABELS[impact] ?? 'Unknown';
}

/**
 * Format approval status for display.
 */
export function formatApprovalStatus(status: ApprovalStatus): string {
  return APPROVAL_STATUS_LABELS[status] ?? 'Unknown';
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

// ============================================
// Date/Time Formatters
// ============================================

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(
  timestamp: string | null | undefined,
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
