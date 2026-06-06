import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('No database URL configured');
    }
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[seo-db] Pool error:', err);
    });
  }
  return pool;
}

export function isSeoDbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL);
}

export async function getClusters() {
  const p = getPool();
  const result = await p.query(`
    SELECT
      kc.id,
      kc.primary_keyword AS cluster_topic,
      kc.cluster_size AS keyword_count,
      kc.total_impressions,
      ROUND(COALESCE(kc.avg_position, 0)::numeric, 1) AS avg_position,
      CASE
        WHEN kc.avg_ctr::text = 'NaN' OR kc.avg_ctr IS NULL THEN 0
        ELSE ROUND((kc.avg_ctr * 100)::numeric, 2)
      END AS avg_ctr,
      kc.primary_keyword
    FROM analytics.keyword_clusters kc
    ORDER BY kc.total_impressions DESC
  `);
  return result.rows.map(r => ({
    ...r,
    keyword_count: Number(r.keyword_count),
    total_impressions: Number(r.total_impressions),
    avg_position: Number(r.avg_position),
    avg_ctr: Number(r.avg_ctr),
  }));
}

export async function getClusterById(id: string) {
  const p = getPool();
  const clusterResult = await p.query(`
    SELECT
      kc.id,
      kc.primary_keyword AS cluster_topic,
      kc.cluster_size AS keyword_count,
      kc.total_impressions,
      ROUND(COALESCE(kc.avg_position, 0)::numeric, 1) AS avg_position,
      CASE
        WHEN kc.avg_ctr::text = 'NaN' OR kc.avg_ctr IS NULL THEN 0
        ELSE ROUND((kc.avg_ctr * 100)::numeric, 2)
      END AS avg_ctr,
      kc.primary_keyword
    FROM analytics.keyword_clusters kc
    WHERE kc.id = $1
  `, [id]);

  if (clusterResult.rows.length === 0) return null;

  const cluster = clusterResult.rows[0];

  const membersResult = await p.query(`
    SELECT
      kcm.keyword,
      COALESCE(kcm.impressions, 0) AS impressions,
      COALESCE(kcm.clicks, 0) AS clicks,
      ROUND(COALESCE(kcm.position, 0)::numeric, 1) AS position,
      CASE
        WHEN kcm.ctr::text = 'NaN' OR kcm.ctr IS NULL THEN 0
        ELSE ROUND((kcm.ctr * 100)::numeric, 2)
      END AS ctr
    FROM analytics.keyword_cluster_members kcm
    WHERE kcm.cluster_id = $1
    ORDER BY COALESCE(kcm.impressions, 0) DESC
  `, [id]);

  return {
    id: cluster.id,
    cluster_topic: cluster.cluster_topic,
    keyword_count: Number(cluster.keyword_count),
    total_impressions: Number(cluster.total_impressions),
    avg_position: Number(cluster.avg_position),
    avg_ctr: Number(cluster.avg_ctr),
    primary_keyword: cluster.primary_keyword,
    members: membersResult.rows.map(m => ({
      keyword: m.keyword,
      impressions: Number(m.impressions),
      clicks: Number(m.clicks),
      position: Number(m.position),
      ctr: Number(m.ctr),
    })),
  };
}

export async function getClusterOpportunities() {
  const p = getPool();
  const result = await p.query(`
    SELECT
      MIN(q.candidate_id::text) AS id,
      q.mutation_type AS cluster_id,
      q.mutation_label AS cluster_topic,
      MIN(q.mutation_type) AS opportunity_type,
      COUNT(*)::int AS total_impressions,
      ROUND(AVG(COALESCE(q.opportunity_score, 0))::numeric, 1) AS avg_position,
      MIN(COALESCE(q.why, q.evidence_summary)) AS suggested_action
    FROM analytics.v_seo_dashboard_queue q
    GROUP BY q.mutation_type, q.mutation_label
    ORDER BY COUNT(*) DESC, AVG(COALESCE(q.opportunity_score, 0)) DESC
  `);
  return result.rows.map(r => ({
    ...r,
    total_impressions: Number(r.total_impressions),
    avg_position: Number(r.avg_position),
  }));
}

export async function getRecommendations() {
  const p = getPool();
  const result = await p.query(`
    SELECT
      q.candidate_id AS id,
      q.mutation_type AS cluster_id,
      q.mutation_label AS cluster_topic,
      q.target_field AS primary_keyword,
      q.mutation_type AS recommended_action,
      COALESCE(q.target_page_url, '') AS recommended_url,
      CASE WHEN q.mutation_type ILIKE '%title%'
           THEN q.proposed_value ELSE NULL END AS recommended_title,
      CASE WHEN q.mutation_type ILIKE '%meta%' OR q.mutation_type ILIKE '%description%'
           THEN q.proposed_value ELSE NULL END AS recommended_meta_description,
      COALESCE(q.target_page_url, '') AS target_url,
      q.mutation_type AS opportunity_type,
      q.opportunity_score AS estimated_impact,
      'pending_review' AS status,
      COALESCE(q.why, q.evidence_summary) AS rationale,
      q.opportunity_score AS priority,
      q.created_at
    FROM analytics.v_seo_dashboard_queue q
    ORDER BY q.created_at DESC
  `);
  // pg returns NUMERIC as string; UI calls .toFixed() and other math.
  return result.rows.map((r) => ({
    ...r,
    estimated_impact: r.estimated_impact != null ? Number(r.estimated_impact) : null,
    priority: r.priority != null ? Number(r.priority) : null,
  }));
}

export async function approveRecommendation(id: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_action
       SET human_decision = 'approved',
           human_decided_at = NOW(),
           status = 'approved'
     WHERE id = $1::uuid`,
    [id],
  );
  if (upd.rowCount === 0) throw new Error('Recommendation not found');
}

export async function rejectRecommendation(id: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_action
       SET human_decision = 'rejected',
           human_decided_at = NOW(),
           status = 'rejected'
     WHERE id = $1::uuid`,
    [id],
  );
  if (upd.rowCount === 0) throw new Error('Recommendation not found');
}

export async function approveExecutionCandidate(candidateId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_candidate
     SET approval_status = 'approved',
         execution_status = 'approved',
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE candidate_id = $1::uuid
       AND execution_status = 'proposed'
       AND approval_status = 'pending'`,
    [candidateId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('Execution candidate not found or already reviewed');
}

export async function rejectExecutionCandidate(candidateId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_candidate
     SET approval_status = 'rejected',
         execution_status = 'rejected',
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE candidate_id = $1::uuid
       AND execution_status = 'proposed'
       AND approval_status = 'pending'`,
    [candidateId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('Execution candidate not found or already reviewed');
}

export async function approveByOpportunityId(opportunityId: string, reviewNotes?: string, opts?: { proposed_value?: string; target_page_url?: string }) {
  const p = getPool();

  // Phase 1: Check for pending candidates — approve them directly
  // Cast opportunity_id to text for comparison (column is text, but UI may send UUID format)
  const pending = await p.query(
    `SELECT candidate_id FROM analytics.seo_execution_candidate
     WHERE opportunity_id = $1::text
       AND execution_status = 'proposed'
       AND approval_status = 'pending'`,
    [opportunityId]
  );
  if (pending.rowCount && pending.rowCount > 0) {
    const upd = await p.query(
      `UPDATE analytics.seo_execution_candidate
       SET approval_status = 'approved',
           execution_status = 'approved',
           reviewer_id = 'operator',
           reviewed_at = NOW(),
           review_notes = $2
       WHERE opportunity_id = $1::text
         AND execution_status = 'proposed'
         AND approval_status = 'pending'`,
      [opportunityId, reviewNotes || null]
    );
    return { mode: 'updated', rowCount: upd.rowCount };
  }

  // Phase 2: Check for already-reviewed candidates (previously rejected or failed)
  const reviewed = await p.query(
    `SELECT candidate_id, execution_status, approval_status FROM analytics.seo_execution_candidate
     WHERE opportunity_id = $1::text
     ORDER BY created_at DESC
     LIMIT 1`,
    [opportunityId]
  );
  if (reviewed.rowCount && reviewed.rowCount > 0) {
    const row = reviewed.rows[0];
    if (row.approval_status === 'approved' && ['approved', 'draft_applied', 'published'].includes(row.execution_status)) {
      return { mode: 'already_approved', rowCount: 0 };
    }
    const upd = await p.query(
      `UPDATE analytics.seo_execution_candidate
       SET approval_status = 'approved',
           execution_status = 'approved',
           reviewer_id = 'operator',
           reviewed_at = NOW(),
           review_notes = $2
       WHERE candidate_id = $1`,
      [row.candidate_id, reviewNotes || null]
    );
    return { mode: 're_approved', rowCount: upd.rowCount };
  }

  // Phase 3: No candidate found by opportunity_id — search by page+mutation
  // The candidate may have been created by generate_execution_candidates() with
  // a different opportunity_id (MD5 hash from scoring queue, not Phase 1 UUID).
  const phase1 = await p.query(
    `SELECT opportunity_id::text, topic_cluster, strategic_intent, max_keyword_score,
            urgency_band, confidence_score, recommended_target_page,
            bottleneck_primary, resolved_existing_page_url
     FROM analytics.seo_phase1_opportunity
     WHERE opportunity_id::text = $1`,
    [opportunityId]
  );
  if (!phase1.rowCount || phase1.rowCount === 0) {
    throw new Error(`Opportunity ${opportunityId} not found in phase1 or execution queue`);
  }
  const opp = phase1.rows[0];
  const intentToMutation: Record<string, { mutation_type: string; target_field: string; family: string }> = {
    improve_ctr: { mutation_type: 'meta_description_update', target_field: 'meta_description', family: 'page' },
    strengthen_page: { mutation_type: 'title_tag_refinement', target_field: 'title_tag', family: 'page' },
    add_internal_links: { mutation_type: 'internal_link_insertion', target_field: 'body_anchor', family: 'query' },
    create_page: { mutation_type: 'meta_description_update', target_field: 'meta_description', family: 'page' },
  };
  const mapping = intentToMutation[opp.strategic_intent] || intentToMutation.improve_ctr;
  const targetUrl = opp.recommended_target_page || opp.resolved_existing_page_url || '';

  // Search for any existing candidate matching this page+mutation (any opportunity_id)
  if (targetUrl) {
    const pageMatch = await p.query(
      `SELECT candidate_id, execution_status, approval_status
       FROM analytics.seo_execution_candidate
       WHERE target_page_url = $1 AND mutation_type = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [targetUrl, mapping.mutation_type]
    );
    if (pageMatch.rowCount && pageMatch.rowCount > 0) {
      const row = pageMatch.rows[0];
      if (row.approval_status === 'approved' && ['approved', 'draft_applied', 'published'].includes(row.execution_status)) {
        return { mode: 'already_approved', rowCount: 0 };
      }
      await p.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'approved', execution_status = 'approved',
             reviewer_id = 'operator', reviewed_at = NOW(), review_notes = $2
         WHERE candidate_id = $1`,
        [row.candidate_id, reviewNotes || null]
      );
      return { mode: 'page_match_approved', rowCount: 1 };
    }
  }

  // Also try matching by attributed_cluster + mutation_type (for candidates without a target URL)
  if (opp.topic_cluster) {
    const clusterMatch = await p.query(
      `SELECT candidate_id, execution_status, approval_status
       FROM analytics.seo_execution_candidate
       WHERE attributed_cluster = $1 AND mutation_type = $2
         AND execution_status NOT IN ('rejected', 'rolled_back', 'failed')
       ORDER BY created_at DESC
       LIMIT 1`,
      [opp.topic_cluster, mapping.mutation_type]
    );
    if (clusterMatch.rowCount && clusterMatch.rowCount > 0) {
      const row = clusterMatch.rows[0];
      if (row.approval_status === 'approved') {
        return { mode: 'already_approved', rowCount: 0 };
      }
      await p.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'approved', execution_status = 'approved',
             reviewer_id = 'operator', reviewed_at = NOW(), review_notes = $2
         WHERE candidate_id = $1`,
        [row.candidate_id, reviewNotes || null]
      );
      return { mode: 'cluster_match_approved', rowCount: 1 };
    }
  }

  // No candidate exists anywhere — create one with ON CONFLICT DO NOTHING
  const topicKw = (opp.topic_cluster || 'neon signs').replace(/\b\w/g, (c: string) => c.toUpperCase());
  let proposedValue = '';
  if (mapping.mutation_type === 'meta_description_update') {
    proposedValue = `Shop ${topicKw} at Neon Signs Depot. Browse custom LED & neon signs — free design consultation, free shipping & 2-year warranty. Order online today.`;
  } else if (mapping.mutation_type === 'title_tag_refinement') {
    proposedValue = `${topicKw} | Custom LED Neon Signs | Neon Signs Depot`;
  } else if (mapping.mutation_type === 'internal_link_insertion') {
    proposedValue = opp.topic_cluster || 'custom neon signs';
  } else {
    proposedValue = `Shop ${topicKw} at Neon Signs Depot.`;
  }
  const evidenceSummary = `Phase-1 opportunity: ${opp.strategic_intent} for cluster "${opp.topic_cluster || 'unknown'}"`;
  await p.query(
    `INSERT INTO analytics.seo_execution_candidate
       (generation_run_id, created_reason,
        opportunity_id, opportunity_family, opportunity_score,
        primary_remedy, source_confidence, mutation_type,
        target_page_url, target_field, proposed_value, evidence_summary,
        attributed_cluster,
        execution_status, approval_status, approval_required,
        reviewer_id, reviewed_at, review_notes)
     VALUES (
        'shell-phase1-' || to_char(NOW(), 'YYYYMMDD-HH24MISS'), 'shell_phase1_approval',
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
        'approved', 'approved', true,
        'operator', NOW(), $12)
     ON CONFLICT DO NOTHING`,
    [
      opp.opportunity_id,
      mapping.family,
      Number(opp.max_keyword_score) || 0,
      opp.strategic_intent || 'improve_ctr',
      opp.confidence_score ? String(opp.confidence_score) : 'medium',
      mapping.mutation_type,
      targetUrl,
      mapping.target_field,
      proposedValue,
      evidenceSummary,
      opp.topic_cluster || null,
      reviewNotes || null,
    ]
  );
  return { mode: 'inserted', rowCount: 1 };
}

export async function rejectByOpportunityId(opportunityId: string, reviewNotes?: string): Promise<{ mode: string; rowCount: number | null; error?: string }> {
  try {
    const p = getPool();

    // Phase 1: Try rejecting pending execution candidates
    const pending = await p.query(
      `SELECT candidate_id FROM analytics.seo_execution_candidate
       WHERE opportunity_id = $1
         AND execution_status = 'proposed'
         AND approval_status = 'pending'`,
      [opportunityId]
    );
    if (pending.rowCount && pending.rowCount > 0) {
      const upd = await p.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'rejected',
             execution_status = 'rejected',
             reviewer_id = 'operator',
             reviewed_at = NOW(),
             review_notes = $2
         WHERE opportunity_id = $1
           AND execution_status = 'proposed'
           AND approval_status = 'pending'`,
        [opportunityId, reviewNotes || null]
      );
      return { mode: 'updated', rowCount: upd.rowCount };
    }

    // Phase 2: Try rejecting any existing candidate (already approved, re-rejecting)
    const any = await p.query(
      `SELECT candidate_id, execution_status, approval_status FROM analytics.seo_execution_candidate
       WHERE opportunity_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [opportunityId]
    );
    if (any.rowCount && any.rowCount > 0) {
      const row = any.rows[0];
      if (row.approval_status === 'rejected') {
        return { mode: 'already_rejected', rowCount: 0 };
      }
      const upd = await p.query(
        `UPDATE analytics.seo_execution_candidate
         SET approval_status = 'rejected',
             execution_status = 'rejected',
             reviewer_id = 'operator',
             reviewed_at = NOW(),
             review_notes = $2
         WHERE candidate_id = $1`,
        [row.candidate_id, reviewNotes || null]
      );
      return { mode: 'rejected', rowCount: upd.rowCount };
    }

    // Phase 3: No execution candidate — try seo_recommendations table
    try {
      const recUpd = await p.query(
        `UPDATE analytics.seo_recommendations
         SET status = 'rejected'
         WHERE (supporting_data->>'cluster_id' = $1 OR id::text = $1)
           AND status IN ('pending', 'pending_review', 'approved')`,
        [opportunityId]
      );
      if (recUpd.rowCount && recUpd.rowCount > 0) {
        return { mode: 'recommendation_rejected', rowCount: recUpd.rowCount };
      }
    } catch {
      // Query failed — continue to not_found return
    }

    return { mode: 'not_found', rowCount: 0 };
  } catch (err) {
    console.error('[seo-db] rejectByOpportunityId error:', err instanceof Error ? err.message : err);
    return { mode: 'error', rowCount: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function submitFeedback(id: string, feedbackText: string) {
  // Migrated 2026-05-12: write human notes onto seo_action directly.
  const p = getPool();
  const result = await p.query(
    `UPDATE analytics.seo_action
       SET human_notes = $2,
           human_decided_at = COALESCE(human_decided_at, NOW())
     WHERE id = $1::uuid`,
    [id, feedbackText],
  );
  if (result.rowCount === 0) throw new Error('Recommendation not found');
}

export async function getOutcomes() {
  // Migrated 2026-05-12: outcomes now derive from seo_action's own outcome
  // columns (outcome_position_delta, outcome_impressions_delta,
  // outcome_ctr_delta, outcome_clicks_delta, measured_at_14d/30d) instead
  // of the legacy seo_learning_outcomes + seo_recommendations + keyword_clusters
  // + seo_execution_log four-way join.
  //
  // measured_at_90d isn't tracked in seo_action — returned as null.
  const p = getPool();
  const result = await p.query(`
    SELECT
      sa.id,
      COALESCE(sa.source_cluster, sa.source_keyword, 'Unknown') AS cluster_topic,
      COALESCE(sa.source_keyword, '') AS keyword,
      COALESCE(sa.target_url, '') AS page_url,
      sa.gsc_position::numeric AS old_position,
      CASE
        WHEN sa.gsc_position IS NOT NULL AND sa.outcome_position_delta IS NOT NULL
        THEN (sa.gsc_position + sa.outcome_position_delta)::numeric
        ELSE NULL
      END AS new_position,
      ROUND(COALESCE(sa.outcome_ctr_delta, 0)::numeric, 1) AS ctr_change,
      COALESCE(sa.outcome_clicks_delta, 0) AS traffic_change,
      COALESCE(sa.executed_at, sa.measured_at_14d) AS execution_date,
      sa.measured_at_14d,
      sa.measured_at_30d,
      NULL::timestamptz AS measured_at_90d
    FROM analytics.seo_action sa
    WHERE sa.measured_at_14d IS NOT NULL OR sa.measured_at_30d IS NOT NULL
    ORDER BY COALESCE(sa.measured_at_30d, sa.measured_at_14d) DESC
  `);
  return result.rows.map(r => ({
    ...r,
    old_position: r.old_position != null ? Number(r.old_position) : null,
    new_position: r.new_position != null ? Number(r.new_position) : null,
    ctr_change: Number(r.ctr_change),
    traffic_change: Number(r.traffic_change),
    measured_at_14d: r.measured_at_14d ?? null,
    measured_at_30d: r.measured_at_30d ?? null,
    measured_at_90d: r.measured_at_90d ?? null,
  }));
}
