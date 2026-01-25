/**
 * Canonical Execution Stage Configuration
 * 
 * GOVERNANCE CONSTRAINT (CRITICAL):
 * This configuration is PRESENTATIONAL ONLY. It does NOT define execution semantics.
 * 
 * The canonical authority for execution state is:
 * - campaign_runs.status
 * - campaign_runs.phase
 * - ODS events
 * 
 * The UI must NEVER infer execution state. It must only render what the backend has emitted.
 * If the backend has not emitted data for a stage → render "Not yet observed"
 * 
 * This configuration exists solely to:
 * 1. Define the presentation order of stages
 * 2. Provide human-readable labels
 * 3. Map backend stage IDs to funnel stage names
 * 4. Ensure the UI can safely handle unknown stages
 */

export interface CanonicalStageConfig {
  readonly id: string;
  readonly label: string;
  readonly sublabel: string;
  readonly countLabel: string;
  readonly funnelStageId: string | null;
}

/**
 * CANONICAL_STAGE_CONFIG
 * 
 * This array defines all known execution stages in their canonical order.
 * 
 * IMPORTANT: This is a UI-only configuration. Adding stages here does NOT
 * enable execution functionality. The backend must emit phase/event data
 * for stages to transition from "Not yet observed".
 * 
 * The configuration includes future stages (email_readiness, personalization, etc.)
 * to ensure the UI can accommodate them without code changes when they go live.
 */
export const CANONICAL_STAGE_CONFIG: readonly CanonicalStageConfig[] = [
  {
    id: 'org_sourcing',
    label: 'Organizations Sourced',
    sublabel: 'Identifying organizations matching ICP criteria',
    countLabel: 'organizations sourced',
    funnelStageId: 'orgs_sourced',
  },
  {
    id: 'contact_discovery',
    label: 'Contacts Discovered',
    sublabel: 'Scanning organizations for relevant contacts',
    countLabel: 'contacts discovered',
    funnelStageId: 'contacts_discovered',
  },
  {
    id: 'lead_creation',
    label: 'Leads Promoted',
    sublabel: 'Qualifying and promoting contacts to leads',
    countLabel: 'leads promoted',
    funnelStageId: 'leads_promoted',
  },
  {
    id: 'email_readiness',
    label: 'Email Readiness',
    sublabel: 'Verifying email availability and enrichment',
    countLabel: 'contacts with verified email',
    funnelStageId: 'contacts_email_ready',
  },
  {
    id: 'personalization',
    label: 'Personalization',
    sublabel: 'Generating personalized outreach content',
    countLabel: 'leads personalized',
    funnelStageId: 'leads_personalized',
  },
  {
    id: 'outbound_activation',
    label: 'Outbound Activation',
    sublabel: 'Connecting to outbound delivery system',
    countLabel: 'leads activated',
    funnelStageId: 'leads_activated',
  },
  {
    id: 'send_in_progress',
    label: 'Sending',
    sublabel: 'Outbound messages in delivery',
    countLabel: 'messages sent',
    funnelStageId: 'messages_sent',
  },
  {
    id: 'send_completed',
    label: 'Completed',
    sublabel: 'All outbound activity completed',
    countLabel: 'total delivered',
    funnelStageId: 'messages_delivered',
  },
] as const;

/**
 * Stage status types that the UI is allowed to render
 * 
 * GOVERNANCE CONSTRAINT:
 * - completed: ONLY when backend has emitted data for this stage
 * - running: ONLY when campaign_runs.phase === stage.id
 * - waiting: No data observed, not current phase
 * - blocked: ONLY if backend provides explicit blocking evidence
 * - not_applicable: ONLY if backend explicitly indicates stage not enabled
 * - not_observed: Stage exists in config but no backend data received
 */
export type StageRenderStatus = 
  | 'completed'
  | 'running'
  | 'waiting'
  | 'blocked'
  | 'not_applicable'
  | 'not_observed';

/**
 * Get stage configuration by ID
 * Returns the canonical config if found, or a safe fallback for unknown stages
 */
export function getStageConfig(stageId: string): CanonicalStageConfig {
  const config = CANONICAL_STAGE_CONFIG.find((s) => s.id === stageId);
  
  if (config) {
    return config;
  }

  return {
    id: stageId,
    label: 'Additional Stage',
    sublabel: 'Stage data observed from backend',
    countLabel: 'items processed',
    funnelStageId: null,
  };
}

/**
 * Check if a stage ID is in the canonical configuration
 */
export function isKnownStage(stageId: string): boolean {
  return CANONICAL_STAGE_CONFIG.some((s) => s.id === stageId);
}

/**
 * Get the index of a stage in the canonical order
 * Returns -1 for unknown stages
 */
export function getStageIndex(stageId: string): number {
  return CANONICAL_STAGE_CONFIG.findIndex((s) => s.id === stageId);
}

/**
 * Get all stage IDs in canonical order
 */
export function getCanonicalStageIds(): readonly string[] {
  return CANONICAL_STAGE_CONFIG.map((s) => s.id);
}

/**
 * Map a funnel stage name to its canonical stage ID
 * Returns null if no mapping exists
 */
export function funnelStageToCanonicalId(funnelStageName: string): string | null {
  const stage = CANONICAL_STAGE_CONFIG.find(
    (s) => s.funnelStageId === funnelStageName
  );
  return stage?.id ?? null;
}

/**
 * Generate neutral copy for an unknown or future stage
 * 
 * GOVERNANCE CONSTRAINT:
 * This function must return neutral, non-assumptive copy.
 * No marketing language. No guesses about what the stage does.
 */
export function getUnknownStageCopy(stageId: string): {
  activeCopy: string;
  completedCopy: string;
  waitingCopy: string;
} {
  return {
    activeCopy: 'Stage in progress — awaiting further data',
    completedCopy: 'Stage completed — data observed',
    waitingCopy: 'Stage not yet observed',
  };
}

/**
 * Check if a stage is a "future" stage (not yet live in backend)
 * 
 * GOVERNANCE CONSTRAINT:
 * This is a UI-only heuristic for presentation purposes.
 * It does NOT determine execution capability.
 * 
 * Currently live stages: org_sourcing, contact_discovery, lead_creation
 */
export function isFutureStage(stageId: string): boolean {
  const liveStages = ['org_sourcing', 'contact_discovery', 'lead_creation'];
  return !liveStages.includes(stageId);
}

/**
 * Get human-readable status label for a stage render status
 */
export function getStatusLabel(status: StageRenderStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'running':
      return 'In Progress';
    case 'waiting':
      return 'Waiting';
    case 'blocked':
      return 'Blocked';
    case 'not_applicable':
      return 'Not Applicable';
    case 'not_observed':
      return 'Not Yet Observed';
    default:
      return 'Unknown';
  }
}
