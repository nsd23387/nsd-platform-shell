// =============================================================================
// GET /api/proxy/seo/candidate?id=<candidate_id> — single engine candidate
// Governance lock: READ-ONLY. Parameterized query only, no writes. Returns one
// gate-accepted execution candidate including its full `evidence` jsonb (the
// candidate-queue list endpoint deliberately omits the heavy jsonb). Approve /
// reject still routes back through /api/proxy/seo/recommendations (Lane 1) —
// this endpoint never mutates. Single backing source:
// analytics.v_seo_dashboard_queue.
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

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing candidate id' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT candidate_id, opportunity_id, mutation_type, mutation_label, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, why, gate_reasons,
              gate_status, opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, approval_status, execution_status,
              target_page_url, page_url_canonical, page_is_live, page_status_class,
              needs_evidence, qa_status, evidence, published_at, outcome_verdict,
              outcome_live_confirmed_at, outcome_live_drift_at, outcome_leading_metric,
              outcome_decided_at
       FROM analytics.v_seo_dashboard_queue
       WHERE candidate_id = $1
       LIMIT 1`,
      [id],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    const r = rows[0];
    const candidate = {
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
      gate_status: r.gate_status,
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
      page_url_canonical: r.page_url_canonical,
      page_is_live: r.page_is_live === true,
      page_status_class: r.page_status_class,
      needs_evidence: r.needs_evidence === true,
      qa_status: r.qa_status,
      evidence: r.evidence ?? null,
      lane: null,
      executor: null,
      original_value: null,
      applied_value: null,
      approval_timestamp: null,
      execution_timestamp: null,
      rollback_available: null,
      rollback_status: null,
      published_at: r.published_at,
      outcome_verdict: r.outcome_verdict,
      outcome_live_confirmed_at: r.outcome_live_confirmed_at,
      outcome_live_drift_at: r.outcome_live_drift_at,
      outcome_leading_metric: r.outcome_leading_metric,
      outcome_decided_at: r.outcome_decided_at,
    };

    return NextResponse.json({ data: candidate });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/candidate] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load candidate' }, { status: 500 });
  }
}
