/**
 * GET /api/proxy/seo/actions — List SEO actions from the simplified seo_action table
 * POST /api/proxy/seo/actions — Approve/reject an action by ID
 *
 * This replaces the complex recommendations proxy that went through
 * Phase 1 opportunities + execution candidates.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') || 'proposed,reviewed,approved';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30', 10);

  try {
    const statuses = status.split(',').map(s => s.trim());
    const { rows } = await pool.query(
      `SELECT *
       FROM analytics.seo_action
       WHERE status = ANY($1::text[])
       ORDER BY
         CASE status
           WHEN 'proposed' THEN 1
           WHEN 'reviewed' THEN 2
           WHEN 'approved' THEN 3
           WHEN 'executing' THEN 4
           WHEN 'published' THEN 5
           WHEN 'measuring' THEN 6
           WHEN 'failed' THEN 7
           WHEN 'rejected' THEN 8
           WHEN 'rolled_back' THEN 9
         END,
         gsc_impressions DESC NULLS LAST,
         created_at DESC
       LIMIT $2`,
      [statuses, limit],
    );
    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error('[seo/actions] GET error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, notes } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }

    if (action === 'approve') {
      const result = await pool.query(
        `UPDATE analytics.seo_action
         SET status = 'approved',
             human_decision = 'approve',
             human_notes = $2,
             human_decided_at = NOW()
         WHERE id = $1::uuid
           AND status IN ('proposed', 'reviewed', 'rejected')
         RETURNING id, status`,
        [id, notes || null],
      );
      if (!result.rowCount) {
        return NextResponse.json({ error: 'Action not found or not in approvable state' }, { status: 404 });
      }
      return NextResponse.json({ success: true, id, status: 'approved' });
    }

    if (action === 'reject') {
      const result = await pool.query(
        `UPDATE analytics.seo_action
         SET status = 'rejected',
             human_decision = 'reject',
             human_notes = $2,
             human_decided_at = NOW()
         WHERE id = $1::uuid
           AND status IN ('proposed', 'reviewed', 'approved')
         RETURNING id, status`,
        [id, notes || null],
      );
      if (!result.rowCount) {
        return NextResponse.json({ error: 'Action not found or not in rejectable state' }, { status: 404 });
      }
      return NextResponse.json({ success: true, id, status: 'rejected' });
    }

    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
  } catch (err: any) {
    console.error('[seo/actions] POST error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
