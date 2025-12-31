/**
 * Governance Components - Target-State Architecture
 * 
 * These components enforce the governance-first, read-only UI façade
 * for the Sales Engine. They display provenance, confidence, and
 * campaign state information without providing mutation capabilities.
 */

export { CampaignStateBadge } from './CampaignStateBadge';
export { ProvenancePill } from './ProvenancePill';
export { ConfidenceBadge } from './ConfidenceBadge';
export { ReadOnlyBanner } from './ReadOnlyBanner';
export { ExecutionReadinessPanel } from './ExecutionReadinessPanel';
export { LearningSignalsPanel } from './LearningSignalsPanel';
export { GovernanceActionsPanel } from './GovernanceActionsPanel';
