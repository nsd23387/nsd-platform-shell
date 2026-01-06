/**
 * Campaign Submit API Route
 * 
 * POST /api/v1/campaigns/[id]/submit
 * 
 * Submits a campaign for approval by updating status from 'draft' to 'pending_review'.
 * 
 * GOVERNANCE:
 * - Only DRAFT campaigns can be submitted
 * - Status changes to 'pending_review' (or equivalent approval state)
 * - No execution occurs
 * - No sourcing occurs
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

/**
 * Map database status to UI governance state
 */
function mapStatusToGovernanceState(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'DRAFT',
    pending_review: 'PENDING_REVIEW',
    active: 'APPROVED_READY',
    paused: 'BLOCKED',
    completed: 'EXECUTED',
    archived: 'ARCHIVED',
  };
  return statusMap[status?.toLowerCase()] || 'DRAFT';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-submit] POST request for:', campaignId);

  // If Supabase is not configured, return mock response
  if (!isSupabaseConfigured()) {
    console.log('[campaign-submit] Supabase not configured, returning mock response');
    return NextResponse.json({
      id: campaignId,
      name: 'Campaign',
      status: 'PENDING_REVIEW',
      updated_at: new Date().toISOString(),
      canEdit: false,
      canSubmit: false,
      canApprove: true,
      isRunnable: false,
    });
  }

  try {
    const supabase = createServerClient();

    // First, verify the campaign exists and is in DRAFT status
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, icp')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-submit] Fetch error:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if campaign is in DRAFT status
    if (existingCampaign.status !== 'draft') {
      return NextResponse.json(
        { error: `Campaign cannot be submitted. Current status: ${existingCampaign.status}` },
        { status: 400 }
      );
    }

    // Update campaign status to pending_review
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('campaigns')
      .update({ 
        status: 'pending_review',
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
      .select('id, name, status, icp, created_at, updated_at')
      .single();

    if (updateError) {
      console.error('[campaign-submit] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log('[campaign-submit] Campaign submitted successfully:', updatedCampaign.id);

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
      canApprove: true,
      isRunnable: false,
    });
  } catch (error) {
    console.error('[campaign-submit] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
