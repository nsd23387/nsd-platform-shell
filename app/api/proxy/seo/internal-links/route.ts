/**
 * GET /api/proxy/seo/internal-links
 *
 * Gate-accepted, anchor-verified internal-link candidates — the SAME source of
 * truth as the command-center review queue (analytics.seo_execution_candidate),
 * filtered to mutation_type='internal_link_insertion'. Read-only.
 *
 * This replaces the legacy ungated "Top 50" generator surface: by reading the
 * gated table, synthetic anchors, intent violations (e.g. /create-sign/ →
 * product), Jaccard duplicates, and test rows never appear here — they were
 * either suppressed by the gate or never gate-accepted. Once the anchor-presence
 * check ships (seoGateJob), this further narrows to links whose anchor text
 * actually exists on the source page.
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
    console.error('[seo/internal-links] query failed:', (err as Error).message);
    return [];
  }
}

export async function GET() {
  if (!databaseUrl) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const p = getPool();

  const rows = await safe(p, `
    SELECT candidate_id::text AS id,
           regexp_replace(target_page_url, '^https?://[^/]+', '') AS page,
           proposed_value AS anchor,
           relevance_score,
           evidence,
           evidence_summary,
           created_at
    FROM analytics.seo_execution_candidate
    WHERE mutation_type = 'internal_link_insertion'
      AND gate_status = 'accepted'
      AND approval_status = 'pending'
      AND proposed_value IS NOT NULL
    ORDER BY relevance_score DESC NULLS LAST, created_at DESC
    LIMIT 100
  `);

  return NextResponse.json({
    data: {
      links: rows.map((r) => ({
        id: r.id,
        page: r.page,
        anchor: r.anchor,
        relevance_score: r.relevance_score != null ? Number(r.relevance_score) : null,
        evidence: r.evidence ?? null,
        evidence_summary: r.evidence_summary ?? null,
        created_at: r.created_at,
      })),
      generated_at: new Date().toISOString(),
    },
  });
}
