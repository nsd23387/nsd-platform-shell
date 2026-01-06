/**
 * Sales Engine Components
 * 
 * Component exports for the Sales Engine UI.
 */

export { StatusBadge } from './StatusBadge';
export { CampaignCard } from './CampaignCard';
export { MetricsDisplay } from './MetricsDisplay';
export { RunsDisplay } from './RunsDisplay';
export { VariantsDisplay } from './VariantsDisplay';
export { ICPEditor } from './ICPEditor';
export { PersonalizationEditor } from './PersonalizationEditor';
export { SalesEngineDashboard } from './SalesEngineDashboard';

// Governance components
export {
  ProvenancePill,
  ConfidenceBadge,
  LearningSignalsPanel,
  GovernanceActionsPanel,
  PromotionDetailsPanel,
} from './governance';

export { GovernanceActions } from './GovernanceActions';

// Lead approval components
// BACKEND ENFORCEMENT: Leads start as pending_approval, approval is explicit
export {
  LeadStatusBadge,
  ApprovalConfirmationModal,
  LeadApprovalActions,
  BulkApprovalPanel,
} from './leads';

// Observability components
// OBSERVABILITY GOVERNANCE: Read-only, pipeline-first, no execution control
export {
  CampaignExecutionStatusCard,
  PipelineFunnelTable,
  CampaignRunHistoryTable,
  SendMetricsPanel,
} from './observability';
