/**
 * Campaign Start API Route — Canonical Execution Endpoint
 * 
 * POST /api/campaigns/[id]/start
 * 
 * This is the CANONICAL endpoint for campaign execution.
 * All UI execution requests MUST use this endpoint.
 * 
 * Legacy endpoints (/api/v1/campaigns/:id/run) should NOT be used.
 * 
 * ARCHITECTURE:
 * - Platform Shell hosts execution (for deployment simplicity)
 * - UI remains observational + approval-only
 * - All state changes are event-driven
 * - Execution writes to activity.events
 * - Run records are written to core.campaign_runs
 * 
 * GOVERNANCE:
 * - No UI state mutation from execution
 * - No bypassing of approval semantics
 * - All execution is event-driven and observable
 * 
 * RESPONSE:
 * - 200 OK or 201 Created on success (run queued)
 * - Response contains run_id for tracking
 */

// Force Node.js runtime for database access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../lib/supabase-server';
import { processCampaign, isRuntimeReady } from '../../../../../lib/sales-engine-runtime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-start] POST request for:', campaignId);

  // =========================================================================
  // STEP 1: Validate runtime is ready
  // =========================================================================
  
  if (!isSupabaseConfigured() || !isRuntimeReady()) {
    console.error('[campaign-start] Runtime not configured');
    return NextResponse.json(
      { error: 'Execution runtime not configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = createServerClient();

    // =========================================================================
    // STEP 2: Validate campaign exists and is in ACTIVE status
    // =========================================================================
    
    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, name, status')
      .eq('id', campaignId)
      .single();

    if (fetchError) {
      console.error('[campaign-start] Fetch error:', fetchError);
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
    // STEP 3: Validate campaign is ACTIVE (approved and ready for execution)
    // =========================================================================
    
    if (campaign.status !== 'active') {
      console.log('[campaign-start] Campaign not active:', campaign.status);
      return NextResponse.json(
        { 
          error: 'Campaign cannot be started',
          reason: `Campaign must be in 'active' status to start. Current status: ${campaign.status}`,
          required_status: 'active',
          current_status: campaign.status,
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // STEP 4: Execute campaign via processCampaign()
    // This creates a run, emits run.started, and triggers pipeline execution.
    // =========================================================================
    
    console.log('[campaign-start] Starting execution for:', campaignId);
    
    const result = await processCampaign(campaignId, {
      triggeredBy: 'platform-shell',
    });

    console.log('[campaign-start] Execution started:', result);

    // =========================================================================
    // STEP 5: Return 200 OK with run details
    // The run is queued; UI must poll /runs for status updates.
    // =========================================================================
    
    return NextResponse.json(
      { 
        status: 'queued',
        campaign_id: campaignId,
        run_id: result.run_id,
        message: 'Campaign execution queued',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[campaign-start] Execution error:', error);
    return NextResponse.json(
      { 
        error: 'Execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
