/**
 * Campaign API Client - Sales Engine Version
 * 
 * This is a SIMPLIFIED version of the API client for use in Sales Engine.
 * Since Sales Engine IS the backend, we call routes directly without proxies.
 * 
 * Copy the functions you need and adapt as necessary.
 */

import type { 
  Campaign, 
  CampaignDetail, 
  CampaignStatus,
  RunRequestResponse,
} from '../types/campaign';

// ============================================================================
// CAMPAIGN CRUD
// ============================================================================

/**
 * List all campaigns with optional status filter.
 */
export async function listCampaigns(status?: CampaignStatus): Promise<Campaign[]> {
  const url = status 
    ? `/api/v1/campaigns?status=${status}` 
    : '/api/v1/campaigns';
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch campaigns');
  
  const data = await response.json();
  return data.campaigns || data || [];
}

/**
 * Get a single campaign by ID.
 */
export async function getCampaign(id: string): Promise<CampaignDetail> {
  const response = await fetch(`/api/v1/campaigns/${id}`);
  if (!response.ok) throw new Error('Failed to fetch campaign');
  
  return response.json();
}

/**
 * Update a campaign.
 */
export async function updateCampaign(
  campaignId: string, 
  data: Partial<CampaignDetail>
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`/api/v1/campaigns/${campaignId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.message || 'Update failed' };
  }
  
  return { success: true };
}

// ============================================================================
// GOVERNANCE ACTIONS
// ============================================================================

/**
 * Submit campaign for approval (DRAFT -> PENDING_REVIEW).
 */
export async function submitCampaignForApproval(campaignId: string) {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit campaign');
  }
  
  return response.json();
}

/**
 * Approve campaign (PENDING_REVIEW -> RUNNABLE).
 */
export async function approveCampaign(campaignId: string) {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to approve campaign');
  }
  
  return response.json();
}

/**
 * Revert campaign to draft status.
 */
export async function revertCampaignToDraft(campaignId: string) {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/revert-to-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to revert campaign');
  }
  
  return response.json();
}

// ============================================================================
// EXECUTION
// ============================================================================

export type RunIntent = 'HARVEST_ONLY' | 'ACTIVATE';

/**
 * Start or re-run a campaign.
 */
export async function requestCampaignRun(
  campaignId: string,
  runIntent: RunIntent = 'ACTIVATE'
): Promise<RunRequestResponse> {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ runIntent }),
  });
  
  if (response.status === 409) {
    const error = await response.json();
    throw new Error(error.message || 'Campaign is already running');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start campaign');
  }
  
  const data = await response.json();
  return {
    status: data.status || 'queued',
    campaign_id: campaignId,
    message: data.message || 'Campaign started',
    run_id: data.run_id,
    is_rerun: data.is_rerun,
    previous_run_id: data.previous_run_id,
    previous_run_status: data.previous_run_status,
    delegated_to: null,
  };
}

/**
 * Get execution state for a campaign.
 */
export async function getExecutionState(campaignId: string) {
  const response = await fetch(`/api/v1/campaigns/${campaignId}/execution-state`);
  
  if (!response.ok) {
    // Return empty state on error
    return {
      campaignId,
      run: null,
      funnel: {
        organizations: { total: 0 },
        contacts: { total: 0, withEmail: 0 },
        leads: { total: 0, pending: 0, approved: 0 },
        emailsSent: 0,
      },
    };
  }
  
  return response.json();
}

// ============================================================================
// DUPLICATION
// ============================================================================

/**
 * Duplicate a campaign.
 */
export async function duplicateCampaign(
  sourceCampaignId: string,
  newName?: string
) {
  const response = await fetch('/api/v1/campaigns/duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      source_campaign_id: sourceCampaignId,
      name: newName,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.message };
  }
  
  const data = await response.json();
  return { 
    success: true, 
    data: { campaign: data.campaign || data } 
  };
}
