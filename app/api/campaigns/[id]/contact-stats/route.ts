/**
 * Contact Stats API Route
 * 
 * GET /api/campaigns/:id/contact-stats
 * 
 * Returns contact funnel statistics showing the 4-state pipeline:
 * - pending: Sourced contacts awaiting scoring
 * - processing: Contacts being scored/enriched
 * - ready: Contacts ready for lead promotion
 * - blocked: Contacts that cannot become leads
 * 
 * This endpoint queries the actual campaign_contacts table for real-time counts.
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

interface ContactStats {
  total: number;
  pending: number;      // sourced - awaiting scoring
  processing: number;   // scored - in enrichment
  ready: number;        // ready for promotion
  blocked: number;      // terminal blocked state
  unavailable: number;  // always 0 (legacy)
  leadsCreated: number;
  readyWithoutLead: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      total: 0,
      pending: 0,
      processing: 0,
      ready: 0,
      blocked: 0,
      unavailable: 0,
      leadsCreated: 0,
      readyWithoutLead: 0,
    });
  }

  try {
    const db = getPool();

    // Query contact stats grouped by status
    // Status values based on actual schema: sourced, scored, ready, blocked
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sourced' AND scored_at IS NULL) as pending,
        COUNT(*) FILTER (WHERE status = 'sourced' AND scored_at IS NOT NULL AND readiness_checked_at IS NULL) as processing,
        COUNT(*) FILTER (WHERE status = 'ready' OR (email_usable = true AND lead_id IS NULL)) as ready,
        COUNT(*) FILTER (WHERE status = 'blocked' OR email_usable = false) as blocked,
        COUNT(*) FILTER (WHERE lead_id IS NOT NULL) as leads_created,
        COUNT(*) FILTER (WHERE (status = 'ready' OR email_usable = true) AND lead_id IS NULL) as ready_without_lead
      FROM public.campaign_contacts
      WHERE campaign_id = $1
    `, [campaignId]);

    const row = result.rows[0];

    const stats: ContactStats = {
      total: parseInt(row?.total || '0', 10),
      pending: parseInt(row?.pending || '0', 10),
      processing: parseInt(row?.processing || '0', 10),
      ready: parseInt(row?.ready || '0', 10),
      blocked: parseInt(row?.blocked || '0', 10),
      unavailable: 0, // Legacy field - always 0
      leadsCreated: parseInt(row?.leads_created || '0', 10),
      readyWithoutLead: parseInt(row?.ready_without_lead || '0', 10),
    };

    // If the status-based counts don't add up, fall back to simpler logic
    // This handles cases where the status enum values differ from expected
    if (stats.pending + stats.processing + stats.ready + stats.blocked === 0 && stats.total > 0) {
      // Simplified fallback based on email_usable
      const fallbackResult = await db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE email_usable = true AND lead_id IS NULL) as ready,
          COUNT(*) FILTER (WHERE email_usable = false OR email_usable IS NULL) as blocked,
          COUNT(*) FILTER (WHERE lead_id IS NOT NULL) as leads_created
        FROM public.campaign_contacts
        WHERE campaign_id = $1
      `, [campaignId]);

      const fb = fallbackResult.rows[0];
      stats.total = parseInt(fb?.total || '0', 10);
      stats.ready = parseInt(fb?.ready || '0', 10);
      stats.blocked = parseInt(fb?.blocked || '0', 10);
      stats.leadsCreated = parseInt(fb?.leads_created || '0', 10);
      stats.readyWithoutLead = stats.ready;
      stats.pending = 0;
      stats.processing = 0;
    }

    console.log(`[contact-stats] Campaign ${campaignId}:`, stats);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[contact-stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact stats' },
      { status: 500 }
    );
  }
}
