/**
 * Sales Engine Runtime — Inline Execution
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
 * - Execution is API-isolated (only triggered via POST /run)
 * - UI remains observational + approval-only
 * - All state changes are event-driven
 * - Events are written to activity.events schema
 * - Run records are written to core.campaign_runs
 * 
 * GOVERNANCE:
 * - No UI state mutation
 * - No bypassing approval semantics
 * - All writes go through canonical event emission
 */

import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

// ============================================================================
// Types
// ============================================================================

export interface ProcessCampaignOptions {
  triggeredBy: 'platform-shell' | 'scheduler' | 'manual';
}

export interface CampaignRun {
  id: string;
  campaign_id: string;
  status: 'REQUESTED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  started_at: string;
  completed_at?: string;
  current_stage?: string;
  orgs_sourced?: number;
  contacts_discovered?: number;
  contacts_evaluated?: number;
  leads_promoted?: number;
  leads_approved?: number;
  emails_sent?: number;
  replies?: number;
  errors?: number;
  error_message?: string;
}

export interface ActivityEvent {
  id?: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  campaign_id: string;
  run_id?: string;
  payload: Record<string, unknown>;
  created_at?: string;
}

// ============================================================================
// Supabase Client Factory
// ============================================================================

/**
 * Create a Supabase client for the core schema (campaign_runs).
 */
function createCoreClient(): AnySupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase not configured for execution');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'core' },
  });
}

/**
 * Create a Supabase client for the activity schema (events).
 */
function createActivityClient(): AnySupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase not configured for execution');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'activity' },
  });
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit an activity event to the activity.events table.
 * All state changes go through event emission.
 */
async function emitEvent(
  activityClient: AnySupabaseClient,
  event: Omit<ActivityEvent, 'id' | 'created_at'>
): Promise<void> {
  const { error } = await activityClient
    .from('events')
    .insert({
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      campaign_id: event.campaign_id,
      run_id: event.run_id,
      payload: event.payload,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`[runtime] Failed to emit event ${event.event_type}:`, error);
    throw error;
  }

  console.log(`[runtime] Emitted event: ${event.event_type} for ${event.entity_type}/${event.entity_id}`);
}

// ============================================================================
// Run Management
// ============================================================================

/**
 * Create a new campaign run record.
 */
async function createRun(
  coreClient: AnySupabaseClient,
  campaignId: string,
  options: ProcessCampaignOptions
): Promise<CampaignRun> {
  const runId = crypto.randomUUID();
  const now = new Date().toISOString();

  const run: Partial<CampaignRun> = {
    id: runId,
    campaign_id: campaignId,
    status: 'REQUESTED',
    started_at: now,
    current_stage: 'initializing',
    orgs_sourced: 0,
    contacts_discovered: 0,
    contacts_evaluated: 0,
    leads_promoted: 0,
    leads_approved: 0,
    emails_sent: 0,
    replies: 0,
    errors: 0,
  };

  const { data, error } = await coreClient
    .from('campaign_runs')
    .insert(run)
    .select()
    .single();

  if (error) {
    console.error('[runtime] Failed to create run:', error);
    throw error;
  }

  console.log(`[runtime] Created run: ${runId} for campaign ${campaignId}`);
  return data as CampaignRun;
}

/**
 * Update a campaign run record.
 */
async function updateRun(
  coreClient: AnySupabaseClient,
  runId: string,
  updates: Partial<CampaignRun>
): Promise<void> {
  const { error } = await coreClient
    .from('campaign_runs')
    .update(updates)
    .eq('id', runId);

  if (error) {
    console.error('[runtime] Failed to update run:', error);
    throw error;
  }
}

// ============================================================================
// Pipeline Execution
// ============================================================================

/**
 * Execute the campaign pipeline.
 * 
 * Pipeline stages:
 * 1. Sourcing - Find organizations matching ICP
 * 2. Discovery - Find contacts within organizations
 * 3. Evaluation - Evaluate contacts for ICP fit
 * 4. Promotion - Promote qualifying contacts to leads
 * 
 * Note: Sending emails requires lead approval and is handled separately.
 */
async function executePipeline(
  coreClient: AnySupabaseClient,
  activityClient: AnySupabaseClient,
  campaignId: string,
  runId: string
): Promise<void> {
  console.log(`[runtime] Starting pipeline execution for run ${runId}`);

  try {
    // Update run status to RUNNING
    await updateRun(coreClient, runId, {
      status: 'RUNNING',
      current_stage: 'sourcing',
    });

    // Emit run.running event
    await emitEvent(activityClient, {
      event_type: 'run.running',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'sourcing' },
    });

    // ========================================================================
    // Stage 1: Sourcing Organizations
    // ========================================================================
    console.log(`[runtime] Stage 1: Sourcing organizations`);
    
    // Get campaign ICP configuration
    const { data: campaign } = await coreClient
      .from('campaigns')
      .select('id, name, icp, sourcing_config')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // TODO: Integrate with actual sourcing logic (Apollo, etc.)
    // For now, emit sourcing event and continue
    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'sourcing', icp: campaign.icp },
    });

    // Simulate sourcing results (placeholder for actual integration)
    const orgsSourced = 0; // Will be populated by actual sourcing
    
    await updateRun(coreClient, runId, {
      current_stage: 'discovery',
      orgs_sourced: orgsSourced,
    });

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'sourcing', orgs_sourced: orgsSourced },
    });

    // ========================================================================
    // Stage 2: Contact Discovery
    // ========================================================================
    console.log(`[runtime] Stage 2: Contact discovery`);
    
    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'discovery' },
    });

    // Placeholder for actual discovery
    const contactsDiscovered = 0;

    await updateRun(coreClient, runId, {
      current_stage: 'evaluation',
      contacts_discovered: contactsDiscovered,
    });

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'discovery', contacts_discovered: contactsDiscovered },
    });

    // ========================================================================
    // Stage 3: Contact Evaluation
    // ========================================================================
    console.log(`[runtime] Stage 3: Contact evaluation`);

    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'evaluation' },
    });

    // Placeholder for actual evaluation
    const contactsEvaluated = 0;

    await updateRun(coreClient, runId, {
      current_stage: 'promotion',
      contacts_evaluated: contactsEvaluated,
    });

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'evaluation', contacts_evaluated: contactsEvaluated },
    });

    // ========================================================================
    // Stage 4: Lead Promotion
    // ========================================================================
    console.log(`[runtime] Stage 4: Lead promotion`);

    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'promotion' },
    });

    // Placeholder for actual promotion
    const leadsPromoted = 0;

    await updateRun(coreClient, runId, {
      current_stage: 'awaiting_approval',
      leads_promoted: leadsPromoted,
    });

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'promotion', leads_promoted: leadsPromoted },
    });

    // ========================================================================
    // Complete Run
    // ========================================================================
    console.log(`[runtime] Pipeline execution completed for run ${runId}`);

    await updateRun(coreClient, runId, {
      status: 'COMPLETED',
      current_stage: 'completed',
      completed_at: new Date().toISOString(),
    });

    await emitEvent(activityClient, {
      event_type: 'run.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: {
        orgs_sourced: orgsSourced,
        contacts_discovered: contactsDiscovered,
        contacts_evaluated: contactsEvaluated,
        leads_promoted: leadsPromoted,
      },
    });

  } catch (error) {
    console.error(`[runtime] Pipeline execution failed for run ${runId}:`, error);
    
    // Mark run as failed
    await updateRun(coreClient, runId, {
      status: 'FAILED',
      completed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    // Emit run.failed event
    await emitEvent(activityClient, {
      event_type: 'run.failed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process a campaign execution request.
 * 
 * This function:
 * 1. Creates a run record immediately
 * 2. Emits run.started event
 * 3. Triggers pipeline execution (non-blocking)
 * 
 * The caller should NOT await pipeline completion - this function
 * returns immediately after run creation and event emission.
 * 
 * @param campaignId - The campaign UUID to execute
 * @param options - Execution options including triggeredBy source
 * @returns The created run record with run_id
 */
export async function processCampaign(
  campaignId: string,
  options: ProcessCampaignOptions
): Promise<{ run_id: string; status: string }> {
  console.log(`[runtime] processCampaign called for ${campaignId} by ${options.triggeredBy}`);

  // Create clients for each schema
  const coreClient = createCoreClient();
  const activityClient = createActivityClient();

  // Step 1: Create run record
  const run = await createRun(coreClient, campaignId, options);

  // Step 2: Emit run.started event immediately
  await emitEvent(activityClient, {
    event_type: 'run.started',
    entity_type: 'campaign_run',
    entity_id: run.id,
    campaign_id: campaignId,
    run_id: run.id,
    payload: {
      triggered_by: options.triggeredBy,
      started_at: run.started_at,
    },
  });

  // Step 3: Trigger pipeline execution (non-blocking)
  // We use setImmediate/setTimeout to ensure the response is returned first
  // This is critical for Vercel serverless - we return 202 immediately
  setImmediate(() => {
    executePipeline(coreClient, activityClient, campaignId, run.id)
      .catch((error) => {
        console.error(`[runtime] Background pipeline execution failed:`, error);
      });
  });

  // Return immediately with run info
  return {
    run_id: run.id,
    status: 'run_started',
  };
}

/**
 * Check if the runtime is ready (Supabase configured).
 */
export function isRuntimeReady(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return Boolean(
    supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    serviceRoleKey
  );
}
