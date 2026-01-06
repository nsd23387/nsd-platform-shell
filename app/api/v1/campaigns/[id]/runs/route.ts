/**
 * Campaign Runs API Route
 * 
 * GET /api/v1/campaigns/[id]/runs
 * 
 * Returns the historical runs for a campaign.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * Run history is reconstructed from run.started + run.completed/run.failed events.
 * 
 * DATABASE ACCESS:
 * - activity.events is read via direct DB connection, not PostgREST.
 * - core.* tables are read via Supabase client (PostgREST).
 * 
 * EMPTY STATE:
 * When runs is [], show "No runs observed yet" in UI.
 * 
 * GOVERNANCE:
 * - Read-only
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

interface RunRecord {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'partial';
  started_at: string;
  completed_at?: string;
  orgs_sourced?: number;
  contacts_discovered?: number;
  leads_promoted?: number;
  leads_approved?: number;
  emails_sent?: number;
  errors?: string;
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

  if (!isSupabaseConfigured() || !isActivityDbConfigured()) {
    // Return empty runs when not configured
    return NextResponse.json({
      campaign_id: campaignId,
      runs: [],
    });
  }

  try {
    const coreClient = createCoreClient();

    // Check if campaign exists (via Supabase/PostgREST)
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get all run.started events via direct Postgres
    // activity.events is read via direct DB connection, not PostgREST.
    const startedEvents = await getRunStartedEvents(campaignId, 50);

    if (!startedEvents || startedEvents.length === 0) {
      // No runs observed yet
      return NextResponse.json({
        campaign_id: campaignId,
        runs: [],
      });
    }

    // Get run IDs from started events
    const runIds = startedEvents
      .map((event) => event.run_id)
      .filter((id): id is string => Boolean(id));

    // Get completion events for these runs
    const completionEvents = await getCompletionEvents(campaignId, runIds);

    // Build a map of completion events by run_id
    const completionMap = new Map<string, StoredEvent>();
    for (const event of completionEvents) {
      if (event.run_id) {
        completionMap.set(event.run_id, event);
      }
    }

    // Build run records from events
    const runs: RunRecord[] = [];

    for (const startEvent of startedEvents) {
      const runId = startEvent.run_id;
      if (!runId) continue;

      const startPayload = startEvent.payload || {};
      const startedAt = (startPayload.started_at as string) || startEvent.created_at;

      const completionEvent = completionMap.get(runId);
      
      let runRecord: RunRecord = {
        id: runId,
        status: 'running',
        started_at: startedAt,
      };

      if (completionEvent) {
        const compPayload = completionEvent.payload || {};

        if (completionEvent.event_type === 'run.completed') {
          runRecord.status = 'completed';
          runRecord.completed_at = (compPayload.completed_at as string) || completionEvent.created_at;
          runRecord.orgs_sourced = compPayload.orgs_sourced as number | undefined;
          runRecord.contacts_discovered = compPayload.contacts_discovered as number | undefined;
          runRecord.leads_promoted = compPayload.leads_promoted as number | undefined;
          runRecord.leads_approved = compPayload.leads_approved as number | undefined;
          runRecord.emails_sent = compPayload.emails_sent as number | undefined;
        } else if (completionEvent.event_type === 'run.failed') {
          runRecord.status = 'failed';
          runRecord.completed_at = (compPayload.failed_at as string) || completionEvent.created_at;
          runRecord.errors = compPayload.error as string | undefined;
        }
      }

      runs.push(runRecord);
    }

    return NextResponse.json({
      campaign_id: campaignId,
      runs: runs,
    });
  } catch (error) {
    console.error('[runs] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
