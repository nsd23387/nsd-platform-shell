/**
 * Campaign Types
 * 
 * Type definitions for the Sales Engine UI.
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
