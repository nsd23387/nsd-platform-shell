/**
 * Campaign Scope API Route
 * 
 * GET /api/campaigns/:id/scope
 * 
 * Returns campaign business scope - the entities this campaign CAN reach,
 * regardless of execution state.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * INVARIANT:
 * Funnel scope represents business value and MUST NOT depend on execution.
 * Campaign value exists independently of execution.
 * Execution unlocks value — it does not define it.
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Scope values:
 * - MUST populate even if execution has never run
 * - MUST populate even if execution produces zero new writes
 * - MUST NOT depend on run status
 * 
 * Data sources:
 * - campaign_organizations: Organizations sourced for this campaign
 * - campaign_contacts: Contacts discovered for this campaign
 * - leads (via campaign_contacts.lead_id): Promoted leads
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

interface CampaignScope {
  campaignId: string;
  eligibleOrganizations: number;
  eligibleContacts: number;
  eligibleLeads: number;
  scopeAvailable: boolean;
  scopeComputedAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // Return unavailable scope if no database
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      campaignId,
      eligibleOrganizations: 0,
      eligibleContacts: 0,
      eligibleLeads: 0,
      scopeAvailable: false,
      scopeComputedAt: new Date().toISOString(),
      message: 'Campaign scope not yet computed',
    });
  }

  try {
    const db = getPool();

    // Query organization count for this campaign
    // Organizations are linked via campaign_organizations or via campaign_contacts
    const orgsResult = await db.query(`
      SELECT COUNT(DISTINCT organization_id) as count
      FROM public.campaign_contacts
      WHERE campaign_id = $1
    `, [campaignId]);
    
    const eligibleOrganizations = parseInt(orgsResult.rows[0]?.count || '0', 10);

    // Query total contacts for this campaign (regardless of status)
    // This represents the SCOPE - who we can reach
    const contactsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM public.campaign_contacts
      WHERE campaign_id = $1
    `, [campaignId]);
    
    const eligibleContacts = parseInt(contactsResult.rows[0]?.count || '0', 10);

    // Query promoted leads (contacts with lead_id)
    const leadsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM public.campaign_contacts
      WHERE campaign_id = $1
      AND lead_id IS NOT NULL
    `, [campaignId]);
    
    const eligibleLeads = parseInt(leadsResult.rows[0]?.count || '0', 10);

    const scope: CampaignScope = {
      campaignId,
      eligibleOrganizations,
      eligibleContacts,
      eligibleLeads,
      scopeAvailable: true,
      scopeComputedAt: new Date().toISOString(),
    };

    console.log(`[campaign-scope] Campaign ${campaignId}:`, scope);

    return NextResponse.json(scope);

  } catch (error) {
    console.error('[campaign-scope] Error:', error);
    
    // Return unavailable scope on error (not a 500)
    // This allows the UI to show "Campaign scope not yet computed"
    return NextResponse.json({
      campaignId,
      eligibleOrganizations: 0,
      eligibleContacts: 0,
      eligibleLeads: 0,
      scopeAvailable: false,
      scopeComputedAt: new Date().toISOString(),
      message: 'Campaign scope not yet computed',
    });
  }
}
