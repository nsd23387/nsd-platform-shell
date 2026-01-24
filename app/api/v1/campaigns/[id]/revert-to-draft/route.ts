/**
 * Campaign Revert to Draft API Route
 * 
 * POST /api/v1/campaigns/[id]/revert-to-draft
 * 
 * Reverts a campaign to DRAFT status to enable editing.
 * 
 * GOVERNANCE:
 * - Non-draft, non-archived campaigns can be reverted
 * - Status changes to 'draft' (editable)
 * - Archived campaigns return 403
 * - No execution occurs from this endpoint
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

/**
 * Map database status to UI status values.
 */
function mapStatusToGovernanceState(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'DRAFT',
    pending_review: 'PENDING_REVIEW',
    active: 'RUNNABLE',
    running: 'RUNNING',
    paused: 'DRAFT',
    completed: 'COMPLETED',
    failed: 'FAILED',
    archived: 'ARCHIVED',
  };
  return statusMap[status?.toLowerCase()] || 'DRAFT';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-revert-to-draft] POST request for:', campaignId);

  // If Supabase is not configured, return mock response
  if (!isSupabaseConfigured()) {
    console.log('[campaign-revert-to-draft] Supabase not configured, returning mock response');
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      status: 'DRAFT',
      reverted: true,
      previousStatus: 'RUNNABLE',
      message: 'Campaign reverted to draft (mock)',
      governance: {
        canEdit: true,
        canSubmit: true,
        canApprove: false,
        isRunnable: false,
      },
    });
  }

  try {
    const supabase = createServerClient();

    // First, verify the campaign exists and check its status
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, icp')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-revert-to-draft] Fetch error:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const previousStatus = existingCampaign.status;
    const previousGovernanceState = mapStatusToGovernanceState(previousStatus);

    // Check if campaign is archived - cannot revert
    if (previousStatus === 'archived') {
      return NextResponse.json(
        { error: 'Cannot revert archived campaign' },
        { status: 403 }
      );
    }

    // If already draft, return success without updating
    if (previousStatus === 'draft') {
      console.log('[campaign-revert-to-draft] Campaign already in draft status');
      const icp = existingCampaign.icp as { metadata?: { description?: string } } | null;
      return NextResponse.json({
        id: existingCampaign.id,
        name: existingCampaign.name,
        description: icp?.metadata?.description || null,
        status: 'DRAFT',
        reverted: false,
        message: 'Campaign is already in draft status',
        governance: {
          canEdit: true,
          canSubmit: true,
          canApprove: false,
          isRunnable: false,
        },
      });
    }

    // Update campaign status to draft
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select('id, name, status, icp, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[campaign-revert-to-draft] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[campaign-revert-to-draft] Campaign reverted successfully:', updatedCampaign.id);

    // Extract description from icp.metadata
    const icp = updatedCampaign.icp as { metadata?: { description?: string } } | null;

    // Return updated campaign
    return NextResponse.json({
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      description: icp?.metadata?.description || null,
      status: 'DRAFT',
      reverted: true,
      previousStatus: previousGovernanceState,
      message: `Campaign reverted from ${previousGovernanceState} to draft`,
      created_at: updatedCampaign.created_at,
      updated_at: updatedCampaign.updated_at,
      governance: {
        canEdit: true,
        canSubmit: true,
        canApprove: false,
        isRunnable: false,
      },
    });
  } catch (error) {
    console.error('[campaign-revert-to-draft] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
