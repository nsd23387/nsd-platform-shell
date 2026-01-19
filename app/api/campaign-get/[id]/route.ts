/**
 * Campaign Get API Route
 * 
 * GET /api/campaign-get/[id]
 * 
 * Fetches a campaign from Supabase by ID.
 * Used by the edit page to load DRAFT campaigns that exist in Supabase
 * but may not yet exist in the M60 API.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - READ-ONLY: This endpoint only reads campaign data
 * - Used for campaigns created/duplicated via platform-shell
 * - Returns campaign with sourcing_config, icp, lead_qualification_config
 * 
 * RUNTIME:
 * - Must run in Node runtime for Supabase service role access
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { 
  createServerClient, 
  isSupabaseConfigured,
} from '../../../../lib/supabase-server';

interface CampaignGetSuccessResponse {
  success: true;
  data: {
    campaign: {
      id: string;
      name: string;
      description?: string;
      status: string;
      icp: Record<string, unknown> | null;
      sourcing_config: Record<string, unknown> | null;
      lead_qualification_config: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    };
  };
}

interface CampaignGetErrorResponse {
  success: false;
  error: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-get] Fetching campaign:', campaignId);

  try {
    if (!campaignId) {
      const errorResponse: CampaignGetErrorResponse = {
        success: false,
        error: 'Campaign ID is required',
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      console.error('[campaign-get] Supabase not configured');
      const errorResponse: CampaignGetErrorResponse = {
        success: false,
        error: 'Database not configured. Please set SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.',
      };
      return NextResponse.json(errorResponse, { status: 503 });
    }

    const supabase = createServerClient();

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, description, status, icp, sourcing_config, lead_qualification_config, created_at, updated_at')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-get] Error fetching campaign:', fetchError);
      if (fetchError.code === 'PGRST116') {
        const errorResponse: CampaignGetErrorResponse = {
          success: false,
          error: 'Campaign not found',
        };
        return NextResponse.json(errorResponse, { status: 404 });
      }
      const errorResponse: CampaignGetErrorResponse = {
        success: false,
        error: `Database error: ${fetchError.message}`,
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    if (!campaign) {
      const errorResponse: CampaignGetErrorResponse = {
        success: false,
        error: 'Campaign not found',
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    console.log('[campaign-get] Campaign found:', campaign.name);

    const successResponse: CampaignGetSuccessResponse = {
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description || undefined,
          status: campaign.status,
          icp: campaign.icp,
          sourcing_config: campaign.sourcing_config,
          lead_qualification_config: campaign.lead_qualification_config,
          created_at: campaign.created_at,
          updated_at: campaign.updated_at,
        },
      },
    };

    return NextResponse.json(successResponse, { status: 200 });
  } catch (error) {
    console.error('[campaign-get] Unexpected error:', error);
    const errorResponse: CampaignGetErrorResponse = {
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
