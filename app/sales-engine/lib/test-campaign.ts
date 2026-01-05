/**
 * Synthetic Test Campaign for Execution Validation
 * 
 * This module provides a frontend-only test campaign for validating
 * execution-related actions (Approve, Run, Reset) without touching
 * any backend systems.
 * 
 * CONSTRAINTS:
 * - NOT persisted to Supabase
 * - Does NOT call any APIs
 * - Does NOT trigger side effects
 * - Only appears in Preview/Development environments
 * 
 * Usage:
 * - Import getTestCampaigns() and merge with real campaigns
 * - Test campaigns have execution flags enabled
 */

import type { Campaign, CampaignDetail, ThroughputConfig } from '../types/campaign';
import { deploymentMode } from '../../../config/appConfig';

/**
 * Check if test campaigns should be shown.
 * Only shown in development or preview environments, never in production.
 */
export function shouldShowTestCampaigns(): boolean {
  // Never show in production
  if (deploymentMode === 'production') {
    return false;
  }
  
  // Show in development or preview
  return deploymentMode === 'development' || deploymentMode === 'preview';
}

/**
 * Synthetic test campaign ID prefix.
 * Used to identify test campaigns in the UI.
 */
export const TEST_CAMPAIGN_ID_PREFIX = 'test-m68-';

/**
 * Check if a campaign ID is a test campaign.
 */
export function isTestCampaign(campaignId: string): boolean {
  return campaignId.startsWith(TEST_CAMPAIGN_ID_PREFIX);
}

/**
 * Get synthetic test campaigns for M68-03 validation.
 * Returns empty array in production.
 */
export function getTestCampaigns(): Campaign[] {
  if (!shouldShowTestCampaigns()) {
    return [];
  }

  const now = new Date().toISOString();

  return [
    {
      id: `${TEST_CAMPAIGN_ID_PREFIX}approve-ready`,
      name: '🧪 TEST — M68 Execution Validation (Approve Ready)',
      description: 'Synthetic test campaign for validating approval flow. This is NOT a real campaign.',
      status: 'PENDING_REVIEW',
      created_at: now,
      updated_at: now,
      canEdit: false,
      canSubmit: false,
      canApprove: true, // Enable approve action
      isRunnable: false,
      provenance: 'CANONICAL',
      source_system: 'test-harness',
      is_canonical: false,
    },
    {
      id: `${TEST_CAMPAIGN_ID_PREFIX}runnable`,
      name: '🧪 TEST — M68 Execution Validation (Runnable)',
      description: 'Synthetic test campaign for validating run flow. This is NOT a real campaign.',
      status: 'RUNNABLE',
      created_at: now,
      updated_at: now,
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true, // Enable run-related actions
      provenance: 'CANONICAL',
      source_system: 'test-harness',
      is_canonical: false,
    },
    {
      id: `${TEST_CAMPAIGN_ID_PREFIX}draft-submit`,
      name: '🧪 TEST — M68 Execution Validation (Draft Submit)',
      description: 'Synthetic test campaign for validating submit flow. This is NOT a real campaign.',
      status: 'DRAFT',
      created_at: now,
      updated_at: now,
      canEdit: true,
      canSubmit: true, // Enable submit action
      canApprove: false,
      isRunnable: false,
      provenance: 'CANONICAL',
      source_system: 'test-harness',
      is_canonical: false,
    },
  ];
}

/**
 * Get a synthetic test campaign detail by ID.
 * Returns null if not a test campaign or not in dev/preview.
 */
export function getTestCampaignDetail(campaignId: string): CampaignDetail | null {
  if (!shouldShowTestCampaigns() || !isTestCampaign(campaignId)) {
    return null;
  }

  const testCampaigns = getTestCampaigns();
  const campaign = testCampaigns.find(c => c.id === campaignId);
  
  if (!campaign) {
    return null;
  }

  // Extend with CampaignDetail fields
  return {
    ...campaign,
    icp: {
      keywords: ['test', 'validation', 'm68'],
      industries: ['Technology'],
      roles: ['Engineering'],
    },
    personalization: {
      toneOfVoice: 'professional',
      cta: 'Test CTA',
      usp: 'Test USP',
    },
  };
}

/**
 * Get mock throughput config for a test campaign.
 */
export function getTestCampaignThroughput(campaignId: string): ThroughputConfig | null {
  if (!shouldShowTestCampaigns() || !isTestCampaign(campaignId)) {
    return null;
  }

  // Return a mock throughput config
  return {
    campaign_id: campaignId,
    daily_limit: 100,
    hourly_limit: 20,
    mailbox_limit: 50,
    current_daily_usage: 25,
    current_hourly_usage: 5,
    is_blocked: false,
  };
}

/**
 * Handle test campaign action.
 * This is a no-op that just logs the action - no actual execution occurs.
 */
export async function handleTestCampaignAction(
  campaignId: string,
  action: 'submit' | 'approve' | 'run' | 'reset'
): Promise<{ success: boolean; message: string }> {
  if (!isTestCampaign(campaignId)) {
    return {
      success: false,
      message: 'Not a test campaign',
    };
  }

  // Log the action for debugging
  console.log(`[TEST CAMPAIGN] Action "${action}" triggered on campaign "${campaignId}"`);
  console.log('[TEST CAMPAIGN] This is a no-op - no actual execution occurs.');

  // Simulate a small delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    success: true,
    message: `Test action "${action}" completed. No actual execution occurred.`,
  };
}

/**
 * Test campaign banner message.
 */
export const TEST_CAMPAIGN_BANNER = 
  '🧪 This is a synthetic test campaign for M68-03 validation. No actual execution will occur.';
