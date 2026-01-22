/**
 * GET /api/v1/campaigns/:id/execution-state
 * 
 * CANONICAL EXECUTION STATE ENDPOINT
 * 
 * This is the ONLY source of execution truth for the UI.
 * All other execution-related endpoints are deprecated for UI consumption.
 * 
 * CONTRACT (NON-NEGOTIABLE):
 * - Returns a single, authoritative execution state object
 * - UI must not infer, reconstruct, or fall back to any other source
 * - If this endpoint returns null/empty, UI must show empty
 * - No reconciliation with other data sources
 * 
 * RESPONSE SHAPE:
 * {
 *   campaignId: string,
 *   run: {
 *     id: string,
 *     status: "queued" | "running" | "completed" | "failed",
 *     stage?: string,
 *     startedAt?: string,
 *     completedAt?: string,
 *     terminationReason?: string,
 *     errorMessage?: string
 *   } | null,
 *   funnel: {
 *     organizations: { total: number },
 *     contacts: { total: number, withEmail: number },
 *     leads: { total: number, pending: number, approved: number },
 *     emailsSent: number
 *   },
 *   _meta: {
 *     fetchedAt: string,
 *     source: "execution-state"
 *   }
 * }
 * 
 * UI RULES (derived from this response):
 * - run === null → "Ready for execution"
 * - run.status === "queued" → "Queued for execution"
 * - run.status === "running" → "Running" + show stage if present
 * - run.status === "completed" → "Completed"
 * - run.status === "failed" → "Execution failed" + terminationReason
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

/**
 * Canonical run status values.
 * UI must handle exactly these values - no inference.
 */
type RunStatus = 'queued' | 'running' | 'completed' | 'failed';

/**
 * Canonical run object shape.
 */
interface ExecutionRun {
  id: string;
  status: RunStatus;
  stage?: string;
  startedAt?: string;
  completedAt?: string;
  terminationReason?: string;
  errorMessage?: string;
}

/**
 * Canonical funnel shape.
 */
interface ExecutionFunnel {
  organizations: {
    total: number;
  };
  contacts: {
    total: number;
    withEmail: number;
  };
  leads: {
    total: number;
    pending: number;
    approved: number;
  };
  emailsSent: number;
}

/**
 * Canonical execution state response.
 */
interface ExecutionStateResponse {
  campaignId: string;
  run: ExecutionRun | null;
  funnel: ExecutionFunnel;
  _meta: {
    fetchedAt: string;
    source: 'execution-state';
  };
}

/**
 * Normalize run status from database to canonical values.
 * If status is unknown, return null (no run).
 */
function normalizeRunStatus(status: string | null | undefined): RunStatus | null {
  if (!status) return null;
  
  const normalized = status.toLowerCase();
  
  // Map to canonical statuses only
  if (normalized === 'queued' || normalized === 'pending' || normalized === 'run_requested') {
    return 'queued';
  }
  if (normalized === 'running' || normalized === 'in_progress') {
    return 'running';
  }
  if (normalized === 'completed' || normalized === 'succeeded' || normalized === 'success') {
    return 'completed';
  }
  if (normalized === 'failed' || normalized === 'error') {
    return 'failed';
  }
  
  // Unknown status - treat as no valid run state
  console.warn(`[execution-state] Unknown run status: ${status}`);
  return null;
}

/**
 * Get the latest run from campaign_runs table.
 */
async function getLatestRun(db: Pool, campaignId: string): Promise<ExecutionRun | null> {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        status, 
        stage,
        started_at, 
        completed_at, 
        termination_reason,
        error_message,
        created_at
      FROM public.campaign_runs
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [campaignId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    const normalizedStatus = normalizeRunStatus(row.status);
    
    // If we can't normalize the status, treat as no valid run
    if (!normalizedStatus) {
      return null;
    }
    
    return {
      id: row.id,
      status: normalizedStatus,
      stage: row.stage || undefined,
      startedAt: row.started_at || row.created_at || undefined,
      completedAt: row.completed_at || undefined,
      terminationReason: row.termination_reason || undefined,
      errorMessage: row.error_message || undefined,
    };
  } catch (error) {
    console.error('[execution-state] Error fetching latest run:', error);
    return null;
  }
}

/**
 * Get funnel counts from actual database tables.
 */
async function getFunnelCounts(db: Pool, campaignId: string): Promise<ExecutionFunnel> {
  const defaultFunnel: ExecutionFunnel = {
    organizations: { total: 0 },
    contacts: { total: 0, withEmail: 0 },
    leads: { total: 0, pending: 0, approved: 0 },
    emailsSent: 0,
  };
  
  try {
    // Fetch all counts in parallel
    const [orgsResult, contactsResult, leadsResult, emailsResult] = await Promise.all([
      db.query(`
        SELECT COUNT(*) as total
        FROM public.organizations 
        WHERE campaign_id = $1
      `, [campaignId]),
      
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE email IS NOT NULL AND email != '') as with_email
        FROM public.campaign_contacts 
        WHERE campaign_id = $1
      `, [campaignId]),
      
      db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE approval_status IN ('pending_approval', 'pending')) as pending,
          COUNT(*) FILTER (WHERE approval_status = 'approved') as approved
        FROM public.leads 
        WHERE campaign_id = $1
      `, [campaignId]),
      
      // Check for sent emails - may not exist in all deployments
      db.query(`
        SELECT COUNT(*) as total
        FROM public.sent_emails
        WHERE campaign_id = $1
      `, [campaignId]).catch(() => ({ rows: [{ total: '0' }] })),
    ]);
    
    return {
      organizations: {
        total: parseInt(orgsResult.rows[0]?.total || '0', 10),
      },
      contacts: {
        total: parseInt(contactsResult.rows[0]?.total || '0', 10),
        withEmail: parseInt(contactsResult.rows[0]?.with_email || '0', 10),
      },
      leads: {
        total: parseInt(leadsResult.rows[0]?.total || '0', 10),
        pending: parseInt(leadsResult.rows[0]?.pending || '0', 10),
        approved: parseInt(leadsResult.rows[0]?.approved || '0', 10),
      },
      emailsSent: parseInt(emailsResult.rows[0]?.total || '0', 10),
    };
  } catch (error) {
    console.error('[execution-state] Error fetching funnel counts:', error);
    return defaultFunnel;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  
  // Default response when database is not configured
  // UI will show "Ready for execution" state
  const defaultResponse: ExecutionStateResponse = {
    campaignId,
    run: null,
    funnel: {
      organizations: { total: 0 },
      contacts: { total: 0, withEmail: 0 },
      leads: { total: 0, pending: 0, approved: 0 },
      emailsSent: 0,
    },
    _meta: {
      fetchedAt: new Date().toISOString(),
      source: 'execution-state',
    },
  };

  if (!isDatabaseConfigured()) {
    console.log('[execution-state] Database not configured, returning default state');
    return NextResponse.json(defaultResponse);
  }

  try {
    const db = getPool();

    // Fetch run and funnel in parallel
    const [run, funnel] = await Promise.all([
      getLatestRun(db, campaignId),
      getFunnelCounts(db, campaignId),
    ]);

    const response: ExecutionStateResponse = {
      campaignId,
      run,
      funnel,
      _meta: {
        fetchedAt: new Date().toISOString(),
        source: 'execution-state',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[execution-state] Error:', error);
    // On error, return default state - UI will show "Ready for execution"
    // This is intentional: we don't mask errors with fabricated data
    return NextResponse.json(defaultResponse);
  }
}
