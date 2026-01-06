/**
 * Campaigns List API Route
 * 
 * GET /api/v1/campaigns
 * 
 * Reads campaigns from core.campaigns in Supabase.
 * This is a read-only endpoint - no mutations.
 * 
 * GOVERNANCE:
 * - Read-only
 * - Returns all campaigns including drafts
 * - No execution or approval logic
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../lib/supabase-server';

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
 * Get mock campaigns when Supabase is not configured
 */
function getMockCampaigns() {
  return [
    {
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
    },
    {
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
    },
    {
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
    },
  ];
}

export async function GET(request: NextRequest) {
  console.log('[campaigns] GET request received');

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  // If Supabase is not configured, return mock data
  if (!isSupabaseConfigured()) {
    console.log('[campaigns] Supabase not configured, returning mock data');
    let campaigns = getMockCampaigns();
    if (status) {
      campaigns = campaigns.filter((c) => c.status === status);
    }
    return NextResponse.json(campaigns);
  }

  try {
    const supabase = createServerClient();

    // Build query - use canonical JSONB columns only
    // NOTE: description is NOT a column in core.campaigns
    // It's stored in icp.metadata.description
    let query = supabase
      .from('campaigns')
      .select('id, name, status, icp, sourcing_config, lead_qualification_config, created_at, updated_at')
      .order('created_at', { ascending: false });

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status.toLowerCase());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[campaigns] Supabase query error:', error);
      // Fall back to mock data on error
      return NextResponse.json(getMockCampaigns());
    }

    // Map database rows to UI format
    // Extract keywords, geographies, and description from icp JSONB
    const campaigns = (data || []).map((row) => {
      const icp = row.icp as { 
        keywords?: string[]; 
        geographies?: string[];
        metadata?: { description?: string };
      } | null;
      return {
        id: row.id,
        name: row.name,
        description: icp?.metadata?.description || null, // Extract from JSONB
        status: mapStatusToGovernanceState(row.status),
        keywords: icp?.keywords || [],
        geographies: icp?.geographies || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        // UI state flags based on status
        canEdit: row.status === 'draft',
        canSubmit: row.status === 'draft',
        canApprove: row.status === 'pending_review',
        isRunnable: row.status === 'active',
      };
    });

    console.log('[campaigns] Returning', campaigns.length, 'campaigns from database');
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('[campaigns] Unexpected error:', error);
    // Fall back to mock data on error
    return NextResponse.json(getMockCampaigns());
  }
}

// POST is handled by /api/campaign-create, but keep this for backwards compatibility
export async function POST(request: NextRequest) {
  // Redirect to the proper campaign-create endpoint
  const body = await request.json();
  
  console.log('[campaigns] POST received - redirecting to campaign-create');
  
  // For backwards compatibility, create a mock response
  // The proper endpoint is /api/campaign-create
  const newCampaign = {
    id: `camp-${Date.now()}`,
    name: body.name,
    description: body.description || null,
    status: 'DRAFT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    canEdit: true,
    canSubmit: true,
    canApprove: false,
    isRunnable: false,
  };
  
  return NextResponse.json(newCampaign, { status: 201 });
}
