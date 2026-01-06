/**
 * Campaign Runs API Route
 * 
 * GET /api/v1/campaigns/[id]/runs
 * 
 * Returns the run history for a campaign.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * Run history is derived from run.started, run.completed, and run.failed events.
 * 
 * GOVERNANCE:
 * - Read-only
 * - Data comes from activity.events
 * - No execution control
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RunSummary {
  id: string;
  campaign_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  leads_processed?: number;
  emails_sent?: number;
  errors?: number;
  orgs_sourced?: number;
  contacts_discovered?: number;
  leads_promoted?: number;
}

function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(supabaseUrl && supabaseUrl !== 'https://placeholder.supabase.co' && serviceRoleKey);
}

function createActivityClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'activity' },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (!isSupabaseConfigured()) {
    // Return empty array when Supabase is not configured
    return NextResponse.json([]);
  }

  try {
    const activityClient = createActivityClient();

    // Get all run.started events for this campaign
    const { data: startedEvents, error: startedError } = await activityClient
      .from('events')
      .select('run_id, payload, created_at')
      .eq('campaign_id', campaignId)
      .eq('entity_type', 'campaign_run')
      .eq('event_type', 'run.started')
      .order('created_at', { ascending: false })
      .limit(50);

    if (startedError) {
      console.error('[runs] Error fetching started events:', startedError);
      return NextResponse.json([]);
    }

    if (!startedEvents || startedEvents.length === 0) {
      return NextResponse.json([]);
    }

    // Get completion/failure events for these runs
    const runIds = startedEvents.map(e => e.run_id).filter(Boolean);
    
    const { data: completionEvents } = await activityClient
      .from('events')
      .select('run_id, event_type, payload, created_at')
      .eq('campaign_id', campaignId)
      .eq('entity_type', 'campaign_run')
      .in('event_type', ['run.completed', 'run.failed'])
      .in('run_id', runIds);

    // Build a map of run_id -> completion event
    const completionMap = new Map<string, { event_type: string; payload: Record<string, unknown>; created_at: string }>();
    if (completionEvents) {
      for (const event of completionEvents) {
        if (event.run_id) {
          completionMap.set(event.run_id, {
            event_type: event.event_type,
            payload: event.payload as Record<string, unknown> || {},
            created_at: event.created_at,
          });
        }
      }
    }

    // Build run summaries
    const runs: RunSummary[] = startedEvents.map(startEvent => {
      const runId = startEvent.run_id!;
      const startPayload = startEvent.payload as Record<string, unknown> || {};
      const completion = completionMap.get(runId);
      
      let status = 'RUNNING';
      let completedAt: string | undefined;
      let orgsSourced: number | undefined;
      let contactsDiscovered: number | undefined;
      let leadsPromoted: number | undefined;
      let errors = 0;

      if (completion) {
        if (completion.event_type === 'run.completed') {
          status = 'COMPLETED';
          completedAt = completion.payload.completed_at as string || completion.created_at;
          orgsSourced = completion.payload.orgs_sourced as number | undefined;
          contactsDiscovered = completion.payload.contacts_discovered as number | undefined;
          leadsPromoted = completion.payload.leads_promoted as number | undefined;
        } else if (completion.event_type === 'run.failed') {
          status = 'FAILED';
          completedAt = completion.payload.failed_at as string || completion.created_at;
          errors = 1;
        }
      }

      return {
        id: runId,
        campaign_id: campaignId,
        status,
        started_at: startPayload.started_at as string || startEvent.created_at,
        completed_at: completedAt,
        orgs_sourced: orgsSourced,
        contacts_discovered: contactsDiscovered,
        leads_promoted: leadsPromoted,
        leads_processed: leadsPromoted,
        emails_sent: 0,
        errors,
      };
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error('[runs] Error:', error);
    return NextResponse.json([]);
  }
}
