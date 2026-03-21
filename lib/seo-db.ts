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
      sr.id,
      (sr.supporting_data->>'cluster_id') AS cluster_id,
      sr.target_query AS cluster_topic,
      sr.recommendation_type AS opportunity_type,
      COALESCE((sr.supporting_data->>'total_impressions')::int, 0) AS total_impressions,
      ROUND(COALESCE((sr.supporting_data->>'avg_position')::numeric, 0), 1) AS avg_position,
      sr.suggested_action
    FROM analytics.seo_recommendations sr
    ORDER BY COALESCE((sr.supporting_data->>'total_impressions')::int, 0) DESC
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
      sr.id,
      (sr.supporting_data->>'cluster_id') AS cluster_id,
      sr.target_query AS cluster_topic,
      sr.target_query AS primary_keyword,
      sr.suggested_action AS recommended_action,
      COALESCE(sr.target_url, '') AS recommended_url,
      sr.title AS recommended_title,
      sr.rationale AS recommended_meta_description,
      COALESCE(sr.target_url, '') AS target_url,
      sr.recommendation_type AS opportunity_type,
      sr.expected_impact AS estimated_impact,
      sr.status,
      sr.rationale,
      sr.priority,
      sr.created_at
    FROM analytics.seo_recommendations sr
    ORDER BY sr.created_at DESC
  `);
  return result.rows;
}

export async function approveRecommendation(id: string) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE analytics.seo_recommendations SET status = 'approved' WHERE id = $1`, [id]
    );
    if (upd.rowCount === 0) throw new Error('Recommendation not found');
    await client.query(`
      INSERT INTO analytics.seo_recommendation_approvals
        (recommendation_id, organization_id, decision, reviewer_type, review_note, created_at)
      SELECT $1, sr.organization_id, 'approved', 'human', NULL, NOW()
      FROM analytics.seo_recommendations sr WHERE sr.id = $1
    `, [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectRecommendation(id: string) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE analytics.seo_recommendations SET status = 'rejected' WHERE id = $1`, [id]
    );
    if (upd.rowCount === 0) throw new Error('Recommendation not found');
    await client.query(`
      INSERT INTO analytics.seo_recommendation_approvals
        (recommendation_id, organization_id, decision, reviewer_type, review_note, created_at)
      SELECT $1, sr.organization_id, 'rejected', 'human', NULL, NOW()
      FROM analytics.seo_recommendations sr WHERE sr.id = $1
    `, [id]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function approveExecutionCandidate(candidateId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_queue
     SET approval_status = 'approved',
         awaiting_approval = false,
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE candidate_id = $1::uuid`,
    [candidateId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('Execution candidate not found');
}

export async function rejectExecutionCandidate(candidateId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_queue
     SET approval_status = 'rejected',
         awaiting_approval = false,
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE candidate_id = $1::uuid`,
    [candidateId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('Execution candidate not found');
}

export async function approveByOpportunityId(opportunityId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_queue
     SET approval_status = 'approved',
         awaiting_approval = false,
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE opportunity_id = $1
       AND awaiting_approval = true`,
    [opportunityId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('No pending execution candidate found for this opportunity');
}

export async function rejectByOpportunityId(opportunityId: string, reviewNotes?: string) {
  const p = getPool();
  const upd = await p.query(
    `UPDATE analytics.seo_execution_queue
     SET approval_status = 'rejected',
         awaiting_approval = false,
         reviewer_id = 'operator',
         reviewed_at = NOW(),
         review_notes = $2
     WHERE opportunity_id = $1
       AND awaiting_approval = true`,
    [opportunityId, reviewNotes || null]
  );
  if (upd.rowCount === 0) throw new Error('No pending execution candidate found for this opportunity');
}

export async function submitFeedback(id: string, feedbackText: string) {
  const p = getPool();
  const result = await p.query(`
    INSERT INTO analytics.seo_recommendation_approvals
      (recommendation_id, organization_id, decision, reviewer_type, review_note, created_at)
    SELECT $1, sr.organization_id, 'feedback', 'human', $2, NOW()
    FROM analytics.seo_recommendations sr WHERE sr.id = $1
  `, [id, feedbackText]);
  if (result.rowCount === 0) throw new Error('Recommendation not found');
}

export async function getOutcomes() {
  const p = getPool();
  const result = await p.query(`
    SELECT
      slo.id,
      COALESCE(sr.target_query, kc.primary_keyword, 'Unknown') AS cluster_topic,
      COALESCE(sr.target_query, '') AS keyword,
      COALESCE(sr.target_url, '') AS page_url,
      COALESCE(slo.baseline_position, 0)::numeric AS old_position,
      COALESCE(slo.measured_position, 0)::numeric AS new_position,
      CASE
        WHEN slo.baseline_impressions > 0 AND slo.measured_impressions > 0
          AND slo.baseline_clicks IS NOT NULL AND slo.measured_clicks IS NOT NULL
        THEN ROUND(
          ((slo.measured_clicks::numeric / NULLIF(slo.measured_impressions, 0)) -
           (slo.baseline_clicks::numeric / NULLIF(slo.baseline_impressions, 0))) * 100, 1)
        ELSE 0
      END AS ctr_change,
      COALESCE(slo.measured_clicks, 0) - COALESCE(slo.baseline_clicks, 0) AS traffic_change,
      slo.measurement_date AS execution_date
    FROM analytics.seo_learning_outcomes slo
    LEFT JOIN analytics.seo_recommendations sr ON sr.id = slo.recommendation_id
    LEFT JOIN analytics.keyword_clusters kc ON kc.id::text = (sr.supporting_data->>'cluster_id')
    ORDER BY slo.measurement_date DESC
  `);
  return result.rows.map(r => ({
    ...r,
    old_position: Number(r.old_position),
    new_position: Number(r.new_position),
    ctr_change: Number(r.ctr_change),
    traffic_change: Number(r.traffic_change),
  }));
}
