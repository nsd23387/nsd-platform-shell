/**
 * Sales Engine Components - Target-State Architecture
 * 
 * Component exports for the Sales Engine UI.
 * Updated to include governance-first components.
 */

// Legacy components (some deprecated, kept for compatibility)
export { StatusBadge } from './StatusBadge';
export { BlockingReasons } from './BlockingReasons';
export { CampaignCard } from './CampaignCard';
export { ReadinessDisplay } from './ReadinessDisplay';
export { MetricsDisplay } from './MetricsDisplay';
export { RunsDisplay } from './RunsDisplay';
export { VariantsDisplay } from './VariantsDisplay';
export { ICPEditor } from './ICPEditor';
export { PersonalizationEditor } from './PersonalizationEditor';
export { SalesEngineDashboard } from './SalesEngineDashboard';

// Governance components (target-state architecture)
export {
  CampaignStateBadge,
  ProvenancePill,
  ConfidenceBadge,
  ReadOnlyBanner,
  ExecutionReadinessPanel,
  LearningSignalsPanel,
  GovernanceActionsPanel,
} from './governance';

/**
 * @deprecated CampaignForm has been removed. The Sales Engine UI is read-only.
 * Campaign creation is managed by backend governance systems.
 */
export function CampaignForm() {
  throw new Error('CampaignForm is deprecated. The Sales Engine UI is read-only.');
}

/**
 * @deprecated GovernanceActions has been replaced by GovernanceActionsPanel.
 * The new component follows target-state constraints (no run/start/launch buttons).
 */
export { GovernanceActions } from './GovernanceActions';
