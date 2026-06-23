// =============================================================================
// GET /api/proxy/seo/candidate-queue — portfolio-wide engine action queue
// Governance lock: READ-ONLY. Parameterized queries only, no writes. Surfaces
// every guarded approvable execution candidate across ALL pages so reviewers
// can triage the backlog without opening each page dossier one at a time.
// Approve/reject still routes back through the existing
// /api/proxy/seo/recommendations write path (Lane 1) — this endpoint never
// mutates. Single backing source: analytics.v_seo_dashboard_queue.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

// The governance contract for this endpoint is "surface EVERY accepted+pending
// candidate" so reviewers triage the whole backlog. A 500 cap silently truncated
// the queue once the backlog approached that size (the Recommendations list and
// Command Center header both fetch this with no explicit limit), so the ceiling
// is raised to a high guardrail value rather than a tight page size. The backing
// query is a single indexed scan ordered by opportunity_score, so returning the
// full pending set is cheap.
const MAX_LIMIT = 5000;
const DEFAULT_LIMIT = 5000;

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const rawLimit = Number(req.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const { rows } = await pool.query(
      `WITH queue AS (
         SELECT q.*,
                CASE q.mutation_type
                  WHEN 'h1_tag_refinement' THEN 'h1'
                  WHEN 'meta_description_update' THEN 'meta_description'
                  WHEN 'title_tag_refinement' THEN 'title'
                  WHEN 'image_alt_text_improvement' THEN 'alt'
                  ELSE NULL
                END AS copy_quality_field
         FROM analytics.v_seo_dashboard_queue q
       )
       SELECT q.candidate_id, q.opportunity_id, q.mutation_type, q.mutation_label, q.primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, why, gate_reasons,
              opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              COALESCE((copy_score.score->>'quality')::numeric, legacy_quality.quality_self_score) AS quality_self_score,
              (copy_score.score->>'quality')::numeric AS copy_quality_score,
              (copy_score.score->>'floor')::numeric AS copy_quality_floor,
              CASE
                WHEN q.copy_quality_field IS NULL THEN true
                ELSE COALESCE((copy_score.score->>'passes_floor')::boolean, false)
              END AS copy_quality_passes_floor,
              regen.status AS copy_regen_status,
              (
                q.gate_status = 'accepted'
                AND q.approval_status = 'pending'
                AND q.execution_status = 'proposed'
                AND q.current_value_snapshot IS NOT NULL
                AND NULLIF(btrim(COALESCE(q.proposed_value, '')), '') IS NOT NULL
                AND q.proposed_value <> '__llm_pending__'
                AND COALESCE(q.needs_evidence, false) IS FALSE
                AND COALESCE(q.regate_review_flag, false) IS FALSE
                AND COALESCE(q.qa_status, '') NOT IN ('warn', 'block')
                AND COALESCE(regen.status, '') NOT IN ('pending', 'regenerating', 'escalated')
                AND (
                  q.copy_quality_field IS NULL
                  OR COALESCE((copy_score.score->>'passes_floor')::boolean, false)
                )
              ) AS safe_to_bulk_approve,
              confidence_tier, source_confidence, gate_status, approval_status, execution_status,
              target_page_url, page_url_canonical, page_is_live, page_status_class,
              regate_review_flag, needs_evidence, qa_status, outcome_verdict,
              COALESCE(pp.auto_publish, false) AS auto_publish
       FROM queue q
       LEFT JOIN analytics.seo_mutation_publish_policy pp
         ON pp.mutation_type = q.mutation_type
       LEFT JOIN LATERAL (
         SELECT a.normalized_keyword
         FROM analytics.seo_page_keyword_assignment a
         WHERE analytics.seo_norm_url(a.intended_page_url) = analytics.seo_norm_url(q.target_page_url)
         ORDER BY (a.status = 'active') DESC NULLS LAST,
                  a.routing_confidence DESC NULLS LAST
         LIMIT 1
       ) kw ON q.copy_quality_field IS NOT NULL
       LEFT JOIN LATERAL (
         SELECT analytics.seo_copy_quality_score(
           q.copy_quality_field,
           q.proposed_value,
           kw.normalized_keyword,
           NULL,
           NULL
         ) AS score
       ) copy_score ON q.copy_quality_field IS NOT NULL
       LEFT JOIN LATERAL (
         SELECT COALESCE(
           CASE WHEN q.evidence->>'quality_self_score' ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN (q.evidence->>'quality_self_score')::numeric END,
           CASE WHEN q.evidence->>'recommendation_quality_score' ~ '^-?[0-9]+(\\.[0-9]+)?$'
                THEN (q.evidence->>'recommendation_quality_score')::numeric END,
           q.opportunity_score::numeric
         ) AS quality_self_score
       ) legacy_quality ON true
       LEFT JOIN analytics.seo_copy_regen_queue regen
         ON regen.candidate_id = q.candidate_id
       ORDER BY opportunity_score DESC NULLS LAST,
                mutation_label ASC NULLS LAST,
                page_url_canonical ASC NULLS LAST,
                candidate_id ASC
       LIMIT $1`,
      [limit],
    );

    const candidates = rows.map((r) => ({
      candidate_id: r.candidate_id,
      opportunity_id: r.opportunity_id,
      mutation_type: r.mutation_type,
      mutation_label: r.mutation_label,
      primary_remedy: r.primary_remedy,
      proposed_value: r.proposed_value,
      current_value_snapshot: r.current_value_snapshot,
      evidence_summary: r.evidence_summary,
      why: r.why,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      quality_self_score: r.quality_self_score != null ? Number(r.quality_self_score) : null,
      copy_quality_score: r.copy_quality_score != null ? Number(r.copy_quality_score) : null,
      copy_quality_floor: r.copy_quality_floor != null ? Number(r.copy_quality_floor) : null,
      copy_quality_passes_floor: r.copy_quality_passes_floor === true,
      copy_regen_status: r.copy_regen_status ?? null,
      safe_to_bulk_approve: r.safe_to_bulk_approve === true,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      gate_status: r.gate_status,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
      page_url_canonical: r.page_url_canonical,
      page_is_live: r.page_is_live === true,
      page_status_class: r.page_status_class,
      regate_review_flag: r.regate_review_flag === true,
      needs_evidence: r.needs_evidence === true,
      qa_status: r.qa_status,
      outcome_verdict: r.outcome_verdict,
      auto_publish: r.auto_publish === true,
    }));

    const summary = await pool.query(`SELECT * FROM analytics.v_seo_dashboard_summary`);
    return NextResponse.json({ data: { candidates, returned: candidates.length, summary: summary.rows[0] ?? null } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/candidate-queue] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load candidate queue' }, { status: 500 });
  }
}
