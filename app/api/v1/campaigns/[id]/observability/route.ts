/**
 * Campaign Observability API Route
 * 
 * GET /api/v1/campaigns/[id]/observability
 * 
 * Returns full observability data including status, pipeline, and send metrics.
 * This is a read-only endpoint that reflects backend-authoritative data.
 * 
 * EXECUTION MODEL:
 * Campaign runs are tracked via activity events, not relational tables.
 * All run state is derived from the event stream in activity.events.
 * 
 * GOVERNANCE:
 * - Read-only
 * - No execution control
 * - Data comes from activity.events
 * - UI reflects backend truth
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  confidence: 'observed' | 'conditional';
  tooltip?: string;
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

  if (!isSupabaseConfigured()) {
    // Return mock/empty data when Supabase is not configured
    return NextResponse.json({
      campaign_id: campaignId,
      status: 'idle',
      last_observed_at: new Date().toISOString(),
      pipeline: [],
      send_metrics: null,
    });
  }

  try {
    const coreClient = createCoreClient();
    const activityClient = createActivityClient();

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get the latest run event to determine execution status
    const { data: latestRunEvent } = await activityClient
      .from('events')
      .select('event_type, entity_id, run_id, payload, created_at')
      .eq('campaign_id', campaignId)
      .eq('entity_type', 'campaign_run')
      .in('event_type', ['run.started', 'run.running', 'run.completed', 'run.failed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Determine execution status from event stream
    let executionStatus: string = 'idle';
    let activeRunId: string | undefined;
    let currentStage: string | undefined;
    let lastObservedAt = new Date().toISOString();

    if (latestRunEvent) {
      lastObservedAt = latestRunEvent.created_at || lastObservedAt;
      const payload = latestRunEvent.payload as Record<string, unknown> || {};
      
      switch (latestRunEvent.event_type) {
        case 'run.started':
          executionStatus = 'run_requested';
          activeRunId = latestRunEvent.run_id;
          break;
        case 'run.running':
          executionStatus = 'running';
          activeRunId = latestRunEvent.run_id;
          currentStage = payload.stage as string | undefined;
          break;
        case 'run.completed':
          executionStatus = 'completed';
          break;
        case 'run.failed':
          executionStatus = 'failed';
          break;
        default:
          executionStatus = 'idle';
      }
    }

    // Get pipeline counts from events
    const pipeline: PipelineStage[] = [];
    
    if (latestRunEvent && (latestRunEvent.event_type === 'run.completed' || latestRunEvent.event_type === 'run.failed')) {
      const payload = latestRunEvent.payload as Record<string, unknown> || {};
      
      const stageDefinitions = [
        { stage: 'orgs_sourced', label: 'Organizations sourced', count: payload.orgs_sourced as number | undefined, confidence: 'observed' as const, tooltip: 'Organizations matching ICP criteria' },
        { stage: 'contacts_discovered', label: 'Contacts discovered', count: payload.contacts_discovered as number | undefined, confidence: 'observed' as const, tooltip: 'Contacts found within sourced organizations' },
        { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: payload.contacts_evaluated as number | undefined, confidence: 'observed' as const, tooltip: 'Contacts evaluated for ICP fit' },
        { stage: 'leads_promoted', label: 'Leads promoted', count: payload.leads_promoted as number | undefined, confidence: 'observed' as const, tooltip: 'Contacts promoted to leads (Tier A/B)' },
      ];

      for (const stageDef of stageDefinitions) {
        if (stageDef.count !== null && stageDef.count !== undefined) {
          pipeline.push({
            stage: stageDef.stage,
            label: stageDef.label,
            count: stageDef.count,
            confidence: stageDef.confidence,
            tooltip: stageDef.tooltip,
          });
        }
      }
    }

    // Build response
    const observability = {
      campaign_id: campaignId,
      status: executionStatus,
      active_run_id: activeRunId,
      current_stage: currentStage,
      last_observed_at: lastObservedAt,
      pipeline: pipeline,
      send_metrics: null,
    };

    return NextResponse.json(observability);
  } catch (error) {
    console.error('[observability] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
