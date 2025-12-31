/**
 * CampaignCreate v1 Types - M67-14
 * 
 * Type definitions for campaign creation payload and response.
 * This is a WRITE + OBSERVE flow only - no execution capability.
 * 
 * Constraints:
 * - Campaign is created in governance_state = DRAFT
 * - source_eligible = false (no sourcing occurs)
 * - targets_gating = false (targets are benchmarks only)
 * - No execution, sourcing, learning, or analytics behavior
 */

export interface CampaignIdentity {
  name: string;
  description?: string;
  owner_id?: string;
  team_id?: string;
}

export interface ICPDefinition {
  company_size?: {
    min?: number;
    max?: number;
  };
  industries?: string[];
  geographies?: string[];
  job_titles?: string[];
  seniority_levels?: string[];
  technologies?: string[];
  keywords?: string[];
  exclusions?: {
    industries?: string[];
    domains?: string[];
    job_titles?: string[];
  };
}

export interface OrganizationSourcing {
  source_type: 'manual' | 'list' | 'criteria';
  list_id?: string;
  criteria?: ICPDefinition;
  max_organizations?: number;
}

export interface ContactTargeting {
  roles?: string[];
  seniority?: string[];
  max_contacts_per_org?: number;
  email_requirements?: {
    require_verified?: boolean;
    exclude_generic?: boolean;
  };
}

export interface LeadQualification {
  minimum_signals?: number;
  required_fields?: string[];
  scoring_model?: string;
}

export interface OutreachContext {
  tone?: string;
  value_propositions?: string[];
  pain_points?: string[];
  call_to_action?: string;
  personalization_fields?: string[];
}

export interface ReadinessRequirements {
  mailbox_health_required?: boolean;
  deliverability_threshold?: number;
  warmup_complete?: boolean;
}

export interface CampaignTargets {
  target_organizations?: number | null;
  target_contacts?: number | null;
  target_leads?: number | null;
  target_emails?: number | null;
  target_replies?: number | null;
}

export interface CampaignCreatePayload {
  campaign_identity: CampaignIdentity;
  icp: ICPDefinition;
  organization_sourcing: OrganizationSourcing;
  contact_targeting: ContactTargeting;
  lead_qualification: LeadQualification;
  outreach_context: OutreachContext;
  readiness_requirements: ReadinessRequirements;
  campaign_targets?: CampaignTargets;
}

export interface CampaignCreateSuccessResponse {
  success: true;
  data: {
    campaign: {
      id: string;
      governance_state: 'DRAFT';
      source_eligible: false;
    };
    icp_snapshot: {
      id: string;
      campaign_id: string;
    };
  };
  meta: {
    semantics: {
      governance_state: 'DRAFT';
      source_eligible: false;
      targets_gating: false;
    };
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface CampaignCreateErrorResponse {
  success: false;
  error: string;
  validation_errors?: ValidationError[];
}

export type CampaignCreateResponse = CampaignCreateSuccessResponse | CampaignCreateErrorResponse;

export function isCampaignCreateSuccess(
  response: CampaignCreateResponse
): response is CampaignCreateSuccessResponse {
  return response.success === true;
}

export function isCampaignCreateError(
  response: CampaignCreateResponse
): response is CampaignCreateErrorResponse {
  return response.success === false;
}
