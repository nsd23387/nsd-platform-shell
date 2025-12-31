export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'RUNNABLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

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

export interface CampaignCreatePayload {
  name: string;
  description?: string;
  icp?: CampaignICP;
  personalization?: CampaignPersonalization;
}

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
}

export interface MetricsHistoryEntry {
  timestamp: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
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
}

export interface NeedsAttentionItem {
  id: string;
  campaignId: string;
  campaignName: string;
  reason: 'in_review_stale' | 'approved_not_started' | 'run_failed';
  status: CampaignStatus;
  lastUpdated: string;
  primaryAction: {
    label: string;
    href: string;
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
}
