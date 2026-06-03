// =============================================================================
// GET /api/proxy/seo/candidate-queue — portfolio-wide engine action queue
// Governance lock: READ-ONLY. Parameterized queries only, no writes. Surfaces
// every gate_status='accepted', approval_status='pending' execution candidate
// across ALL pages so reviewers can triage the backlog without opening each
// page dossier one at a time. Approve/reject still routes back through the
// existing /api/proxy/seo/recommendations write path (Lane 1) — this endpoint
// never mutates. Single backing source: analytics.seo_execution_candidate.
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

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 500;

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const rawLimit = Number(req.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const { rows } = await pool.query(
      `SELECT candidate_id, opportunity_id, mutation_type, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, gate_reasons,
              opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, approval_status, execution_status,
              target_page_url, regate_review_flag
       FROM analytics.seo_execution_candidate
       WHERE gate_status = 'accepted'
         AND approval_status = 'pending'
       ORDER BY opportunity_score DESC NULLS LAST
       LIMIT $1`,
      [limit],
    );

    const candidates = rows.map((r) => ({
      candidate_id: r.candidate_id,
      opportunity_id: r.opportunity_id,
      mutation_type: r.mutation_type,
      primary_remedy: r.primary_remedy,
      proposed_value: r.proposed_value,
      current_value_snapshot: r.current_value_snapshot,
      evidence_summary: r.evidence_summary,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
      regate_review_flag: r.regate_review_flag === true,
    }));

    return NextResponse.json({ data: { candidates, returned: candidates.length } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/candidate-queue] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load candidate queue' }, { status: 500 });
  }
}
