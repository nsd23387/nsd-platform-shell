/**
 * Campaign Observability Funnel API Route
 * 
 * GET /api/v1/campaigns/[id]/observability/funnel
 * 
 * Returns the pipeline funnel data for a campaign.
 * This is the SOURCE OF TRUTH for pipeline counts.
 * 
 * UI must render counts directly from this response.
 * No local math or inference is allowed.
 * 
 * Empty state: When stages is [], show "No activity observed yet".
 * 
 * GOVERNANCE:
 * - Read-only
 * - Counts are backend-authoritative
 * - No local computation in UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '../../../../../../../lib/supabase-server';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  confidence: 'observed' | 'conditional';
  tooltip?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (!isSupabaseConfigured()) {
    // Return empty funnel when Supabase is not configured
    return NextResponse.json({
      campaign_id: campaignId,
      stages: [],
      last_updated_at: new Date().toISOString(),
    });
  }

  try {
    const supabase = createServerClient();

    // Check if campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get pipeline counts from campaign_run_stats or aggregate from runs
    // First, try to get counts from the latest run
    const { data: latestRun } = await supabase
      .from('campaign_runs')
      .select('id, orgs_sourced, contacts_discovered, contacts_evaluated, leads_promoted, leads_approved, emails_sent, replies, started_at, completed_at')
      .eq('campaign_id', campaignId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Build pipeline stages
    const stages: PipelineStage[] = [];

    if (latestRun) {
      // Only add stages that have data
      const stageDefinitions = [
        { stage: 'orgs_sourced', label: 'Organizations sourced', count: latestRun.orgs_sourced, confidence: 'observed' as const, tooltip: 'Organizations matching ICP criteria' },
        { stage: 'contacts_discovered', label: 'Contacts discovered', count: latestRun.contacts_discovered, confidence: 'observed' as const, tooltip: 'Contacts found within sourced organizations' },
        { stage: 'contacts_evaluated', label: 'Contacts evaluated', count: latestRun.contacts_evaluated, confidence: 'observed' as const, tooltip: 'Contacts evaluated for ICP fit' },
        { stage: 'leads_promoted', label: 'Leads promoted', count: latestRun.leads_promoted, confidence: 'observed' as const, tooltip: 'Contacts promoted to leads (Tier A/B)' },
        { stage: 'leads_approved', label: 'Leads approved', count: latestRun.leads_approved, confidence: 'observed' as const, tooltip: 'Leads approved for outreach' },
        { stage: 'emails_sent', label: 'Emails sent', count: latestRun.emails_sent, confidence: 'conditional' as const, tooltip: 'Emails dispatched to approved leads' },
        { stage: 'replies', label: 'Replies', count: latestRun.replies, confidence: 'conditional' as const, tooltip: 'Replies received from leads' },
      ];

      // Add stages that have counts (>= 0)
      for (const stageDef of stageDefinitions) {
        if (stageDef.count !== null && stageDef.count !== undefined) {
          stages.push(stageDef);
        }
      }
    }

    // If no stages found, this is an empty state - "No activity observed yet"
    // Return empty stages array to signal this to the UI

    return NextResponse.json({
      campaign_id: campaignId,
      stages: stages,
      last_updated_at: latestRun?.completed_at || latestRun?.started_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[observability/funnel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
