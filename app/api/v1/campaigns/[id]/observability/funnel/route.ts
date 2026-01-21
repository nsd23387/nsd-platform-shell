/**
 * Campaign Observability Funnel API Route
 * 
 * GET /api/v1/campaigns/[id]/observability/funnel
 * 
 * Returns the pipeline funnel data for a campaign.
 * This is the SOURCE OF TRUTH for pipeline counts.
 * 
 * DATA AUTHORITY:
 * This endpoint now queries ACTUAL database tables for accurate counts:
 * - public.organizations - for org counts
 * - public.campaign_contacts - for contact counts  
 * - public.leads - for lead counts
 * 
 * This ensures the UI always shows real data, not stale ODS events.
 * 
 * RESPONSE SHAPE (matches ObservabilityFunnel interface):
 * {
 *   campaign_id: string,
 *   stages: PipelineStage[],
 *   last_updated_at: string
 * }
 * 
 * PipelineStage: { stage, label, count, confidence, tooltip? }
 * 
 * GOVERNANCE:
 * - Read-only projection from database tables
 * - Counts are backend-authoritative (from actual DB)
 * - No local computation in UI
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

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

function createCoreClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: 'core' },
  });
}

// Direct Postgres pool for querying public schema tables
let pgPool: Pool | null = null;

function getPool(): Pool {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL not configured');
    }
    pgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pgPool;
}

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // Default response when not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      campaign_id: campaignId,
      stages: [],
      last_updated_at: new Date().toISOString(),
    });
  }

  try {
    const coreClient = createCoreClient();

    // Check if campaign exists (via Supabase/PostgREST for core schema)
    const { data: campaign, error: campaignError } = await coreClient
      .from('campaigns')
      .select('id, status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Query ACTUAL database tables for real counts (DATA AUTHORITY)
    const stages: PipelineStage[] = [];
    let lastUpdatedAt = new Date().toISOString();

    if (isDatabaseConfigured()) {
      try {
        const db = getPool();

        // Get organization count from public.organizations
        const orgResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.organizations
          WHERE campaign_id = $1
        `, [campaignId]);
        const orgCount = parseInt(orgResult.rows[0]?.count || '0', 10);

        // Get contact count from public.campaign_contacts
        const contactResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.campaign_contacts
          WHERE campaign_id = $1
        `, [campaignId]);
        const contactCount = parseInt(contactResult.rows[0]?.count || '0', 10);

        // Get SCORED contacts count (status = 'scored' or any status beyond discovered)
        // Contacts are scored when they have been processed for ICP fit
        const scoredResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.campaign_contacts
          WHERE campaign_id = $1
          AND status IN ('scored', 'enriched', 'promoted', 'blocked')
        `, [campaignId]);
        const scoredCount = parseInt(scoredResult.rows[0]?.count || '0', 10);

        // Get ENRICHED contacts count (contacts with email addresses)
        // This is the gate before lead promotion
        const enrichedResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.campaign_contacts
          WHERE campaign_id = $1
          AND email IS NOT NULL
          AND email != ''
        `, [campaignId]);
        const enrichedCount = parseInt(enrichedResult.rows[0]?.count || '0', 10);

        // Get lead count from public.leads
        const leadResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.leads
          WHERE campaign_id = $1
        `, [campaignId]);
        const leadCount = parseInt(leadResult.rows[0]?.count || '0', 10);

        // Get latest run timestamp
        const runResult = await db.query(`
          SELECT completed_at, started_at
          FROM public.campaign_runs
          WHERE campaign_id = $1
          ORDER BY started_at DESC
          LIMIT 1
        `, [campaignId]);
        if (runResult.rows[0]) {
          lastUpdatedAt = runResult.rows[0].completed_at || runResult.rows[0].started_at || lastUpdatedAt;
        }

        // Build stages from actual counts
        // AUTHORITATIVE PIPELINE ORDER:
        // Organizations Sourced → Contacts Discovered → Contacts Scored → Contacts Enriched → Leads Promoted → Leads Approved
        
        if (orgCount > 0) {
          stages.push({
            stage: 'orgs_sourced',
            label: 'Organizations sourced',
            count: orgCount,
            confidence: 'observed',
            tooltip: 'Organizations matching ICP criteria',
          });
        }

        if (contactCount > 0) {
          stages.push({
            stage: 'contacts_discovered',
            label: 'Contacts discovered',
            count: contactCount,
            confidence: 'observed',
            tooltip: 'Contacts found within sourced organizations',
          });
        }

        // CONTACTS SCORED: Always show if contacts exist (even if 0 scored)
        // This is critical for showing progress when scoring is in progress
        if (contactCount > 0) {
          stages.push({
            stage: 'contacts_scored',
            label: 'Contacts scored',
            count: scoredCount,
            confidence: 'observed',
            tooltip: 'Contacts evaluated for ICP fit',
          });
        }

        // CONTACTS ENRICHED: Show if scoring has started (even if 0 enriched)
        // This shows the email enrichment gate
        if (scoredCount > 0) {
          stages.push({
            stage: 'contacts_enriched',
            label: 'Contacts with email',
            count: enrichedCount,
            confidence: 'observed',
            tooltip: 'Scored contacts with verified email addresses',
          });
        }

        // LEADS PROMOTED: Show if enrichment has started (even if 0 leads)
        // Leads require enriched contacts
        if (enrichedCount > 0 || leadCount > 0) {
          stages.push({
            stage: 'leads_promoted',
            label: 'Leads promoted',
            count: leadCount,
            confidence: 'observed',
            tooltip: 'Enriched contacts promoted to leads',
          });
        }

        // Also get leads awaiting approval count
        const pendingLeadsResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.leads
          WHERE campaign_id = $1
          AND (approval_status IS NULL OR approval_status = 'pending')
        `, [campaignId]);
        const pendingLeadCount = parseInt(pendingLeadsResult.rows[0]?.count || '0', 10);

        if (pendingLeadCount > 0) {
          stages.push({
            stage: 'leads_awaiting_approval',
            label: 'Leads awaiting approval',
            count: pendingLeadCount,
            confidence: 'observed',
            tooltip: 'Leads pending review and approval',
          });
        }

        // Get approved leads count
        const approvedLeadsResult = await db.query(`
          SELECT COUNT(*) as count
          FROM public.leads
          WHERE campaign_id = $1
          AND approval_status = 'approved'
        `, [campaignId]);
        const approvedLeadCount = parseInt(approvedLeadsResult.rows[0]?.count || '0', 10);

        if (approvedLeadCount > 0) {
          stages.push({
            stage: 'leads_approved',
            label: 'Leads approved',
            count: approvedLeadCount,
            confidence: 'observed',
            tooltip: 'Leads approved for outreach',
          });
        }

        console.log(`[observability/funnel] Campaign ${campaignId}: ${orgCount} orgs, ${contactCount} contacts, ${scoredCount} scored, ${enrichedCount} enriched, ${leadCount} leads`);

      } catch (dbError) {
        console.error('[observability/funnel] Database query error:', dbError);
        // Fall through - return empty stages if DB query fails
      }
    }

    // Return ObservabilityFunnel shape
    return NextResponse.json({
      campaign_id: campaignId,
      stages: stages,
      last_updated_at: lastUpdatedAt,
    });
  } catch (error) {
    console.error('[observability/funnel] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
