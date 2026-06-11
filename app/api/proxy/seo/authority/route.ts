// =============================================================================
// GET /api/proxy/seo/authority — Lane 3 off-page authority queue
// Governance lock: READ-ONLY. Surfaces analytics.v_seo_offpage_authority_queue,
// the PII-safe authority opportunity view. This endpoint never reads contact
// tables, never exposes emails/messages, and never mutates outreach state.
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

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        id::text,
        opportunity_type,
        prospect_domain,
        prospect_url,
        prospect_domain_rating::numeric AS prospect_domain_rating,
        our_target_url,
        proposed_anchor,
        discovered_via,
        relevance_score::numeric AS relevance_score,
        opportunity_score::numeric AS opportunity_score,
        score_drivers,
        segment,
        gate_status,
        gate_reasons,
        confidence_tier,
        status,
        suppression_reason,
        routed_at,
        consumed_by,
        dismissed_reason,
        contact_count,
        conversation_count,
        last_conversation_at
      FROM analytics.v_seo_offpage_authority_queue
      ORDER BY
        CASE gate_status WHEN 'accepted' THEN 0 ELSE 1 END,
        opportunity_score DESC NULLS LAST,
        prospect_domain_rating DESC NULLS LAST,
        prospect_domain
      LIMIT 200
    `);

    return NextResponse.json({ data: rows.map((r) => ({
      id: r.id,
      opportunity_type: r.opportunity_type,
      prospect_domain: r.prospect_domain,
      prospect_url: r.prospect_url ?? null,
      prospect_domain_rating: r.prospect_domain_rating != null ? Number(r.prospect_domain_rating) : null,
      our_target_url: r.our_target_url,
      proposed_anchor: r.proposed_anchor ?? null,
      discovered_via: r.discovered_via ?? null,
      relevance_score: r.relevance_score != null ? Number(r.relevance_score) : null,
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      score_drivers: r.score_drivers ?? null,
      segment: r.segment ?? null,
      gate_status: r.gate_status ?? null,
      gate_reasons: r.gate_reasons ?? null,
      confidence_tier: r.confidence_tier ?? null,
      status: r.status ?? null,
      suppression_reason: r.suppression_reason ?? null,
      routed_at: r.routed_at ?? null,
      consumed_by: r.consumed_by ?? null,
      dismissed_reason: r.dismissed_reason ?? null,
      contact_count: r.contact_count != null ? Number(r.contact_count) : 0,
      conversation_count: r.conversation_count != null ? Number(r.conversation_count) : 0,
      last_conversation_at: r.last_conversation_at ?? null,
    })) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/authority] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load SEO authority queue' }, { status: 500 });
  }
}
