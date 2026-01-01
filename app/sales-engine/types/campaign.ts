/**
 * Campaign Types - Target-State Architecture
 * 
 * Type definitions for the Sales Engine UI.
 * Updated to support governance-first, read-only architecture.
 */

/**
 * Legacy campaign status from backend.
 * Note: UI should map these to CampaignGovernanceState for display.
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
 * @deprecated Campaign creation is not supported in read-only UI.
 */
export interface CampaignCreatePayload {
  name: string;
  description?: string;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
}

/**
 * @deprecated Campaign updates are not supported in read-only UI.
 */
export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
}

export type BlockingReason =
  | 'MISSING_HUMAN_APPROVAL'
  | 'PERSISTENCE_ERRORS'
  | 'NO_LEADS_PERSISTED'
  | 'KILL_SWITCH_ENABLED'
  | 'SMARTLEAD_NOT_CONFIGURED'
  | 'INSUFFICIENT_CREDITS';

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

export interface ReadinessStatus {
  is_ready: boolean;
  blocking_reasons: BlockingReason[];
  last_checked?: string;
  mailbox_healthy?: boolean;
  deliverability_score?: number;
  kill_switch_enabled?: boolean;
}

export interface CampaignDetail extends Campaign {
  readiness?: ReadinessStatus;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
}

export interface DashboardReadiness {
  total: number;
  draft: number;
  pendingReview: number;
  runnable: number;
  running: number;
  completed: number;
  failed: number;
  archived: number;
  blockers: { reason: string; count: number }[];
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
    type: 'view' | 'review'; // Actions are read-only navigation only
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
 * Qualified lead record.
 * Per target-state constraints: Lead views must only show records in
 * "lead-ready/qualified" canonical state.
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
}

/**
 * Contact record (distinct from Lead).
 * Per target-state constraints: Do not treat "contact with email" as a Lead.
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
