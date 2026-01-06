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
 * EVENT EMISSION:
 * All events are emitted via the canonical emitRunEvent() helper from activity-db.
 * This ensures consistent population of ALL NOT NULL columns:
 * - id (generated in emitActivityEvent)
 * - event_type
 * - entity_type (always 'campaign_run' for run events)
 * - entity_id (the runId)
 * - payload (contains campaignId, runId, and event-specific data)
 * 
 * DATABASE ACCESS:
 * - activity.events is written via direct DB connection, not PostgREST.
 * - core.* tables are read via Supabase client (PostgREST).
 * - This separation is required because activity schema is not exposed via PostgREST.
 * 
 * ARCHITECTURE:
 * - Execution is API-isolated (only triggered via POST /run)
 * - UI remains observational + approval-only
 * - All state changes are event-driven (append-only)
 * - Events are written to activity.events via direct Postgres
 * - Run tracking is event-based, not table-based
 * 
 * GOVERNANCE:
 * - No UI state mutation
 * - No bypassing approval semantics
 * - All writes go through canonical event emission
 * - Append-only writes only
 */

import { createClient } from '@supabase/supabase-js';
import { emitRunEvent, isActivityDbConfigured } from './activity-db';

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

// ============================================================================
// Supabase Client Factory (for core.* reads only)
// ============================================================================

/**
 * Create a Supabase client for the core schema (campaigns, organizations, contacts, leads).
 * NOTE: This is used for READS only. Event writes go through direct Postgres.
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
 * Each stage emits events via the canonical emitRunEvent() helper,
 * which ensures all NOT NULL columns are populated.
 */
async function executePipeline(
  coreClient: AnySupabaseClient,
  context: PipelineContext
): Promise<void> {
  const { runId, campaignId } = context;
  console.log(`[runtime] Starting pipeline execution for run ${runId}`);

  try {
    // Emit run.running event (status change tracked via events)
    context.currentStage = 'sourcing';
    await emitRunEvent('run.running', runId, campaignId, {
      stage: 'sourcing',
      triggeredBy: context.triggeredBy,
    });

    // ========================================================================
    // Stage 1: Sourcing Organizations
    // ========================================================================
    console.log(`[runtime] Stage 1: Sourcing organizations`);
    
    // Get campaign ICP configuration (READ from core.campaigns via Supabase)
    const { data: campaign } = await coreClient
      .from('campaigns')
      .select('id, name, icp, sourcing_config')
      .eq('id', campaignId)
      .single();

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await emitRunEvent('stage.started', runId, campaignId, {
      stage: 'sourcing',
      icp: campaign.icp,
    });

    // TODO: Integrate with actual sourcing logic (Apollo, etc.)
    // Placeholder for actual integration
    context.counters.orgsSourced = 0;

    await emitRunEvent('stage.completed', runId, campaignId, {
      stage: 'sourcing',
      orgsSourced: context.counters.orgsSourced,
    });

    // ========================================================================
    // Stage 2: Contact Discovery
    // ========================================================================
    console.log(`[runtime] Stage 2: Contact discovery`);
    context.currentStage = 'discovery';
    
    await emitRunEvent('stage.started', runId, campaignId, {
      stage: 'discovery',
    });

    // Placeholder for actual discovery
    context.counters.contactsDiscovered = 0;

    await emitRunEvent('stage.completed', runId, campaignId, {
      stage: 'discovery',
      contactsDiscovered: context.counters.contactsDiscovered,
    });

    // ========================================================================
    // Stage 3: Contact Evaluation
    // ========================================================================
    console.log(`[runtime] Stage 3: Contact evaluation`);
    context.currentStage = 'evaluation';

    await emitRunEvent('stage.started', runId, campaignId, {
      stage: 'evaluation',
    });

    // Placeholder for actual evaluation
    context.counters.contactsEvaluated = 0;

    await emitRunEvent('stage.completed', runId, campaignId, {
      stage: 'evaluation',
      contactsEvaluated: context.counters.contactsEvaluated,
    });

    // ========================================================================
    // Stage 4: Lead Promotion
    // ========================================================================
    console.log(`[runtime] Stage 4: Lead promotion`);
    context.currentStage = 'promotion';

    await emitRunEvent('stage.started', runId, campaignId, {
      stage: 'promotion',
    });

    // Placeholder for actual promotion
    context.counters.leadsPromoted = 0;

    await emitRunEvent('stage.completed', runId, campaignId, {
      stage: 'promotion',
      leadsPromoted: context.counters.leadsPromoted,
    });

    // ========================================================================
    // Complete Run
    // ========================================================================
    console.log(`[runtime] Pipeline execution completed for run ${runId}`);
    context.currentStage = 'completed';

    // Emit run.completed event (this is how observability knows the run finished)
    await emitRunEvent('run.completed', runId, campaignId, {
      completedAt: new Date().toISOString(),
      orgsSourced: context.counters.orgsSourced,
      contactsDiscovered: context.counters.contactsDiscovered,
      contactsEvaluated: context.counters.contactsEvaluated,
      leadsPromoted: context.counters.leadsPromoted,
    });

  } catch (error) {
    console.error(`[runtime] Pipeline execution failed for run ${runId}:`, error);
    
    // Emit run.failed event (this is how observability knows the run failed)
    await emitRunEvent('run.failed', runId, campaignId, {
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: new Date().toISOString(),
      lastStage: context.currentStage,
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
 * - run.started event is emitted immediately via direct Postgres
 * - All run state changes are tracked via events
 * - Observability derives state from event stream
 * 
 * EVENT EMISSION:
 * All events use the canonical emitRunEvent() helper which ensures:
 * - entity_type = 'campaign_run'
 * - entity_id = runId
 * - All NOT NULL columns are populated
 * 
 * This function:
 * 1. Generates a unique runId
 * 2. Emits run.started event immediately (via direct Postgres)
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

  // Verify DATABASE_URL is configured for activity event writes
  if (!isActivityDbConfigured()) {
    throw new Error('DATABASE_URL is not configured. Required for activity.events writes.');
  }

  // Generate runId in code (no database table needed)
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Create core client for reading campaign data
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

  // Step 1: Emit run.started event immediately (via direct Postgres)
  // Uses canonical emitRunEvent() which ensures all NOT NULL columns are populated
  await emitRunEvent('run.started', runId, campaignId, {
    triggeredBy: options.triggeredBy,
    startedAt,
  });

  console.log(`[runtime] Emitted run.started for run ${runId}`);

  // Step 2: Trigger pipeline execution (non-blocking)
  // We use setImmediate to ensure the response is returned first
  // This is critical for Vercel serverless - we return 202 immediately
  setImmediate(() => {
    executePipeline(coreClient, context)
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
 * Check if the runtime is ready (Supabase and DATABASE_URL configured).
 */
export function isRuntimeReady(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  return Boolean(
    supabaseUrl &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    serviceRoleKey &&
    databaseUrl
  );
}
