/**
 * Campaign Execution State API Route (CANONICAL)
 * 
 * GET /api/v1/campaigns/[id]/execution-state
 * 
 * THIS IS THE SOLE EXECUTION AUTHORITY.
 * All execution-related UI must derive from this endpoint.
 * 
 * CANONICAL RESPONSE SHAPE:
 * {
 *   campaignId: string,
 *   run: {
 *     id: string,
 *     status: string,
 *     stage?: string,
 *     startedAt?: string,
 *     endedAt?: string,
 *     terminationReason?: string,
 *     errorMessage?: string
 *   } | null,
 *   funnel: {
 *     organizations: { total, qualified, review, disqualified },
 *     contacts: { total, sourced, ready, withEmail },
 *     leads: { total, pending, approved }
 *   },
 *   lastUpdatedAt: string
 * }
 * 
 * GOVERNANCE:
 * - Read-only endpoint
 * - Direct database queries for real-time accuracy
 * - No caching - always fresh data
 * - No fallback to legacy endpoints
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Connection pool for direct Postgres access
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ============================================================================
// Type Definitions (Canonical)
// ============================================================================

interface OrganizationCounts {
  total: number;
  qualified: number;
  review: number;
  disqualified: number;
}

interface ContactCounts {
  total: number;
  sourced: number;
  ready: number;
  withEmail: number;
}

interface LeadCounts {
  total: number;
  pending: number;
  approved: number;
}

interface Run {
  id: string;
  status: string;
  stage?: string;
  startedAt?: string;
  endedAt?: string;
  terminationReason?: string;
  errorMessage?: string;
}

interface ExecutionState {
  campaignId: string;
  run: Run | null;
  funnel: {
    organizations: OrganizationCounts;
    contacts: ContactCounts;
    leads: LeadCounts;
  };
  lastUpdatedAt: string;
}

// ============================================================================
// Database Queries
// ============================================================================

async function getOrganizationCounts(db: Pool, campaignId: string): Promise<OrganizationCounts> {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'review') as review,
        COUNT(*) FILTER (WHERE status = 'disqualified') as disqualified
      FROM public.organizations 
      WHERE campaign_id = $1
    `, [campaignId]);
    
    const row = result.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      qualified: parseInt(row?.qualified || '0', 10),
      review: parseInt(row?.review || '0', 10),
      disqualified: parseInt(row?.disqualified || '0', 10),
    };
  } catch (error) {
    console.error('[execution-state] Error getting org counts:', error);
    return { total: 0, qualified: 0, review: 0, disqualified: 0 };
  }
}

async function getContactCounts(db: Pool, campaignId: string): Promise<ContactCounts> {
  try {
    // NOTE: Cast status to text to avoid enum type mismatch errors
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status::text = 'sourced') as sourced,
        COUNT(*) FILTER (WHERE status::text = 'ready') as ready,
        COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email
      FROM public.campaign_contacts 
      WHERE campaign_id = $1
    `, [campaignId]);
    
    const row = result.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      sourced: parseInt(row?.sourced || '0', 10),
      ready: parseInt(row?.ready || '0', 10),
      withEmail: parseInt(row?.with_email || '0', 10),
    };
  } catch (error) {
    console.error('[execution-state] Error getting contact counts:', error);
    return { total: 0, sourced: 0, ready: 0, withEmail: 0 };
  }
}

async function getLeadCounts(db: Pool, campaignId: string): Promise<LeadCounts> {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE approval_status = 'pending_approval' OR approval_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE approval_status = 'approved') as approved
      FROM public.leads 
      WHERE campaign_id = $1
    `, [campaignId]);
    
    const row = result.rows[0];
    return {
      total: parseInt(row?.total || '0', 10),
      pending: parseInt(row?.pending || '0', 10),
      approved: parseInt(row?.approved || '0', 10),
    };
  } catch (error) {
    console.error('[execution-state] Error getting lead counts:', error);
    return { total: 0, pending: 0, approved: 0 };
  }
}

async function getLatestRun(db: Pool, campaignId: string): Promise<Run | null> {
  try {
    const result = await db.query(`
      SELECT id, status, stage, error_message, termination_reason,
             started_at, completed_at, created_at
      FROM public.campaign_runs
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [campaignId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      id: row.id,
      status: row.status || 'unknown',
      stage: row.stage || undefined,
      startedAt: row.started_at || row.created_at || undefined,
      endedAt: row.completed_at || undefined,
      terminationReason: row.termination_reason || undefined,
      errorMessage: row.error_message || undefined,
    };
  } catch (error) {
    console.error('[execution-state] Error getting latest run:', error);
    return null;
  }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  const now = new Date().toISOString();
  
  console.log('[execution-state] Fetching canonical state for campaign:', campaignId);

  // Database not configured - return empty state (not an error)
  if (!isDatabaseConfigured()) {
    console.warn('[execution-state] Database not configured');
    return NextResponse.json<ExecutionState>({
      campaignId,
      run: null,
      funnel: {
        organizations: { total: 0, qualified: 0, review: 0, disqualified: 0 },
        contacts: { total: 0, sourced: 0, ready: 0, withEmail: 0 },
        leads: { total: 0, pending: 0, approved: 0 },
      },
      lastUpdatedAt: now,
    });
  }

  try {
    const db = getPool();

    // Fetch all data in parallel for performance
    const [organizations, contacts, leads, run] = await Promise.all([
      getOrganizationCounts(db, campaignId),
      getContactCounts(db, campaignId),
      getLeadCounts(db, campaignId),
      getLatestRun(db, campaignId),
    ]);

    const state: ExecutionState = {
      campaignId,
      run,
      funnel: { organizations, contacts, leads },
      lastUpdatedAt: now,
    };

    console.log('[execution-state] Canonical state:', {
      campaignId,
      runId: run?.id ?? 'none',
      runStatus: run?.status ?? 'no_runs',
      orgs: organizations.total,
      contacts: contacts.total,
      leads: leads.total,
    });

    return NextResponse.json<ExecutionState>(state);
  } catch (error) {
    console.error('[execution-state] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution state', campaignId },
      { status: 500 }
    );
  }
}
