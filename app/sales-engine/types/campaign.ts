export type CampaignStatus = 'DRAFT' | 'PENDING_REVIEW' | 'RUNNABLE' | 'ARCHIVED';

export interface Location {
  country: string;
  state?: string;
  city?: string;
}

export interface EmployeeSizeRange {
  min: number;
  max: number;
}

export interface ICP {
  keywords: string[];
  locations: Location[];
  industries: string[];
  employeeSize: EmployeeSizeRange;
  roles: string[];
  painPoints: string[];
  valuePropositions: string[];
}

export interface PersonalizationStrategy {
  toneOfVoice: 'professional' | 'casual' | 'friendly' | 'authoritative';
  primaryCTA: string;
  uniqueSellingPoints: string[];
  customFields: Record<string, string>;
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
  icp?: ICP;
  personalization?: PersonalizationStrategy;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CampaignCreatePayload {
  name: string;
  description?: string;
  icp?: ICP;
  personalization?: PersonalizationStrategy;
}

export interface CampaignUpdatePayload {
  name?: string;
  description?: string;
  icp?: ICP;
  personalization?: PersonalizationStrategy;
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
  emails_bounced: number;
  emails_unsubscribed: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
  last_updated: string;
}

export interface MetricsHistoryEntry {
  timestamp: string;
  emails_sent: number;
  emails_opened: number;
  emails_replied: number;
  emails_bounced: number;
}

export interface CampaignRun {
  id: string;
  campaign_id: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'IN_PROGRESS';
  started_at: string;
  completed_at?: string;
  leads_processed: number;
  emails_sent: number;
  errors: number;
  triggered_by: string;
}

export interface CampaignVariant {
  id: string;
  name: string;
  subject_line: string;
  body_preview: string;
  weight: number;
  performance?: {
    sent: number;
    opened: number;
    replied: number;
  };
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
  last_reset: string;
}

export interface ReadinessStatus {
  is_ready: boolean;
  blocking_reasons: BlockingReason[];
  throughput_blocked: boolean;
  throughput_block_reason?: ThroughputBlockCode;
}

export interface CampaignDetail extends Campaign {
  readiness?: ReadinessStatus;
}

export interface AIGeneratedContent {
  icp: ICP;
  personalization: PersonalizationStrategy;
  generatedAt: string;
  prompt?: string;
}

export interface DashboardReadiness {
  total_campaigns: number;
  by_status: Record<CampaignStatus, number>;
  blockers: Record<BlockingReason, number>;
  blocked_count: number;
  ready_count: number;
}

export interface DashboardThroughput {
  daily_limit: number;
  daily_used: number;
  daily_remaining: number;
  hourly_limit: number;
  hourly_used: number;
  hourly_remaining: number;
  active_campaigns_count: number;
  blocked_by_throughput_count: number;
  last_reset: string;
  is_throttled: boolean;
}

export type NoticeType = 'INFO' | 'WARNING' | 'ERROR';

export interface SystemNotice {
  id: string;
  type: NoticeType;
  code: string;
  message: string;
  timestamp: string;
}

export interface RecentRunOutcome {
  id: string;
  campaign_id: string;
  campaign_name: string;
  status: 'COMPLETED' | 'PARTIAL' | 'BLOCKED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  leads_attempted: number;
  leads_sent: number;
  leads_blocked: number;
}
