/**
 * Campaign Run API Route — Inline Execution
 * 
 * POST /api/v1/campaigns/[id]/run
 * 
 * NOTE:
 * Execution is intentionally co-located with the Platform Shell
 * for cost and simplicity reasons.
 *
 * This file represents a logical execution boundary and is
 * designed to be extractable into a separate runtime in the future
 * without changing semantics.
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
 */

// Force Node.js runtime for database access
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../lib/supabase-server';
import { processCampaign, isRuntimeReady } from '../../../../../../lib/sales-engine-runtime';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[campaign-run] POST request for:', campaignId);

  // =========================================================================
  // STEP 1: Validate runtime is ready
  // =========================================================================
  
  if (!isSupabaseConfigured() || !isRuntimeReady()) {
    console.error('[campaign-run] Runtime not configured');
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
    // STEP 3: Validate campaign is ACTIVE (approved and ready for execution)
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
        { status: 409 }
      );
    }

    // =========================================================================
    // STEP 4: Execute campaign via processCampaign()
    // This creates a run, emits run.started, and triggers pipeline execution.
    // The pipeline runs in the background - we return 202 immediately.
    // =========================================================================
    
    console.log('[campaign-run] Starting execution for:', campaignId);
    
    const result = await processCampaign(campaignId, {
      triggeredBy: 'platform-shell',
    });

    console.log('[campaign-run] Execution started:', result);

    // =========================================================================
    // STEP 5: Return 202 Accepted immediately
    // Do NOT await execution completion.
    // =========================================================================
    
    return NextResponse.json(
      { 
        status: 'run_started',
        campaignId: campaignId,
        run_id: result.run_id,
        message: 'Campaign execution started',
      },
      { status: 202 }
    );

  } catch (error) {
    console.error('[campaign-run] Execution error:', error);
    return NextResponse.json(
      { 
        error: 'Execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
