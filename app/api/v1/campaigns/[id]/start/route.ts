/**
 * Campaign Start v1 Adapter
 * 
 * POST /api/v1/campaigns/[id]/start
 * 
 * This endpoint is an ADAPTER, not an executor.
 * It validates the campaign and forwards to the canonical execution endpoint.
 * 
 * VALIDATION RULES:
 * 1. Campaign must exist → 404 if not found
 * 2. Campaign status must be 'active' → 409 CAMPAIGN_NOT_RUNNABLE if not
 * 3. Campaign must not be planning-only → 409 PLANNING_ONLY_CAMPAIGN if benchmarks_only=true
 * 
 * If valid:
 * - Forward request to canonical endpoint POST /api/campaigns/:id/start
 * - Return 202 Accepted
 * 
 * DO NOT:
 * - Call processCampaign() directly
 * - Create campaign_runs directly
 * - Implement queue logic
 * - Add background execution
 */

// Force Node.js runtime for database access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

interface SourcingConfig {
  benchmarks_only?: boolean;
  targets?: {
    target_leads?: number | null;
    target_emails?: number | null;
    target_reply_rate?: number | null;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[v1-campaign-start] POST request for:', campaignId);

  // =========================================================================
  // STEP 1: Validate runtime is ready
  // =========================================================================
  
  if (!isSupabaseConfigured()) {
    console.error('[v1-campaign-start] Supabase not configured');
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = createServerClient();

    // =========================================================================
    // STEP 2: Fetch campaign by ID
    // =========================================================================
    
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status, sourcing_config')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[v1-campaign-start] Fetch error:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // =========================================================================
    // STEP 3: Validate campaign status is 'active'
    // =========================================================================
    
    if (campaign.status !== 'active') {
      console.log('[v1-campaign-start] Campaign not active:', campaign.status);
      return NextResponse.json(
        { 
          error: 'CAMPAIGN_NOT_RUNNABLE',
          status: campaign.status,
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // STEP 4: Validate campaign is not planning-only
    // =========================================================================
    
    const sourcingConfig = campaign.sourcing_config as SourcingConfig | null;
    if (sourcingConfig?.benchmarks_only === true) {
      console.log('[v1-campaign-start] Planning-only campaign cannot be executed');
      return NextResponse.json(
        { 
          error: 'PLANNING_ONLY_CAMPAIGN',
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // STEP 5: Forward to canonical execution endpoint
    // This adapter does NOT execute - it delegates to the canonical endpoint
    // =========================================================================
    
    console.log('[v1-campaign-start] Forwarding to canonical endpoint');
    
    const canonicalUrl = new URL(`/api/campaigns/${campaignId}/start`, request.url);
    
    const forwardResponse = await fetch(canonicalUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        forwarded_from: 'v1-adapter',
        requested_at: new Date().toISOString(),
      }),
    });

    // =========================================================================
    // STEP 6: Return 202 Accepted
    // =========================================================================
    
    if (forwardResponse.ok) {
      const responseData = await forwardResponse.json();
      return NextResponse.json(
        {
          status: 'accepted',
          campaign_id: campaignId,
          message: 'Execution request accepted',
          ...responseData,
        },
        { status: 202 }
      );
    }

    // Forward error from canonical endpoint
    const errorData = await forwardResponse.json().catch(() => ({ error: 'Unknown error' }));
    return NextResponse.json(errorData, { status: forwardResponse.status });

  } catch (error) {
    console.error('[v1-campaign-start] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
