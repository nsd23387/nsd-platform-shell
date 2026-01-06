/**
 * Campaign Detail API Route
 * 
 * GET /api/v1/campaigns/[id]
 * PATCH /api/v1/campaigns/[id]
 * 
 * Reads/updates a single campaign from core.campaigns in Supabase.
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../lib/supabase-server';

/**
 * Map database status to UI governance state
 */
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

/**
 * Mock campaigns for fallback when Supabase is not configured
 */
const mockCampaigns: Record<string, any> = {
  'camp-001': {
    id: 'camp-001',
    name: 'Q1 Outreach Campaign',
    description: 'Initial outreach to enterprise prospects',
    status: 'DRAFT',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-20T14:30:00Z',
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
    icp: {
      industries: ['Technology', 'Financial Services'],
      keywords: ['enterprise', 'b2b'],
      geographies: ['United States'],
    },
  },
  'camp-002': {
    id: 'camp-002',
    name: 'Product Launch Sequence',
    description: 'Multi-touch campaign for new product launch',
    status: 'PENDING_REVIEW',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-18T16:45:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: true,
    isRunnable: false,
    icp: {
      industries: ['Retail', 'E-commerce'],
      keywords: ['product launch'],
      geographies: ['United States', 'Canada'],
    },
  },
  'camp-003': {
    id: 'camp-003',
    name: 'Re-engagement Campaign',
    description: 'Targeting dormant leads',
    status: 'RUNNABLE',
    created_at: '2025-01-05T11:00:00Z',
    updated_at: '2025-01-17T10:00:00Z',
    canEdit: false,
    canSubmit: false,
    canApprove: false,
    isRunnable: true,
    icp: {
      industries: ['SaaS', 'Enterprise Software'],
      keywords: ['re-engagement'],
      geographies: ['United States'],
    },
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-detail] GET request for:', campaignId);

  // If Supabase is not configured, use mock data
  if (!isSupabaseConfigured()) {
    console.log('[campaign-detail] Supabase not configured, using mock data');
    const campaign = mockCampaigns[campaignId];
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(campaign);
  }

  try {
    const supabase = createServerClient();

    // Query campaign by ID
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, icp, sourcing_config, lead_qualification_config, created_at, updated_at')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('[campaign-detail] Supabase query error:', error);
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Map database row to UI format
    const icp = data.icp as {
      keywords?: string[];
      geographies?: string[];
      industries?: string[];
      metadata?: { description?: string };
    } | null;

    const campaign = {
      id: data.id,
      name: data.name,
      description: icp?.metadata?.description || null,
      status: mapStatusToGovernanceState(data.status),
      keywords: icp?.keywords || [],
      geographies: icp?.geographies || [],
      industries: icp?.industries || [],
      icp: data.icp,
      sourcing_config: data.sourcing_config,
      lead_qualification_config: data.lead_qualification_config,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // UI state flags based on status
      canEdit: data.status === 'draft',
      canSubmit: data.status === 'draft',
      canApprove: data.status === 'pending_review',
      isRunnable: data.status === 'active',
    };

    console.log('[campaign-detail] Returning campaign:', campaign.id);
    return NextResponse.json(campaign);
  } catch (error) {
    console.error('[campaign-detail] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-detail] PATCH request for:', campaignId);

  // GOVERNANCE: PATCH is not currently implemented for Supabase
  // This is a read-only endpoint for now
  // CampaignCreate is the only allowed write

  // Fallback to mock behavior
  const body = await request.json();
  const campaign = mockCampaigns[campaignId];
  
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  
  if (!campaign.canEdit) {
    return NextResponse.json({ error: 'Campaign cannot be edited' }, { status: 403 });
  }
  
  if (body.name) campaign.name = body.name;
  if (body.description !== undefined) campaign.description = body.description;
  campaign.updated_at = new Date().toISOString();
  
  return NextResponse.json(campaign);
}
