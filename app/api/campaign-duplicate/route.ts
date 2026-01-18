/**
 * Campaign Duplicate API Route
 * 
 * POST /api/campaign-duplicate
 * 
 * Duplicates an existing campaign with a new ID and DRAFT status.
 * This is a control-plane write, creating a new campaign entry.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - PERMITTED MUTATION: This endpoint follows the same governance pattern as
 *   campaign-create (INSERT INTO core.campaigns with status='draft')
 * - This is NOT a UI-initiated execution - it creates a new campaign for review
 * - Source campaign is NOT modified (read-only access)
 * - New campaign always starts as DRAFT (no execution capabilities until approved)
 * - No execution history, runs, or metrics are copied (fresh campaign)
 * - No sourcing, approval, or readiness logic initiated
 * 
 * GOVERNANCE ALIGNMENT:
 * Campaign duplication is explicitly permitted as an extension of the
 * CampaignCreate control-plane write capability. Both create new campaigns
 * in DRAFT state without execution capabilities. Duplication simply pre-fills
 * data from an existing campaign for user convenience.
 * 
 * RUNTIME:
 * - Must run in Node runtime for Supabase service role access
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { 
  createServerClient, 
  isSupabaseConfigured,
} from '../../../lib/supabase-server';

interface DuplicateCampaignPayload {
  source_campaign_id: string;
  new_name?: string;
}

interface DuplicateCampaignSuccessResponse {
  success: true;
  data: {
    campaign: {
      id: string;
      name: string;
      governance_state: 'DRAFT';
      source_campaign_id: string;
    };
  };
}

interface DuplicateCampaignErrorResponse {
  success: false;
  error: string;
}

export async function POST(request: NextRequest) {
  console.log('[campaign-duplicate] Received request');

  try {
    const payload: DuplicateCampaignPayload = await request.json();
    console.log('[campaign-duplicate] Payload:', JSON.stringify(payload, null, 2));

    if (!payload.source_campaign_id) {
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: 'source_campaign_id is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.error('[campaign-duplicate] Supabase not configured');
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: 'Database not configured. Please set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.',
      };
      return NextResponse.json(errorResponse, { status: 503 });
    }

    const supabase = createServerClient();

    // Step 1: Fetch the source campaign
    const { data: sourceCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('name, icp, sourcing_config, lead_qualification_config')
      .eq('id', payload.source_campaign_id)
      .single();

    if (fetchError) {
      console.error('[campaign-duplicate] Error fetching source campaign:', fetchError);
      if (fetchError.code === 'PGRST116') {
        const errorResponse: DuplicateCampaignErrorResponse = {
          success: false,
          error: 'Source campaign not found',
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: `Database error: ${fetchError.message}`,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!sourceCampaign) {
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: 'Source campaign not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log('[campaign-duplicate] Source campaign found:', sourceCampaign.name);

    // Step 2: Prepare the new campaign data
    const newName = payload.new_name?.trim() || `Copy of ${sourceCampaign.name}`;
    
    const newCampaignRow = {
      name: newName,
      status: 'draft',
      icp: sourceCampaign.icp,
      sourcing_config: sourceCampaign.sourcing_config,
      lead_qualification_config: sourceCampaign.lead_qualification_config,
    };

    console.log('[campaign-duplicate] Inserting new campaign:', JSON.stringify(newCampaignRow, null, 2));

    // Step 3: Insert the new campaign
    const { data: newCampaign, error: insertError } = await supabase
      .from('campaigns')
      .insert(newCampaignRow)
      .select('id, name')
      .single();

    if (insertError) {
      console.error('[campaign-duplicate] Insert error:', insertError);
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: `Database error: ${insertError.message}`,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!newCampaign) {
      const errorResponse: DuplicateCampaignErrorResponse = {
        success: false,
        error: 'Campaign created but no data returned',
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    console.log('[campaign-duplicate] New campaign created:', newCampaign);

    const successResponse: DuplicateCampaignSuccessResponse = {
      success: true,
      data: {
        campaign: {
          id: newCampaign.id,
          name: newCampaign.name,
          governance_state: 'DRAFT',
          source_campaign_id: payload.source_campaign_id,
        },
      },
    };

    return NextResponse.json(successResponse, { status: 201 });
  } catch (error) {
    console.error('[campaign-duplicate] Unexpected error:', error);
    const errorResponse: DuplicateCampaignErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
