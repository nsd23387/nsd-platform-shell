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
 * 
 * M67-14 REMOVED FIELDS (forbidden):
 * - technologies
 * - source_type, max_organizations (organization_sourcing derived from ICP)
 * - minimum_signals (lead_qualification removed)
 * - target_organizations, target_contacts, target_replies
 * 
 * M67-14 REQUIRED FIELDS:
 * - name
 * - keywords[] (non-empty)
 * - geographies[] (non-empty)
 */

export interface CampaignIdentity {
  name: string;
  description?: string;
  owner_id?: string;
  team_id?: string;
}

/**
 * ICP Definition
 * 
 * REQUIRED: keywords, geographies (non-empty arrays)
 * REMOVED: technologies (forbidden per M67-14)
 */
export interface ICPDefinition {
  company_size?: {
    min?: number;
    max?: number;
  };
  industries?: string[];
  geographies: string[];  // REQUIRED
  job_titles?: string[];
  seniority_levels?: string[];
  keywords: string[];     // REQUIRED
  exclusions?: {
    industries?: string[];
    domains?: string[];
    job_titles?: string[];
  };
}

/**
 * Contact Targeting
 * 
 * Organization sourcing is DERIVED from ICP (read-only)
 * No OrganizationSourcing interface needed
 */
export interface ContactTargeting {
  roles?: string[];
  seniority?: string[];
  max_contacts_per_org?: number;
  email_requirements?: {
    require_verified?: boolean;
    exclude_generic?: boolean;
  };
}

export interface OutreachContext {
  tone?: string;
  value_propositions?: string[];
  pain_points?: string[];
  call_to_action?: string;
  personalization_fields?: string[];
}

/**
 * Campaign Targets - BENCHMARKS ONLY
 * 
 * These do NOT gate execution, sourcing, or approval.
 * They do NOT affect campaign lifecycle.
 * 
 * REMOVED: target_organizations, target_contacts, target_replies (forbidden)
 * ALLOWED: target_leads, target_emails, target_reply_rate
 */
export interface CampaignTargets {
  target_leads?: number | null;
  target_emails?: number | null;
  target_reply_rate?: number | null;
}

/**
 * M67-14 CampaignCreate Payload
 * 
 * REMOVED from payload:
 * - organization_sourcing (derived from ICP)
 * - lead_qualification (minimum_signals forbidden)
 */
export interface CampaignCreatePayload {
  campaign_identity: CampaignIdentity;
  icp: ICPDefinition;
  contact_targeting: ContactTargeting;
  outreach_context: OutreachContext;
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
