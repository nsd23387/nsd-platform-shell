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
      `SELECT candidate_id, opportunity_id, mutation_type, mutation_label, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, why, gate_reasons,
              opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, gate_status, approval_status, execution_status,
              target_page_url, page_url_canonical, page_is_live, page_status_class,
              regate_review_flag, needs_evidence, qa_status, outcome_verdict
       FROM analytics.v_seo_dashboard_queue
       ORDER BY opportunity_score DESC NULLS LAST
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
    }));

    const summary = await pool.query(`SELECT * FROM analytics.v_seo_dashboard_summary`);
    return NextResponse.json({ data: { candidates, returned: candidates.length, summary: summary.rows[0] ?? null } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/candidate-queue] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load candidate queue' }, { status: 500 });
  }
}
