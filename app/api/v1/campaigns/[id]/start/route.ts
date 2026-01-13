/**
 * Campaign Start v1 Adapter — Execution Blocked
 * 
 * POST /api/v1/campaigns/[id]/start
 * 
 * ⚠️ EXECUTION DISABLED
 * 
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 * 
 * This endpoint is a VALIDATION-ONLY adapter.
 * It validates the campaign and returns a 409 error
 * indicating that execution must occur via nsd-sales-engine.
 * 
 * WHAT THIS ENDPOINT DOES:
 * - Validates campaign exists (→ 404 if not found)
 * - Validates campaign status is 'active' (→ 409 CAMPAIGN_NOT_RUNNABLE if not)
 * - Validates campaign is not planning-only (→ 409 PLANNING_ONLY_CAMPAIGN if benchmarks_only=true)
 * - Returns 409 with PLATFORM_SHELL_EXECUTION_DISABLED
 * 
 * WHAT THIS ENDPOINT DOES NOT DO:
 * - Call processCampaign() directly
 * - Generate run IDs
 * - Create campaign_runs directly
 * - Emit run.started / run.running events
 * - Execute pipeline logic
 * - Write to activity.events
 * - Add background execution
 * 
 * ARCHITECTURE:
 * Platform-shell acts ONLY as:
 * - UI rendering layer
 * - Validation layer
 * - Adapter to canonical execution (nsd-sales-engine)
 * 
 * All execution must occur via nsd-sales-engine, which:
 * - Creates durable campaign_runs records
 * - Uses queue-first, cron-adopted execution
 * - Maintains execution authority
 * 
 * RESPONSE:
 * - 404 if campaign not found
 * - 409 CAMPAIGN_NOT_RUNNABLE if status !== 'active'
 * - 409 PLANNING_ONLY_CAMPAIGN if benchmarks_only === true
 * - 409 PLATFORM_SHELL_EXECUTION_DISABLED if validation passes
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

/**
 * NOTE:
 * Execution is intentionally disabled in platform-shell.
 * This service is NOT an execution authority.
 * See nsd-sales-engine for execution logic.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[v1-campaign-start] POST request for:', campaignId);
  console.warn('[v1-campaign-start] ⚠️ EXECUTION DISABLED: Platform-shell is not an execution engine.');

  // =========================================================================
  // STEP 1: Validate database is configured
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
    // STEP 5: BLOCK EXECUTION — Platform-shell is NOT an execution engine
    // =========================================================================
    
    /**
     * NOTE:
     * Execution is intentionally disabled in platform-shell.
     * This service is NOT an execution authority.
     * See nsd-sales-engine for execution logic.
     * 
     * ⚠️ EXECUTION DISABLED
     * 
     * Campaign passed validation but execution is blocked.
     * All execution must occur via nsd-sales-engine.
     * 
     * DO NOT:
     * - Forward to local canonical endpoint
     * - Call processCampaign()
     * - Generate run IDs
     * - Emit events
     */
    
    console.warn(
      `[v1-campaign-start] ⚠️ EXECUTION BLOCKED for campaign ${campaignId}. ` +
      `Platform-shell is not an execution engine. ` +
      `Use nsd-sales-engine POST /api/v1/campaigns/:id/execute for execution.`
    );

    return NextResponse.json(
      { 
        error: 'PLATFORM_SHELL_EXECUTION_DISABLED',
        reason: 'Execution is disabled in platform-shell. All campaign execution must occur via nsd-sales-engine.',
        campaign_id: campaignId,
        campaign_name: campaign.name,
        campaign_status: campaign.status,
        validation_passed: true,
        message: 'Campaign passed validation but execution is blocked. Use nsd-sales-engine POST /api/v1/campaigns/:id/execute for execution.',
      },
      { status: 409 }
    );

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
