/**
 * Campaign Details Components
 * 
 * DECISION-FIRST UX COMPONENTS
 * 
 * These components implement the refactored Campaign Details view
 * following decision-first UX principles:
 * 
 * - Single source of truth per concept
 * - Progressive disclosure
 * - No backend jargon exposed to operators
 * - Phase-aware rendering
 */

export { 
  PrimaryCampaignStatusBanner, 
  deriveCampaignPhase,
  type CampaignPhase,
} from './PrimaryCampaignStatusBanner';

export { 
  DecisionSummaryPanel,
} from './DecisionSummaryPanel';

export { 
  CampaignIntentScope,
} from './CampaignIntentScope';

export { 
  ExecutionTimeline,
  type ExecutionStage,
  type ExecutionStageStatus,
} from './ExecutionTimeline';

export { 
  ResultsSection,
} from './ResultsSection';

export { 
  CollapsibleLearningSignals,
} from './CollapsibleLearningSignals';
