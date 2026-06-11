// =============================================================================
// GET /api/proxy/seo/strategy — demand Strategist recommendation layer
// Governance lock: READ-ONLY. Parameterized queries only, no writes. Surfaces
// analytics.v_seo_portfolio_recommendation_ranked — the governed, strategic
// portfolio recommendation backlog. This is distinct from the execution queue
// and never approves, rejects, drafts, publishes, or mutates engine candidates.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT *
       FROM analytics.v_seo_portfolio_recommendation_ranked
       ORDER BY portfolio_rank ASC`,
    );

    const recommendations = rows.map((r) => {
      const evidence = asRecord(r.evidence);
      const arbitration = asRecord(evidence.coverage_arbitration);
      return {
        portfolio_rank: r.portfolio_rank != null ? Number(r.portfolio_rank) : null,
        recommendation_id: r.recommendation_id,
        source_key: r.source_key ?? null,
        rec_type: r.rec_type,
        target_url: r.target_url ?? null,
        proposed_slug: r.proposed_slug ?? null,
        intent: r.intent ?? null,
        entity: r.entity ?? null,
        rationale: r.rationale,
        evidence,
        coverage_page: firstString(r.coverage_page, evidence.coverage_page, arbitration.coverage_page),
        coverage_score: firstNumber(r.coverage_score, evidence.coverage_score, arbitration.coverage_score),
        coverage_method: firstString(r.coverage_method, evidence.coverage_method, arbitration.coverage_method),
        why: firstString(r.why, evidence.why, arbitration.why),
        conversion_priority: r.conversion_priority != null ? Number(r.conversion_priority) : null,
        confidence: r.confidence != null ? Number(r.confidence) : null,
        status: r.status,
        depends_on_rework: Boolean(r.depends_on_rework),
        source_signals: r.source_signals ?? {},
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return NextResponse.json({ data: recommendations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/strategy] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load strategy recommendations' }, { status: 500 });
  }
}
