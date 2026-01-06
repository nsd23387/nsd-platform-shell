/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NOTE:
 * This file intentionally disables `@typescript-eslint/no-explicit-any`.
 *
 * Reason:
 * - This module is a server-only runtime orchestration layer.
 * - It interfaces with heterogeneous pipeline payloads and execution contexts.
 * - The repository does not enforce @typescript-eslint rules globally.
 * - Enabling the rule here causes Vercel build failures due to missing plugin resolution.
 *
 * Scope:
 * - This disable applies ONLY to this file.
 * - No UI code, shared types, or client bundles are affected.
 * - No runtime behavior is changed by this lint override.
 */

/**
 * Sales Engine Runtime — Inline Execution (Event-Sourced)
 * 
 * NOTE:
 * Execution is intentionally co-located with the Platform Shell
 * for cost and simplicity reasons.
 *
 * This file represents a logical execution boundary and is
 * designed to be extractable into a separate runtime in the future
 * without changing semantics.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * - No core.campaign_runs table is used
 * - All run state is derived from activity.events
 * - Observability UI reads events to display run status
 * - This is target-state compliant (event-sourced execution)
 * 
 * ARCHITECTURE:
 * - Execution is API-isolated (only triggered via POST /run)
 * - UI remains observational + approval-only
 * - All state changes are event-driven (append-only)
 * - Events are written to activity.events schema
 * - Run tracking is event-based, not table-based
 * 
 * GOVERNANCE:
 * - No UI state mutation
 * - No bypassing approval semantics
 * - All writes go through canonical event emission
 * - Append-only writes only
 */

import { createClient } from '@supabase/supabase-js';

type AnySupabaseClient = any;

// ============================================================================
// Types
// ============================================================================

export interface ProcessCampaignOptions {
  triggeredBy: 'platform-shell' | 'scheduler' | 'manual';
}

/**
 * Pipeline execution context.
 * Passed through all pipeline stages to maintain run context.
 */
export interface PipelineContext {
  runId: string;
  campaignId: string;
  triggeredBy: string;
  startedAt: string;
  currentStage: string;
  counters: {
    orgsSourced: number;
    contactsDiscovered: number;
    contactsEvaluated: number;
    leadsPromoted: number;
  };
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
 * Create a Supabase client for the core schema (campaigns, organizations, contacts, leads).
 * NOTE: This is used for READS only. Run tracking is event-based.
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
 * All run tracking and state changes go through this client.
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
 * 
 * All state changes go through event emission.
 * This is an append-only operation - events are never updated or deleted.
 * 
 * Campaign runs are tracked via activity events, not relational tables.
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
 * 
 * IMPORTANT: Run state is tracked via events, not a campaign_runs table.
 * Each stage emits events that observability UI can read.
 */
async function executePipeline(
  coreClient: AnySupabaseClient,
  activityClient: AnySupabaseClient,
  context: PipelineContext
): Promise<void> {
  const { runId, campaignId } = context;
  console.log(`[runtime] Starting pipeline execution for run ${runId}`);

  try {
    // Emit run.running event (status change tracked via events)
    context.currentStage = 'sourcing';
    await emitEvent(activityClient, {
      event_type: 'run.running',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { 
        stage: 'sourcing',
        triggered_by: context.triggeredBy,
      },
    });

    // ========================================================================
    // Stage 1: Sourcing Organizations
    // ========================================================================
    console.log(`[runtime] Stage 1: Sourcing organizations`);
    
    // Get campaign ICP configuration (READ from core.campaigns)
    const { data: campaign } = await coreClient
      .from('campaigns')
      .select('id, name, icp, sourcing_config')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'sourcing', icp: campaign.icp },
    });

    // TODO: Integrate with actual sourcing logic (Apollo, etc.)
    // Placeholder for actual integration
    context.counters.orgsSourced = 0;

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'sourcing', orgs_sourced: context.counters.orgsSourced },
    });

    // ========================================================================
    // Stage 2: Contact Discovery
    // ========================================================================
    console.log(`[runtime] Stage 2: Contact discovery`);
    context.currentStage = 'discovery';
    
    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'discovery' },
    });

    // Placeholder for actual discovery
    context.counters.contactsDiscovered = 0;

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'discovery', contacts_discovered: context.counters.contactsDiscovered },
    });

    // ========================================================================
    // Stage 3: Contact Evaluation
    // ========================================================================
    console.log(`[runtime] Stage 3: Contact evaluation`);
    context.currentStage = 'evaluation';

    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'evaluation' },
    });

    // Placeholder for actual evaluation
    context.counters.contactsEvaluated = 0;

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'evaluation', contacts_evaluated: context.counters.contactsEvaluated },
    });

    // ========================================================================
    // Stage 4: Lead Promotion
    // ========================================================================
    console.log(`[runtime] Stage 4: Lead promotion`);
    context.currentStage = 'promotion';

    await emitEvent(activityClient, {
      event_type: 'stage.started',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'promotion' },
    });

    // Placeholder for actual promotion
    context.counters.leadsPromoted = 0;

    await emitEvent(activityClient, {
      event_type: 'stage.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { stage: 'promotion', leads_promoted: context.counters.leadsPromoted },
    });

    // ========================================================================
    // Complete Run
    // ========================================================================
    console.log(`[runtime] Pipeline execution completed for run ${runId}`);
    context.currentStage = 'completed';

    // Emit run.completed event (this is how observability knows the run finished)
    await emitEvent(activityClient, {
      event_type: 'run.completed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: {
        completed_at: new Date().toISOString(),
        orgs_sourced: context.counters.orgsSourced,
        contacts_discovered: context.counters.contactsDiscovered,
        contacts_evaluated: context.counters.contactsEvaluated,
        leads_promoted: context.counters.leadsPromoted,
      },
    });

  } catch (error) {
    console.error(`[runtime] Pipeline execution failed for run ${runId}:`, error);
    
    // Emit run.failed event (this is how observability knows the run failed)
    await emitEvent(activityClient, {
      event_type: 'run.failed',
      entity_type: 'campaign_run',
      entity_id: runId,
      campaign_id: campaignId,
      run_id: runId,
      payload: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString(),
        last_stage: context.currentStage,
      },
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Process a campaign execution request.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * - runId is generated in code (UUID)
 * - run.started event is emitted immediately
 * - All run state changes are tracked via events
 * - Observability derives state from event stream
 * 
 * This function:
 * 1. Generates a unique runId
 * 2. Emits run.started event immediately
 * 3. Triggers pipeline execution (non-blocking)
 * 
 * The caller should NOT await pipeline completion - this function
 * returns immediately after run.started event emission.
 * 
 * @param campaignId - The campaign UUID to execute
 * @param options - Execution options including triggeredBy source
 * @returns The run_id and status
 */
export async function processCampaign(
  campaignId: string,
  options: ProcessCampaignOptions
): Promise<{ run_id: string; status: string }> {
  console.log(`[runtime] processCampaign called for ${campaignId} by ${options.triggeredBy}`);

  // Generate runId in code (no database table needed)
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Create activity client for event emission
  const activityClient = createActivityClient();
  const coreClient = createCoreClient();

  // Create pipeline context (passed through all stages)
  const context: PipelineContext = {
    runId,
    campaignId,
    triggeredBy: options.triggeredBy,
    startedAt,
    currentStage: 'initializing',
    counters: {
      orgsSourced: 0,
      contactsDiscovered: 0,
      contactsEvaluated: 0,
      leadsPromoted: 0,
    },
  };

  // Step 1: Emit run.started event immediately
  // This is how observability knows a run has begun
  await emitEvent(activityClient, {
    event_type: 'run.started',
    entity_type: 'campaign_run',
    entity_id: runId,
    campaign_id: campaignId,
    run_id: runId,
    payload: {
      triggered_by: options.triggeredBy,
      started_at: startedAt,
    },
  });

  console.log(`[runtime] Emitted run.started for run ${runId}`);

  // Step 2: Trigger pipeline execution (non-blocking)
  // We use setImmediate to ensure the response is returned first
  // This is critical for Vercel serverless - we return 202 immediately
  setImmediate(() => {
    executePipeline(coreClient, activityClient, context)
      .catch((error) => {
        console.error(`[runtime] Background pipeline execution failed:`, error);
      });
  });

  // Return immediately with run info
  return {
    run_id: runId,
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
