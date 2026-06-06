import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

export async function GET(_req: NextRequest) {
  if (!process.env.SUPABASE_DATABASE_URL && !process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const result = await pool.query(`
      SELECT
        c.candidate_id::text AS id,
        analytics.seo_mutation_label(c.mutation_type) AS cluster_topic,
        COALESCE(c.evidence#>>'{query}', c.evidence#>>'{primary_keyword}', c.mutation_type, '') AS keyword,
        COALESCE(analytics.seo_norm_url(c.target_page_url), c.target_page_url, '') AS page_url,
        NULL::numeric AS old_position,
        NULL::numeric AS new_position,
        0::numeric AS ctr_change,
        0::numeric AS traffic_change,
        COALESCE(o.published_at, c.published_at, c.execution_timestamp, c.reviewed_at, c.created_at) AS execution_date,
        o.decided_at AS measured_at_14d,
        NULL::timestamptz AS measured_at_30d,
        NULL::timestamptz AS measured_at_90d
      FROM analytics.seo_execution_candidate c
      LEFT JOIN analytics.seo_published_outcome o
        ON o.candidate_id = c.candidate_id
      WHERE c.execution_status IN ('published', 'draft_applied')
         OR o.candidate_id IS NOT NULL
      ORDER BY COALESCE(o.decided_at, o.published_at, c.published_at, c.execution_timestamp, c.reviewed_at, c.created_at) DESC
      LIMIT 200
    `);
    const outcomes = result.rows.map((r) => ({
      ...r,
      old_position: r.old_position != null ? Number(r.old_position) : null,
      new_position: r.new_position != null ? Number(r.new_position) : null,
      ctr_change: Number(r.ctr_change ?? 0),
      traffic_change: Number(r.traffic_change ?? 0),
      measured_at_14d: r.measured_at_14d ?? null,
      measured_at_30d: r.measured_at_30d ?? null,
      measured_at_90d: r.measured_at_90d ?? null,
    }));
    return NextResponse.json({ data: outcomes });
  } catch (err: any) {
    console.error('[seo/outcomes] Error:', err.message);
    return NextResponse.json({ error: 'Failed to load outcomes' }, { status: 500 });
  }
}
