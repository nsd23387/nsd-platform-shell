/**
 * Observability Components
 * 
 * Pipeline-first, read-only observability UI components.
 * 
 * OBSERVABILITY GOVERNANCE:
 * - Read-only display
 * - No execution control
 * - No retries or overrides
 * - No Smartlead editing
 * - No stage skipping
 * - Backend observability wins
 * - UI reflects, never infers
 * 
 * Observability reflects pipeline state; execution is delegated.
 */

export { CampaignExecutionStatusCard } from './CampaignExecutionStatusCard';
export type { CampaignExecutionStatusCardProps } from './CampaignExecutionStatusCard';

export { PipelineFunnelTable } from './PipelineFunnelTable';
export type { PipelineFunnelTableProps } from './PipelineFunnelTable';

export { CampaignRunHistoryTable } from './CampaignRunHistoryTable';
export type { CampaignRunHistoryTableProps } from './CampaignRunHistoryTable';

export { SendMetricsPanel } from './SendMetricsPanel';
export type { SendMetricsPanelProps } from './SendMetricsPanel';

export { ExecutionTimelineFeed } from './ExecutionTimelineFeed';
export type { ExecutionTimelineFeedProps, ExecutionEvent } from './ExecutionTimelineFeed';

export { ApprovalAwarenessPanel } from './ApprovalAwarenessPanel';
export type { ApprovalAwarenessPanelProps, ApprovalAwarenessState } from './ApprovalAwarenessPanel';

export { LatestRunStatusCard } from './LatestRunStatusCard';
export type { default as LatestRunStatusCardDefault } from './LatestRunStatusCard';

export { LastExecutionSummaryCard } from './LastExecutionSummaryCard';

export { ExecutionConfidenceBadge } from './ExecutionConfidenceBadge';
export { ExecutionTimeline } from './ExecutionTimeline';
export { NextStepCard } from './NextStepCard';
export { ExecutionTooltip } from './ExecutionTooltip';
export { ExecutionExplainabilityPanel } from './ExecutionExplainabilityPanel';

export { CampaignScopeSummary } from './CampaignScopeSummary';
export { CampaignStatusHeader } from './CampaignStatusHeader';
export { FunnelSummaryWidget } from './FunnelSummaryWidget';
export { ForwardMomentumCallout } from './ForwardMomentumCallout';
export { LastUpdatedIndicator } from './LastUpdatedIndicator';

export { ExecutionStageTracker } from './ExecutionStageTracker';
export { ActiveStageFocusPanel } from './ActiveStageFocusPanel';
export { ExecutionHealthIndicator } from './ExecutionHealthIndicator';
export { ResultsBreakdownCards } from './ResultsBreakdownCards';
export { AdvisoryCallout } from './AdvisoryCallout';
export { PollingStatusIndicator } from './PollingStatusIndicator';

export { ExecutionNarrativeCard } from './ExecutionNarrativeCard';
export type { ExecutionNarrativeCardProps } from './ExecutionNarrativeCard';

// Execution Health & Trust UX Components
export { ExecutionHealthBanner } from './ExecutionHealthBanner';
export type { ExecutionHealthBannerProps } from './ExecutionHealthBanner';

export { ExecutionDataSourceBadge } from './ExecutionDataSourceBadge';
export type { ExecutionDataSourceBadgeProps } from './ExecutionDataSourceBadge';

// Contact Pipeline Components (4-State Model)
export { ContactFunnelCard } from './ContactFunnelCard';
export type { ContactFunnelCardProps } from './ContactFunnelCard';

export { ContactProgressBar } from './ContactProgressBar';
export type { ContactProgressBarProps } from './ContactProgressBar';

export { BlockedContactsBreakdown } from './BlockedContactsBreakdown';
export type { BlockedContactsBreakdownProps } from './BlockedContactsBreakdown';

// Campaign Progress Components (Near-Real-Time Visibility)
export { CampaignProgressCard } from './CampaignProgressCard';
export type { CampaignProgressCardProps } from './CampaignProgressCard';

export { StageProgressBar } from './StageProgressBar';
export type { StageProgressBarProps } from './StageProgressBar';

export { LastRunImpactSummary } from './LastRunImpactSummary';
export type { LastRunImpactSummaryProps } from './LastRunImpactSummary';

export { WhyPausedExplainer } from './WhyPausedExplainer';
export type { WhyPausedExplainerProps } from './WhyPausedExplainer';

export { ThroughputIndicator } from './ThroughputIndicator';
export type { ThroughputIndicatorProps, ThroughputStats } from './ThroughputIndicator';

// Stage Display (P1 Incremental)
export { CurrentStageIndicator } from './CurrentStageIndicator';
export type { default as CurrentStageIndicatorDefault } from './CurrentStageIndicator';

// Run History v2 (Canonical - from sales-engine)
// EXECUTION AUTHORITY: Sales-engine is the sole source of run history
export { RunHistoryPanel } from './RunHistoryPanel';
export type { default as RunHistoryPanelDefault } from './RunHistoryPanel';
