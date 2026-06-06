/**
 * GET /api/proxy/seo/actions — List SEO dashboard recommendations/results
 * from the canonical candidate pipeline.
 *
 * Read source:
 *   - pending review: analytics.v_seo_dashboard_queue
 *   - shipped/results: analytics.seo_execution_candidate + seo_published_outcome
 *
 * Legacy dashboard action writes are intentionally not supported here;
 * approve/reject UI uses the existing candidate path.
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
  const status = req.nextUrl.searchParams.get('status') || 'pending';
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30', 10);

  try {
    const statuses = status.split(',').map(s => s.trim());
    const pendingAliases = new Set(['pending', 'proposed', 'reviewed', 'needs_review', 'awaiting_approval']);
    const wantsPending = statuses.some((s) => pendingAliases.has(s));
    const lifecycleStatuses = statuses.filter((s) => !pendingAliases.has(s));
    const resultRows: Record<string, unknown>[] = [];

    if (wantsPending) {
      const result = await pool.query(
        `SELECT
           candidate_id::text AS id,
           candidate_id,
           opportunity_id,
           target_page_url AS target_url,
           page_url_canonical,
           page_is_live,
           page_status_class,
           mutation_type,
           mutation_label,
           target_field,
           current_value_snapshot AS current_value,
           proposed_value,
           why AS proposed_reason,
           evidence_summary,
           evidence,
           opportunity_score::numeric AS agent_review_score,
           opportunity_urgency,
           confidence_tier,
           source_confidence,
           approval_status AS status,
           approval_status,
           execution_status,
           gate_status,
           regate_review_flag,
           needs_evidence,
           qa_status,
           outcome_verdict AS outcome_label,
           created_at,
           published_at,
           'seo_dashboard_queue' AS source
         FROM analytics.v_seo_dashboard_queue
         ORDER BY opportunity_score DESC NULLS LAST
         LIMIT $1`,
        [limit],
      );
      resultRows.push(...result.rows);
    }

    if (lifecycleStatuses.length > 0) {
      const result = await pool.query(
        `SELECT
             c.candidate_id::text AS id,
             c.candidate_id,
             c.opportunity_id,
             c.target_page_url AS target_url,
             analytics.seo_norm_url(c.target_page_url) AS page_url_canonical,
             (i.status_class = 'canonical_live') AS page_is_live,
             i.status_class AS page_status_class,
             c.mutation_type,
             analytics.seo_mutation_label(c.mutation_type) AS mutation_label,
             c.target_field,
             c.current_value_snapshot AS current_value,
             c.proposed_value,
             COALESCE(c.evidence#>>'{why}', c.evidence_summary) AS proposed_reason,
             c.evidence_summary,
             c.evidence,
             CASE
               WHEN c.opportunity_score IS NULL THEN NULL::numeric
               WHEN abs(c.opportunity_score::numeric) <= 1 THEN round(c.opportunity_score::numeric * 100, 1)
               ELSE round(c.opportunity_score::numeric, 1)
             END AS agent_review_score,
             c.opportunity_urgency,
             c.confidence_tier,
             c.source_confidence,
             c.execution_status AS status,
             c.approval_status,
             c.execution_status,
             c.gate_status,
             c.regate_review_flag,
             c.needs_evidence,
             c.evidence#>>'{qa,status}' AS qa_status,
             o.verdict AS outcome_label,
             c.created_at,
             COALESCE(o.published_at, c.published_at, c.execution_timestamp) AS published_at,
             COALESCE(o.published_at, c.published_at, c.execution_timestamp) AS executed_at,
             'seo_execution_candidate' AS source
           FROM analytics.seo_execution_candidate c
           LEFT JOIN analytics.seo_page_inventory i
             ON analytics.seo_norm_url(i.url) = analytics.seo_norm_url(c.target_page_url)
           LEFT JOIN analytics.seo_published_outcome o
             ON o.candidate_id = c.candidate_id
           WHERE c.execution_status = ANY($1::text[])
           ORDER BY COALESCE(o.published_at, c.published_at, c.execution_timestamp, c.created_at) DESC
           LIMIT $2`,
        [lifecycleStatuses, limit],
      );
      resultRows.push(...result.rows);
    }

    const rows = resultRows.slice(0, limit).map((r) => ({
      ...r,
      agent_review_score: r.agent_review_score != null ? Number(r.agent_review_score) : null,
      opportunity_score: r.agent_review_score != null ? Number(r.agent_review_score) : null,
      gsc_position: null,
      gsc_ctr: null,
      gsc_impressions: null,
      gsc_clicks: null,
      outcome_position_delta: null,
      outcome_impressions_delta: null,
      outcome_ctr_delta: null,
      outcome_clicks_delta: null,
    }));

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

    const fromCandidate = source === 'seo_execution_candidate' || source === 'seo_dashboard_queue';

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
      return NextResponse.json({ error: 'Legacy action approval is retired; use candidate source.' }, { status: 410 });
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
      return NextResponse.json({ error: 'Legacy action rejection is retired; use candidate source.' }, { status: 410 });
    }

    return NextResponse.json({ error: 'Invalid action. Use approve or reject.' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/actions] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
