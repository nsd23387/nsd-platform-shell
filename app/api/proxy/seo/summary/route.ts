/**
 * GET /api/proxy/seo/summary
 *
 * Single aggregation endpoint for the revamped SEO command center.
 * Reads directly from the POPULATED analytics tables (not the near-empty
 * seo_action table) so the dashboard surfaces what the engine has actually
 * found: proposed changes awaiting review, ranking decay, cannibalization,
 * backlink targets, competitor gaps, and topical-authority gaps.
 *
 * Every query is independently guarded so one missing table never blanks
 * the whole dashboard.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool && databaseUrl) {
    pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false }, max: 3 });
  }
  if (!pool) throw new Error('No database URL configured');
  return pool;
}

type Row = Record<string, unknown>;
async function safe(p: Pool, sql: string): Promise<Row[]> {
  try {
    const { rows } = await p.query(sql);
    return rows;
  } catch (err) {
    console.error('[seo/summary] query failed:', (err as Error).message);
    return [];
  }
}
const n = (v: unknown): number => (v == null ? 0 : Number(v));

// One independently-guarded count per table. A missing table or column
// yields 0 for that metric instead of blanking every count.
async function count(p: Pool, sql: string): Promise<number> {
  const rows = await safe(p, sql);
  return rows.length ? n(rows[0].c) : 0;
}

export async function GET() {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const p = getPool();

  const [
    cProposed, cDecay, cCannibal, cBacklinks, cCompetitor, cTopical, cSerp, cSuppressed,
    proposedChanges,
    decay,
    cannibalization,
    backlinks,
  ] = await Promise.all([
    count(p, `SELECT count(*) c FROM analytics.seo_execution_candidate WHERE (approval_status = 'pending' OR execution_status = 'proposed') AND (gate_status IS NULL OR gate_status = 'accepted')`),
    count(p, `SELECT count(*) c FROM analytics.seo_decay_signal WHERE status = 'new'`),
    count(p, `SELECT count(*) c FROM analytics.seo_cannibalization_signal WHERE status = 'new'`),
    count(p, `SELECT count(*) c FROM analytics.seo_backlink_opportunities WHERE status = 'new'`),
    count(p, `SELECT count(*) c FROM analytics.seo_competitor_gap`),
    count(p, `SELECT count(*) c FROM analytics.seo_topical_authority_gap`),
    count(p, `SELECT count(*) c FROM analytics.seo_serp_features`),
    // Candidates the intent/relevance gate withheld.
    count(p, `SELECT count(*) c FROM analytics.seo_gate_suppressed`),
    // The actual proposed changes — with before -> after text + gate evidence.
    // Gate-suppressed rows are excluded; ordered by the gate's relevance score.
    safe(p, `
      SELECT candidate_id::text AS id,
             regexp_replace(target_page_url, '^https?://[^/]+', '') AS page,
             mutation_type, target_field,
             original_value, proposed_value,
             evidence_summary,
             opportunity_score,
             relevance_score,
             evidence,
             gate_status,
             COALESCE(approval_status, execution_status) AS state,
             created_at
      FROM analytics.seo_execution_candidate
      WHERE (approval_status = 'pending' OR execution_status = 'proposed')
        AND proposed_value IS NOT NULL
        AND (gate_status IS NULL OR gate_status = 'accepted')
      ORDER BY relevance_score DESC NULLS LAST, opportunity_score DESC NULLS LAST, created_at DESC
      LIMIT 25
    `),
    safe(p, `
      SELECT id::text AS id,
             regexp_replace(page_path, '^https?://[^/]+', '') AS page,
             keyword, position_30d_ago, position_now, position_delta,
             traffic_delta_pct, decay_score, detected_at
      FROM analytics.seo_decay_signal
      WHERE status = 'new'
      ORDER BY decay_score DESC NULLS LAST, detected_at DESC
      LIMIT 10
    `),
    safe(p, `
      SELECT id::text AS id, keyword,
             regexp_replace(page_path_a, '^https?://[^/]+', '') AS page_a,
             regexp_replace(page_path_b, '^https?://[^/]+', '') AS page_b,
             overlap_score,
             regexp_replace(suggested_canonical, '^https?://[^/]+', '') AS suggested_canonical,
             canonical_confidence, detected_at
      FROM analytics.seo_cannibalization_signal
      WHERE status = 'new'
      ORDER BY overlap_score DESC NULLS LAST, detected_at DESC
      LIMIT 10
    `),
    safe(p, `
      SELECT id::text AS id, referring_domain, domain_rank, backlinks_count,
             spam_score, gap_competitor, discovered_at
      FROM analytics.seo_backlink_opportunities
      WHERE status = 'new'
      ORDER BY domain_rank DESC NULLS LAST
      LIMIT 10
    `),
  ]);

  const counts: Record<string, number> = {
    proposed_changes: cProposed,
    decay: cDecay,
    cannibalization: cCannibal,
    backlinks: cBacklinks,
    competitor_gaps: cCompetitor,
    topical_gaps: cTopical,
    serp_features: cSerp,
    suppressed: cSuppressed,
  };

  return NextResponse.json({
    data: {
      counts,
      proposedChanges: proposedChanges.map((r) => ({
        ...r,
        opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
        relevance_score: r.relevance_score != null ? Number(r.relevance_score) : null,
        evidence: r.evidence ?? null,
      })),
      decay: decay.map((r) => ({
        ...r,
        position_30d_ago: n(r.position_30d_ago),
        position_now: n(r.position_now),
        position_delta: n(r.position_delta),
        traffic_delta_pct: n(r.traffic_delta_pct),
        decay_score: n(r.decay_score),
      })),
      cannibalization: cannibalization.map((r) => ({ ...r, overlap_score: n(r.overlap_score) })),
      backlinks: backlinks.map((r) => ({
        ...r,
        domain_rank: n(r.domain_rank),
        backlinks_count: n(r.backlinks_count),
        spam_score: n(r.spam_score),
      })),
      generated_at: new Date().toISOString(),
    },
  });
}
