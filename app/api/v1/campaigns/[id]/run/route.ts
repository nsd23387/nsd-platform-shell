/**
 * Campaign Run API Route — Execution Handoff
 * 
 * POST /api/v1/campaigns/[id]/run
 * 
 * ARCHITECTURE:
 * - Platform Shell = command issuer (intent only)
 * - Sales Engine = execution authority
 * - ODS = immutable system of record
 * 
 * This endpoint does NOT execute campaigns. It delegates execution intent
 * to the Sales Engine, which is the only system with execution authority.
 * 
 * GOVERNANCE:
 * - UI issues intent; Sales Engine executes
 * - No sourcing logic runs in Platform Shell
 * - No execution state mutation locally
 * - No Smartlead or message sending
 * - No bypass of approvals
 */

// Force Node.js runtime for Supabase access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';

/**
 * Sales Engine Runtime URL for execution delegation.
 * The Sales Engine (nsd-sales-engine-replit-agent) is the only system with execution authority.
 * 
 * IMPORTANT: This must point to the Sales Engine runtime, NOT the Platform Shell's
 * internal API routes. The Platform Shell delegates execution to the Sales Engine.
 */
const SALES_ENGINE_RUNTIME_URL = process.env.SALES_ENGINE_RUNTIME_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-run] POST request for:', campaignId);

  // =========================================================================
  // STEP 1: Validate campaign exists and is in ACTIVE status
  // =========================================================================
  
  if (!isSupabaseConfigured()) {
    console.error('[campaign-run] Supabase not configured');
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = createServerClient();

    // Fetch campaign from ODS (core.campaigns)
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-run] Fetch error:', fetchError);
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
    // STEP 2: Validate campaign is ACTIVE (approved and ready for execution)
    // =========================================================================
    
    if (campaign.status !== 'active') {
      console.log('[campaign-run] Campaign not active:', campaign.status);
      return NextResponse.json(
        { 
          error: 'Campaign cannot be run',
          reason: `Campaign must be in 'active' status to run. Current status: ${campaign.status}`,
          required_status: 'active',
          current_status: campaign.status,
        },
        { status: 409 }  // Conflict - campaign not in correct state
      );
    }

    // =========================================================================
    // STEP 3: Delegate execution to Sales Engine
    // UI issues intent; Sales Engine executes.
    // =========================================================================
    
    if (!SALES_ENGINE_RUNTIME_URL) {
      console.warn('[campaign-run] SALES_ENGINE_RUNTIME_URL not configured');
      
      // In development/preview without Sales Engine, return mock acceptance
      // This allows UI testing without the full backend
      console.log('[campaign-run] Returning mock 202 (Sales Engine not configured)');
      return NextResponse.json(
        { 
          status: 'run_requested',
          campaign_id: campaignId,
          message: 'Execution request accepted (Sales Engine not configured - mock response)',
          delegated_to: null,
        },
        { status: 202 }
      );
    }

    // Delegate to Sales Engine
    // The Sales Engine will:
    // 1. Create a new campaign_run record
    // 2. Emit campaign.run.started event
    // 3. Begin execution starting with sourcing
    const salesEngineUrl = `${SALES_ENGINE_RUNTIME_URL}/campaigns/${campaignId}/run`;
    console.log('[campaign-run] Delegating to Sales Engine:', salesEngineUrl);

    try {
      const delegateResponse = await fetch(salesEngineUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward authorization if present
          ...(request.headers.get('authorization') 
            ? { 'Authorization': request.headers.get('authorization')! }
            : {}),
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          requested_at: new Date().toISOString(),
          source: 'platform-shell',
        }),
      });

      if (!delegateResponse.ok) {
        const errorData = await delegateResponse.json().catch(() => ({}));
        console.error('[campaign-run] Sales Engine error:', delegateResponse.status, errorData);
        return NextResponse.json(
          { 
            error: 'Sales Engine rejected execution request',
            sales_engine_status: delegateResponse.status,
            details: errorData,
          },
          { status: delegateResponse.status }
        );
      }

      // Sales Engine accepted the execution request
      const responseData = await delegateResponse.json().catch(() => ({}));
      console.log('[campaign-run] Sales Engine accepted:', responseData);

      // =========================================================================
      // STEP 4: Return 202 Accepted
      // Do NOT wait for execution to complete.
      // =========================================================================
      
      return NextResponse.json(
        { 
          status: 'run_requested',
          campaign_id: campaignId,
          message: 'Execution request delegated to Sales Engine',
          delegated_to: 'sales-engine',
          sales_engine_response: responseData,
        },
        { status: 202 }
      );

    } catch (delegateError) {
      // Sales Engine could not be reached
      console.error('[campaign-run] Failed to reach Sales Engine:', delegateError);
      return NextResponse.json(
        { 
          error: 'Sales Engine unavailable',
          message: 'Could not delegate execution request to Sales Engine',
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('[campaign-run] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
