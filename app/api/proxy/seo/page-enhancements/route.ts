// =============================================================================
// GET/POST /api/proxy/seo/page-enhancements
// Page-package review surface. The decision unit is one page enhancement package
// from analytics.v_seo_page_enhancement_review_detail, with member candidate
// details joined only for review and guard evaluation.
// =============================================================================

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

const OPEN_REGEN_STATUSES = ['pending', 'regenerating', 'escalated'];
const EVALUATING_STATUSES = ['evaluating', 'performer', 'probation', 'watch'];
const RESOLVED_STATUSES = ['winner', 'retired', 'inconclusive'];

const packageMemberSql = `
  WITH package_queue AS (
    SELECT p.enhancement_id,
           p.canonical_url,
           p.rep_url,
           p.version,
           p.fields,
           p.change_count,
           q.member_candidate_ids,
           p.updated_at,
           p.changes
    FROM analytics.v_seo_page_enhancement_review_detail p
    LEFT JOIN analytics.v_seo_page_enhancement_queue q
      ON q.enhancement_id = p.enhancement_id
  ),
  member_rows AS (
    SELECT p.enhancement_id,
           p.canonical_url,
           p.rep_url,
           p.version,
           p.fields,
           p.change_count,
           p.member_candidate_ids,
           p.updated_at,
           p.changes,
           m.ordinality,
           q.candidate_id,
           q.opportunity_id,
           q.mutation_type,
           q.target_field,
           q.target_page_url,
           q.proposed_value,
           q.current_value_snapshot,
           q.mutation_label,
           q.primary_remedy,
           q.opportunity_score::numeric AS opportunity_score,
           q.gate_status,
           q.approval_status,
           q.execution_status,
           q.regate_review_flag,
           q.needs_evidence,
           q.qa_status,
           q.gate_reasons,
           COALESCE(pp.auto_publish, false) AS auto_publish,
           CASE q.mutation_type
             WHEN 'h1_tag_refinement' THEN 'h1'
             WHEN 'meta_description_update' THEN 'meta_description'
             WHEN 'title_tag_refinement' THEN 'title'
             WHEN 'image_alt_text_improvement' THEN 'alt'
             ELSE NULL
           END AS copy_quality_field
    FROM package_queue p
    LEFT JOIN LATERAL unnest(p.member_candidate_ids) WITH ORDINALITY AS m(candidate_id, ordinality)
      ON true
    LEFT JOIN analytics.v_seo_dashboard_queue q
      ON q.candidate_id = m.candidate_id
    LEFT JOIN analytics.seo_mutation_publish_policy pp
      ON pp.mutation_type = q.mutation_type
  ),
  scored AS (
    SELECT mr.*,
           (copy_score.score->>'quality')::numeric AS copy_quality_score,
           (copy_score.score->>'floor')::numeric AS copy_quality_floor,
           CASE
             WHEN mr.copy_quality_field IS NULL THEN true
             ELSE COALESCE((copy_score.score->>'passes_floor')::boolean, false)
           END AS copy_quality_passes_floor,
           regen.status AS copy_regen_status
    FROM member_rows mr
    LEFT JOIN LATERAL (
      SELECT a.normalized_keyword
      FROM analytics.seo_page_keyword_assignment a
      WHERE analytics.seo_norm_url(a.intended_page_url) = analytics.seo_norm_url(mr.target_page_url)
      ORDER BY (a.status = 'active') DESC NULLS LAST,
               a.routing_confidence DESC NULLS LAST
      LIMIT 1
    ) kw ON mr.copy_quality_field IS NOT NULL
    LEFT JOIN LATERAL (
      SELECT analytics.seo_copy_quality_score(
        mr.copy_quality_field,
        mr.proposed_value,
        kw.normalized_keyword,
        NULL,
        NULL
      ) AS score
    ) copy_score ON mr.copy_quality_field IS NOT NULL
    LEFT JOIN analytics.seo_copy_regen_queue regen
      ON regen.candidate_id = mr.candidate_id
  )
  SELECT *,
         (
           candidate_id IS NOT NULL
           AND gate_status = 'accepted'
           AND approval_status = 'pending'
           AND execution_status = 'proposed'
           AND current_value_snapshot IS NOT NULL
           AND NULLIF(btrim(COALESCE(proposed_value, '')), '') IS NOT NULL
           AND proposed_value <> '__llm_pending__'
           AND COALESCE(needs_evidence, false) IS FALSE
           AND COALESCE(regate_review_flag, false) IS FALSE
           AND COALESCE(qa_status, '') NOT IN ('warn', 'block')
           AND COALESCE(copy_regen_status, '') <> ALL($1::text[])
           AND (
             copy_quality_field IS NULL
             OR COALESCE(copy_quality_passes_floor, false)
           )
         ) AS member_safe
  FROM scored
  ORDER BY updated_at DESC NULLS LAST, canonical_url ASC, ordinality ASC
`;

function fieldLabel(row: any): string {
  const field = String(row.target_field || row.copy_quality_field || row.mutation_type || '').toLowerCase();
  if (field.includes('title')) return 'title';
  if (field.includes('meta')) return 'meta';
  if (field.includes('h1')) return 'h1';
  if (field.includes('alt') || field.includes('image')) return 'alt';
  if (field.includes('schema')) return 'schema';
  return field.replace(/_/g, ' ') || 'change';
}

function mapPackages(rows: any[]) {
  const map = new Map<string, any>();
  for (const r of rows) {
    const id = String(r.enhancement_id);
    let pkg = map.get(id);
    if (!pkg) {
      pkg = {
        enhancement_id: id,
        canonical_url: r.canonical_url,
        rep_url: r.rep_url,
        version: Number(r.version ?? 0),
        fields: Array.isArray(r.fields) ? r.fields : [],
        change_count: Number(r.change_count ?? 0),
        member_candidate_ids: Array.isArray(r.member_candidate_ids) ? r.member_candidate_ids.map(String) : [],
        updated_at: r.updated_at,
        changes: Array.isArray(r.changes) ? r.changes : [],
        members: [],
        safe_to_bulk_approve: true,
        auto_publish_count: 0,
        draft_count: 0,
      };
      map.set(id, pkg);
    }
    if (!r.candidate_id) {
      pkg.safe_to_bulk_approve = false;
      continue;
    }
    const member = {
      candidate_id: String(r.candidate_id),
      opportunity_id: r.opportunity_id ?? null,
      mutation_type: r.mutation_type ?? null,
      target_field: r.target_field ?? null,
      field_label: fieldLabel(r),
      target_page_url: r.target_page_url ?? null,
      proposed_value: r.proposed_value ?? null,
      current_value_snapshot: r.current_value_snapshot ?? null,
      mutation_label: r.mutation_label ?? null,
      primary_remedy: r.primary_remedy ?? null,
      opportunity_score: r.opportunity_score != null ? Number(r.opportunity_score) : null,
      gate_status: r.gate_status ?? null,
      approval_status: r.approval_status ?? null,
      execution_status: r.execution_status ?? null,
      qa_status: r.qa_status ?? null,
      gate_reasons: Array.isArray(r.gate_reasons) ? r.gate_reasons : [],
      auto_publish: r.auto_publish === true,
      copy_quality_score: r.copy_quality_score != null ? Number(r.copy_quality_score) : null,
      copy_quality_floor: r.copy_quality_floor != null ? Number(r.copy_quality_floor) : null,
      copy_quality_passes_floor: r.copy_quality_passes_floor === true,
      copy_regen_status: r.copy_regen_status ?? null,
      safe_to_approve: r.member_safe === true,
    };
    pkg.members.push(member);
    if (!member.safe_to_approve) pkg.safe_to_bulk_approve = false;
    if (member.auto_publish) pkg.auto_publish_count += 1;
    else pkg.draft_count += 1;
  }
  return Array.from(map.values()).map((pkg) => ({
    ...pkg,
    safe_to_bulk_approve: pkg.safe_to_bulk_approve
      && pkg.members.length === pkg.member_candidate_ids.length
      && pkg.members.length > 0,
  }));
}

function lifecycleDay(releasedAt: string | Date | null): number | null {
  if (!releasedAt) return null;
  const t = new Date(releasedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

async function loadPayload(client: Pool | PoolClient) {
  const memberResult = await client.query(packageMemberSql, [OPEN_REGEN_STATUSES]);
  const lifecycleResult = await client.query(
    `SELECT enhancement_id::text, canonical_url, rep_url, version, status, fields,
            member_candidate_ids::text[], released_at, anchor_at, prov_label, prov_at,
            final_label, final_at, action, baseline_position::numeric,
            baseline_clicks::numeric, prov_position::numeric, prov_clicks::numeric,
            final_position::numeric, final_clicks::numeric, updated_at
     FROM analytics.seo_page_enhancement
     ORDER BY COALESCE(released_at, updated_at) DESC NULLS LAST
     LIMIT 500`,
  );
  const policyResult = await client.query(
    `SELECT first_verdict_days, final_days
     FROM analytics.seo_lifecycle_policy
     ORDER BY policy_id
     LIMIT 1`,
  );
  const northStarResult = await client.query(`SELECT * FROM analytics.v_seo_north_star LIMIT 1`);
  const moneyResult = await client.query(`SELECT * FROM analytics.v_seo_north_star_money_pages LIMIT 8`);

  const packages = mapPackages(memberResult.rows);
  const policy = {
    first_verdict_days: Number(policyResult.rows[0]?.first_verdict_days ?? 30),
    final_days: Number(policyResult.rows[0]?.final_days ?? 60),
  };
  const lifecycle = lifecycleResult.rows.map((r) => ({
    enhancement_id: r.enhancement_id,
    canonical_url: r.canonical_url,
    rep_url: r.rep_url,
    version: Number(r.version ?? 0),
    status: r.status,
    fields: Array.isArray(r.fields) ? r.fields : [],
    member_candidate_ids: Array.isArray(r.member_candidate_ids) ? r.member_candidate_ids.map(String) : [],
    released_at: r.released_at,
    anchor_at: r.anchor_at,
    prov_label: r.prov_label,
    prov_at: r.prov_at,
    final_label: r.final_label,
    final_at: r.final_at,
    action: r.action,
    baseline_position: r.baseline_position != null ? Number(r.baseline_position) : null,
    baseline_clicks: r.baseline_clicks != null ? Number(r.baseline_clicks) : null,
    prov_position: r.prov_position != null ? Number(r.prov_position) : null,
    prov_clicks: r.prov_clicks != null ? Number(r.prov_clicks) : null,
    final_position: r.final_position != null ? Number(r.final_position) : null,
    final_clicks: r.final_clicks != null ? Number(r.final_clicks) : null,
    updated_at: r.updated_at,
    day: lifecycleDay(r.released_at),
  }));
  const counts = {
    review: packages.length,
    evaluating: lifecycle.filter((r) => EVALUATING_STATUSES.includes(String(r.status))).length,
    resolved: lifecycle.filter((r) => RESOLVED_STATUSES.includes(String(r.status))).length,
  };
  const ns = northStarResult.rows[0] ?? null;
  return {
    packages,
    lifecycle,
    counts,
    policy,
    north_star: ns ? {
      as_of: ns.as_of,
      pages_with_traffic: Number(ns.pages_with_traffic ?? 0),
      ranked_top3: Number(ns.ranked_top3 ?? 0),
      ranked_top10: Number(ns.ranked_top10 ?? 0),
      ranked_top20: Number(ns.ranked_top20 ?? 0),
      pct_page1: ns.pct_page1 != null ? Number(ns.pct_page1) : null,
      improving: Number(ns.improving ?? 0),
      declining: Number(ns.declining ?? 0),
      flat: Number(ns.flat ?? 0),
      clicks_28d: Number(ns.clicks_28d ?? 0),
      clicks_prev28d: Number(ns.clicks_prev28d ?? 0),
      impr_28d: Number(ns.impr_28d ?? 0),
      impr_prev28d: Number(ns.impr_prev28d ?? 0),
    } : null,
    money_pages: moneyResult.rows.map((r) => ({
      canonical_url: r.canonical_url,
      clicks_28d: Number(r.clicks_28d ?? 0),
      clicks_prev28d: Number(r.clicks_prev28d ?? 0),
      impr_28d: Number(r.impr_28d ?? 0),
      pos_28d: r.pos_28d != null ? Number(r.pos_28d) : null,
    })),
  };
}

async function approveLoadedPackage(client: PoolClient, pkg: any, reviewNotes?: string, force = false) {
  if (!force && !pkg.safe_to_bulk_approve) return { enhancement_id: pkg.enhancement_id, status: 'skipped', reason: 'package_guard_failed' };

  const ids = pkg.member_candidate_ids;
  const whereClause = force
    ? `WHERE candidate_id = ANY($1::uuid[]) AND approval_status = 'pending'`
    : `WHERE candidate_id = ANY($1::uuid[]) AND approval_status = 'pending' AND execution_status = 'proposed' AND gate_status = 'accepted'`;
  const update = await client.query(
    `UPDATE analytics.seo_execution_candidate
     SET approval_status = 'approved',
         execution_status = 'approved',
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     ${whereClause}`,
    [ids, reviewNotes || (force ? 'force-approved as page package (override guards)' : 'approved as page package')],
  );
  if (!force && update.rowCount !== ids.length) {
    throw new Error(`approved ${update.rowCount}/${ids.length} package members`);
  }
  await client.query(`SELECT analytics.seo_release_page_enhancement($1::bigint)`, [pkg.enhancement_id]);
  return {
    enhancement_id: pkg.enhancement_id,
    status: 'approved',
    approved: ids.length,
    auto_publish_count: pkg.auto_publish_count,
    draft_count: pkg.draft_count,
  };
}

async function approvePackage(client: PoolClient, enhancementId: string, reviewNotes?: string, force = false) {
  const payload = await loadPayload(client);
  const pkg = payload.packages.find((p) => p.enhancement_id === enhancementId);
  if (!pkg) return { enhancement_id: enhancementId, status: 'skipped', reason: 'not_found_or_not_pending' };
  return approveLoadedPackage(client, pkg, reviewNotes, force);
}

async function rejectPackage(client: PoolClient, enhancementId: string, reviewNotes?: string) {
  const row = await client.query(
    `SELECT member_candidate_ids::text[] AS ids
     FROM analytics.v_seo_page_enhancement_queue
     WHERE enhancement_id = $1::bigint
     LIMIT 1`,
    [enhancementId],
  );
  const ids = row.rows[0]?.ids ?? [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return { enhancement_id: enhancementId, status: 'skipped', reason: 'not_found_or_empty' };
  }
  const update = await client.query(
    `UPDATE analytics.seo_execution_candidate
     SET approval_status = 'rejected',
         execution_status = 'rejected',
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE candidate_id = ANY($1::uuid[])
       AND approval_status = 'pending'
       AND execution_status = 'proposed'`,
    [ids, reviewNotes || 'rejected as page package'],
  );
  // is_active is managed by the dedupe function — direct writes are rejected by trigger
  try {
    await client.query(`SELECT analytics.seo_dedupe_candidates()`);
  } catch {
    // non-fatal if function doesn't exist in this schema version
  }
  return { enhancement_id: enhancementId, status: 'rejected', rejected: update.rowCount };
}

export async function GET(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  const filterById = req.nextUrl.searchParams.get('enhancement_id') ?? '';
  const client = await pool.connect();
  try {
    await client.query("SET statement_timeout = '10s'");
    const data = await loadPayload(client);
    if (filterById) {
      const pkg = data.packages.find((p: any) => p.enhancement_id === filterById);
      if (pkg) {
        const lcEntry = data.lifecycle?.find((l: any) => l.enhancement_id === filterById);
        if (lcEntry?.prov_label) pkg.prov_label = lcEntry.prov_label;
      }
      return NextResponse.json({ data: pkg ?? null });
    }
    return NextResponse.json({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/page-enhancements] GET error:', msg);
    return NextResponse.json({ error: 'Failed to load page enhancements', detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const action = String(body?.action || '');
  if (!['approve_package', 'reject_package', 'bulk_approve_packages', 'approve_candidate', 'skip_candidate'].includes(action)) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  const reviewNotes = typeof body?.review_notes === 'string' ? body.review_notes : undefined;
  const enhancementId = body?.enhancement_id != null ? String(body.enhancement_id) : null;
  const enhancementIds = Array.isArray(body?.enhancement_ids) ? body.enhancement_ids.map(String) : [];
  const force = body?.force === true;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let result: any;
    if (action === 'approve_package') {
      if (!enhancementId) throw new Error('enhancement_id required');
      result = await approvePackage(client, enhancementId, reviewNotes, force);
    } else if (action === 'reject_package') {
      if (!enhancementId) throw new Error('enhancement_id required');
      result = await rejectPackage(client, enhancementId, reviewNotes);
    } else if (action === 'bulk_approve_packages') {
      const safeOnly = body?.safe_only !== false;
      const payload = await loadPayload(client);
      const ids = enhancementIds.length > 0
        ? enhancementIds
        : payload.packages.filter((p) => !safeOnly || p.safe_to_bulk_approve).map((p) => p.enhancement_id);
      const results = [];
      for (const id of ids) {
        const pkg = payload.packages.find((p) => p.enhancement_id === id);
        if (!pkg) {
          results.push({ enhancement_id: id, status: 'skipped', reason: 'not_found_or_not_pending' });
        } else {
          results.push(await approveLoadedPackage(client, pkg, reviewNotes || 'bulk approved as page package'));
        }
      }
      result = {
        results,
        summary: {
          requested: ids.length,
          approved: results.filter((r) => r.status === 'approved').length,
          skipped: results.filter((r) => r.status !== 'approved').length,
          auto_publish_count: results.reduce((sum, r) => sum + Number(r.auto_publish_count ?? 0), 0),
          draft_count: results.reduce((sum, r) => sum + Number(r.draft_count ?? 0), 0),
        },
      };
    } else if (action === 'approve_candidate') {
      const candidateId = body?.candidate_id != null ? String(body.candidate_id) : null;
      if (!candidateId) throw new Error('candidate_id required');
      const update = await client.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'approved',
             execution_status = 'approved',
             reviewer_id = 'operator',
             reviewed_at = NOW(),
             review_notes = $2
         WHERE candidate_id = $1::uuid`,
        [candidateId, reviewNotes || 'field approved individually'],
      );
      result = { candidate_id: candidateId, status: 'approved', rowCount: update.rowCount };
    } else if (action === 'skip_candidate') {
      const candidateId = body?.candidate_id != null ? String(body.candidate_id) : null;
      if (!candidateId) throw new Error('candidate_id required');
      const update = await client.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'rejected',
             execution_status = 'rejected',
             reviewer_id = 'operator',
             reviewed_at = NOW(),
             review_notes = $2
         WHERE candidate_id = $1::uuid`,
        [candidateId, reviewNotes || 'field skipped individually'],
      );
      // is_active is managed by the dedupe function — direct writes are rejected by trigger
      try {
        await client.query(`SELECT analytics.seo_dedupe_candidates()`);
      } catch {
        // non-fatal if function doesn't exist in this schema version
      }
      result = { candidate_id: candidateId, status: 'skipped', rowCount: update.rowCount };
    }
    await client.query('COMMIT');
    return NextResponse.json({ data: result });
  } catch (err: unknown) {
    await client.query('ROLLBACK').catch(() => undefined);
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[seo/page-enhancements] POST error:', msg);
    return NextResponse.json({ error: 'Failed to update page enhancement', detail: msg }, { status: 500 });
  } finally {
    client.release();
  }
}
