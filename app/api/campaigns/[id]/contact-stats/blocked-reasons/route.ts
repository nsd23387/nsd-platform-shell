/**
 * Blocked Reasons API Route
 * 
 * GET /api/campaigns/:id/contact-stats/blocked-reasons
 * 
 * Returns breakdown of why contacts are blocked from becoming leads.
 * 
 * Blocked reasons:
 * - no_email: Apollo couldn't reveal email
 * - invalid_email: Email failed validation
 * - low_fit_score: Below enrichment threshold
 * - excluded_title: Title in exclusion list
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

interface BlockedReasons {
  total: number;
  reasons: {
    no_email: number;
    invalid_email: number;
    low_fit_score: number;
    excluded_title: number;
    other: number;
  };
}

// Map database email_block_reason values to our reason categories
function categorizeBlockReason(reason: string | null): keyof BlockedReasons['reasons'] {
  if (!reason) return 'other';
  
  const normalized = reason.toLowerCase();
  
  // No email available
  if (normalized.includes('no_email') || 
      normalized.includes('no email') || 
      normalized.includes('email_not_found') ||
      normalized.includes('not found') ||
      normalized.includes('unavailable')) {
    return 'no_email';
  }
  
  // Invalid email
  if (normalized.includes('invalid') || 
      normalized.includes('validation') ||
      normalized.includes('malformed') ||
      normalized.includes('bounce')) {
    return 'invalid_email';
  }
  
  // Low fit score
  if (normalized.includes('score') || 
      normalized.includes('fit') ||
      normalized.includes('threshold') ||
      normalized.includes('below')) {
    return 'low_fit_score';
  }
  
  // Excluded title
  if (normalized.includes('title') || 
      normalized.includes('role') ||
      normalized.includes('excluded') ||
      normalized.includes('exclusion')) {
    return 'excluded_title';
  }
  
  return 'other';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      total: 0,
      reasons: {
        no_email: 0,
        invalid_email: 0,
        low_fit_score: 0,
        excluded_title: 0,
        other: 0,
      },
    });
  }

  try {
    const db = getPool();

    // Get blocked contacts with their block reasons
    // NOTE: Cast status to text to avoid enum type mismatch errors
    const result = await db.query(`
      SELECT 
        email_block_reason,
        status_reason,
        COUNT(*) as count
      FROM public.campaign_contacts
      WHERE campaign_id = $1
      AND (email_usable = false OR status::text = 'blocked')
      GROUP BY email_block_reason, status_reason
      ORDER BY count DESC
    `, [campaignId]);

    // Aggregate into reason categories
    const reasons: BlockedReasons['reasons'] = {
      no_email: 0,
      invalid_email: 0,
      low_fit_score: 0,
      excluded_title: 0,
      other: 0,
    };

    let total = 0;

    for (const row of result.rows) {
      const count = parseInt(row.count, 10);
      total += count;
      
      // Try email_block_reason first, then status_reason
      const blockReason = row.email_block_reason || row.status_reason;
      const category = categorizeBlockReason(blockReason);
      reasons[category] += count;
    }

    // If no specific reasons found but we have blocked contacts,
    // query total blocked and attribute to no_email (most common reason)
    if (total === 0) {
      const totalBlockedResult = await db.query(`
        SELECT COUNT(*) as count
        FROM public.campaign_contacts
        WHERE campaign_id = $1
        AND (email_usable = false OR email_usable IS NULL)
      `, [campaignId]);
      
      total = parseInt(totalBlockedResult.rows[0]?.count || '0', 10);
      reasons.no_email = total; // Assume no_email if no specific reason
    }

    const response: BlockedReasons = {
      total,
      reasons,
    };

    console.log(`[blocked-reasons] Campaign ${campaignId}:`, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[blocked-reasons] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked reasons' },
      { status: 500 }
    );
  }
}
