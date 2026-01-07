/**
 * Campaign Runs API Route
 * 
 * GET /api/v1/campaigns/[id]/runs
 * 
 * Returns the historical runs for a campaign as an ARRAY directly.
 * The UI expects CampaignRun[] or CampaignRunDetailed[], not a wrapped object.
 * 
 * activity.events SCHEMA:
 * - id: uuid (NOT NULL, no default)
 * - event_type: text (NOT NULL)
 * - entity_type: text (NOT NULL) - 'campaign_run' for run events
 * - entity_id: uuid (NOT NULL) - the runId
 * - actor_id: uuid (nullable)
 * - payload: jsonb (nullable) - contains campaignId, counts, etc.
 * - created_at: timestamptz (NOT NULL, default now())
 * 
 * Run history is reconstructed from run.started + run.completed/run.failed events.
 * The entity_id column contains the runId.
 * 
 * EMPTY STATE:
 * When no runs exist, returns [] (empty array).
 * UI should show "No runs observed yet".
 * 
 * GOVERNANCE:
 * - Read-only projection from activity.events
 * - Runs are observed, not created via UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getRunStartedEvents, 
  getCompletionEvents, 
  isActivityDbConfigured,
  StoredEvent 
} from '../../../../../../lib/activity-db';

/**
 * Run record matching CampaignRunDetailed interface expected by UI.
 * 
 * IMPORTANT: Field names must match the TypeScript types in types/campaign.ts:
 * - id, campaign_id, status, started_at, completed_at
 * - leads_processed (NOT leads_promoted - UI expects this name)
 * - emails_sent, errors, error_details
 * - Pipeline counts: orgs_sourced, contacts_discovered, contacts_evaluated, leads_promoted, leads_approved
 */
interface RunRecord {
  id: string;
  campaign_id: string;
  status: 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'RUNNING';
  started_at: string;
  completed_at?: string;
  leads_processed: number;
  emails_sent: number;
  errors: number;
  error_details?: string[];
  // Extended fields for CampaignRunDetailed
  orgs_sourced?: number;
  contacts_discovered?: number;
  contacts_evaluated?: number;
  leads_promoted?: number;
  leads_approved?: number;
}

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && serviceRoleKey);
}

function createCoreClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'core' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // When not configured, return empty array (UI expects array, not wrapped object)
  if (!isSupabaseConfigured() || !isActivityDbConfigured()) {
    return NextResponse.json([]);
  }

  try {
    const coreClient = createCoreClient();

    // Check if campaign exists (via Supabase/PostgREST for core schema)
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get all run.started events via direct Postgres
    // activity.events uses entity_type = 'campaign_run' for efficient filtering
    const startedEvents = await getRunStartedEvents(campaignId, 50);

    if (!startedEvents || startedEvents.length === 0) {
      // Return empty array - UI shows "No runs observed yet"
      return NextResponse.json([]);
    }

    // Get run IDs from started events (entity_id IS the runId)
    const runIds = startedEvents
      .map((event) => event.entity_id)
      .filter((id): id is string => Boolean(id));

    // Get completion events for these runs
    const completionEvents = await getCompletionEvents(campaignId, runIds);

    // Build a map of completion events by entity_id (runId)
    const completionMap = new Map<string, StoredEvent>();
    for (const event of completionEvents) {
      if (event.entity_id) {
        completionMap.set(event.entity_id, event);
      }
    }

    // Build run records from events
    const runs: RunRecord[] = [];

    for (const startEvent of startedEvents) {
      const runId = startEvent.entity_id;
      if (!runId) continue;

      // Defensive payload access (payload may be null or missing keys)
      const startPayload = startEvent.payload || {};
      const startedAt = (startPayload.startedAt as string) || startEvent.created_at;

      const completionEvent = completionMap.get(runId);
      
      // Default run record for in-progress runs
      let runRecord: RunRecord = {
        id: runId,
        campaign_id: campaignId,
        status: 'RUNNING',
        started_at: startedAt,
        leads_processed: 0,
        emails_sent: 0,
        errors: 0,
      };

      if (completionEvent) {
        // Defensive payload access
        const compPayload = completionEvent.payload || {};

        if (completionEvent.event_type === 'run.completed') {
          const leadsPromoted = (compPayload.leadsPromoted as number) || 0;
          
          runRecord = {
            ...runRecord,
            status: 'COMPLETED',
            completed_at: (compPayload.completedAt as string) || completionEvent.created_at,
            // UI expects leads_processed
            leads_processed: leadsPromoted,
            emails_sent: (compPayload.emailsSent as number) || 0,
            errors: 0,
            // Extended pipeline counts
            orgs_sourced: compPayload.orgsSourced as number | undefined,
            contacts_discovered: compPayload.contactsDiscovered as number | undefined,
            contacts_evaluated: compPayload.contactsEvaluated as number | undefined,
            leads_promoted: leadsPromoted,
            leads_approved: compPayload.leadsApproved as number | undefined,
          };
        } else if (completionEvent.event_type === 'run.failed') {
          const errorMessage = compPayload.error as string | undefined;
          
          runRecord = {
            ...runRecord,
            status: 'FAILED',
            completed_at: (compPayload.failedAt as string) || completionEvent.created_at,
            leads_processed: 0,
            emails_sent: 0,
            errors: 1,
            error_details: errorMessage ? [errorMessage] : undefined,
          };
        }
      }

      runs.push(runRecord);
    }

    // Return array directly - UI expects CampaignRun[] or CampaignRunDetailed[]
    return NextResponse.json(runs);
  } catch (error) {
    console.error('[runs] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
