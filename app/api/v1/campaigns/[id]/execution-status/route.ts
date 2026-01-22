/**
 * Campaign Execution Status API Route
 * 
 * GET /api/v1/campaigns/[id]/execution-status
 * 
 * Returns REAL-TIME pipeline status by querying actual database tables,
 * NOT the stale ODS activity.events.
 * 
 * This endpoint provides authoritative counts from:
 * - public.organizations (actual sourced orgs)
 * - public.campaign_contacts (actual sourced contacts)
 * - public.leads (actual created leads)
 * - public.execution_logs (actual stage progress)
 * - public.campaign_runs (run status)
 * 
 * RESPONSE SHAPE:
 * {
 *   campaignId: string,
 *   latestRun: { id, status, startedAt, completedAt, durationSeconds },
 *   funnel: {
 *     organizations: { total, qualified, review, disqualified },
 *     contacts: { total, sourced, ready, withEmail },
 *     leads: { total, pending, approved }
 *   },
 *   stages: [{ stage, status, message, completedAt }],
 *   alerts: [{ type, message }]
 * }
 * 
 * GOVERNANCE:
 * - Read-only endpoint
 * - Direct database queries for real-time accuracy
 * - No caching - always fresh data
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

interface ExecutionStage {
  stage: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message: string;
  details?: Record<string, unknown>;
  completedAt?: string;
}

interface LatestRun {
  id: string;
  status: string;
  phase?: string;
  stage?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  errorMessage?: string;
  terminationReason?: string;
}

interface Alert {
  type: 'info' | 'warning' | 'error';
  message: string;
}

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
    console.error('[execution-status] Error getting org counts:', error);
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
    console.error('[execution-status] Error getting contact counts:', error);
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
    console.error('[execution-status] Error getting lead counts:', error);
    return { total: 0, pending: 0, approved: 0 };
  }
}

async function getExecutionStages(db: Pool, campaignId: string): Promise<ExecutionStage[]> {
  try {
    const result = await db.query(`
      SELECT stage, action, status, message, details, created_at
      FROM public.execution_logs
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [campaignId]);
    
    // Group by stage and get the latest status for each
    const stageMap = new Map<string, ExecutionStage>();
    
    for (const row of result.rows) {
      const stageName = row.stage || 'unknown';
      if (!stageMap.has(stageName)) {
        stageMap.set(stageName, {
          stage: stageName,
          status: mapLogStatus(row.status),
          message: row.message || '',
          details: row.details,
          completedAt: row.created_at,
        });
      }
    }
    
    return Array.from(stageMap.values());
  } catch (error) {
    console.error('[execution-status] Error getting execution stages:', error);
    return [];
  }
}

function mapLogStatus(status: string | null): 'pending' | 'running' | 'success' | 'error' | 'skipped' {
  if (!status) return 'pending';
  const normalized = status.toLowerCase();
  if (normalized === 'success' || normalized === 'completed') return 'success';
  if (normalized === 'error' || normalized === 'failed') return 'error';
  if (normalized === 'running' || normalized === 'in_progress') return 'running';
  if (normalized === 'skipped') return 'skipped';
  return 'pending';
}

async function getLatestRun(db: Pool, campaignId: string): Promise<LatestRun | null> {
  try {
    const result = await db.query(`
      SELECT id, status, phase, stage, error_message, termination_reason,
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
    const startedAt = row.started_at || row.created_at;
    const completedAt = row.completed_at;
    
    let durationSeconds: number | undefined;
    if (startedAt && completedAt) {
      durationSeconds = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    }
    
    return {
      id: row.id,
      status: row.status || 'unknown',
      phase: row.phase,
      stage: row.stage,
      startedAt,
      completedAt,
      durationSeconds,
      errorMessage: row.error_message,
      terminationReason: row.termination_reason,
    };
  } catch (error) {
    console.error('[execution-status] Error getting latest run:', error);
    return null;
  }
}

function generateAlerts(
  funnel: { organizations: OrganizationCounts; contacts: ContactCounts; leads: LeadCounts },
  latestRun: LatestRun | null
): Alert[] {
  const alerts: Alert[] = [];
  
  // Check for contacts needing email discovery
  if (funnel.contacts.total > 0 && funnel.contacts.withEmail < funnel.contacts.total) {
    const needsEmail = funnel.contacts.total - funnel.contacts.withEmail;
    alerts.push({
      type: 'warning',
      message: `${needsEmail} contacts need email discovery before they can become leads.`,
    });
  }
  
  // Check for leads pending approval
  if (funnel.leads.pending > 0) {
    alerts.push({
      type: 'info',
      message: `${funnel.leads.pending} leads are pending approval.`,
    });
  }
  
  // Check for organizations in review
  if (funnel.organizations.review > 0 && funnel.organizations.qualified === 0) {
    alerts.push({
      type: 'info',
      message: `${funnel.organizations.review} organizations are in review status. Score threshold may need adjustment.`,
    });
  }
  
  // Check for run errors
  if (latestRun?.status === 'failed' && latestRun.errorMessage) {
    alerts.push({
      type: 'error',
      message: `Last run failed: ${latestRun.errorMessage}`,
    });
  }
  
  return alerts;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  console.log('[execution-status] Fetching status for campaign:', campaignId);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      campaignId,
      latestRun: null,
      funnel: {
        organizations: { total: 0, qualified: 0, review: 0, disqualified: 0 },
        contacts: { total: 0, sourced: 0, ready: 0, withEmail: 0 },
        leads: { total: 0, pending: 0, approved: 0 },
      },
      stages: [],
      alerts: [{ type: 'warning', message: 'Database not configured' }],
    });
  }

  try {
    const db = getPool();

    // Fetch all data in parallel for performance
    const [organizations, contacts, leads, stages, latestRun] = await Promise.all([
      getOrganizationCounts(db, campaignId),
      getContactCounts(db, campaignId),
      getLeadCounts(db, campaignId),
      getExecutionStages(db, campaignId),
      getLatestRun(db, campaignId),
    ]);

    const funnel = { organizations, contacts, leads };
    const alerts = generateAlerts(funnel, latestRun);

    console.log('[execution-status] Fetched counts:', {
      orgs: organizations.total,
      contacts: contacts.total,
      leads: leads.total,
      stages: stages.length,
    });

    return NextResponse.json({
      campaignId,
      latestRun,
      funnel,
      stages,
      alerts,
      _meta: {
        fetchedAt: new Date().toISOString(),
        source: 'direct_database_query',
      },
    });
  } catch (error) {
    console.error('[execution-status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch execution status' },
      { status: 500 }
    );
  }
}
