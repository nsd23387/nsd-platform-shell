/**
 * SEO Intelligence - Components Index
 * 
 * Central export point for all SEO UI components.
 * 
 * GOVERNANCE:
 * - All components are display-focused
 * - Actions delegate to parent handlers
 * - No direct API calls from components
 */

export { SeoMetricCard } from './SeoMetricCard';
export type { SeoMetricCardProps } from './SeoMetricCard';

export { RecommendationCard } from './RecommendationCard';
export type { RecommendationCardProps } from './RecommendationCard';

export { RecommendationDiff } from './RecommendationDiff';
export type { RecommendationDiffProps } from './RecommendationDiff';

export { ApprovalActions } from './ApprovalActions';
export type { ApprovalActionsProps } from './ApprovalActions';

export { ConfidenceBadge, ConfidenceDot } from './ConfidenceBadge';
export type { ConfidenceBadgeProps, ConfidenceDotProps } from './ConfidenceBadge';

export { ImpactSummary } from './ImpactSummary';
export type { ImpactSummaryProps } from './ImpactSummary';
