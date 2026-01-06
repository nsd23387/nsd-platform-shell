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
 * NOTE: activity.events is event-sourced.
 * Identifiers such as campaignId and runId live in payload (JSONB),
 * not as physical columns.
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
    // NOTE: activity.events is event-sourced.
    // Identifiers such as campaignId and runId live in payload (JSONB),
    // not as physical columns.
    const startedEvents = await getRunStartedEvents(campaignId, 50);

    if (!startedEvents || startedEvents.length === 0) {
      // No runs observed yet
      return NextResponse.json({
        campaign_id: campaignId,
        runs: [],
      });
    }

    // Get run IDs from started events (runId is in payload, camelCase)
    const runIds = startedEvents
      .map((event) => event.payload?.runId as string)
      .filter((id): id is string => Boolean(id));

    // Get completion events for these runs
    const completionEvents = await getCompletionEvents(campaignId, runIds);

    // Build a map of completion events by runId (from payload)
    const completionMap = new Map<string, StoredEvent>();
    for (const event of completionEvents) {
      const eventRunId = event.payload?.runId as string;
      if (eventRunId) {
        completionMap.set(eventRunId, event);
      }
    }

    // Build run records from events
    const runs: RunRecord[] = [];

    for (const startEvent of startedEvents) {
      // runId is in payload (camelCase)
      const runId = startEvent.payload?.runId as string;
      if (!runId) continue;

      const startPayload = startEvent.payload || {};
      const startedAt = (startPayload.startedAt as string) || startEvent.created_at;

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
          runRecord.completed_at = (compPayload.completedAt as string) || completionEvent.created_at;
          // Use camelCase keys from payload
          runRecord.orgs_sourced = compPayload.orgsSourced as number | undefined;
          runRecord.contacts_discovered = compPayload.contactsDiscovered as number | undefined;
          runRecord.leads_promoted = compPayload.leadsPromoted as number | undefined;
          runRecord.leads_approved = compPayload.leadsApproved as number | undefined;
          runRecord.emails_sent = compPayload.emailsSent as number | undefined;
        } else if (completionEvent.event_type === 'run.failed') {
          runRecord.status = 'failed';
          runRecord.completed_at = (compPayload.failedAt as string) || completionEvent.created_at;
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
