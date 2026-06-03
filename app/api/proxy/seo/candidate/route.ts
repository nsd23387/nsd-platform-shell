// =============================================================================
// GET /api/proxy/seo/candidate?id=<candidate_id> — single engine candidate
// Governance lock: READ-ONLY. Parameterized query only, no writes. Returns one
// gate-accepted execution candidate including its full `evidence` jsonb (the
// candidate-queue list endpoint deliberately omits the heavy jsonb). Approve /
// reject still routes back through /api/proxy/seo/recommendations (Lane 1) —
// this endpoint never mutates. Single backing source:
// analytics.seo_execution_candidate.
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
      `SELECT candidate_id, opportunity_id, mutation_type, primary_remedy,
              proposed_value, current_value_snapshot, evidence_summary, gate_reasons,
              gate_status, opportunity_score::numeric AS opportunity_score, opportunity_urgency,
              confidence_tier, source_confidence, approval_status, execution_status,
              target_page_url, regate_review_flag, lane, executor, evidence
       FROM analytics.seo_execution_candidate
       WHERE candidate_id = $1
         AND gate_status = 'accepted'
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
      primary_remedy: r.primary_remedy,
      proposed_value: r.proposed_value,
      current_value_snapshot: r.current_value_snapshot,
      evidence_summary: r.evidence_summary,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      gate_status: r.gate_status,
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      opportunity_urgency: r.opportunity_urgency,
      confidence_tier: r.confidence_tier,
      source_confidence: r.source_confidence,
      approval_status: r.approval_status,
      execution_status: r.execution_status,
      target_page_url: r.target_page_url,
      regate_review_flag: r.regate_review_flag ?? null,
      lane: r.lane != null ? Number(r.lane) : null,
      executor: r.executor ?? null,
      evidence: r.evidence ?? null,
    };

    return NextResponse.json({ data: candidate });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/candidate] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load candidate' }, { status: 500 });
  }
}
