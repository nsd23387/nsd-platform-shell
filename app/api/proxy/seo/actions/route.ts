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
    let rows: Record<string, unknown>[] = [];

    try {
      const result = await pool.query(
        `SELECT *, 'seo_action' AS source
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
      // pg returns NUMERIC columns as JS strings by default. The UI calls
      // .toFixed() on these — coerce to number here so the API contract
      // never leaks string-numerics.
      rows = result.rows.map((r) => ({
        ...r,
        agent_review_score: r.agent_review_score != null ? Number(r.agent_review_score) : null,
        gsc_position: r.gsc_position != null ? Number(r.gsc_position) : null,
        gsc_ctr: r.gsc_ctr != null ? Number(r.gsc_ctr) : null,
        gsc_impressions: r.gsc_impressions != null ? Number(r.gsc_impressions) : null,
        gsc_clicks: r.gsc_clicks != null ? Number(r.gsc_clicks) : null,
        outcome_position_delta: r.outcome_position_delta != null ? Number(r.outcome_position_delta) : null,
        outcome_impressions_delta: r.outcome_impressions_delta != null ? Number(r.outcome_impressions_delta) : null,
        outcome_ctr_delta: r.outcome_ctr_delta != null ? Number(r.outcome_ctr_delta) : null,
        outcome_clicks_delta: r.outcome_clicks_delta != null ? Number(r.outcome_clicks_delta) : null,
      }));
    } catch {
      // seo_action table may not exist yet — fall through to candidate fallback
    }

    // Fallback: if seo_action is empty, surface awaiting-approval execution candidates
    if (rows.length === 0) {
      try {
        const fallback = await pool.query(
          `SELECT
             candidate_id::text AS id,
             target_page_url AS target_url,
             mutation_type AS action_type,
             COALESCE(proposed_value, recommendation_detail->>'proposed_value') AS proposed_value,
             opportunity_score AS quality_score,
             evidence_summary AS rationale,
             'awaiting_approval' AS status,
             created_at,
             'seo_execution_candidate' AS source
           FROM analytics.seo_execution_candidate
           WHERE execution_status = 'awaiting_approval'
              OR (execution_status = 'proposed' AND approval_status = 'pending')
           ORDER BY opportunity_score DESC NULLS LAST, created_at DESC
           LIMIT $1`,
          [limit],
        );
        rows = fallback.rows;
      } catch {
        // No fallback data available — return empty
      }
    }

    return NextResponse.json({ data: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/actions] GET error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; action: string; notes?: string; source?: string };
    const { id, action, notes, source } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 });
    }

    const fromCandidate = source === 'seo_execution_candidate';

    if (action === 'approve') {
      if (fromCandidate) {
        const result = await pool.query(
          `UPDATE analytics.seo_execution_candidate
           SET execution_status = 'approved',
               approval_status = 'approved',
               reviewer_id = 'operator',
               reviewed_at = NOW(),
               review_notes = $2
           WHERE candidate_id = $1::uuid
           RETURNING candidate_id`,
          [id, notes || null],
        );
        if (!result.rowCount) {
          return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id, status: 'approved' });
      }
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
      if (fromCandidate) {
        const result = await pool.query(
          `UPDATE analytics.seo_execution_candidate
           SET execution_status = 'rejected',
               approval_status = 'rejected',
               reviewer_id = 'operator',
               reviewed_at = NOW(),
               review_notes = $2
           WHERE candidate_id = $1::uuid
           RETURNING candidate_id`,
          [id, notes || null],
        );
        if (!result.rowCount) {
          return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, id, status: 'rejected' });
      }
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/actions] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
