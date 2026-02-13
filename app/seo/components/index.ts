/**
 * SEO Intelligence - Components Index (v1)
 * 
 * Central export point for all SEO UI components.
 * Aligned with canonical AI recommendation schema.
 * 
 * ============================================================
 * NON-GOALS (Governance)
 * ============================================================
 * - This UI does NOT deploy changes
 * - This UI does NOT modify site content
 * - All implementation occurs externally (e.g., website repo via PR)
 * ============================================================
 * 
 * GOVERNANCE:
 * - All components are display-focused
 * - Actions delegate to parent handlers
 * - ApprovalActionsPanel is the ONLY mutation surface
 */

// Metric Display
export { SeoMetricCard } from './SeoMetricCard';
export type { SeoMetricCardProps } from './SeoMetricCard';

// Recommendation Cards & Lists
export { RecommendationCard } from './RecommendationCard';
export type { RecommendationCardProps } from './RecommendationCard';

// Diff Display
export { RecommendationDiff } from './RecommendationDiff';
export type { RecommendationDiffProps } from './RecommendationDiff';

// Action Components
// ApprovalActions - delegates to parent handlers
export { ApprovalActions } from './ApprovalActions';
export type { ApprovalActionsProps } from './ApprovalActions';

// ApprovalActionsPanel - integrates with API (ONLY mutation surface)
export { ApprovalActionsPanel } from './ApprovalActionsPanel';
export type { ApprovalActionsPanelProps } from './ApprovalActionsPanel';

// Governance Signal Components
export { ConfidenceBadge, ConfidenceDot } from './ConfidenceBadge';
export type { ConfidenceBadgeProps, ConfidenceDotProps } from './ConfidenceBadge';

export { RiskBadge, RiskDisplay } from './RiskBadge';
export type { RiskBadgeProps, RiskDisplayProps } from './RiskBadge';

export { StatusChip, ApprovalDecisionChip } from './StatusChip';
export type { StatusChipProps, ApprovalDecisionChipProps } from './StatusChip';

// Impact Display
export { ImpactSummary } from './ImpactSummary';
export type { ImpactSummaryProps } from './ImpactSummary';
