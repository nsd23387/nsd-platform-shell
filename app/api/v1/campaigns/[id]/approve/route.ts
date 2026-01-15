/**
 * Campaign Approve API Route
 * 
 * POST /api/v1/campaigns/[id]/approve
 * 
 * Approves a campaign by updating status from 'pending_review' to 'active'.
 * 
 * GOVERNANCE:
 * - Only PENDING_REVIEW campaigns can be approved
 * - Status changes to 'active' (ready for execution)
 * - No execution occurs from this endpoint
 * - No sourcing occurs from this endpoint
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

/**
 * Map database status to UI status values.
 * 
 * IMPORTANT: These values must match the CampaignStatus type in the UI:
 * 'DRAFT' | 'PENDING_REVIEW' | 'RUNNABLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'
 */
function mapStatusToGovernanceState(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'DRAFT',
    pending_review: 'PENDING_REVIEW',
    active: 'RUNNABLE',        // UI expects RUNNABLE for approved/active campaigns
    running: 'RUNNING',
    paused: 'DRAFT',           // Paused campaigns shown as draft (editable)
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
  console.log('[campaign-approve] POST request for:', campaignId);

  // If Supabase is not configured, return mock response
  if (!isSupabaseConfigured()) {
    console.log('[campaign-approve] Supabase not configured, returning mock response');
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      status: 'APPROVED_READY',
      updated_at: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true,
    });
  }

  try {
    const supabase = createServerClient();

    // First, verify the campaign exists and is in PENDING_REVIEW status
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, icp')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-approve] Fetch error:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign is in PENDING_REVIEW status
    if (existingCampaign.status !== 'pending_review') {
      return NextResponse.json(
        { error: `Campaign cannot be approved. Current status: ${existingCampaign.status}` },
        { status: 400 }
      );
    }

    // Update campaign status to active
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select('id, name, status, icp, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[campaign-approve] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[campaign-approve] Campaign approved successfully:', updatedCampaign.id);

    // Extract description from icp.metadata
    const icp = updatedCampaign.icp as { metadata?: { description?: string } } | null;

    // Return updated campaign
    return NextResponse.json({
      id: updatedCampaign.id,
      name: updatedCampaign.name,
      description: icp?.metadata?.description || null,
      status: mapStatusToGovernanceState(updatedCampaign.status),
      created_at: updatedCampaign.created_at,
      updated_at: updatedCampaign.updated_at,
      canEdit: false,
      canSubmit: false,
      canApprove: false,
      isRunnable: true,
    });
  } catch (error) {
    console.error('[campaign-approve] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
