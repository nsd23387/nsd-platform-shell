/**
 * Campaign Types
 * 
 * Type definitions for the Sales Engine UI.
 * 
 * OBSERVATIONS-FIRST ARCHITECTURE:
 * - observations.* = market existence (source of truth for market scope)
 * - public.* = operational working set (NOT market scope)
 * - outcomeType = authoritative run outcome
 * - runIntent = HARVEST_ONLY | ACTIVATE
 * 
 * INVARIANTS:
 * - INV-1: Observed reality defines existence
 * - INV-2: public.* ≠ market scope  
 * - INV-4: Zero data is a valid outcome, not failure
 */

/**
 * Campaign governance status from backend.
 * NOTE: This is GOVERNANCE state, NOT execution state.
 * Do not use this to derive execution status.
 */
export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'RUNNABLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

/**
 * Provenance type for data records.
 */
export type ProvenanceType = 'CANONICAL' | 'LEGACY_OBSERVED';

/**
 * Confidence classification for metrics.
 */
export type MetricConfidence = 'SAFE' | 'CONDITIONAL' | 'BLOCKED';

// ============================================
// OBSERVATIONS-FIRST TYPES
// ============================================

/**
 * Run intent determines what actions the execution should take.
 * 
 * HARVEST_ONLY: Observe and collect market data without sending emails
 * ACTIVATE: Full execution including email dispatch
 */
export type RunIntent = 'HARVEST_ONLY' | 'ACTIVATE';

/**
 * Outcome type provides semantic meaning to run results.
 * 
 * CRITICAL: Do NOT collapse these back into boolean success/failure.
 * Each outcome type requires different UI treatment.
 * 
 * VALID_EMPTY_OBSERVATION: Run succeeded but found zero qualifying data.
 *   This is NOT a failure - the market was observed correctly.
 *   UI should show as neutral/informational state.
 * 
 * CONFIG_INCOMPLETE: Run could not proceed due to missing configuration.
 *   This is a user-fixable issue, not a system error.
 *   UI should guide user to complete configuration.
 * 
 * INFRA_ERROR: Infrastructure failure (network, database, etc.)
 *   This IS a system error requiring engineering attention.
 *   UI should show as error state.
 * 
 * EXECUTION_ERROR: Logic error during execution.
 *   This IS a failure that may require investigation.
 *   UI should show as error state with details.
 */
export type RunOutcomeType = 
  | 'VALID_EMPTY_OBSERVATION'
  | 'CONFIG_INCOMPLETE'
  | 'INFRA_ERROR'
  | 'EXECUTION_ERROR';

/**
 * Market scope represents observed market reality.
 * Source: observations.* tables
 * 
 * This is the TRUE market scope - do not confuse with operational data.
 */
export interface MarketScope {
  /** Total organizations observed matching ICP */
  observedOrganizations: number;
  /** Total contacts observed across organizations */
  observedContacts: number;
  /** Estimated reachable contacts (with valid email potential) */
  estimatedReachable: number;
  /** Market observation timestamp */
  observedAt: string;
  /** ICP criteria hash for cache invalidation */
  icpHash?: string;
}

/**
 * Operational working set represents data actively being processed.
 * Source: public.* tables
 * 
 * This is NOT market scope - it's the operational subset.
 */
export interface OperationalWorkingSet {
  /** Organizations currently in operational pipeline */
  organizations: number;
  /** Contacts currently in operational pipeline */
  contacts: number;
  /** Leads created from operational data */
  leads: number;
  /** Emails sent from operational data */
  emailsSent: number;
  /** Last operational activity */
  lastActivityAt?: string;
}

/**
 * Harvest metrics from a campaign run.
 * Provides detailed breakdown of what was observed vs processed.
 */
export interface HarvestMetrics {
  /** Run ID these metrics are for */
  runId: string;
  /** Market scope at time of harvest */
  marketScope: MarketScope;
  /** Operational working set after harvest */
  operationalSet: OperationalWorkingSet;
  /** Harvest timestamp */
  harvestedAt: string;
}

/**
 * Sourcing configuration for campaigns.
 * Contains settings that control execution behavior.
 */
export interface CampaignSourcingConfig {
  /** If true, this is a planning-only campaign that cannot be executed */
  benchmarks_only?: boolean;
  targets?: {
    target_leads?: number | null;
    target_emails?: number | null;
    target_reply_rate?: number | null;
  };
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  isRunnable: boolean;
  // Sourcing configuration (includes planning-only flag)
  sourcing_config?: CampaignSourcingConfig;
  // Provenance fields
  provenance?: ProvenanceType;
  source_system?: string;
  is_canonical?: boolean;
}

export interface CampaignICP {
  keywords?: string[];
  industries?: string[];
  roles?: string[];
  painPoints?: string[];
  valuePropositions?: string[];
  employeeSize?: { min: number; max: number };
}

export interface CampaignPersonalization {
  toneOfVoice?: string;
  cta?: string;
  usp?: string;
}

/**
 * Payload for creating a new campaign.
 */
export interface CampaignCreatePayload {
  name: string;
  description?: string;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
}

/**
 * Payload for updating a campaign.
 */
export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
}

export type ThroughputBlockCode =
  | 'DAILY_LIMIT_EXCEEDED'
  | 'HOURLY_LIMIT_EXCEEDED'
  | 'MAILBOX_LIMIT_EXCEEDED'
  | 'CONFIG_INACTIVE'
  | 'NO_CONFIG_FOUND';

export interface CampaignMetrics {
  campaign_id: string;
  total_leads: number;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  open_rate: number;
  reply_rate: number;
  last_updated: string;
  // Confidence metadata
  confidence?: MetricConfidence;
  validation_status?: string;
  provenance?: ProvenanceType;
}

export interface MetricsHistoryEntry {
  timestamp: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  confidence?: MetricConfidence;
}

export interface CampaignRun {
  id: string;
  campaign_id: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  started_at: string;
  completed_at?: string;
  leads_processed: number;
  emails_sent: number;
  errors: number;
  error_details?: string[];
  snapshot?: {
    icp_hash: string;
    leads_count: number;
    created_at: string;
  };
  // Provenance
  provenance?: ProvenanceType;
  // Terminal metadata (optional) - emitted by backend on terminal runs
  error_message?: string | null;
  failure_reason?: string | null;
  reason?: string | null;
  
  // OBSERVATIONS-FIRST FIELDS
  /** 
   * Run intent that was requested.
   * HARVEST_ONLY = observe market only
   * ACTIVATE = full execution with email dispatch
   */
  runIntent?: RunIntent;
  
  /**
   * Outcome type provides semantic meaning to the result.
   * CRITICAL: Do not collapse this to boolean success/failure.
   * 
   * - VALID_EMPTY_OBSERVATION: Success, but zero qualifying data found
   * - CONFIG_INCOMPLETE: Missing configuration (user-fixable)
   * - INFRA_ERROR: System infrastructure failure
   * - EXECUTION_ERROR: Logic error during execution
   */
  outcomeType?: RunOutcomeType;
  
  /**
   * Human-readable reason for the outcome.
   * Particularly important for VALID_EMPTY_OBSERVATION to explain
   * why zero results is correct (e.g., "No organizations match ICP criteria")
   */
  outcomeReason?: string;
}

export interface CampaignVariant {
  id: string;
  name: string;
  subject_line: string;
  body_preview: string;
  weight: number;
}

export interface ThroughputConfig {
  campaign_id: string;
  daily_limit: number;
  hourly_limit: number;
  mailbox_limit: number;
  current_daily_usage: number;
  current_hourly_usage: number;
  is_blocked: boolean;
  block_reason?: ThroughputBlockCode;
}

export interface CampaignDetail extends Campaign {
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  // sourcing_config is inherited from Campaign
}

export interface DashboardThroughput {
  dailyLimit: number;
  usedToday: number;
  activeCampaigns: number;
  blockedByThroughput: number;
}

export interface SystemNotice {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  active: boolean;
  createdAt: string;
}

export interface RecentRunOutcome {
  runId: string;
  campaignId: string;
  campaignName: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL';
  leadsAttempted: number;
  leadsSent: number;
  leadsBlocked: number;
  completedAt: string;
  provenance?: ProvenanceType;
}

/**
 * Needs attention items with governance-first actions.
 * Updated: Removed "Start Run" action per target-state constraints.
 */
export interface NeedsAttentionItem {
  id: string;
  campaignId: string;
  campaignName: string;
  reason: 'pending_approval_stale' | 'approved_not_observed' | 'execution_failed' | 'blocked';
  status: CampaignStatus;
  lastUpdated: string;
  primaryAction: {
    label: string;
    href: string;
    type: 'view' | 'review';
  };
}

export interface UserBootstrap {
  id: string;
  email: string;
  name?: string;
  permissions: string[];
  feature_visibility: {
    sales_engine?: boolean;
    [key: string]: boolean | undefined;
  };
  // M68-03: Optional additional keys that some UI components may access
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Lead promotion tier.
 * 
 * IMPORTANT: Contacts and leads are distinct; leads are conditionally promoted.
 * - Tier A/B: Promoted leads (eligible for outreach)
 * - Tier C/D: Contacts that do NOT qualify as leads (never appear in lead views)
 * 
 * Promotion requires:
 * - ICP fit
 * - Real (non-placeholder) email
 */
export type PromotionTier = 'A' | 'B' | 'C' | 'D';

/**
 * Promotion details for a lead.
 * These fields are set by the backend during deterministic contact evaluation.
 * UI displays these as read-only snapshots.
 */
export interface PromotionDetails {
  /** Promotion tier (A/B = promoted leads, C/D = non-promoted contacts) */
  promotionTier: PromotionTier;
  /** Numeric score assigned during promotion (0-100) */
  promotionScore: number;
  /** Array of reasons explaining why this contact was promoted to lead status */
  promotionReasons: string[];
  /** Timestamp when promotion was evaluated */
  promotedAt?: string;
}

/**
 * Qualified lead record.
 * 
 * CRITICAL DISTINCTION:
 * - Contacts are global; campaign linkage via contact.discovered
 * - Leads exist ONLY when contacts are promoted
 * - Promotion requires ICP fit AND real (non-placeholder) email
 * - Tier C/D contacts are NEVER leads and should never appear in lead views
 * 
 * Per target-state constraints: Lead views must only show records in
 * "lead-ready/qualified" canonical state with promotionTier A or B.
 */
export interface QualifiedLead {
  id: string;
  organization_id: string;
  contact_id: string;
  email: string; // Must be valid, non-filler email
  qualification_state: 'qualified' | 'mql' | 'sql';
  provenance: ProvenanceType;
  created_at: string;
  updated_at: string;
  
  /**
   * Promotion details (read-only snapshot from backend).
   * Present only for promoted leads (Tier A/B).
   * Contacts and leads are distinct; leads are conditionally promoted.
   */
  promotion?: PromotionDetails;
}

/**
 * Contact record (distinct from Lead).
 * 
 * CRITICAL DISTINCTION (contacts vs leads):
 * - Organizations are global; campaign linkage via organization.sourced
 * - Contacts are global; campaign linkage via contact.discovered
 * - Contacts are evaluated deterministically
 * - Leads exist ONLY when contacts are promoted (requires ICP fit + real email)
 * - Tier C/D contacts never become leads
 * 
 * Per target-state constraints: Do not treat "contact with email" as a Lead.
 * A contact may have an email but still not qualify as a lead.
 */
export interface ContactObserved {
  id: string;
  organization_id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  provenance: ProvenanceType;
  observed_at: string;
  
  /**
   * If present, indicates this contact was evaluated for promotion.
   * - Tier A/B: Contact was promoted to lead status
   * - Tier C/D: Contact was NOT promoted (remains contact only)
   */
  evaluationTier?: PromotionTier;
}

/**
 * Learning signal metadata.
 */
export interface LearningSignal {
  id: string;
  name: string;
  type: 'reply_outcome' | 'bounce' | 'open_rate' | 'click_rate' | 'engagement' | 'other';
  collected: boolean;
  eligibleForLearning: boolean;
  excludedFromAutomation: boolean;
  reason?: string;
}

/**
 * Autonomy levels (L0-L2 only per constraints).
 */
export type AutonomyLevel = 'L0' | 'L1' | 'L2';

// ============================================
// Lead Approval Types
// ============================================

/**
 * Lead approval status.
 * 
 * BACKEND ENFORCEMENT:
 * - Leads start as `pending_approval`
 * - Only approved leads can be sent/exported
 * - Approval/rejection are explicit actions
 * - UI reflects this state, does not auto-approve
 */
export type LeadApprovalStatus = 'pending_approval' | 'approved' | 'rejected';

/**
 * Lead approval action type.
 */
export type LeadApprovalAction = 'approve' | 'reject';

/**
 * Lead record with approval status.
 * 
 * IMPORTANT: Approval is gated by backend.
 * - Leads start as pending_approval
 * - Only approved leads can be sent/exported
 * - UI must not imply auto-approval
 */
export interface LeadWithApproval extends QualifiedLead {
  /** Current approval status (backend-authoritative) */
  approval_status: LeadApprovalStatus;
  /** When approval/rejection occurred */
  approval_updated_at?: string;
  /** Who approved/rejected (user ID or system) */
  approval_updated_by?: string;
  /** Optional rejection reason */
  rejection_reason?: string;
}

/**
 * Bulk approval request payload.
 */
export interface BulkApprovalRequest {
  campaign_id: string;
  lead_ids: string[];
  action: LeadApprovalAction;
}

/**
 * Bulk approval response from backend.
 */
export interface BulkApprovalResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ lead_id: string; error: string }>;
}

/**
 * Lead counts by approval status for a campaign.
 */
export interface LeadApprovalCounts {
  pending_approval: number;
  approved: number;
  rejected: number;
  total: number;
}

// ============================================
// Business Scope Types (Business-First Funnel)
// ============================================

/**
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Campaign value exists independently of execution.
 * Execution unlocks value — it does not define it.
 * 
 * Scope values:
 * - MUST populate even if execution has never run
 * - MUST populate even if execution produces zero new writes
 * - MUST NOT depend on run status
 */
export interface FunnelScope {
  /** Total organizations matching this campaign's targeting criteria */
  eligibleOrganizations: number;
  /** Total contacts matching this campaign's targeting criteria */
  eligibleContacts: number;
  /** Total leads eligible for this campaign (contacts promoted to leads) */
  eligibleLeads: number;
  /** Whether scope data is available (false = "Campaign scope not yet computed") */
  scopeAvailable: boolean;
  /** When scope was last computed */
  scopeComputedAt?: string;
}

/**
 * Execution progress metrics for a specific run.
 * 
 * These values:
 * - Reset per run
 * - May legitimately be zero
 * - Are secondary to business scope
 * 
 * Execution metrics are observational only.
 */
export interface FunnelExecution {
  /** Organizations processed in this run */
  processedOrganizations: number;
  /** Contacts discovered/processed in this run */
  processedContacts: number;
  /** Leads promoted in this run */
  promotedLeads: number;
  /** Emails sent in this run */
  sentMessages: number;
  /** Whether execution data is available */
  executionAvailable: boolean;
  /** Current run ID (if any) */
  runId?: string;
  /** Run status */
  runStatus?: string;
}

/**
 * Combined funnel data with both scope and execution layers.
 * 
 * UI MUST display both layers:
 * - Primary: Business scope (eligibility)
 * - Secondary: Execution progress (processed this run)
 */
export interface DualLayerFunnel {
  /** Campaign ID */
  campaignId: string;
  /** Business scope - who the campaign CAN reach */
  scope: FunnelScope;
  /** Execution progress - what has been processed */
  execution: FunnelExecution;
  /** Last updated timestamp */
  lastUpdatedAt: string;
}

// ============================================
// Pipeline Observability Types
// ============================================

/**
 * Campaign execution status.
 * 
 * BACKEND AUTHORITATIVE:
 * - Status reflects actual pipeline state
 * - UI never infers or controls execution
 * - Execution is delegated to backend systems
 * 
 * STATUS MEANINGS (queued → cron execution model):
 * - idle: No active run, campaign is ready for execution
 * - queued: Run has been queued, awaiting cron execution (UI label: "Queued – execution will start shortly")
 * - run_requested: Legacy alias for queued (UI label: "Queued – execution will start shortly")
 * - running: Run in progress (UI label: "Running – sourcing organizations")
 * - awaiting_approvals: Run completed, leads pending approval
 * - completed: Last execution completed successfully (UI label: "Completed – results available")
 * - failed: Last execution failed (UI label: "Failed – see timeline for details")
 * - partial: Last execution partially completed (UI label: "Partially completed – see timeline for details")
 * 
 * UI STATUS MAPPING:
 * - queued/run_requested → "Queued – execution will start shortly" (with pulse animation)
 * - running → "Running – sourcing organizations" (with stage context)
 * - completed → "Completed – results available"
 * - failed → "Failed – see timeline for details"
 * - blocked → "Blocked – see reason"
 */
export type CampaignExecutionStatus = 
  | 'idle'               // No active run
  | 'queued'             // Run queued, awaiting cron execution (NEW)
  | 'run_requested'      // Legacy: execution request sent (maps to queued)
  | 'running'            // Run in progress
  | 'awaiting_approvals' // Run completed, awaiting lead approvals
  | 'completed'          // Last execution completed
  | 'failed'             // Last execution failed
  | 'partial';           // Last execution partially completed

/**
 * Adapter execution status.
 * 
 * IMPORTANT: Adapter status must come ONLY from event payload fields.
 * UI must not infer adapter behavior.
 */
export type AdapterExecutionStatus = 
  | 'not_called'       // Adapter was not invoked
  | 'called_success'   // Adapter called, returned results
  | 'called_no_results'// Adapter called, returned zero results
  | 'adapter_error';   // Adapter call failed

/**
 * Adapter execution details from event payload.
 * 
 * Fields extracted from details.adapterRequestMade and reason.
 */
export interface AdapterExecutionDetails {
  /** Whether the adapter was called */
  adapterRequestMade: boolean;
  /** Adapter name (e.g., "apollo", "linkedin") */
  adapterName?: string;
  /** Number of results returned */
  resultCount?: number;
  /** Reason for not calling adapter or error message */
  reason?: string;
  /** Derived status for display */
  status: AdapterExecutionStatus;
}

/**
 * Pipeline stage in the execution funnel.
 * 
 * IMPORTANT: Observability reflects pipeline state; execution is delegated.
 * - Counts come directly from backend
 * - UI never computes or infers counts
 * - Confidence indicates data reliability
 */
export interface PipelineStage {
  /** Stage identifier */
  stage: string;
  /** Display label for the stage */
  label: string;
  /** Count at this stage (backend-authoritative) */
  count: number;
  /** Confidence level for this count */
  confidence: 'observed' | 'conditional';
  /** Tooltip explaining this stage */
  tooltip?: string;
  /** Adapter execution details (if stage involves adapter call) */
  adapterDetails?: AdapterExecutionDetails;
}

/**
 * Campaign observability data from backend.
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability
 * 
 * UI GOVERNANCE:
 * - Read-only display
 * - No execution control
 * - No retries or overrides
 * - No stage skipping
 */
export interface CampaignObservability {
  /** Campaign ID */
  campaign_id: string;
  
  /** Current execution status */
  status: CampaignExecutionStatus;
  
  /** Active run ID (if status === 'running') */
  active_run_id?: string;
  
  /** Current pipeline stage (if running) */
  current_stage?: string;
  
  /** Last observed event timestamp */
  last_observed_at: string;
  
  /** Pipeline stages with counts */
  pipeline: PipelineStage[];
  
  /** Send metrics (post-approval only) */
  send_metrics?: {
    emails_sent: number;
    emails_opened: number;
    emails_replied: number;
    open_rate?: number;
    reply_rate?: number;
    confidence: 'observed' | 'conditional';
  };
}

/**
 * Extended campaign run with full pipeline visibility.
 * 
 * Data source: GET /api/v1/campaigns/{id}/runs
 */
export interface CampaignRunDetailed extends CampaignRun {
  /** Organizations sourced in this run */
  orgs_sourced?: number;
  /** Contacts discovered in this run */
  contacts_discovered?: number;
  /** Contacts evaluated in this run */
  contacts_evaluated?: number;
  /** Leads promoted in this run */
  leads_promoted?: number;
  /** Leads approved in this run */
  leads_approved?: number;
}

/**
 * Execution status display configuration.
 */
export interface ExecutionStatusDisplay {
  /** Status emoji */
  emoji: string;
  /** Status copy */
  copy: string;
  /** Background color */
  bg: string;
  /** Text color */
  text: string;
  /** Border color */
  border: string;
}

// ============================================
// Run Request Types
// ============================================

/**
 * Response from POST /api/execute-campaign (server-side proxy)
 * 
 * Execution is handled exclusively by nsd-sales-engine.
 * platform-shell must never execute campaigns.
 * 
 * The proxy forwards requests server-to-server to avoid CORS.
 * Browsers must NEVER call nsd-sales-engine directly.
 * 
 * IMPORTANT: This submits execution intent, not synchronous execution.
 * - 202 Accepted = execution intent accepted by Sales Engine
 * - A campaign_run is created in nsd-ods
 * - Sales Engine cron automatically executes the run
 * - UI must refetch /runs to get server-truth state
 * - UI must NOT fabricate local run state
 * - platform-shell emits NO execution events
 */
export interface RunRequestResponse {
  /** Status of the request */
  status: 'queued' | 'run_requested' | 'error';
  /** Campaign ID */
  campaign_id: string;
  /** Message describing the outcome */
  message: string;
  /** Where execution was delegated */
  delegated_to: 'nsd-sales-engine' | 'sales-engine' | null;
  /** Run ID if available */
  run_id?: string;
  /** Error details if failed */
  error?: string;
  
  // Re-run support (from Sales Engine v2)
  /** Whether this is a re-run of a previously executed campaign */
  is_rerun?: boolean;
  /** UUID of the previous run (if re-run) */
  previous_run_id?: string;
  /** Status of the previous run ("failed", "stopped", "cancelled", etc.) */
  previous_run_status?: string;
}

/**
 * Observability status response from backend.
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability/status
 * 
 * This is the source of truth for execution state.
 * UI must derive all execution display from this endpoint.
 */
export interface ObservabilityStatus {
  /** Campaign ID */
  campaign_id: string;
  /** Current execution status */
  status: CampaignExecutionStatus;
  /** Active run ID (if running) */
  active_run_id?: string;
  /** Current pipeline stage (if running) */
  current_stage?: string;
  /** Last observed event timestamp */
  last_observed_at: string;
  /** Error message if status is 'failed' */
  error_message?: string;
}

/**
 * Observability funnel response from backend.
 * 
 * Data source: GET /api/v1/campaigns/{id}/observability/funnel
 * 
 * UI must render counts directly from this endpoint.
 * No local math or inference is allowed.
 */
export interface ObservabilityFunnel {
  /** Campaign ID */
  campaign_id: string;
  /** Pipeline stages with counts */
  stages: PipelineStage[];
  /** Last updated timestamp */
  last_updated_at: string;
}
